import { describe, expect, it } from "vitest";
import { campaignParametersToQuery, hasCampaignParameters, readCampaignParameters } from "./campaignTracking";

describe("readCampaignParameters", () => {
  it("keeps only standard, safe UTM values", () => {
    expect(readCampaignParameters("?utm_source=whatsapp&utm_medium=group&utm_campaign=wa_moms_aug&utm_content=message_a")).toEqual({
      utm_source: "whatsapp",
      utm_medium: "group",
      utm_campaign: "wa_moms_aug",
      utm_content: "message_a",
    });
  });

  it("does not expose form, contact, or unrelated query values to analytics", () => {
    const parameters = readCampaignParameters("?childName=TestChild&contactValue=0500000000&childInterest=space&utm_source=telegram&utm_campaign=family_group");

    expect(parameters).toEqual({ utm_source: "telegram", utm_campaign: "family_group" });
    expect(Object.keys(parameters)).not.toContain("childName");
    expect(Object.keys(parameters)).not.toContain("contactValue");
    expect(Object.keys(parameters)).not.toContain("childInterest");
  });

  it("rejects malformed campaign values", () => {
    expect(readCampaignParameters("?utm_source=whatsapp&utm_campaign=<script>alert(1)</script>")).toEqual({ utm_source: "whatsapp" });
    expect(hasCampaignParameters({})).toBe(false);
  });

  it("serializes only the safe campaign context for the thank-you route", () => {
    const parameters = readCampaignParameters("?utm_source=telegram&contactValue=0500000000&utm_medium=group&utm_campaign=tg_moms_aug");

    expect(campaignParametersToQuery(parameters)).toBe("utm_source=telegram&utm_medium=group&utm_campaign=tg_moms_aug");
  });
});
