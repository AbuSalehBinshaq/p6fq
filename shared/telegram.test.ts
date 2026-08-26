import { describe, expect, it } from "vitest";
import { buildSellerTelegramUrl, SELLER_TELEGRAM_HANDLE, SELLER_TELEGRAM_URL } from "./telegram";

describe("seller Telegram contact", () => {
  it("builds a direct seller chat URL", () => {
    const url = buildSellerTelegramUrl("hello%20there");
    expect(SELLER_TELEGRAM_HANDLE).toBe("p6_fq");
    expect(SELLER_TELEGRAM_URL).toBe("https://t.me/p6_fq");
    expect(url).toBe("https://t.me/p6_fq?text=hello%20there");
  });
});
