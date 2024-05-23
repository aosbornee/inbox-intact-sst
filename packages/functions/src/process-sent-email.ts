import { EmailOpenResponse, MailTester } from "@inbox-intact-sst/core/types";
import axios from "axios";
import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { IncomingWebhook } from "@slack/webhook";
import { smartleadActiveCampaign } from "@inbox-intact-sst/core/drizzle/schema";
import { db } from "@inbox-intact-sst/core/drizzle/db";
import { eq, count, and } from "drizzle-orm";
import { deleteCampaign } from "@inbox-intact-sst/core/create-smartlead-campaign";
import { createSpreadsheet } from "@inbox-intact-sst/core/spreadsheet";
import { MAIL_TESTER_USERNAME } from "@inbox-intact-sst/core/constants";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    if (!event.body || !event?.pathParameters?.userId)
      throw new Error("There's a problem");

    const userId = event.pathParameters.userId;
    const data = JSON.parse(event.body) as EmailOpenResponse;

    console.log("API triggered with this data", data);

    const { campaign_id: campaignId } = data;

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

    for (const campaign of user.smartleadActiveCampaigns) {
      try {
        await deleteCampaign(campaign.id, apiKey);
      } catch (error) {
        console.error(
          `Error deleting campaign with id ${campaign.id}: ${error}`
        );
      }
    }

    const rows = await Promise.all(
      user.smartleadActiveCampaigns.map(async (campaign) => {
        const inboxUrl = `https://www.mail-tester.com/${MAIL_TESTER_USERNAME}-${campaign.id}&format=json`;
        const response = await axios.get<MailTester>(inboxUrl);
        const { data: mailData } = response;
        return {
          // no. of blacklists
          // blacklists
          emailInbox: campaign.emailUsed,
          testScore: mailData.displayedMark,
          testLink: inboxUrl,
          testDate: mailData.messageInfo.dateReceived,
        };
      })
    );

    await db
      .delete(smartleadActiveCampaign)
      .where(eq(smartleadActiveCampaign.userId, userId));

    const link = await createSpreadsheet(rows);
    const webhook = new IncomingWebhook(user.slack.incomingWebhook);
    await webhook.send({
      text: `Your Deliverability Results Are *Ready* :smile: \n <${link}|Here's the link>`,
      blocks: [
        {
          type: "divider",
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `Your Deliverability Results Are *Ready* :smile: \n <${link}|Here's the link>`,
          },
        },
      ],
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
