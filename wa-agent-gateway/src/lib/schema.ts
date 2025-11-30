/**
 * Drizzle ORM schema definitions
 *
 * These schemas mirror the tables in the public schema managed by
 * platform/supabase/migrations. This is read-only from wa-agent-gateway
 * perspective for existing tables, with read/write for conversations and messages.
 */

import {
  pgTable,
  uuid,
  text,
  timestamp,
  date,
  jsonb,
  integer,
  boolean,
  pgEnum,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ============================================
// ENUMS
// ============================================

export const conversationChannelEnum = pgEnum("conversation_channel", [
  "whatsapp",
  "web",
  "app",
]);

export const conversationStatusEnum = pgEnum("conversation_status", [
  "active",
  "ended",
  "archived",
]);

export const messageRoleEnum = pgEnum("message_role", [
  "user",
  "assistant",
  "system",
]);

// ============================================
// EXISTING TABLES (read-only from wa-agent-gateway)
// ============================================

/**
 * Users table - application-level user profiles
 * Managed by platform/ migrations
 */
export const users = pgTable("users", {
  id: uuid("id").primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  birthDate: date("birth_date"),
  pictureUrl: text("picture_url"),
});

/**
 * Patients table - clinical patient entity
 * Managed by platform/ migrations
 */
export const patients = pgTable("patients", {
  id: uuid("id").primaryKey(),
  dni: text("dni").notNull().unique(),
  clinicalProfileJson: jsonb("clinical_profile_json"),
});

// ============================================
// NEW TABLES (managed by wa-agent-gateway)
// ============================================

/**
 * Conversations table - tracks AI chat sessions
 */
export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    threadId: text("thread_id").notNull().unique(),
    patientId: uuid("patient_id").references(() => patients.id, {
      onDelete: "set null",
    }),
    phone: text("phone").notNull(),
    channel: conversationChannelEnum("channel").notNull().default("whatsapp"),
    status: conversationStatusEnum("status").notNull().default("active"),
    actionType: text("action_type").default("chat"),
    agentUsed: text("agent_used"),
    messageCount: integer("message_count").notNull().default(0),
    summary: text("summary"),
    riskLevel: text("risk_level").default("none"),
    riskScore: integer("risk_score").default(0),
    metadata: jsonb("metadata").default({}),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("conversations_thread_id_idx").on(table.threadId),
    index("conversations_patient_id_idx").on(table.patientId),
    index("conversations_phone_idx").on(table.phone),
    index("conversations_status_idx").on(table.status),
  ]
);

/**
 * Messages table - individual messages in conversations
 */
export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    externalId: text("external_id"), // WhatsApp message ID
    role: messageRoleEnum("role").notNull(),
    content: text("content").notNull(),
    agentUsed: text("agent_used"),
    metadata: jsonb("metadata").default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("messages_conversation_id_idx").on(table.conversationId),
    index("messages_created_at_idx").on(table.createdAt),
  ]
);

// ============================================
// RELATIONS
// ============================================

export const usersRelations = relations(users, ({ one }) => ({
  patient: one(patients, {
    fields: [users.id],
    references: [patients.id],
  }),
}));

export const patientsRelations = relations(patients, ({ one, many }) => ({
  user: one(users, {
    fields: [patients.id],
    references: [users.id],
  }),
  conversations: many(conversations),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  patient: one(patients, {
    fields: [conversations.patientId],
    references: [patients.id],
  }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
}));

// ============================================
// TYPE EXPORTS
// ============================================

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Patient = typeof patients.$inferSelect;
export type NewPatient = typeof patients.$inferInsert;

export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;

export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;

