import { initTRPC, TRPCError } from "@trpc/server";
import type { Request } from "express";
import { z } from "zod";
import { nanoid } from "nanoid";
import superjson from "superjson";
import { buildConversationTelegramUrl, conversationRequestSchema, orderStatusValues } from "../shared/orderFlow";
import { expenseCategories, expenseInputSchema, paymentStatusValues } from "../shared/finance";
import {
  createRenderConversationOrder,
  getRenderSiteSettings,
  updateRenderSiteSettings,
  createRenderExpense,
  deleteRenderExpense,
  getRenderMonthlySummary,
  listRenderConversationOrders,
  listRenderExpenses,
  markRenderOwnerNotified,
  markRenderTelegramOpened,
  updateRenderConversationOrder,
  listRenderReferralPartners,
  createRenderReferralPartner,
  updateRenderReferralPartner,
  createRenderShortLink,
  listRenderShortLinks,
  listRenderStoryOrders,
  getRenderStoryOrder,
  updateRenderStoryOrderStatus,
  getRenderStoryProduction,
  upsertRenderStoryProduction,
} from "./renderDb";
import { buildAdminSessionCookie, clearAdminSessionCookie, hasDashboardAccess } from "./renderAuth";
import { notifyRenderOwner } from "./renderNotify";
import { sendTelegramReply } from "./telegramBot";
import { readReferralCode } from "./referral";
import { defaultSiteSettings, type SiteSettings } from "../shared/siteSettings";
import { storyOrderReferenceSchema, storyOrderStatusValues, storyPaymentStatusLabels, type StoryPaymentStatus } from "../shared/storyOrders";
import { storyProductionDraftSchema } from "../shared/storyProduction";
import { storageGetSignedUrl } from "./storage";
import { generateStoryProductionWithOutput, StoryOutputValidationError } from "./storyProductionGenerator";

const t = initTRPC.context<{ req: Request; res?: import("express").Response }>().create({ transformer: superjson });
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
const siteSettingsSchema = z.object({
  brandName: z.string().max(1000),
  priceAed: z.string().max(1000),
  pdfPages: z.string().max(1000),
  deliveryDays: z.string().max(1000),
  revisionCount: z.string().max(1000),
  productName: z.string().max(1000),
  productDescription: z.string().max(1000),
  responseHours: z.string().max(1000),
  telegramHandle: z.string().max(1000),
  announcement: z.string().max(1000),
  heroTitle: z.string().max(1000),
  heroSubtitle: z.string().max(1000),
  metaDescription: z.string().max(1000),
  gaMeasurementId: z.string().max(1000),
  clarityProjectId: z.string().max(1000),
});

export const renderRouter = t.router({
  auth: t.router({
    status: t.procedure.query(({ ctx }) => ({ authenticated: hasDashboardAccess(ctx.req) })),
    login: t.procedure.input(z.object({ password: z.string().min(1).max(200) })).mutation(({ input, ctx }) => {
      if (!process.env.ORDERS_DASHBOARD_PASSWORD || input.password !== process.env.ORDERS_DASHBOARD_PASSWORD) throw new TRPCError({ code: "UNAUTHORIZED", message: "كلمة المرور غير صحيحة." });
      ctx.res?.setHeader("Set-Cookie", buildAdminSessionCookie());
      return { success: true } as const;
    }),
    logout: t.procedure.mutation(({ ctx }) => { ctx.res?.setHeader("Set-Cookie", clearAdminSessionCookie()); return { success: true } as const; }),
  }),
  site: t.router({
    settings: t.procedure.query(() => getRenderSiteSettings()),
  }),
  settings: t.router({
    get: dashboardProcedure.query(() => getRenderSiteSettings()),
    defaults: dashboardProcedure.query(() => defaultSiteSettings),
    update: dashboardProcedure.input(siteSettingsSchema).mutation(({ input }) => updateRenderSiteSettings(input as SiteSettings)),
  }),
  storyOrders: t.router({
    list: dashboardProcedure.query(() => listRenderStoryOrders()),
    get: dashboardProcedure.input(z.object({ reference: storyOrderReferenceSchema })).query(({ input }) => getRenderStoryOrder(input.reference)),
    updateStatus: dashboardProcedure.input(z.object({ reference: storyOrderReferenceSchema, status: z.enum(storyOrderStatusValues), paymentStatus: z.enum(Object.keys(storyPaymentStatusLabels) as [StoryPaymentStatus, StoryPaymentStatus]) })).mutation(({ input }) => updateRenderStoryOrderStatus(input.reference, input.status, input.paymentStatus)),
    photoUrl: dashboardProcedure.input(z.object({ reference: storyOrderReferenceSchema })).query(async ({ input }) => {
      const order = await getRenderStoryOrder(input.reference);
      if (!order?.photoStorageKey) throw new TRPCError({ code: "NOT_FOUND" });
      return { url: await storageGetSignedUrl(order.photoStorageKey) };
    }),
    production: dashboardProcedure.input(z.object({ reference: storyOrderReferenceSchema })).query(({ input }) => getRenderStoryProduction(input.reference)),
    saveProduction: dashboardProcedure.input(storyProductionDraftSchema).mutation(({ input }) => upsertRenderStoryProduction(input)),
  }),
  storyProductions: t.router({
    generate: dashboardProcedure.input(z.object({ reference: storyOrderReferenceSchema, confirmed: z.literal(true) })).mutation(async ({ input }) => {
      const order = await getRenderStoryOrder(input.reference);
      if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "لم يتم العثور على طلب القصة." });
      try {
        const { draft, rawOutput } = await generateStoryProductionWithOutput({
          reference: order.reference,
          childName: order.childName,
          childAge: order.childAge,
          storyIdea: order.storyIdea,
          educationalValue: order.educationalValue,
          additionalNotes: order.additionalNotes,
        });
        const production = await upsertRenderStoryProduction(draft);
        return { success: true as const, rawOutput, production };
      } catch (error) {
        if (error instanceof StoryOutputValidationError) return { success: false as const, rawOutput: error.rawOutput, error: error.message };
        throw error;
      }
    }),
  }),
  telegram: t.router({
    sendReply: dashboardProcedure.input(z.object({ chatId: z.string().regex(/^\d+$/), message: z.string().trim().min(1).max(4000) })).mutation(async ({ input }) => {
      await sendTelegramReply(input.chatId, input.message);
      return { success: true } as const;
    }),
  }),
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
  partners: t.router({
    list: dashboardProcedure.query(() => listRenderReferralPartners()),
    create: dashboardProcedure.input(z.object({ name: z.string().trim().min(1).max(120), commissionType: z.enum(["fixed", "percent"]), commissionValue: z.string().regex(/^\d+(\.\d{1,2})?$/) })).mutation(async ({ input }) => {
      const partner = await createRenderReferralPartner({ ...input, code: `p-${nanoid(8).toLowerCase()}` });
      const shortLink = await createRenderShortLink({ slug: nanoid(7), partnerCode: partner.code, source: "telegram", campaign: "telegram_campaign", content: "default" });
      return { partner, shortLink };
    }),
    update: dashboardProcedure.input(z.object({ id: z.number().int().positive(), name: z.string().trim().min(1).max(120).optional(), commissionType: z.enum(["fixed", "percent"]).optional(), commissionValue: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(), active: z.boolean().optional() })).mutation(({ input }) => { const { id, ...changes } = input; return updateRenderReferralPartner(id, changes); }),
  }),
  shortLinks: t.router({
    list: dashboardProcedure.query(() => listRenderShortLinks()),
    create: dashboardProcedure.input(z.object({ partnerCode: z.string().min(2).max(48), source: z.string().trim().min(1).max(60), campaign: z.string().trim().min(1).max(120), content: z.string().trim().max(120).default("") })).mutation(({ input }) => createRenderShortLink({ ...input, slug: nanoid(7) })),
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
