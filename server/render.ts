import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { renderRouter } from "./renderRouter";
import { initializeRenderDatabase } from "./renderStartup";
import { requireDashboardAccess } from "./renderAuth";
import { captureReferralFromRequest, normalizeReferralCode, setReferralCookie } from "./referral";
import { handleTelegramWebhook, initializeTelegramBot } from "./telegramBot";
import { getRenderShortLink } from "./renderDb";

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
app.use(["/orders", "/expenses", "/summary"], requireDashboardAccess);
app.use("/api/trpc", createExpressMiddleware({ router: renderRouter, createContext: ({ req, res }) => ({ req, res }) }));
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
