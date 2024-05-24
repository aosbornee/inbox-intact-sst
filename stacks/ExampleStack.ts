import {StackContext, Function, EventBus } from "sst/constructs";
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
    timeout: "60 seconds",
  });

  const eventBus = new EventBus(stack, "EventBus");

  const scheduleRole = new Role(stack, "scheduler-role", {
    assumedBy: new ServicePrincipal("scheduler.amazonaws.com"),
  });

  stack.addDefaultFunctionEnv({
    ...environment,
    SCHEDULE_ROLE_ARN: scheduleRole.roleArn,
    EVENTBUS_ARN: eventBus.eventBusArn,
  });

  const webhookProcessor = new Function(stack, "WebhookProcessor", {
    handler: "packages/functions/src/process-sent-email.handler",
    url: true,
  });

  const scrape = new Function(stack, "Scrape", {
    handler: "packages/functions/src/scrape/scraper.handler",
    environment: {
      WEBHOOK_API_URL: webhookProcessor.url!,
    },
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
    webhookProcessor: webhookProcessor.url,
  });
}
