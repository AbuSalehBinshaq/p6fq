import { customAlphabet } from "nanoid";
import { z } from "zod";
import { conversationOrders, orderStatuses } from "../drizzle/schema";
import { buildConversationTelegramUrl, conversationRequestSchema } from "../shared/orderFlow";
import { getDb, createConversationOrder, listConversationOrders, markOrderOwnerNotified, markOrderTelegramOpened, updateConversationOrder } from "./db";
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
    startConversation: publicProcedure.input(conversationRequestSchema).mutation(async ({ input }) => {
      const reference = `BS-${referenceSuffix()}`;
      const order = await createConversationOrder({
        reference,
        childName: input.childName,
        childAge: input.childAge,
        childInterest: input.childInterest,
        contactMethod: input.contactMethod,
        contactValue: input.contactValue,
        privacyConsent: input.privacyConsent,
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
    })).mutation(async ({ input }) => {
      await updateConversationOrder(input.reference, { status: input.status, adminNotes: input.adminNotes });
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
});

export type AppRouter = typeof appRouter;

