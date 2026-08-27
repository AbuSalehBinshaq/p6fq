import { timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

function decodeDashboardPassword(header?: string) {
  if (!header?.startsWith("Basic ")) return null;
  try {
    const [username, password] = Buffer.from(header.slice(6), "base64").toString("utf8").split(":");
    return username === "owner" ? password ?? null : null;
  } catch { return null; }
}

export function hasDashboardAccess(request: Pick<Request, "headers">) {
  const expected = process.env.ORDERS_DASHBOARD_PASSWORD;
  const supplied = decodeDashboardPassword(request.headers.authorization);
  if (!expected || !supplied) return false;
  const expectedBuffer = Buffer.from(expected);
  const suppliedBuffer = Buffer.from(supplied);
  return expectedBuffer.length === suppliedBuffer.length && timingSafeEqual(expectedBuffer, suppliedBuffer);
}

export function requireDashboardAccess(req: Request, res: Response, next: NextFunction) {
  if (!process.env.ORDERS_DASHBOARD_PASSWORD) return res.status(503).send("لوحة الطلبات لم تُضبط بعد.");
  if (hasDashboardAccess(req)) return next();
  res.setHeader("WWW-Authenticate", 'Basic realm="Batal Story Orders", charset="UTF-8"');
  return res.status(401).send("يتطلب هذا المسار كلمة مرور.");
}
