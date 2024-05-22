import {
  varchar,
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  serial,
} from "drizzle-orm/pg-core";
import { sql, relations } from "drizzle-orm";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: varchar("name", { length: 256 }),
  email: text("email").unique(),
  smartleadApiKey: text("smartlead_api_key"),
  createdAt: timestamp("created_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: timestamp("updatedAt"),
});

export const emailAccount = pgTable("email-account", {
  id: serial("id").primaryKey(),
  smartleadId: integer("smartlead_id").notNull(),
  type: varchar("type", { length: 256 }).notNull(),
  isTracked: boolean("is_tracked").default(false),
  email: text("email").notNull(),
  userId: text("user_id")
    .references(() => user.id, { onDelete: "cascade" })
    .notNull(),
});

export const smartleadActiveCampaign = pgTable("smartlead-active-campaign", {
  id: integer("id").unique(),
  emailUsed: text("email_used").notNull(),
  isCompleted: boolean("is_completed").default(false),
  userId: text("user_id")
    .references(() => user.id, { onDelete: "cascade" })
    .notNull(),
});

export const slack = pgTable("slack", {
  id: serial("id").primaryKey(),
  appId: text("app_id").notNull(),
  authedUserId: text("authed_user_id").notNull(),
  slackAccessToken: text("slack_access_token").unique(),
  botUserId: text("bot_user_id").notNull(),
  teamId: text("team_id").notNull(),
  teamName: text("team_name").notNull(),
  incomingWebhook: text("incoming_webhook").notNull(),
  userId: text("user_id")
    .references(() => user.id, { onDelete: "cascade" })
    .notNull(),
});

export const emailTemplate = pgTable("email-template", {
  id: serial("id").primaryKey(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  userId: text("user_id")
    .references(() => user.id, { onDelete: "cascade" })
    .notNull(),
});

export const usersRelations = relations(user, ({ many, one }) => ({
  emailAccounts: many(emailAccount),
  smartleadActiveCampaigns: many(smartleadActiveCampaign),
  slack: one(slack, {
    fields: [user.id],
    references: [slack.userId],
  }),
  emailTemplate: one(emailTemplate),
}));

export const emailAccountRelations = relations(emailAccount, ({ one }) => ({
  user: one(user, {
    fields: [emailAccount.userId],
    references: [user.id],
  }),
}));

export const smartleadActiveCampaignRelations = relations(
  smartleadActiveCampaign,
  ({ one }) => ({
    user: one(user, {
      fields: [smartleadActiveCampaign.userId],
      references: [user.id],
    }),
  })
);

export const slackRelations = relations(slack, ({ one }) => ({
  user: one(user, {
    fields: [slack.userId],
    references: [user.id],
  }),
}));

export const emailTemplateRelations = relations(emailTemplate, ({ one }) => ({
  user: one(user, {
    fields: [emailTemplate.userId],
    references: [user.id],
  }),
}));
