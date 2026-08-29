import { initTRPC, TRPCError } from "@trpc/server";
import type { Request } from "express";
import { z } from "zod";
import { nanoid } from "nanoid";
import superjson from "superjson";
import { buildConversationTelegramUrl, conversationRequestSchema, orderStatusValues } from "../shared/orderFlow";
import { expenseCategories, expenseInputSchema, paymentStatusValues } from "../shared/finance";
import {
  createRenderConversationOrder,
  createRenderExpense,
  deleteRenderExpense,
  getRenderMonthlySummary,
  listRenderConversationOrders,
  listRenderExpenses,
  markRenderOwnerNotified,
  markRenderTelegramOpened,
  updateRenderConversationOrder,
} from "./renderDb";
import { hasDashboardAccess } from "./renderAuth";
import { notifyRenderOwner } from "./renderNotify";
import { readReferralCode } from "./referral";

const t = initTRPC.context<{ req: Request }>().create({ transformer: superjson });
const dashboardProcedure = t.procedure.use(({ ctx, next }) => {
  if (!hasDashboardAccess(ctx.req)) throw new TRPCError({ code: "UNAUTHORIZED" });
  return next();
});

const referenceSchema = z.string().regex(/^BS-[A-Z0-9_-]+$/);
const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
const orderFinancialsSchema = z.object({
  orderAmount: z.number().finite().min(0).max(999999999),
  paymentStatus: z.enum(paymentStatusValues),
});

export const renderRouter = t.router({
  orders: t.router({
    startConversation: t.procedure.input(conversationRequestSchema).mutation(async ({ input, ctx }) => {
      const reference = `BS-${nanoid(7).toUpperCase()}`;
      const referralCode = readReferralCode(ctx.req);

      try {
        await createRenderConversationOrder({ ...input, reference, referralCode });
      } catch (error) {
        console.error("[Order] Failed to save conversation request:", error);
        throw new Error("تعذر حفظ طلبك الآن. جربي مرة أخرى بعد قليل.");
      }

      const notified = await notifyRenderOwner({
        title: `طلب محادثة جديد — ${reference}`,
        content: `الطفل: ${input.childName} (${input.childAge} سنوات)\nالاهتمام: ${input.childInterest}\nوسيلة التواصل: ${input.contactMethod} — ${input.contactValue}\nمصدر الإحالة: ${referralCode ?? "مباشر"}`,
      });
      if (notified) await markRenderOwnerNotified(reference);

      return { reference, telegramUrl: buildConversationTelegramUrl(input, reference) };
    }),
    markTelegramOpened: t.procedure.input(z.object({ reference: referenceSchema })).mutation(async ({ input }) => {
      await markRenderTelegramOpened(input.reference);
      return { success: true } as const;
    }),
    list: dashboardProcedure.query(() => listRenderConversationOrders()),
    update: dashboardProcedure.input(z.object({ reference: referenceSchema, status: z.enum(orderStatusValues), adminNotes: z.string().trim().max(1000), ...orderFinancialsSchema.shape })).mutation(async ({ input }) => {
      await updateRenderConversationOrder(input.reference, input.status, input.adminNotes, input.orderAmount, input.paymentStatus);
      return { success: true } as const;
    }),
  }),
  expenses: t.router({
    list: dashboardProcedure.input(z.object({ month: monthSchema.optional() }).optional()).query(({ input }) => listRenderExpenses(input?.month)),
    create: dashboardProcedure.input(expenseInputSchema).mutation(async ({ input }) => createRenderExpense(input)),
    delete: dashboardProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input }) => {
      await deleteRenderExpense(input.id);
      return { success: true } as const;
    }),
    categories: dashboardProcedure.query(() => expenseCategories),
  }),
  summary: t.router({
    monthly: dashboardProcedure.input(z.object({ month: monthSchema })).query(({ input }) => getRenderMonthlySummary(input.month)),
  }),
});

export type RenderRouter = typeof renderRouter;
