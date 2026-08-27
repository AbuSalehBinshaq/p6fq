import { boolean, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["admin", "user"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const orderStatuses = [
  "conversation_started",
  "awaiting_photo",
  "preview_in_progress",
  "preview_shared",
  "awaiting_approval",
  "approved_for_payment",
  "paid",
  "delivered",
  "cancelled",
] as const;

export const contactMethods = ["telegram", "whatsapp", "phone"] as const;

export const conversationOrders = mysqlTable("conversationOrders", {
  id: int("id").autoincrement().primaryKey(),
  reference: varchar("reference", { length: 24 }).notNull().unique(),
  childName: varchar("childName", { length: 80 }).notNull(),
  childAge: int("childAge").notNull(),
  childInterest: varchar("childInterest", { length: 180 }).notNull(),
  contactMethod: mysqlEnum("contactMethod", contactMethods).notNull(),
  contactValue: varchar("contactValue", { length: 120 }).notNull(),
  privacyConsent: boolean("privacyConsent").notNull().default(false),
  status: mysqlEnum("status", orderStatuses).notNull().default("conversation_started"),
  ownerNotifiedAt: timestamp("ownerNotifiedAt"),
  telegramOpenedAt: timestamp("telegramOpenedAt"),
  adminNotes: text("adminNotes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type ConversationOrder = typeof conversationOrders.$inferSelect;
export type InsertConversationOrder = typeof conversationOrders.$inferInsert;
