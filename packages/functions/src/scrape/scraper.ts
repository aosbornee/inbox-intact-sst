import { EventBridgeEvent } from "aws-lambda";
import { createSmartleadCampaign } from "@inbox-intact-sst/core/create-smartlead-campaign";
import { IScraperDetails } from "@inbox-intact-sst/core/types";
import { PrismaClient } from "@prisma/client";

const client = new PrismaClient();

export const handler = async (
  event: EventBridgeEvent<string, IScraperDetails>
) => {
  console.log("scraper just triggered from event bridge", event);

  const { detail } = event;
  const { userId } = detail;

  try {
    const user = await client.user.findUniqueOrThrow({
      where: {
        id: userId,
      },
      include: {
        slack: true,
        emailAccounts: true,
      },
    });

    const apiKey = user.smartleadApiKey;
    if (!apiKey) throw new Error("API Key Not Set");

    const emailsToTrack = user.emailAccounts.filter((email) => email.isTracked);

    // Loop over each tracked email account and run the campaign creation logic
    for (const emailAccount of emailsToTrack) {
      try {
        const campaignId = await createSmartleadCampaign({
          apiKey,
          userId,
          emailAccount,
        });
        await client.smartleadActiveCampaign.create({
          data: {
            id: campaignId,
            emailUsed: emailAccount.email,
            userId,
          },
        });
      } catch (error) {
        console.error(
          `Error processing email account ${emailAccount.id}: ${error}`
        );
        // Optionally, continue with next account or handle the error as needed
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "done" }),
    };
  } catch (error: any) {
    console.log(error, "error");
    throw new Error(error);
  }
};
