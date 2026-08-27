import { initTRPC } from "@trpc/server";
import { nanoid } from "nanoid";
import superjson from "superjson";
import { buildConversationTelegramUrl, conversationRequestSchema } from "../shared/orderFlow";
import { createRenderConversationOrder, markRenderOwnerNotified, markRenderTelegramOpened } from "./renderDb";
import { notifyRenderOwner } from "./renderNotify";

const t = initTRPC.create({ transformer: superjson });

export const renderRouter = t.router({
  orders: t.router({
    startConversation: t.procedure.input(conversationRequestSchema).mutation(async ({ input }) => {
      const reference = `BS-${nanoid(7).toUpperCase()}`;

      try {
        await createRenderConversationOrder({ ...input, reference });
      } catch (error) {
        console.error("[Order] Failed to save conversation request:", error);
        throw new Error("تعذر حفظ طلبك الآن. جربي مرة أخرى بعد قليل.");
      }

      const notified = await notifyRenderOwner({
        title: `طلب محادثة جديد — ${reference}`,
        content: `الطفل: ${input.childName} (${input.childAge} سنوات)\nالاهتمام: ${input.childInterest}\nوسيلة التواصل: ${input.contactMethod} — ${input.contactValue}`,
      });
      if (notified) await markRenderOwnerNotified(reference);

      return { reference, telegramUrl: buildConversationTelegramUrl(input, reference) };
    }),
    markTelegramOpened: t.procedure.input(conversationRequestSchema.pick({}).extend({ reference: conversationRequestSchema.shape.childName.regex(/^BS-[A-Z0-9_-]+$/) })).mutation(async ({ input }) => {
      await markRenderTelegramOpened(input.reference);
      return { success: true } as const;
    }),
  }),
});

export type RenderRouter = typeof renderRouter;
