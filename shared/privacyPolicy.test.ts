import { describe, expect, it } from "vitest";
import { analyticsPrivacyDisclosure, dataWeDoNotCollectOnSite, privacyPolicyMeta } from "./privacyPolicy";

describe("privacy policy commitments", () => {
  it("states clearly that child photos and payment information are not collected on the site", () => {
    expect(dataWeDoNotCollectOnSite.join(" ")).toContain("صورة الطفل");
    expect(dataWeDoNotCollectOnSite.join(" ")).toContain("بطاقة بنكية");
  });

  it("includes a direct route for privacy requests", () => {
    expect(privacyPolicyMeta.contactUrl).toBe("https://t.me/p6_fq");
  });

  it("states that child and contact form details do not go to analytics or recordings", () => {
    expect(analyticsPrivacyDisclosure.detail).toContain("لا نرسل إلى أدوات التحليل");
    expect(analyticsPrivacyDisclosure.detail).toContain("لا تظهر حقول نموذج الطفل");
  });
});
