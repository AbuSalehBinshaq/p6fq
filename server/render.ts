import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { renderRouter } from "./renderRouter";
import { initializeRenderDatabase } from "./renderStartup";

const app = express();
const currentDir = dirname(fileURLToPath(import.meta.url));
const staticDir = join(currentDir, "public");
const port = Number(process.env.PORT ?? 10000);

app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(express.json({ limit: "1mb" }));
app.get("/health", (_req, res) => res.status(200).json({ status: "ok" }));
app.use("/api/trpc", createExpressMiddleware({ router: renderRouter, createContext: () => ({}) }));
app.use(express.static(staticDir, { maxAge: "1y", immutable: true, index: false }));
app.get("*", (_req, res) => res.sendFile(join(staticDir, "index.html")));

async function startRenderServer() {
  await initializeRenderDatabase();
  app.listen(port, "0.0.0.0", () => console.log(`[Render] Server listening on port ${port}`));
}

void startRenderServer().catch(error => {
  console.error("[Render] Database migration failed during startup", error);
  process.exit(1);
});
