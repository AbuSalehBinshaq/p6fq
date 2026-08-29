import { describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({ createRenderConversationOrder: vi.fn(), markRenderOwnerNotified: vi.fn(), markRenderTelegramOpened: vi.fn() }));
const notifier = vi.hoisted(() => ({ notifyRenderOwner: vi.fn() }));
const referral = vi.hoisted(() => ({ readReferralCode: vi.fn() }));

vi.mock("./renderDb", () => db);
vi.mock("./renderNotify", () => notifier);
vi.mock("./referral", () => referral);

import { renderRouter } from "./renderRouter";

describe("Render order API", () => {
  it("saves a valid order and generates a Telegram handoff link", async () => {
    db.createRenderConversationOrder.mockResolvedValue(undefined);
    referral.readReferralCode.mockReturnValue("admin_ahmed");
    notifier.notifyRenderOwner.mockResolvedValue(true);
    db.markRenderOwnerNotified.mockResolvedValue(undefined);
    const caller = renderRouter.createCaller({});
    const result = await caller.orders.startConversation({ childName: "ريان", childAge: 4, childInterest: "الفضاء", contactMethod: "telegram", contactValue: "@rayan_parent", privacyConsent: true });
    expect(result.reference).toMatch(/^BS-/);
    expect(result.telegramUrl).toContain("https://t.me/p6_fq?text=");
    expect(db.createRenderConversationOrder).toHaveBeenCalledWith(expect.objectContaining({ reference: expect.stringMatching(/^BS-/), referralCode: "admin_ahmed" }));
  });
});
