import { describe, expect, it } from "vitest";
import { buildConversationTelegramMessage, buildConversationTelegramUrl, conversationRequestSchema } from "./orderFlow";

const validRequest = {
  childName: "ريان",
  childAge: 7,
  childInterest: "الفضاء والكواكب",
  contactMethod: "telegram" as const,
  contactValue: "@parent",
  privacyConsent: true as const,
};

describe("conversation request flow", () => {
  it("validates the minimum details needed to start a human conversation", () => {
    expect(conversationRequestSchema.safeParse(validRequest).success).toBe(true);
    expect(conversationRequestSchema.safeParse({ ...validRequest, privacyConsent: false }).success).toBe(false);
    expect(conversationRequestSchema.safeParse({ ...validRequest, childAge: 1 }).success).toBe(false);
  });

  it("builds a transparent Telegram message that asks for the photo inside the chat", () => {
    const message = buildConversationTelegramMessage(validRequest, "BS-ABCDE");
    const url = buildConversationTelegramUrl(validRequest, "BS-ABCDE");
    expect(message).toContain("رقم الطلب: BS-ABCDE");
    expect(message).toContain("العمر: 6–8 سنوات");
    expect(message).toContain("سأرسل صورة واضحة للطفل هنا داخل تيليجرام");
    expect(url).toBe("https://t.me/AtharAe_bot?start=BS-ABCDE");
  });
});
