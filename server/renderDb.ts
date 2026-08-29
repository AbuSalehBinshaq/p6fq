import { Pool } from "pg";
import type { ConversationRequest, OrderStatus } from "../shared/orderFlow";

type RenderOrder = ConversationRequest & { reference: string; referralCode: string | null };
export type RenderOrderRecord = RenderOrder & { status: OrderStatus; adminNotes: string | null; createdAt: Date; ownerNotifiedAt: Date | null; telegramOpenedAt: Date | null };

let pool: Pool | null = null;

export function getRenderPool() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured");
  }

  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined,
    });
  }

  return pool;
}

export async function migrateRenderDatabase() {
  await getRenderPool().query(`
    CREATE TABLE IF NOT EXISTS conversation_orders (
      id BIGSERIAL PRIMARY KEY,
      reference VARCHAR(24) NOT NULL UNIQUE,
      child_name VARCHAR(80) NOT NULL,
      child_age INTEGER NOT NULL CHECK (child_age BETWEEN 2 AND 14),
      child_interest VARCHAR(180) NOT NULL,
      contact_method VARCHAR(20) NOT NULL CHECK (contact_method IN ('telegram', 'whatsapp', 'phone')),
      contact_value VARCHAR(120) NOT NULL,
      privacy_consent BOOLEAN NOT NULL DEFAULT FALSE,
      referral_code VARCHAR(48),
      status VARCHAR(40) NOT NULL DEFAULT 'conversation_started',
      admin_notes VARCHAR(1000),
      owner_notified_at TIMESTAMPTZ,
      telegram_opened_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await getRenderPool().query("ALTER TABLE conversation_orders ADD COLUMN IF NOT EXISTS admin_notes VARCHAR(1000)");
  await getRenderPool().query("ALTER TABLE conversation_orders ADD COLUMN IF NOT EXISTS referral_code VARCHAR(48)");
}

export async function createRenderConversationOrder(order: RenderOrder) {
  await getRenderPool().query(
    `INSERT INTO conversation_orders
      (reference, child_name, child_age, child_interest, contact_method, contact_value, privacy_consent, referral_code)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [order.reference, order.childName, order.childAge, order.childInterest, order.contactMethod, order.contactValue, order.privacyConsent, order.referralCode],
  );
}

export async function markRenderOwnerNotified(reference: string) {
  await getRenderPool().query(
    "UPDATE conversation_orders SET owner_notified_at = NOW(), updated_at = NOW() WHERE reference = $1",
    [reference],
  );
}

export async function markRenderTelegramOpened(reference: string) {
  await getRenderPool().query(
    "UPDATE conversation_orders SET telegram_opened_at = NOW(), updated_at = NOW() WHERE reference = $1",
    [reference],
  );
}

export async function listRenderConversationOrders() {
  const result = await getRenderPool().query<RenderOrderRecord>(`SELECT reference, child_name AS "childName", child_age AS "childAge", child_interest AS "childInterest", contact_method AS "contactMethod", contact_value AS "contactValue", privacy_consent AS "privacyConsent", referral_code AS "referralCode", status, admin_notes AS "adminNotes", created_at AS "createdAt", owner_notified_at AS "ownerNotifiedAt", telegram_opened_at AS "telegramOpenedAt" FROM conversation_orders ORDER BY created_at DESC`);
  return result.rows;
}

export async function updateRenderConversationOrder(reference: string, status: OrderStatus, adminNotes: string) {
  await getRenderPool().query("UPDATE conversation_orders SET status = $2, admin_notes = $3, updated_at = NOW() WHERE reference = $1", [reference, status, adminNotes.trim() || null]);
}
