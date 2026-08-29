import { createHmac, timingSafeEqual } from "node:crypto";
import type { Request, Response } from "express";

export const REFERRAL_COOKIE_NAME = "batal_referral";
export const REFERRAL_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const REFERRAL_CODE_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_-]{1,47}$/;

type CookieOptions = {
  secure?: boolean;
};

function getReferralSecret() {
  return process.env.REFERRAL_COOKIE_SECRET ?? process.env.JWT_SECRET ?? process.env.DATABASE_URL ?? "development-only-referral-secret";
}

export function normalizeReferralCode(value: unknown) {
  if (typeof value !== "string") return null;
  const code = value.trim();
  return REFERRAL_CODE_PATTERN.test(code) ? code : null;
}

function sign(code: string) {
  return createHmac("sha256", getReferralSecret()).update(code).digest("base64url");
}

export function buildReferralCookieHeader(code: string, options: CookieOptions = {}) {
  const normalized = normalizeReferralCode(code);
  if (!normalized) throw new Error("Invalid referral code");
  const value = `${normalized}.${sign(normalized)}`;
  const secure = options.secure ?? process.env.NODE_ENV === "production";
  return `${REFERRAL_COOKIE_NAME}=${encodeURIComponent(value)}; Max-Age=${REFERRAL_MAX_AGE_SECONDS}; Path=/; HttpOnly; SameSite=Lax${secure ? "; Secure" : ""}`;
}

export function setReferralCookie(res: Response, code: string, options?: CookieOptions) {
  res.setHeader("Set-Cookie", buildReferralCookieHeader(code, options));
}

function readCookieHeader(header: string | undefined) {
  if (!header) return null;
  const entry = header.split(";").map(value => value.trim()).find(value => value.startsWith(`${REFERRAL_COOKIE_NAME}=`));
  if (!entry) return null;
  try {
    return decodeURIComponent(entry.slice(REFERRAL_COOKIE_NAME.length + 1));
  } catch {
    return null;
  }
}

export function readReferralCode(req: Request) {
  const raw = readCookieHeader(req.headers.cookie);
  if (!raw) return null;
  const separator = raw.lastIndexOf(".");
  if (separator <= 0) return null;
  const code = normalizeReferralCode(raw.slice(0, separator));
  const signature = raw.slice(separator + 1);
  if (!code || !signature) return null;
  const expected = sign(code);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) return null;
  return code;
}

export function captureReferralFromRequest(req: Request, res: Response) {
  const legacyRef = typeof req.query.ref === "string" && !/^BS-[A-Z0-9_-]+$/i.test(req.query.ref) ? req.query.ref : undefined;
  const queryCode = normalizeReferralCode(req.query.partner ?? req.query.referral ?? legacyRef);
  const existingCode = readReferralCode(req);
  if (!queryCode || existingCode) return existingCode;
  setReferralCookie(res, queryCode);
  return queryCode;
}
