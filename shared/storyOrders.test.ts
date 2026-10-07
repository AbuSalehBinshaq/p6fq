import { describe, expect, it } from "vitest";
import { isSupportedStoryPhoto, STORY_PHOTO_MAX_BYTES, storyOrderInputSchema, storyOrderReferenceSchema } from "./storyOrders";

const validInput = { childName: "ريان", childAge: 7, storyIdea: "يحب الفضاء", educationalValue: "الشجاعة", additionalNotes: "", privacyConsent: true };

describe("Story order validation", () => {
  it("accepts valid order data", () => {
    expect(storyOrderInputSchema.parse(validInput)).toMatchObject(validInput);
  });

  it("accepts legacy references containing nanoid separators", () => {
    expect(storyOrderReferenceSchema.parse("ST-2LJPMU9DJ-")).toBe("ST-2LJPMU9DJ-");
    expect(storyOrderReferenceSchema.parse("ST-ABC_DEF123")).toBe("ST-ABC_DEF123");
  });

  it("rejects missing consent and oversized text", () => {
    expect(() => storyOrderInputSchema.parse({ ...validInput, privacyConsent: false })).toThrow();
    expect(() => storyOrderInputSchema.parse({ ...validInput, storyIdea: "x".repeat(1201) })).toThrow();
  });

  it("accepts supported image signatures and rejects fake content", () => {
    expect(isSupportedStoryPhoto("image/jpeg", Uint8Array.from([0xff, 0xd8, 0xff, 0xe0]))).toBe(true);
    expect(isSupportedStoryPhoto("image/png", Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]))).toBe(true);
    expect(isSupportedStoryPhoto("image/webp", Uint8Array.from([...new TextEncoder().encode("RIFF"), 0, 0, 0, 0, ...new TextEncoder().encode("WEBP")]))).toBe(true);
    expect(isSupportedStoryPhoto("image/png", new TextEncoder().encode("not-an-image"))).toBe(false);
    expect(STORY_PHOTO_MAX_BYTES).toBe(8 * 1024 * 1024);
  });
});
