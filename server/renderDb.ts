import { Pool } from "pg";
import type { ConversationRequest, OrderStatus } from "../shared/orderFlow";
import type { ExpenseInput, PaymentStatus } from "../shared/finance";
import { defaultSiteSettings, sanitizeSiteSettings, type SiteSettings } from "../shared/siteSettings";

type RenderOrder = ConversationRequest & { reference: string; referralCode: string | null };
export type RenderOrderRecord = RenderOrder & { status: OrderStatus; adminNotes: string | null; orderAmount: number; paymentStatus: PaymentStatus; createdAt: Date; ownerNotifiedAt: Date | null; telegramOpenedAt: Date | null };
export type RenderExpenseRecord = ExpenseInput & { id: number; createdAt: Date; updatedAt: Date };
export type TelegramConversationStage = "welcome" | "collect_name" | "collect_age" | "collect_interest" | "confirm" | "human_mode" | "awaiting_photo";
export type TelegramConversationRecord = {
  chatId: string;
  telegramUserId: string;
  username: string | null;
  firstName: string;
  stage: TelegramConversationStage;
  humanMode: boolean;
  childName: string | null;
  childAge: number | null;
  childInterest: string | null;
  referralCode: string | null;
  orderReference: string | null;
  ownerNotifiedAt: Date | null;
  lastMessageAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

type TelegramConversationPatch = Partial<Omit<TelegramConversationRecord, "chatId" | "createdAt" | "updatedAt">>;

let pool: Pool | null = null;

export function getRenderPool() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured");
  if (!pool) pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined });
  return pool;
}

export async function migrateRenderDatabase() {
  await getRenderPool().query(`CREATE TABLE IF NOT EXISTS conversation_orders (id BIGSERIAL PRIMARY KEY, reference VARCHAR(24) NOT NULL UNIQUE, child_name VARCHAR(80) NOT NULL, child_age INTEGER NOT NULL CHECK (child_age BETWEEN 2 AND 14), child_interest VARCHAR(180) NOT NULL, contact_method VARCHAR(20) NOT NULL CHECK (contact_method IN ('telegram', 'whatsapp', 'phone')), contact_value VARCHAR(120) NOT NULL, privacy_consent BOOLEAN NOT NULL DEFAULT FALSE, referral_code VARCHAR(48), status VARCHAR(40) NOT NULL DEFAULT 'conversation_started', admin_notes VARCHAR(1000), order_amount NUMERIC(12, 2) NOT NULL DEFAULT 0, payment_status VARCHAR(20) NOT NULL DEFAULT 'unpaid', owner_notified_at TIMESTAMPTZ, telegram_opened_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());`);
  await getRenderPool().query("ALTER TABLE conversation_orders ADD COLUMN IF NOT EXISTS admin_notes VARCHAR(1000)");
  await getRenderPool().query("ALTER TABLE conversation_orders ADD COLUMN IF NOT EXISTS referral_code VARCHAR(48)");
  await getRenderPool().query("ALTER TABLE conversation_orders ADD COLUMN IF NOT EXISTS order_amount NUMERIC(12, 2) NOT NULL DEFAULT 0");
  await getRenderPool().query("ALTER TABLE conversation_orders ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) NOT NULL DEFAULT 'unpaid'");
  await getRenderPool().query(`CREATE TABLE IF NOT EXISTS finance_expenses (id BIGSERIAL PRIMARY KEY, description VARCHAR(160) NOT NULL, category VARCHAR(80) NOT NULL, amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0), expense_date DATE NOT NULL, notes VARCHAR(500) NOT NULL DEFAULT '', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());`);
  await getRenderPool().query(`CREATE TABLE IF NOT EXISTS site_settings (setting_key VARCHAR(80) PRIMARY KEY, setting_value TEXT NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());`);
  for (const [key, value] of Object.entries(defaultSiteSettings)) {
    await getRenderPool().query(`INSERT INTO site_settings (setting_key, setting_value) VALUES ($1, $2) ON CONFLICT (setting_key) DO NOTHING`, [key, value]);
  }
  await migrateTelegramBotDatabase();
}

export async function getRenderSiteSettings(): Promise<SiteSettings> {
  const result = await getRenderPool().query<{ settingKey: string; settingValue: string }>(`SELECT setting_key AS "settingKey", setting_value AS "settingValue" FROM site_settings`);
  return sanitizeSiteSettings(Object.fromEntries(result.rows.map(row => [row.settingKey, row.settingValue])));
}

export async function updateRenderSiteSettings(values: Partial<SiteSettings>): Promise<SiteSettings> {
  const settings = sanitizeSiteSettings(values as Record<string, unknown>);
  const client = await getRenderPool().connect();
  try {
    await client.query("BEGIN");
    for (const [key, value] of Object.entries(settings)) {
      await client.query(`INSERT INTO site_settings (setting_key, setting_value, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = NOW()`, [key, value]);
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
  return settings;
}

export async function migrateTelegramBotDatabase() {
  await getRenderPool().query(`CREATE TABLE IF NOT EXISTS telegram_conversations (chat_id VARCHAR(64) PRIMARY KEY, telegram_user_id VARCHAR(64) NOT NULL, username VARCHAR(64), first_name VARCHAR(120) NOT NULL DEFAULT 'زائر', stage VARCHAR(32) NOT NULL DEFAULT 'welcome', human_mode BOOLEAN NOT NULL DEFAULT FALSE, child_name VARCHAR(80), child_age INTEGER, child_interest VARCHAR(180), referral_code VARCHAR(48), order_reference VARCHAR(24), owner_notified_at TIMESTAMPTZ, last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());`);
}

export async function getTelegramConversation(chatId: string): Promise<TelegramConversationRecord | null> {
  const result = await getRenderPool().query<TelegramConversationRecord>(`SELECT chat_id AS "chatId", telegram_user_id AS "telegramUserId", username, first_name AS "firstName", stage, human_mode AS "humanMode", child_name AS "childName", child_age AS "childAge", child_interest AS "childInterest", referral_code AS "referralCode", order_reference AS "orderReference", owner_notified_at AS "ownerNotifiedAt", last_message_at AS "lastMessageAt", created_at AS "createdAt", updated_at AS "updatedAt" FROM telegram_conversations WHERE chat_id = $1`, [chatId]);
  return result.rows[0] ?? null;
}

export async function saveTelegramConversation(chatId: string, patch: TelegramConversationPatch): Promise<TelegramConversationRecord> {
  const current = await getTelegramConversation(chatId);
  const values = {
    telegramUserId: patch.telegramUserId ?? current?.telegramUserId ?? chatId,
    username: patch.username !== undefined ? patch.username : current?.username ?? null,
    firstName: patch.firstName ?? current?.firstName ?? "زائر",
    stage: patch.stage ?? current?.stage ?? "welcome",
    humanMode: patch.humanMode ?? current?.humanMode ?? false,
    childName: patch.childName !== undefined ? patch.childName : current?.childName ?? null,
    childAge: patch.childAge !== undefined ? patch.childAge : current?.childAge ?? null,
    childInterest: patch.childInterest !== undefined ? patch.childInterest : current?.childInterest ?? null,
    referralCode: patch.referralCode !== undefined ? patch.referralCode : current?.referralCode ?? null,
    orderReference: patch.orderReference !== undefined ? patch.orderReference : current?.orderReference ?? null,
    ownerNotifiedAt: patch.ownerNotifiedAt !== undefined ? patch.ownerNotifiedAt : current?.ownerNotifiedAt ?? null,
    lastMessageAt: patch.lastMessageAt ?? current?.lastMessageAt ?? new Date(),
  } satisfies Omit<TelegramConversationRecord, "chatId" | "createdAt" | "updatedAt">;
  const result = await getRenderPool().query<TelegramConversationRecord>(`INSERT INTO telegram_conversations (chat_id, telegram_user_id, username, first_name, stage, human_mode, child_name, child_age, child_interest, referral_code, order_reference, owner_notified_at, last_message_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) ON CONFLICT (chat_id) DO UPDATE SET telegram_user_id = EXCLUDED.telegram_user_id, username = EXCLUDED.username, first_name = EXCLUDED.first_name, stage = EXCLUDED.stage, human_mode = EXCLUDED.human_mode, child_name = EXCLUDED.child_name, child_age = EXCLUDED.child_age, child_interest = EXCLUDED.child_interest, referral_code = EXCLUDED.referral_code, order_reference = EXCLUDED.order_reference, owner_notified_at = EXCLUDED.owner_notified_at, last_message_at = EXCLUDED.last_message_at, updated_at = NOW() RETURNING chat_id AS "chatId", telegram_user_id AS "telegramUserId", username, first_name AS "firstName", stage, human_mode AS "humanMode", child_name AS "childName", child_age AS "childAge", child_interest AS "childInterest", referral_code AS "referralCode", order_reference AS "orderReference", owner_notified_at AS "ownerNotifiedAt", last_message_at AS "lastMessageAt", created_at AS "createdAt", updated_at AS "updatedAt"`, [chatId, values.telegramUserId, values.username, values.firstName, values.stage, values.humanMode, values.childName, values.childAge, values.childInterest, values.referralCode, values.orderReference, values.ownerNotifiedAt, values.lastMessageAt]);
  return result.rows[0];
}

export async function createRenderConversationOrder(order: RenderOrder) {
  await getRenderPool().query(`INSERT INTO conversation_orders (reference, child_name, child_age, child_interest, contact_method, contact_value, privacy_consent, referral_code) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, [order.reference, order.childName, order.childAge, order.childInterest, order.contactMethod, order.contactValue, order.privacyConsent, order.referralCode]);
}
export async function getRenderConversationOrderByReference(reference: string): Promise<RenderOrderRecord | null> {
  const result = await getRenderPool().query<RenderOrderRecord>(`SELECT reference, child_name AS "childName", child_age AS "childAge", child_interest AS "childInterest", contact_method AS "contactMethod", contact_value AS "contactValue", privacy_consent AS "privacyConsent", referral_code AS "referralCode", status, admin_notes AS "adminNotes", COALESCE(order_amount, 0)::float8 AS "orderAmount", COALESCE(payment_status, 'unpaid') AS "paymentStatus", created_at AS "createdAt", owner_notified_at AS "ownerNotifiedAt", telegram_opened_at AS "telegramOpenedAt" FROM conversation_orders WHERE reference = $1`, [reference]);
  return result.rows[0] ?? null;
}

export async function markRenderOwnerNotified(reference: string) { await getRenderPool().query("UPDATE conversation_orders SET owner_notified_at = NOW(), updated_at = NOW() WHERE reference = $1", [reference]); }
export async function markRenderTelegramOpened(reference: string) { await getRenderPool().query("UPDATE conversation_orders SET telegram_opened_at = NOW(), updated_at = NOW() WHERE reference = $1", [reference]); }
export async function listRenderConversationOrders() {
  const result = await getRenderPool().query<RenderOrderRecord>(`SELECT reference, child_name AS "childName", child_age AS "childAge", child_interest AS "childInterest", contact_method AS "contactMethod", contact_value AS "contactValue", privacy_consent AS "privacyConsent", referral_code AS "referralCode", status, admin_notes AS "adminNotes", COALESCE(order_amount, 0)::float8 AS "orderAmount", COALESCE(payment_status, 'unpaid') AS "paymentStatus", created_at AS "createdAt", owner_notified_at AS "ownerNotifiedAt", telegram_opened_at AS "telegramOpenedAt" FROM conversation_orders ORDER BY created_at DESC`);
  return result.rows;
}
export async function updateRenderConversationOrder(reference: string, status: OrderStatus, adminNotes: string, orderAmount: number, paymentStatus: PaymentStatus) { await getRenderPool().query("UPDATE conversation_orders SET status = $2, admin_notes = $3, order_amount = $4, payment_status = $5, updated_at = NOW() WHERE reference = $1", [reference, status, adminNotes.trim() || null, orderAmount, paymentStatus]); }
export async function createRenderExpense(expense: ExpenseInput) { const result = await getRenderPool().query<RenderExpenseRecord>(`INSERT INTO finance_expenses (description, category, amount, expense_date, notes) VALUES ($1, $2, $3, $4, $5) RETURNING id, description, category, amount::float8 AS amount, expense_date::text AS "expenseDate", notes, created_at AS "createdAt", updated_at AS "updatedAt"`, [expense.description, expense.category, expense.amount, expense.expenseDate, expense.notes.trim()]); return result.rows[0]; }
export async function listRenderExpenses(month?: string) { const result = await getRenderPool().query<RenderExpenseRecord>(`SELECT id, description, category, amount::float8 AS amount, expense_date::text AS "expenseDate", notes, created_at AS "createdAt", updated_at AS "updatedAt" FROM finance_expenses ${month ? "WHERE TO_CHAR(expense_date, 'YYYY-MM') = $1" : ""} ORDER BY expense_date DESC, id DESC`, month ? [month] : []); return result.rows; }
export async function deleteRenderExpense(id: number) { await getRenderPool().query("DELETE FROM finance_expenses WHERE id = $1", [id]); }
export async function getRenderMonthlySummary(month: string) {
  const [orders, expenses, categories] = await Promise.all([
    getRenderPool().query<{ orderCount: string; paidOrderCount: string; orderValue: string; collectedRevenue: string }>(`SELECT COUNT(*)::int AS "orderCount", COUNT(*) FILTER (WHERE COALESCE(payment_status, 'unpaid') = 'paid')::int AS "paidOrderCount", COALESCE(SUM(COALESCE(order_amount, 0)), 0)::float8 AS "orderValue", COALESCE(SUM(CASE WHEN COALESCE(payment_status, 'unpaid') = 'paid' THEN COALESCE(order_amount, 0) ELSE 0 END), 0)::float8 AS "collectedRevenue" FROM conversation_orders WHERE TO_CHAR(created_at, 'YYYY-MM') = $1`, [month]),
    getRenderPool().query<{ totalExpenses: string }>(`SELECT COALESCE(SUM(amount), 0)::float8 AS "totalExpenses" FROM finance_expenses WHERE TO_CHAR(expense_date, 'YYYY-MM') = $1`, [month]),
    getRenderPool().query<{ category: string; amount: string }>(`SELECT category, SUM(amount)::float8 AS amount FROM finance_expenses WHERE TO_CHAR(expense_date, 'YYYY-MM') = $1 GROUP BY category ORDER BY amount DESC`, [month]),
  ]);
  const orderSummary = orders.rows[0] ?? { orderCount: 0, paidOrderCount: 0, orderValue: 0, collectedRevenue: 0 };
  const totalExpenses = Number(expenses.rows[0]?.totalExpenses ?? 0); const collectedRevenue = Number(orderSummary.collectedRevenue ?? 0);
  return { month, orderCount: Number(orderSummary.orderCount ?? 0), paidOrderCount: Number(orderSummary.paidOrderCount ?? 0), orderValue: Number(orderSummary.orderValue ?? 0), collectedRevenue, totalExpenses, netProfit: collectedRevenue - totalExpenses, expenseCategories: categories.rows.map(item => ({ category: item.category, amount: Number(item.amount) })) };
}
