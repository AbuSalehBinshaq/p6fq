import { customAlphabet } from "nanoid";
import { z } from "zod";
import { conversationOrders, orderStatuses } from "../drizzle/schema";
import { buildConversationTelegramUrl, conversationRequestSchema } from "../shared/orderFlow";
import { createConversationOrder, createReferralPartner, getDb, listConversationOrders, listReferralPartners, markOrderOwnerNotified, markOrderTelegramOpened, updateConversationOrder, updateReferralPartner } from "./db";
import { normalizeReferralCode, readReferralCode } from "./referral";
import { getSessionCookieOptions } from "./_core/cookies";
import { notifyOwner } from "./_core/notification";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, publicProcedure, router } from "./_core/trpc";
import { COOKIE_NAME } from "../shared/const";

const referenceSuffix = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 7);
const statusSchema = z.enum(orderStatuses);

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  orders: router({
    startConversation: publicProcedure.input(conversationRequestSchema).mutation(async ({ input, ctx }) => {
      const reference = `BS-${referenceSuffix()}`;
      const referralCode = ctx.req ? (readReferralCode(ctx.req) ?? undefined) : undefined;
      const order = await createConversationOrder({
        reference,
        childName: input.childName,
        childAge: input.childAge,
        childInterest: input.childInterest,
        contactMethod: input.contactMethod,
        contactValue: input.contactValue,
        privacyConsent: input.privacyConsent,
        referralCode,
        status: "conversation_started",
      });

      const notified = await notifyOwner({
        title: `طلب محادثة جديد — ${reference}`,
        content: `طفل: ${input.childName} (${input.childAge} سنوات)\nالاهتمام: ${input.childInterest}\nالتواصل: ${input.contactValue}`,
      }).catch(() => false);
      if (notified) await markOrderOwnerNotified(reference);

      return {
        reference: order.reference,
        telegramUrl: buildConversationTelegramUrl(input, order.reference),
        ownerNotified: notified,
      };
    }),
    markTelegramOpened: publicProcedure.input(z.object({ reference: z.string().regex(/^BS-[A-Z0-9]{7}$/) })).mutation(async ({ input }) => {
      await markOrderTelegramOpened(input.reference);
      return { success: true };
    }),
    list: adminProcedure.query(() => listConversationOrders()),
    update: adminProcedure.input(z.object({
      reference: z.string().regex(/^BS-[A-Z0-9]{7}$/),
      status: statusSchema,
      adminNotes: z.string().max(2000).nullable(),
      referralCode: z.string().max(48).nullable().optional(),
    })).mutation(async ({ input }) => {
      await updateConversationOrder(input.reference, { status: input.status, adminNotes: input.adminNotes, referralCode: input.referralCode ?? null });
      return { success: true };
    }),
    summary: adminProcedure.query(async () => {
      const db = await getDb();
      if (!db) return { total: 0, newRequests: 0 };
      const rows = await db.select().from(conversationOrders);
      return {
        total: rows.length,
        newRequests: rows.filter(order => order.status === "conversation_started").length,
      };
    }),
  }),
  partners: router({
    list: adminProcedure.query(() => listReferralPartners()),
    create: adminProcedure.input(z.object({
      name: z.string().trim().min(1).max(120),
      code: z.string().trim().regex(/^[a-z0-9][a-z0-9-]{2,47}$/i).transform(value => normalizeReferralCode(value)!),
      commissionType: z.enum(["fixed", "percent"]),
      commissionValue: z.string().regex(/^\d+(\.\d{1,2})?$/),
    })).mutation(({ input }) => createReferralPartner({ ...input, active: true })),
    update: adminProcedure.input(z.object({
      id: z.number().int().positive(),
      name: z.string().trim().min(1).max(120).optional(),
      commissionType: z.enum(["fixed", "percent"]).optional(),
      commissionValue: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
      active: z.boolean().optional(),
    })).mutation(({ input }) => {
      const { id, ...changes } = input;
      return updateReferralPartner(id, changes);
    }),
  }),
});

export type AppRouter = typeof appRouter;
