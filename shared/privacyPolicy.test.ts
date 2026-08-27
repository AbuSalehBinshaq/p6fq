import { describe, expect, it } from "vitest";
import { dataWeDoNotCollectOnSite, privacyPolicyMeta } from "./privacyPolicy";

describe("privacy policy commitments", () => {
  it("states clearly that child photos and payment information are not collected on the site", () => {
    expect(dataWeDoNotCollectOnSite.join(" ")).toContain("صورة الطفل");
    expect(dataWeDoNotCollectOnSite.join(" ")).toContain("بطاقة بنكية");
  });

  it("includes a direct route for privacy requests", () => {
    expect(privacyPolicyMeta.contactUrl).toBe("https://t.me/p6_fq");
  });
});
