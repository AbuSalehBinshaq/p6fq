import { describe, expect, it } from "vitest";
import { buildOrderMessage, buildOrderTelegramUrl } from "./order";

describe("order submission link", () => {
  it("targets the configured seller and carries the order details", () => {
    const input = { name: "ليان", age: "6", adventure: "رحلة إلى الفضاء", contact: "@parent", hasPreview: true };
    expect(buildOrderMessage(input)).toContain("%D9%84%D9%8A%D8%A7%D9%86");
    expect(buildOrderMessage(input)).toContain("تمت المشاهدة");
    expect(buildOrderTelegramUrl(input)).toContain("https://t.me/p6_fq?text=");
  });
});
