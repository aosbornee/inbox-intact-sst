export type SmartleadEmailAccount = {
  id: number;
  created_at: string;
  updated_at: string;
  user_id: number;
  from_name: string;
  from_email: string;
  username: string;
  password: string;
  imap_password: string;
  smtp_host: string;
  smtp_port: number;
  smtp_port_type: "SSL" | "TLS" | "Other"; // Assuming possible types
  message_per_day: number;
  different_reply_to_address: string;
  is_different_imap_account: boolean;
  imap_username: string;
  imap_host: string;
  imap_port: number;
  imap_port_type: "SSL" | "TLS" | "Other"; // Assuming possible types
  signature: string;
  custom_tracking_domain: string;
  bcc_email: string;
  is_smtp_success: boolean;
  is_imap_success: boolean;
  smtp_failure_error: string;
  imap_failure_error: string;
  type: "SMTP" | "GMAIL" | "ZOHO" | "OUTLOOK"; // ENUM (SMTP / GMAIL / ZOHO / OUTLOOK)
  daily_sent_count: number;
  client_id: number | null; // null if it is not attached to a client
  warmup_details: {
    id: number;
    status: "ACTIVE" | "INACTIVE";
    total_sent_count: number;
    total_spam_count: number;
    warmup_reputation: string;
  };
};

export type EmailOpenResponse = {
  webhook_id: string;
  webhook_name: string;
  sl_email_lead_id: string;
  sl_email_lead_map_id: string;
  webhook_url: string;
  stats_id: string;
  event_type: string;
  event_timestamp: string;
  from_email: string;
  to_email: string;
  to_name: string;
  subject: string;
  campaign_id: number;
  campaign_name: string;
  campaign_status: string;
  sequence_number: string;
  sent_message: {
    message_id: string;
    html: string;
    text: string;
    time: string;
  };
  client_id: string;
  app_url: string;
  secret_key: string;
  description: string;
  metadata: {
    webhook_created_at: string;
  };
};

export type MailTester = {
  title: string;
  mark: number;
  displayedMark: string;
  maxMark: number;
  commentedMark: string;
  status: boolean;
  redirect: boolean;
  access: boolean;
  mailboxId: string;
  messageId: string;
  markClass: string;
  messageInfo: {
    subject: string;
    dateReceivedDisplayed: string;
    dateReceived: string;
    bounceAddress: string;
    bounceAddressDisplayed: string;
    fromAddress: string;
    fromAddressDisplayed: string;
    replyto: string[];
    replytoDisplayed: string;
  };
  spamAssassin: {
    title: string;
    score: number;
    threshold: number;
    mark: number;
    diplayedMark: number;
    statusClass: string;
    rules: Record<
      string,
      {
        code: string;
        score: number;
        description: string;
        solution: string;
        status: string;
      }
    >;
  };
  signature: {
    subtests: {
      mxRecord: {
        tested: string;
      };
    };
  };
  body: {
    title: string;
    mark: number;
    displayedMark: number;
    status: string;
    statusClass: string;
    description: string;
    messages: string;
    subtests: Record<string, any>;
    content: {
      title: string;
      statusClass: string;
      description: string;
    };
    raw: {
      title: string;
      content: string;
    };
    text: {
      title: string;
      content: string;
    };
    html: {
      title: string;
      content: string;
    };
    imageLess: {
      title: string;
      content: string;
    };
  };
  blacklists: {
    blacklists: Record<
      string,
      {
        name: string;
        url: string;
        dns: string;
        statusCode: number;
        hitMark: number;
        mark: number;
        details: string;
      }
    >;
    title: string;
    mark: number;
    displayedMark: number;
    statusClass: string;
    description: string;
    hits: number;
    timeout: number;
    messages: string;
  };
  links: {
    title: string;
    mark: number;
    displayedMark: string;
    statusClass: string;
    description: string;
    messages: string;
    urls: {
      baseUrl: string;
      statusCode: string;
      httpStatus: string;
    }[];
    brokenLinks: number;
    redirects: number;
    notFound: number;
    timeouts: number;
    imagesWeight: number;
  };
};


export interface IScraperDetails {
  userId: string;
}