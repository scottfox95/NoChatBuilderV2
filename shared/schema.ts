import { pgTable, text, serial, integer, boolean, jsonb, timestamp, varchar, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("admin"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  role: true,
});

export const chatbots = pgTable("chatbots", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  slug: text("slug").notNull().unique(),
  systemPrompt: text("system_prompt").notNull(),
  model: text("model").notNull(),
  temperature: integer("temperature").notNull().default(70),
  maxTokens: integer("max_tokens").notNull().default(500),
  ragEnabled: boolean("rag_enabled").notNull().default(true),
  behaviorRules: jsonb("behavior_rules").notNull().default([]),
  fallbackResponse: text("fallback_response"),
  welcomeMessage: text("welcome_message").default("Hello! How can I assist you today?"),
  welcomeMessages: jsonb("welcome_messages").default(["Hello! How can I assist you today?"]),
  suggestedQuestions: text("suggested_questions").array().default([]),
  views: integer("views").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertChatbotSchema = createInsertSchema(chatbots).omit({
  id: true,
  views: true,
  createdAt: true,
  updatedAt: true,
});

export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  chatbotId: integer("chatbot_id").notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(), // pdf, docx, txt
  content: text("content").notNull(),
  size: integer("size").notNull(), // in bytes
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  createdAt: true,
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  chatbotId: integer("chatbot_id").notNull(),
  sessionId: text("session_id").notNull(),
  isUser: boolean("is_user").notNull(),
  content: text("content").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  timestamp: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertChatbot = z.infer<typeof insertChatbotSchema>;
export type Chatbot = typeof chatbots.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documents.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

// Extended schemas with validation
export const loginSchema = insertUserSchema;

export const userChatbotAssignments = pgTable("user_chatbot_assignments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  chatbotId: integer("chatbot_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserChatbotAssignmentSchema = createInsertSchema(userChatbotAssignments).omit({
  id: true,
  createdAt: true,
});

export const behaviorRuleSchema = z.object({
  condition: z.string(),
  response: z.string(),
});

export type BehaviorRule = z.infer<typeof behaviorRuleSchema>;
export type InsertUserChatbotAssignment = z.infer<typeof insertUserChatbotAssignmentSchema>;
export type UserChatbotAssignment = typeof userChatbotAssignments.$inferSelect;
