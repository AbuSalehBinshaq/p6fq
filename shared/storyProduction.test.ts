import { describe, expect, it } from "vitest";
import { storyProductionDraftSchema, validateStoryProduction } from "./storyProduction";

const pages = Array.from({ length: 8 }, (_, index) => ({ pageNumber: index + 1, scene: `مشهد الصفحة ${index + 1}` }));
const prompts = Array.from({ length: 8 }, (_, index) => ({ pageNumber: index + 1, prompt: `Leonardo prompt ${index + 1}` }));

describe("story production validation", () => {
  it("requires exactly eight scenes and eight Leonardo prompts", () => {
    const result = validateStoryProduction({ storyTitle: "رحلة ريان", characterDescription: "طفل فضولي", storyText: "نص قصة طويل ".repeat(40), pageScenes: pages, leonardoPrompts: prompts });
    expect(result.errors).toEqual([]);
    expect(result.pageCount).toBe(8);
  });

  it("returns blocking errors for incomplete production and warnings separately", () => {
    const result = validateStoryProduction({ storyTitle: "", characterDescription: "", storyText: "قصير", pageScenes: [], leonardoPrompts: [] });
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.warnings).toContain("نص القصة قصير وقد يحتاج إلى مراجعة بشرية.");
  });

  it("accepts a draft schema without calling an LLM", () => {
    const parsed = storyProductionDraftSchema.parse({
      reference: "ST-ABCDEFGHIJ",
      storyBrief: { childName: "ريان", childAge: 5, storyIdea: "الفضاء", educationalValue: "الشجاعة", additionalNotes: "", characterDescription: "" },
    });
    expect(parsed.productionStatus).toBe("draft");
    expect(parsed.pageScenes).toHaveLength(0);
  });
});
