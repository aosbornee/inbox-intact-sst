import { EmailOpenResponse, MailTester } from "@inbox-intact-sst/core/types";
import axios from "axios";
import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { IncomingWebhook } from "@slack/webhook";
import { smartleadActiveCampaign } from "@inbox-intact-sst/core/drizzle/schema";
import { db } from "@inbox-intact-sst/core/drizzle/db";
import { eq, count, and } from "drizzle-orm";
import { deleteCampaign } from "@inbox-intact-sst/core/create-smartlead-campaign";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    if (!event.body || !event?.pathParameters?.userId)
      throw new Error("There's a problem");

    const userId = event.pathParameters.userId;
    const data = JSON.parse(event.body) as EmailOpenResponse;

    console.log("API triggered with this data", data);

    const { to_email: toEmail, campaign_id: campaignId } = data;

    const strippedEmail = toEmail.split("@")[0];

    await db
      .update(smartleadActiveCampaign)
      .set({ isCompleted: true })
      .where(eq(smartleadActiveCampaign.id, campaignId));

    const incompleteCampaigns = await db
      .select({ count: count() })
      .from(smartleadActiveCampaign)
      .where(
        and(
          eq(smartleadActiveCampaign.userId, userId),
          eq(smartleadActiveCampaign.isCompleted, false)
        )
      );

    if (incompleteCampaigns[0].count > 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({ message: "Not all campaigns completed yet." }),
      };
    }

    const user = await db.query.user.findFirst({
      where: (model, { eq }) => eq(model.id, userId),
      with: {
        slack: true,
        emailAccounts: true,
        smartleadActiveCampaigns: true,
      },
    });

    if (!user) throw new Error("User not found");
    if (!user.slack) throw new Error("No slack key set for user");
    const apiKey = user.smartleadApiKey;
    if (!apiKey) throw new Error("API Key Not Set");

    // Loop over each tracked email account and run the campaign creation logic
    for (const campaign of user.smartleadActiveCampaigns) {
      try {
        await deleteCampaign(campaign.id, apiKey);
      } catch (error) {
        console.error(
          `Error deleting campaign with id ${campaign.id}: ${error}`
        );
      }
    }
    await db
      .delete(smartleadActiveCampaign)
      .where(eq(smartleadActiveCampaign.userId, userId));

    const response = await axios.get<MailTester>(
      `https://www.mail-tester.com/${strippedEmail}&format=json`
    );
    const { data: mailData } = response;

    console.log(mailData, "mailData");

    const { body } = mailData;

    const slackWebhookUrl = user.slack.incomingWebhook;
    const webhook = new IncomingWebhook(slackWebhookUrl);
    await webhook.send({
      text: `I've got news for you... ${body.title}`,
    });
    return {
      statusCode: 200,
      body: JSON.stringify({ message: "done" }),
    };
  } catch (error: any) {
    console.log(error, "error");
    let message;
    if (error instanceof Error) {
      message = error.message;
    } else {
      message = String(error);
    }
    return {
      statusCode: 500,
      body: JSON.stringify({ message }),
    };
  }
};
