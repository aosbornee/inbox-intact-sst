import { Api, StackContext, Function, EventBus } from "sst/constructs";
import {
  Effect,
  Policy,
  PolicyStatement,
  Role,
  ServicePrincipal,
} from "aws-cdk-lib/aws-iam";
import { environment } from "./constants";

export function ExampleStack({ stack, app }: StackContext) {
  stack.setDefaultFunctionProps({
    runtime: "nodejs20.x",
  });

  const api = new Api(stack, "WebhookApi", {
    routes: {
      "POST /process-sent-email/{userId}":
        "packages/functions/src/process-sent-email.handler",
    },
  });

  const eventBus = new EventBus(stack, "EventBus");

  const scheduleRole = new Role(stack, "scheduler-role", {
    assumedBy: new ServicePrincipal("scheduler.amazonaws.com"),
  });

  stack.addDefaultFunctionEnv({
    ...environment,
    WEBHOOK_API_URL: api.url,
    SCHEDULE_ROLE_ARN: scheduleRole.roleArn,
    EVENTBUS_ARN: eventBus.eventBusArn,
  });

  new Policy(stack, "schedule-policy", {
    policyName: "ScheduleToPutEvents",
    roles: [scheduleRole],
    statements: [
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["events:PutEvents"],
        resources: [eventBus.eventBusArn],
      }),
    ],
  });

  const scrape = new Function(stack, "Scrape", {
    handler: "packages/functions/src/scrape/scraper.handler",
    permissions: ["ssm"],
  });

  const createScrapeSchedule = new Function(stack, "CreateScrapeSchedule", {
    handler: "packages/functions/src/scrape/create-scrape-scheduler.handler",
    initialPolicy: [
      // Give lambda permission to create group, schedule and pass IAM role to the scheduler
      new PolicyStatement({
        actions: [
          "scheduler:CreateSchedule",
          "iam:PassRole",
          "scheduler:CreateScheduleGroup",
        ],
        resources: ["*"],
      }),
    ],
  });

  eventBus.addRules(stack, {
    firstRule: {
      pattern: {
        source: ["app.scrape"],
        detailType: ["ScrapeCreated"],
      },
      targets: {
        firstTarget: createScrapeSchedule,
      },
    },

    secondRule: {
      pattern: {
        source: ["app.scrape"],
        detailType: ["ScrapeFeed"],
      },
      targets: {
        firstTarget: scrape,
      },
    },
    // thirdRule: {
    //   pattern: {
    //     source: ['app.scrape'],
    //     detailType: ['ScrapeDeleted'],
    //   },
    //   targets: {
    //     firstTarget: this.deleteScrapeSchedule,
    //   },
    // },
  });

  stack.addOutputs({
    api: api.url,
  });
}
