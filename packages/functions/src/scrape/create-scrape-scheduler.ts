import { IScraperDetails } from "@inbox-intact-sst/core/types";
import { EventBridgeEvent } from "aws-lambda";
import {
  SchedulerClient,
  CreateScheduleCommand,
  FlexibleTimeWindowMode,
  CreateScheduleGroupCommand,
} from "@aws-sdk/client-scheduler";

const client = new SchedulerClient({});

const { SCHEDULE_ROLE_ARN } = process.env;
const { EVENTBUS_ARN } = process.env;

if (!SCHEDULE_ROLE_ARN || !EVENTBUS_ARN)
  throw new Error("Missing EVENTBUS_ARN && SCHEDULE_ROLE_ARN");

export const handler = async (
  event: EventBridgeEvent<string, IScraperDetails>
) => {
  console.log("create scrape just triggered from event bridge");
  const {
    detail: {userId },
  } = event;
  try {
    // Create the schedule group for now, this would be done in CDK when we can
    await client.send(
      new CreateScheduleGroupCommand({
        Name: `SchedulesForScrape7Days`,
      })
    );
  } catch (error) {
    console.log(error, "error");
  }

  try {
    await client.send(
      new CreateScheduleCommand({
        Name: `${userId.trim()}`,
        GroupName: `SchedulesForScrape7Days`,
        Target: {
          RoleArn: process.env.SCHEDULE_ROLE_ARN,
          Arn: process.env.EVENTBUS_ARN,
          // Using the template targets for EventBridge
          EventBridgeParameters: {
            DetailType: "ScrapeFeed",
            Source: "app.scrape",
          },
          // This is the detail of the event, we just pass it on
          Input: JSON.stringify({ ...event.detail }),
        },
        FlexibleTimeWindow: {
          Mode: FlexibleTimeWindowMode.OFF,
        },
        Description: `scrape feed every 7 days`,
        ScheduleExpression: `rate(7 days)`,
      })
    );
  } catch (error) {
    console.log("error", error);
    console.log("event", event);
  }

  return {
    statusCode: 200,
    headers: { "Content-Type": "text/plain" },
    body: "",
  };
};
