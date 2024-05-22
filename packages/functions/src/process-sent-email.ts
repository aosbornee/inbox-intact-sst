import { EmailOpenResponse, MailTester } from "@inbox-intact-sst/core/types";
import axios from "axios";
import { PrismaClient } from "@prisma/client";
import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { IncomingWebhook } from "@slack/webhook";

const client = new PrismaClient();

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  if (!event.body || !event?.pathParameters?.userId)
    throw new Error("There's a problem");

  const userId = event.pathParameters.userId;
  const data = JSON.parse(event.body) as EmailOpenResponse;

  const { to_email: toEmail, campaign_id: campaignId } = data;

  const strippedEmail = toEmail.split("@")[0];

  await client.smartleadActiveCampaign.update({
    where: {
      id: campaignId,
      userId,
    },
    data: {
      isCompleted: true,
    },
  });

  // Check if all campaigns for this user are completed
  const incompleteCampaigns = await client.smartleadActiveCampaign.count({
    where: {
      userId: userId,
      isCompleted: false,
    },
  });

  if (incompleteCampaigns > 0) {
    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Not all campaigns completed yet." }),
    };
  }

  const user = await client.user.findUniqueOrThrow({
    where: { id: userId },
    include: { slack: true },
  });
  if (!user.slack) throw new Error("There's a problem");

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
