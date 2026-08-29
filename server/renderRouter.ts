import { initTRPC, TRPCError } from "@trpc/server";
import type { Request } from "express";
import { z } from "zod";
import { nanoid } from "nanoid";
import superjson from "superjson";
import { buildConversationTelegramUrl, conversationRequestSchema, orderStatusValues } from "../shared/orderFlow";
import { createRenderConversationOrder, listRenderConversationOrders, markRenderOwnerNotified, markRenderTelegramOpened, updateRenderConversationOrder } from "./renderDb";
import { hasDashboardAccess } from "./renderAuth";
import { notifyRenderOwner } from "./renderNotify";
import { readReferralCode } from "./referral";

const t = initTRPC.context<{ req: Request }>().create({ transformer: superjson });
const dashboardProcedure = t.procedure.use(({ ctx, next }) => { if (!hasDashboardAccess(ctx.req)) throw new TRPCError({ code: "UNAUTHORIZED" }); return next(); });

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
    markTelegramOpened: t.procedure.input(conversationRequestSchema.pick({}).extend({ reference: conversationRequestSchema.shape.childName.regex(/^BS-[A-Z0-9_-]+$/) })).mutation(async ({ input }) => {
      await markRenderTelegramOpened(input.reference);
      return { success: true } as const;
    }),
    list: dashboardProcedure.query(() => listRenderConversationOrders()),
    update: dashboardProcedure.input(conversationRequestSchema.pick({}).extend({ reference: conversationRequestSchema.shape.childName.regex(/^BS-[A-Z0-9_-]+$/), status: z.enum(orderStatusValues), adminNotes: z.string().trim().max(1000) })).mutation(async ({ input }) => { await updateRenderConversationOrder(input.reference, input.status, input.adminNotes); return { success: true } as const; }),
  }),
});

export type RenderRouter = typeof renderRouter;
