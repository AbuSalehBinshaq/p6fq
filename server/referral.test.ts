import { beforeEach, describe, expect, it } from "vitest";
import type { Request } from "express";
import { buildReferralCookieHeader, captureReferralFromRequest, readReferralCode } from "./referral";

function request(cookie?: string, query: Record<string, string> = {}) {
  return { headers: cookie ? { cookie } : {}, query } as unknown as Request;
}

describe("referral attribution cookie", () => {
  beforeEach(() => {
    process.env.REFERRAL_COOKIE_SECRET = "test-referral-secret";
    process.env.NODE_ENV = "test";
  });

  it("signs and reads a valid partner code", () => {
    const header = buildReferralCookieHeader("admin_ahmed", { secure: false });
    const cookie = header.split(";", 1)[0];
    expect(readReferralCode(request(cookie))).toBe("admin_ahmed");
  });

  it("rejects a tampered cookie", () => {
    const header = buildReferralCookieHeader("admin_ahmed", { secure: false });
    const cookie = header.replace("admin_ahmed", "admin_other").split(";", 1)[0];
    expect(readReferralCode(request(cookie))).toBeNull();
  });

  it("captures a partner query and does not confuse an order reference with a partner", () => {
    const response = { setHeader: (name: string, value: string) => { response.headers[name] = value; }, headers: {} as Record<string, string> } as unknown as import("express").Response & { headers: Record<string, string> };
    expect(captureReferralFromRequest(request(undefined, { partner: "admin_ahmed" }), response)).toBe("admin_ahmed");
    expect(response.headers["Set-Cookie"]).toContain("batal_referral=");

    const orderResponse = { setHeader: () => undefined } as unknown as import("express").Response;
    expect(captureReferralFromRequest(request(undefined, { ref: "BS-ABC1234" }), orderResponse)).toBeNull();
  });
});
