import { EventBridgeEvent } from "aws-lambda";
import { createSmartleadCampaign } from "@inbox-intact-sst/core/create-smartlead-campaign";
import { IScraperDetails } from "@inbox-intact-sst/core/types";
import { db } from "@inbox-intact-sst/core/drizzle/db";
import { smartleadActiveCampaign } from "@inbox-intact-sst/core/drizzle/schema";

export const handler = async (
  event: EventBridgeEvent<string, IScraperDetails>
) => {
  console.log("scraper just triggered from event bridge", event);

  const { detail } = event;
  const { userId } = detail;

  try {
    const user = await db.query.user.findFirst({
      where: (model, { eq }) => eq(model.id, userId),
      with: {
        slack: true,
        emailAccounts: true,
        emailTemplate: true,
      },
    });

    if (!user) throw new Error("User not found");
    if (!user.emailTemplate) throw new Error("No email template set for user");
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
          emailTemplate: user.emailTemplate,
          webhookUrl: process.env.WEBHOOK_API_URL as string,
        });
        await db.insert(smartleadActiveCampaign).values({
          id: campaignId,
          emailUsed: emailAccount.email,
          userId: userId,
        });
      } catch (error) {
        console.error(
          `Error processing email account ${emailAccount.id}: ${error}`
        );
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
