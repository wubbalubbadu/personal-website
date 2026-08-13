import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const messages = sqliteTable("messages", {
  id: text("id").primaryKey(),
  userText: text("user_text").notNull(),
  assistantText: text("assistant_text").notNull(),
  createdAt: integer("created_at").notNull(),
});

export const proposals = sqliteTable("proposals", {
  id: text("id").primaryKey(),
  messageId: text("message_id").notNull(),
  category: text("category").notNull(),
  title: text("title").notNull(),
  details: text("details"),
  status: text("status").notNull().default("pending"),
  createdAt: integer("created_at").notNull(),
});
