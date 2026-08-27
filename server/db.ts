import { desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { conversationOrders, type ConversationOrder, type InsertConversationOrder, type InsertUser, users } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  textFields.forEach(field => {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  });
  values.lastSignedIn = user.lastSignedIn ?? new Date();
  updateSet.lastSignedIn = values.lastSignedIn;
  values.role = user.role ?? (user.openId === ENV.ownerOpenId ? "admin" : "user");
  updateSet.role = values.role;

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function createConversationOrder(order: InsertConversationOrder) {
  const db = await getDb();
  if (!db) throw new Error("تعذر حفظ طلبك الآن. جربي مرة أخرى بعد قليل.");
  await db.insert(conversationOrders).values(order);
  const result = await db.select().from(conversationOrders).where(eq(conversationOrders.reference, order.reference)).limit(1);
  return result[0] as ConversationOrder;
}

export async function markOrderOwnerNotified(reference: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(conversationOrders).set({ ownerNotifiedAt: new Date() }).where(eq(conversationOrders.reference, reference));
}

export async function markOrderTelegramOpened(reference: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(conversationOrders).set({ telegramOpenedAt: new Date() }).where(eq(conversationOrders.reference, reference));
}

export async function listConversationOrders() {
  const db = await getDb();
  if (!db) return [] as ConversationOrder[];
  return db.select().from(conversationOrders).orderBy(desc(conversationOrders.createdAt));
}

export async function updateConversationOrder(reference: string, update: Pick<ConversationOrder, "status" | "adminNotes">) {
  const db = await getDb();
  if (!db) throw new Error("تعذر تحديث الطلب الآن.");
  await db.update(conversationOrders).set(update).where(eq(conversationOrders.reference, reference));
}
