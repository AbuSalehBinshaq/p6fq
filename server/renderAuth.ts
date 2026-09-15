import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

export const ADMIN_SESSION_COOKIE = "athar_admin_session";
function decodeDashboardPassword(header?: string) {
  if (!header?.startsWith("Basic ")) return null;
  try {
    const [username, password] = Buffer.from(header.slice(6), "base64").toString("utf8").split(":");
    return username === "owner" ? password ?? null : null;
  } catch { return null; }
}
function secret() { return process.env.REFERRAL_COOKIE_SECRET ?? process.env.DATABASE_URL ?? "development-admin-secret"; }
function sign(value: string) { return createHmac("sha256", secret()).update(value).digest("base64url"); }
export function buildAdminSessionCookie() { const value = `admin.${sign("admin")}`; return `${ADMIN_SESSION_COOKIE}=${value}; Max-Age=604800; Path=/; HttpOnly; SameSite=Lax${process.env.NODE_ENV === "production" ? "; Secure" : ""}`; }
export function clearAdminSessionCookie() { return `${ADMIN_SESSION_COOKIE}=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax${process.env.NODE_ENV === "production" ? "; Secure" : ""}`; }
function hasSession(request: Pick<Request, "headers">) { const raw = request.headers.cookie?.split(";").map(value => value.trim()).find(value => value.startsWith(`${ADMIN_SESSION_COOKIE}=`))?.slice(ADMIN_SESSION_COOKIE.length + 1); return raw === `admin.${sign("admin")}`; }

export function hasDashboardAccess(request: Pick<Request, "headers">) {
  if (hasSession(request)) return true;
  const expected = process.env.ORDERS_DASHBOARD_PASSWORD;
  const supplied = decodeDashboardPassword(request.headers.authorization);
  if (!expected || !supplied) return false;
  const expectedBuffer = Buffer.from(expected);
  const suppliedBuffer = Buffer.from(supplied);
  return expectedBuffer.length === suppliedBuffer.length && timingSafeEqual(expectedBuffer, suppliedBuffer);
}

export function requireDashboardAccess(req: Request, res: Response, next: NextFunction) {
  if (!process.env.ORDERS_DASHBOARD_PASSWORD) return res.status(503).send("لوحة الإدارة لم تُضبط بعد.");
  if (hasDashboardAccess(req)) return next();
  res.setHeader("WWW-Authenticate", 'Basic realm="Athar Orders", charset="UTF-8"');
  return res.status(401).send("يتطلب هذا المسار تسجيل الدخول.");
}
