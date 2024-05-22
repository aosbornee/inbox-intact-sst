import path from "path";
import fs from "fs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { Api, StackContext, Function, EventBus } from "sst/constructs";

import {
  Effect,
  Policy,
  PolicyStatement,
  Role,
  ServicePrincipal,
} from "aws-cdk-lib/aws-iam";
import { environment } from "./constants";

const prismaDatabaseLayerPath = "./.sst/layers/prisma";

function preparePrismaLayerFiles() {
  // Remove any existing layer path data
  fs.rmSync(prismaDatabaseLayerPath, { force: true, recursive: true });

  // Create a fresh new layer path
  fs.mkdirSync(prismaDatabaseLayerPath, { recursive: true });

  // Prisma folders to retrieve the client and the binaries from
  const prismaFiles = [
    "node_modules/@prisma/client",
    "node_modules/prisma/build",
  ];

  for (const file of prismaFiles) {
    fs.cpSync(file, path.join(prismaDatabaseLayerPath, "nodejs", file), {
      // Do not include binary files that aren't for AWS to save space
      filter: (src) =>
        !src.endsWith("so.node") ||
        src.includes("rhel") ||
        src.includes("linux-arm64"),
      recursive: true,
    });
  }
}

export function ExampleStack({ stack, app }: StackContext) {
  preparePrismaLayerFiles();

  // Creation of the Prisma layer
  const prismaLayer = new lambda.LayerVersion(stack, "PrismaLayer", {
    code: lambda.Code.fromAsset(path.resolve(prismaDatabaseLayerPath)),
  });

  // Add the Prisma layer to all functions in this stack
  stack.addDefaultFunctionLayers([prismaLayer]);
  stack.setDefaultFunctionProps({
    runtime: "nodejs20.x",
    nodejs: {
      esbuild: {
        external: ["@prisma/client", ".prisma"],
      },
    },
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
    // environment: {
    //   SCHEDULE_ROLE_ARN: scheduleRole.roleArn,
    //   EVENTBUS_ARN: eventBus.eventBusArn,
    // },
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
