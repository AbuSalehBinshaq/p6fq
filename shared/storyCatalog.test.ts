import { describe, expect, it } from "vitest";
import { getPreviewSummary, storyThemes } from "./storyCatalog";

describe("story catalog", () => {
  it("puts the courage story first and uses age ranges", () => {
    expect(storyThemes[0]?.tag).toBe("الشجاعة");
    expect(storyThemes[0]?.age).toBe("3–6 سنوات");
    expect(storyThemes.every((story) => /\d+–\d+ سنوات/.test(story.age))).toBe(true);
  });

  it("provides preview pages for every story card", () => {
    expect(storyThemes.every((story) => story.previewImages.length > 0)).toBe(true);
  });

  it("builds preview text with the story title and age range", () => {
    const summary = getPreviewSummary(storyThemes[0]);
    expect(summary).toContain("سعيد يجرب لأول مرة");
    expect(summary).toContain("3–6 سنوات");
    expect(summary).toContain("PDF");
  });
});
