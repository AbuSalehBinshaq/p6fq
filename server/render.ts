import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { renderRouter } from "./renderRouter";
import { initializeRenderDatabase } from "./renderStartup";
import { requireDashboardAccess } from "./renderAuth";
import { captureReferralFromRequest, normalizeReferralCode, setReferralCookie } from "./referral";
import { handleTelegramWebhook, initializeTelegramBot } from "./telegramBot";
import { attachRenderStoryPhoto, createRenderStoryOrder, deleteRenderStoryOrder, getRenderShortLink } from "./renderDb";
import { storagePut } from "./storage";
import { nanoid } from "nanoid";
import { storyOrderInputSchema, STORY_PHOTO_MAX_BYTES, STORY_PHOTO_TYPES, isSupportedStoryPhoto, storyPhotoExtension } from "../shared/storyOrders";

const app = express();
const currentDir = dirname(fileURLToPath(import.meta.url));
const staticDir = join(currentDir, "public");
const port = Number(process.env.PORT ?? 10000);

app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(express.json({ limit: "1mb" }));
app.get("/r/:slug", async (req, res) => {
  const link = await getRenderShortLink(req.params.slug);
  if (!link) return res.redirect("/");
  setReferralCookie(res, link.partnerCode);
  const params = new URLSearchParams({ utm_source: link.source, utm_medium: link.source === "google" ? "cpc" : "social", utm_campaign: link.campaign, ...(link.content ? { utm_content: link.content } : {}) });
  return res.redirect(`/?${params.toString()}`);
});
app.get("/partner/:code", (req, res) => {
  const code = normalizeReferralCode(req.params.code);
  if (!code) return res.redirect("/");
  setReferralCookie(res, code);
  const source = typeof req.query.s === "string" ? req.query.s.slice(0, 40) : "";
  const campaign = typeof req.query.c === "string" ? req.query.c.slice(0, 80) : "";
  const content = typeof req.query.a === "string" ? req.query.a.slice(0, 80) : "";
  const params = new URLSearchParams();
  if (source) { params.set("utm_source", source); params.set("utm_medium", source === "google" ? "cpc" : "social"); }
  if (campaign) params.set("utm_campaign", campaign);
  if (content) params.set("utm_content", content);
  return res.redirect(params.toString() ? `/?${params.toString()}` : "/");
});
app.use((req, res, next) => {
  if (req.method === "GET" && req.path !== "/health") captureReferralFromRequest(req, res);
  next();
});
app.get("/health", (_req, res) => res.status(200).json({ status: "ok" }));
app.post("/api/telegram/webhook", handleTelegramWebhook);
app.post("/api/story-orders", async (req, res) => {
  const contentType = String(req.headers["x-story-photo-type"] ?? "");
  const contentLength = Number(req.headers["content-length"] ?? 0);
  if (!STORY_PHOTO_TYPES.includes(contentType as (typeof STORY_PHOTO_TYPES)[number]) || !Number.isSafeInteger(contentLength) || contentLength <= 0 || contentLength > STORY_PHOTO_MAX_BYTES) return res.status(400).json({ message: "الصورة يجب أن تكون JPEG أو PNG أو WebP وبحجم لا يتجاوز 8MB." });
  const decode = (name: string) => { const value = req.headers[name]; if (typeof value !== "string") throw new Error("missing"); return decodeURIComponent(value); };
  let body = Buffer.alloc(0);
  try {
    const chunks: Buffer[] = [];
    for await (const chunk of req) { body = Buffer.concat([body, Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)]); if (body.length > STORY_PHOTO_MAX_BYTES) throw new Error("too_large"); }
    if (body.length !== contentLength || !isSupportedStoryPhoto(contentType, body)) return res.status(400).json({ message: "تعذر التحقق من بنية الصورة." });
    const input = storyOrderInputSchema.parse({ childName: decode("x-story-child-name"), childAge: Number(req.headers["x-story-child-age"]), storyIdea: decode("x-story-idea"), educationalValue: decode("x-story-educational-value"), additionalNotes: decode("x-story-additional-notes"), privacyConsent: req.headers["x-story-privacy-consent"] === "true" });
    const reference = `ST-${nanoid(10).toUpperCase()}`;
    await createRenderStoryOrder({ ...input, reference });
    const extension = storyPhotoExtension(contentType)!;
    try {
      const uploaded = await storagePut(`story-orders/${reference}/${nanoid(24)}.${extension}`, body, contentType);
      await attachRenderStoryPhoto(reference, uploaded.key, contentType, body.length);
    } catch (error) {
      await deleteRenderStoryOrder(reference).catch(() => undefined);
      throw error;
    }
    return res.status(201).json({ reference });
  } catch (error) {
    if (error instanceof Error && error.message === "too_large") return res.status(413).json({ message: "حجم الصورة أكبر من 8MB." });
    if (error instanceof Error && error.name === "ZodError") return res.status(400).json({ message: "راجعي بيانات الطلب ثم حاولي مرة أخرى." });
    console.error("[StoryOrder] creation failed:", error);
    return res.status(500).json({ message: "تعذر إنشاء الطلب الآن. حاولي مرة أخرى بعد قليل." });
  }
});
app.use(["/orders", "/expenses", "/summary"], requireDashboardAccess);
app.use("/api/trpc", createExpressMiddleware({ router: renderRouter, createContext: ({ req, res }) => ({ req, res }) }));
app.get("/robots.txt", (_req, res) => res.sendFile(join(staticDir, "robots.txt")));
app.get("/sitemap.xml", (_req, res) => res.type("application/xml").sendFile(join(staticDir, "sitemap.xml")));
app.use(express.static(staticDir, { maxAge: "1y", immutable: true, index: false }));
app.get("*", (_req, res) => res.sendFile(join(staticDir, "index.html")));

async function startRenderServer() {
  await initializeRenderDatabase();
  await initializeTelegramBot();
  app.listen(port, "0.0.0.0", () => console.log(`[Render] Server listening on port ${port}`));
}

void startRenderServer().catch(error => {
  console.error("[Render] Database migration failed during startup", error);
  process.exit(1);
});
