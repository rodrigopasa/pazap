import { pgTable, text, serial, integer, boolean, timestamp, jsonb, varchar } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("user"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// WhatsApp Sessions table
export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  sessionId: text("session_id").notNull().unique(),
  name: text("name").notNull(),
  phone: text("phone"),
  status: text("status").notNull().default("disconnected"), // connected, disconnected, qr_needed
  qrCode: text("qr_code"),
  sessionData: jsonb("session_data"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastConnected: timestamp("last_connected"),
});

// Messages table
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").references(() => sessions.id).notNull(),
  campaignId: integer("campaign_id").references(() => campaigns.id),
  type: text("type").notNull(), // text, image, document, audio
  content: text("content"),
  mediaUrl: text("media_url"),
  phone: text("phone").notNull(),
  status: text("status").notNull().default("pending"), // pending, sent, delivered, failed, blocked
  scheduledAt: timestamp("scheduled_at"),
  sentAt: timestamp("sent_at"),
  deliveredAt: timestamp("delivered_at"),
  failureReason: text("failure_reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Campaigns table
export const campaigns = pgTable("campaigns", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type").notNull(), // bulk, birthday, scheduled
  status: text("status").notNull().default("draft"), // draft, active, completed, paused
  messageTemplate: text("message_template"),
  mediaUrl: text("media_url"),
  phoneNumbers: text("phone_numbers").array(), // Array of phone numbers for bulk campaigns
  targetCount: integer("target_count").default(0),
  sentCount: integer("sent_count").default(0),
  successCount: integer("success_count").default(0),
  failureCount: integer("failure_count").default(0),
  scheduledAt: timestamp("scheduled_at"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Birthday contacts table
export const birthdays = pgTable("birthdays", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").references(() => campaigns.id),
  phone: text("phone").notNull(),
  name: text("name"),
  birthDate: text("birth_date").notNull(), // MM-DD format
  year: integer("year"), // birth year if available
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Groups table
export const groups = pgTable("groups", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").references(() => sessions.id).notNull(),
  groupId: text("group_id").notNull(), // WhatsApp group ID
  name: text("name").notNull(),
  description: text("description"),
  memberCount: integer("member_count").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Group members table
export const groupMembers = pgTable("group_members", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").references(() => groups.id).notNull(),
  phone: text("phone").notNull(),
  name: text("name"),
  role: text("role").default("member"), // admin, member
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
});

// Contacts table for CSV uploads
export const contacts = pgTable("contacts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  phone: text("phone").notNull(),
  name: text("name"),
  email: text("email"),
  tags: text("tags").array(),
  customFields: jsonb("custom_fields"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Notifications table
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  type: text("type").notNull(), // success, error, warning, info
  title: text("title").notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// System logs table
export const logs = pgTable("logs", {
  id: serial("id").primaryKey(),
  level: text("level").notNull(), // info, warn, error, debug
  source: text("source").notNull(), // session, api, cron, etc
  message: text("message").notNull(),
  metadata: jsonb("metadata"),
  sessionId: integer("session_id").references(() => sessions.id),
  userId: integer("user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// System settings table for configurations
export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  key: text("key").notNull(),
  value: text("value").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  campaigns: many(campaigns),
  contacts: many(contacts),
  notifications: many(notifications),
  logs: many(logs),
}));

export const sessionsRelations = relations(sessions, ({ one, many }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
  messages: many(messages),
  groups: many(groups),
  logs: many(logs),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  session: one(sessions, {
    fields: [messages.sessionId],
    references: [sessions.id],
  }),
  campaign: one(campaigns, {
    fields: [messages.campaignId],
    references: [campaigns.id],
  }),
}));

export const campaignsRelations = relations(campaigns, ({ one, many }) => ({
  user: one(users, {
    fields: [campaigns.userId],
    references: [users.id],
  }),
  messages: many(messages),
  birthdays: many(birthdays),
}));

export const birthdaysRelations = relations(birthdays, ({ one }) => ({
  campaign: one(campaigns, {
    fields: [birthdays.campaignId],
    references: [campaigns.id],
  }),
}));

export const groupsRelations = relations(groups, ({ one, many }) => ({
  session: one(sessions, {
    fields: [groups.sessionId],
    references: [sessions.id],
  }),
  members: many(groupMembers),
}));

export const groupMembersRelations = relations(groupMembers, ({ one }) => ({
  group: one(groups, {
    fields: [groupMembers.groupId],
    references: [groups.id],
  }),
}));

export const contactsRelations = relations(contacts, ({ one }) => ({
  user: one(users, {
    fields: [contacts.userId],
    references: [users.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

export const logsRelations = relations(logs, ({ one }) => ({
  user: one(users, {
    fields: [logs.userId],
    references: [users.id],
  }),
  session: one(sessions, {
    fields: [logs.sessionId],
    references: [sessions.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertSessionSchema = createInsertSchema(sessions).omit({
  id: true,
  createdAt: true,
  lastConnected: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
  sentAt: true,
  deliveredAt: true,
});

export const insertCampaignSchema = createInsertSchema(campaigns).omit({
  id: true,
  createdAt: true,
  startedAt: true,
  completedAt: true,
});

export const insertBirthdaySchema = createInsertSchema(birthdays).omit({
  id: true,
  createdAt: true,
});

export const insertGroupSchema = createInsertSchema(groups).omit({
  id: true,
  createdAt: true,
});

export const insertContactSchema = createInsertSchema(contacts).omit({
  id: true,
  createdAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export const insertSettingSchema = createInsertSchema(settings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Setting = typeof settings.$inferSelect;
export type InsertSetting = z.infer<typeof insertSettingSchema>;

export type Session = typeof sessions.$inferSelect;
export type InsertSession = z.infer<typeof insertSessionSchema>;

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

export type Campaign = typeof campaigns.$inferSelect;
export type InsertCampaign = z.infer<typeof insertCampaignSchema>;

export type Birthday = typeof birthdays.$inferSelect;
export type InsertBirthday = z.infer<typeof insertBirthdaySchema>;

export type Group = typeof groups.$inferSelect;
export type InsertGroup = z.infer<typeof insertGroupSchema>;

export type Contact = typeof contacts.$inferSelect;
export type InsertContact = z.infer<typeof insertContactSchema>;

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

export type Log = typeof logs.$inferSelect;
