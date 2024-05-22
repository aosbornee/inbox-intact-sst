import { EmailOpenResponse, MailTester } from "@inbox-intact-sst/core/types";
import axios from "axios";
import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { IncomingWebhook } from "@slack/webhook";
import { smartleadActiveCampaign } from "@inbox-intact-sst/core/drizzle/schema";
import { db } from "@inbox-intact-sst/core/drizzle/db";
import { eq, count, and } from "drizzle-orm";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  if (!event.body || !event?.pathParameters?.userId)
    throw new Error("There's a problem");

  const userId = event.pathParameters.userId;
  const data = JSON.parse(event.body) as EmailOpenResponse;

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
    },
  });

  if (!user) throw new Error("User not found");
  if (!user.slack) throw new Error("No slack key set for user");

  try {
    const response = await axios.get<MailTester>(
      `https://www.mail-tester.com/${strippedEmail}&format=json`
    );
    const { data } = response;

    console.log(data, "data");

    const { body } = data;

    const slackWebhookUrl = user.slack?.incomingWebhook;
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
    throw new Error(error);
  }
};
