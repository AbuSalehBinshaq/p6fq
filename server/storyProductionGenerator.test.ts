import { describe, expect, it, vi } from "vitest";
import type { InvokeResult } from "./_core/llm";
import { buildStoryGenerationMessages, generateStoryProduction, generateStoryProductionWithOutput, parseGeneratedStoryResponse } from "./storyProductionGenerator";

const input = {
  reference: "ST-ABCDEFGHIJ",
  childName: "ريان",
  childAge: 5,
  storyIdea: "رحلة إلى الفضاء",
  educationalValue: "الشجاعة",
  additionalNotes: "يحب الكواكب",
};

function response(content: string, finish_reason = "stop"): InvokeResult {
  return { id: "mock", created: 0, model: "deepseek-flash", choices: [{ index: 0, message: { role: "assistant", content }, finish_reason }] };
}

function validJson() {
  return JSON.stringify({
    story_brief: { child_name: "ريان", child_age: 5, story_idea: "رحلة إلى الفضاء", educational_value: "الشجاعة", additional_notes: "يحب الكواكب" },
    story_title: "ريان والنجمة الشجاعة",
    character_description: "طفل فضولي يرتدي بدلة فضاء زرقاء ويحمل حقيبة صغيرة.",
    story_text: "ريان قصة جميلة عن الشجاعة. ".repeat(30),
    page_scenes: Array.from({ length: 8 }, (_, index) => ({ page: index + 1, scene: `مشهد الصفحة ${index + 1}` })),
    leonardo_prompts: Array.from({ length: 8 }, (_, index) => ({ page: index + 1, prompt: `مشهد كرتوني دافئ للصفحة ${index + 1}، شخصية طفل متسقة، دون نص أو حروف داخل الصورة` })),
  });
}

describe("story production generation", () => {
  it("sends only the approved text fields and no photo data", () => {
    const messages = buildStoryGenerationMessages(input);
    const prompt = messages[1].content as string;
    expect(prompt).toContain("child_name");
    expect(prompt).toContain("educational_value");
    expect(prompt).not.toContain("photo");
    expect(prompt).not.toContain("storage");
    expect(messages[0].content).toContain("JSON صالحًا فقط");
  });

  it("accepts valid JSON with exactly eight pages", () => {
    const draft = parseGeneratedStoryResponse(input, response(validJson()));
    expect(draft.productionStatus).toBe("review");
    expect(draft.pageScenes).toHaveLength(8);
    expect(draft.leonardoPrompts).toHaveLength(8);
  });

  it("returns raw model output alongside a valid draft for temporary admin display", async () => {
    const rawOutput = validJson();
    const callLLM = vi.fn().mockResolvedValue(response(rawOutput));
    const result = await generateStoryProductionWithOutput(input, callLLM);
    expect(result.rawOutput).toBe(rawOutput);
    expect(result.draft.pageScenes).toHaveLength(8);
  });

  it("joins an array of story paragraphs into the story text", () => {
    const source = JSON.parse(validJson());
    source.story_text = Array.from({ length: 8 }, (_, index) => `فقرة القصة رقم ${index + 1}.`);
    const draft = parseGeneratedStoryResponse(input, response(JSON.stringify(source)));
    expect(draft.storyText).toBe(source.story_text.join("\n\n"));
  });

  it("accepts common camelCase fields and derives the brief from the submitted order", () => {
    const source = JSON.parse(validJson());
    const camelCase = {
      storyTitle: source.story_title,
      characterDescription: source.character_description,
      storyText: source.story_text,
      pageScenes: source.page_scenes.map(({ page, scene }: { page: number; scene: string }) => ({ pageNumber: page, scene })),
      leonardoPrompts: source.leonardo_prompts.map(({ page, prompt }: { page: number; prompt: string }) => ({ pageNumber: page, prompt })),
    };
    const draft = parseGeneratedStoryResponse(input, response(JSON.stringify(camelCase)));
    expect(draft.storyBrief.childName).toBe(input.childName);
    expect(draft.pageScenes).toHaveLength(8);
  });

  it.each([
    ["seven scenes", () => ({ ...JSON.parse(validJson()), page_scenes: JSON.parse(validJson()).page_scenes.slice(0, 7) })],
    ["nine scenes", () => ({ ...JSON.parse(validJson()), page_scenes: [...JSON.parse(validJson()).page_scenes, { page: 9, scene: "زائد" }] })],
    ["wrong page numbering", () => ({ ...JSON.parse(validJson()), page_scenes: JSON.parse(validJson()).page_scenes.map((page: { page: number; scene: string }, index: number) => index === 3 ? { ...page, page: 5 } : page) })],
    ["empty prompt", () => ({ ...JSON.parse(validJson()), leonardo_prompts: JSON.parse(validJson()).leonardo_prompts.map((page: { page: number; prompt: string }, index: number) => index === 2 ? { ...page, prompt: "" } : page) })],
  ])("rejects %s", (_label, build) => {
    expect(() => parseGeneratedStoryResponse(input, response(JSON.stringify(build())))).toThrow();
  });

  it("rejects malformed JSON, incomplete finish reasons, and empty choices", () => {
    expect(() => parseGeneratedStoryResponse(input, response("not json"))).toThrow("malformed JSON");
    expect(() => parseGeneratedStoryResponse(input, response(validJson(), "length"))).toThrow("incomplete");
    expect(() => parseGeneratedStoryResponse(input, { ...response(validJson()), choices: [] })).toThrow("no choices");
  });

  it.each(["DeepSeek API error: 401", "DeepSeek timeout"])("propagates provider errors without saving a partial result (%s)", async errorMessage => {
    const callLLM = vi.fn().mockRejectedValue(new Error(errorMessage));
    await expect(generateStoryProduction(input, callLLM)).rejects.toThrow(errorMessage);
    expect(callLLM).toHaveBeenCalledOnce();
  });
});
