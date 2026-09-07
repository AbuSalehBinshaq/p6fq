import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  createConversationOrder: vi.fn(),
  markOrderOwnerNotified: vi.fn(),
  markOrderTelegramOpened: vi.fn(),
  listConversationOrders: vi.fn(),
  updateConversationOrder: vi.fn(),
  getDb: vi.fn(),
}));
const notifyOwnerMock = vi.hoisted(() => vi.fn());

vi.mock("./db", () => dbMocks);
vi.mock("./_core/notification", () => ({ notifyOwner: notifyOwnerMock }));

import { appRouter } from "./routers";

describe("orders.startConversation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.createConversationOrder.mockImplementation(async order => ({ ...order, id: 1, createdAt: new Date(), updatedAt: new Date(), ownerNotifiedAt: null, telegramOpenedAt: null, adminNotes: null }));
    notifyOwnerMock.mockResolvedValue(true);
    dbMocks.markOrderTelegramOpened.mockResolvedValue(undefined);
  });

  it("saves an initial conversation request and alerts the owner without requesting a child photo", async () => {
    const caller = appRouter.createCaller({ user: null } as never);
    const result = await caller.orders.startConversation({
      childName: "ريان",
      childAge: 6,
      childInterest: "الفضاء والكواكب",
      contactMethod: "telegram",
      contactValue: "@parent",
      privacyConsent: true,
    });

    expect(dbMocks.createConversationOrder).toHaveBeenCalledWith(expect.objectContaining({ childName: "ريان", status: "conversation_started" }));
    expect(notifyOwnerMock).toHaveBeenCalledWith(expect.objectContaining({ title: expect.stringContaining("طلب محادثة جديد") }));
    expect(dbMocks.markOrderOwnerNotified).toHaveBeenCalledWith(result.reference);
    expect(result.telegramUrl).toBe(`https://t.me/AtharAe_bot?start=${result.reference}`);
  });

  it("keeps the conversation request valid when owner notification is temporarily unavailable", async () => {
    notifyOwnerMock.mockResolvedValue(false);
    const caller = appRouter.createCaller({ user: null } as never);
    const result = await caller.orders.startConversation({
      childName: "ليان",
      childAge: 7,
      childInterest: "البحر والأسماك",
      contactMethod: "whatsapp",
      contactValue: "0500000000",
      privacyConsent: true,
    });

    expect(result.ownerNotified).toBe(false);
    expect(dbMocks.createConversationOrder).toHaveBeenCalledTimes(1);
    expect(dbMocks.markOrderOwnerNotified).not.toHaveBeenCalled();
  });

  it("records that the customer opened Telegram using the order reference", async () => {
    const caller = appRouter.createCaller({ user: null } as never);
    await expect(caller.orders.markTelegramOpened({ reference: "BS-ABCDEFG" })).resolves.toEqual({ success: true });
    expect(dbMocks.markOrderTelegramOpened).toHaveBeenCalledWith("BS-ABCDEFG");
  });

  it("does not notify the owner when saving the conversation request fails", async () => {
    dbMocks.createConversationOrder.mockRejectedValue(new Error("تعذر حفظ طلبك الآن."));
    const caller = appRouter.createCaller({ user: null } as never);
    await expect(caller.orders.startConversation({
      childName: "مازن",
      childAge: 5,
      childInterest: "الديناصورات",
      contactMethod: "phone",
      contactValue: "0500000000",
      privacyConsent: true,
    })).rejects.toThrow("تعذر حفظ طلبك الآن.");
    expect(notifyOwnerMock).not.toHaveBeenCalled();
  });
});
