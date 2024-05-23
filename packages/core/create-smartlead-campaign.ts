import axios from "axios";
import { BASE_SMARTLEAD_URL, MAIL_TESTER_USERNAME } from "./constants";
import { EmailAccount } from "./types";

const createCampaign = async (email: string, apiKey: string) => {
  const response = await axios.post<{
    ok: boolean;
    id: number;
    name: string;
    created_at: Date;
  }>(`${BASE_SMARTLEAD_URL}/campaigns/create/?api_key=${apiKey}`, {
    name: `Inbox Intact | Testing Deliverability for ${email}`,
  });
  const { data } = response;
  return data;
};

export const deleteCampaign = async (campaignId: number, apiKey: string) => {
  const response = await axios.delete<{
    ok: boolean;
  }>(`${BASE_SMARTLEAD_URL}/campaigns/${campaignId}/?api_key=${apiKey}`);
  const { data } = response;
  return data;
};

type IProps = {
  userId: string;
  apiKey: string;
  emailAccount: EmailAccount;
  webhookUrl: string;
  emailBodyTemplate?: string;
};

export const createSmartleadCampaign = async ({
  apiKey,
  userId,
  emailAccount,
  emailBodyTemplate,
  webhookUrl,
}: IProps) => {
  const campaign = await createCampaign(emailAccount.email, apiKey);

  console.log("Campaign created");

  // Add the email account to the campaign
  await axios.post(
    `${BASE_SMARTLEAD_URL}/campaigns/${campaign.id}/email-accounts/?api_key=${apiKey}`,
    { email_account_ids: [emailAccount.smartleadId] }
  );

  console.log("Email account added to campaign");

  // const uniqueIdentifier = `${campaign.id}:${userId}`;
  const uniqueIdentifier = `${campaign.id}`;

  const emailToSend = `${MAIL_TESTER_USERNAME}-${uniqueIdentifier}@mail-tester.com`;
  console.log(emailToSend, "emailToSend");

  try {
    await axios.post(
      `${BASE_SMARTLEAD_URL}/campaigns/${campaign.id}/leads/?api_key=${apiKey}`,
      {
        lead_list: [
          {
            email: emailToSend,
          },
        ],
      }
    );
    console.log(`Lead: ${emailToSend} added to campaign`);
  } catch (error) {
    console.log(error);
    console.log(`Failed to add lead: ${emailToSend} to campaign`);
  }

  // Save a sequence for the campaign
  await axios.post(
    `${BASE_SMARTLEAD_URL}/campaigns/${campaign.id}/sequences/?api_key=${apiKey}`,
    {
      sequences: [
        {
          seq_number: 1,
          seq_delay_details: {
            delay_in_days: 0,
          },
          seq_variants: [
            {
              subject: "Quick Q brother",
              email_body:
                "<p>Hi<br><br>How are you?<br><br>Hope you're doing good</p>",
              variant_label: "A",
            },
          ],
        },
      ],
    }
  );

  console.log("Sequence saved");

  // Schedule the campaign
  await axios.post(
    `${BASE_SMARTLEAD_URL}/campaigns/${campaign.id}/schedule/?api_key=${apiKey}`,
    {
      timezone: "Europe/London",
      days_of_the_week: [0, 1, 2, 3, 4, 5, 6],
      start_hour: "06:00",
      end_hour: "22:00",
      min_time_btw_emails: 3,
      max_new_leads_per_day: 20,
      schedule_start_time: new Date(new Date().getTime() + 10000).toISOString(),
    }
  );

  console.log("Campaign Scheduled");

  // Schedule the campaign
  await axios.post(
    `${BASE_SMARTLEAD_URL}/campaigns/${campaign.id}/status/?api_key=${apiKey}`,
    {
      status: "START",
    }
  );

  console.log("Campaign Launched");

  // Create a webhook to listen for when an email has been sent
  await axios.post(
    `${BASE_SMARTLEAD_URL}/campaigns/${campaign.id}/webhooks/?api_key=${apiKey}`,
    {
      name: "Deliverability Testing",
      webhook_url: `${webhookUrl}/process-sent-email/${userId}`,
      event_types: ["EMAIL_SENT"],
    }
  );

  console.log("Webby added");

  return campaign.id;
};
