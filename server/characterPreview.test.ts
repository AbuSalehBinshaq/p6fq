import { describe, expect, it } from "vitest";
import { buildCharacterPrompt } from "./routers";

describe("character preview prompt", () => {
  it("keeps the child experience gentle and non-photorealistic", () => {
    const prompt = buildCharacterPrompt({ name: "ليان", age: 6, adventure: "رحلة إلى الفضاء" });
    expect(prompt).toContain("ليان");
    expect(prompt).toContain("رحلة إلى الفضاء");
    expect(prompt).toContain("do not create a photorealistic likeness");
    expect(prompt).toContain("no scary elements");
  });
});
