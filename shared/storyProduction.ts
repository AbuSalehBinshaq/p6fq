import { z } from "zod";
import { storyOrderReferenceSchema } from "./storyOrders";

export const storyProductionStatusLabels = {
  draft: "مسودة الإنتاج",
  brief_ready: "الـBrief جاهز",
  writing: "قيد كتابة القصة",
  review: "قيد المراجعة البشرية",
  approved: "معتمد للإنتاج اليدوي",
} as const;

export const storyProductionStatusValues = Object.keys(storyProductionStatusLabels) as [
  keyof typeof storyProductionStatusLabels,
  ...(keyof typeof storyProductionStatusLabels)[],
];
export type StoryProductionStatus = keyof typeof storyProductionStatusLabels;

export const storyBriefSchema = z.object({
  childName: z.string().trim().min(2).max(80),
  childAge: z.number().int().min(2).max(14),
  storyIdea: z.string().trim().min(2).max(1200),
  educationalValue: z.string().trim().min(2).max(600),
  additionalNotes: z.string().trim().max(1600).default(""),
  characterDescription: z.string().trim().max(2000).default(""),
});
export type StoryBrief = z.infer<typeof storyBriefSchema>;

export const storySceneSchema = z.object({
  pageNumber: z.number().int().min(1).max(8),
  scene: z.string().trim().max(2000),
});
export const leonardoPromptSchema = z.object({
  pageNumber: z.number().int().min(1).max(8),
  prompt: z.string().trim().max(3000),
});
export type StoryScene = z.infer<typeof storySceneSchema>;
export type LeonardoPrompt = z.infer<typeof leonardoPromptSchema>;

export const storyValidationResultSchema = z.object({
  errors: z.array(z.string().max(500)),
  warnings: z.array(z.string().max(500)),
  pageCount: z.number().int().min(0).max(8),
  checkedAt: z.string().datetime().nullable().default(null),
});
export type StoryValidationResult = z.infer<typeof storyValidationResultSchema>;

export const storyProductionDraftSchema = z.object({
  reference: storyOrderReferenceSchema,
  storyBrief: storyBriefSchema,
  storyTitle: z.string().trim().max(240).default(""),
  characterDescription: z.string().trim().max(2000).default(""),
  storyText: z.string().max(16000).default(""),
  pageScenes: z.array(storySceneSchema).max(8).default([]),
  leonardoPrompts: z.array(leonardoPromptSchema).max(8).default([]),
  productionStatus: z.enum(storyProductionStatusValues).default("draft"),
});
export type StoryProductionDraft = z.infer<typeof storyProductionDraftSchema>;

export const storyGenerationResponseSchema = z.object({
  story_brief: z.object({
    child_name: z.string().trim().min(2).max(80),
    child_age: z.number().int().min(2).max(14),
    story_idea: z.string().trim().min(2).max(1200),
    educational_value: z.string().trim().min(2).max(600),
    additional_notes: z.string().trim().max(1600).default(""),
  }),
  story_title: z.string().trim().min(1).max(240),
  character_description: z.string().trim().min(1).max(2000),
  story_text: z.string().trim().min(1).max(16000),
  page_scenes: z.array(z.object({ page: z.number().int(), scene: z.string().trim().min(1).max(2000) })).length(8),
  leonardo_prompts: z.array(z.object({ page: z.number().int(), prompt: z.string().trim().min(1).max(3000) })).length(8),
});
export type StoryGenerationResponse = z.infer<typeof storyGenerationResponseSchema>;

export function generatedResponseToDraft(reference: string, output: StoryGenerationResponse): StoryProductionDraft {
  return storyProductionDraftSchema.parse({
    reference,
    storyBrief: {
      childName: output.story_brief.child_name,
      childAge: output.story_brief.child_age,
      storyIdea: output.story_brief.story_idea,
      educationalValue: output.story_brief.educational_value,
      additionalNotes: output.story_brief.additional_notes,
      characterDescription: output.character_description,
    },
    storyTitle: output.story_title,
    characterDescription: output.character_description,
    storyText: output.story_text,
    pageScenes: output.page_scenes.map(page => ({ pageNumber: page.page, scene: page.scene })),
    leonardoPrompts: output.leonardo_prompts.map(page => ({ pageNumber: page.page, prompt: page.prompt })),
    productionStatus: "review",
  });
}

export const storyProductionRecordSchema = storyProductionDraftSchema.extend({
  validationResult: storyValidationResultSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type StoryProductionRecord = z.infer<typeof storyProductionRecordSchema>;

export function validateStoryProduction(input: Pick<StoryProductionDraft, "storyTitle" | "characterDescription" | "storyText" | "pageScenes" | "leonardoPrompts">) {
  const errors: string[] = [];
  const warnings: string[] = [];
  const scenes = input.pageScenes;
  const prompts = input.leonardoPrompts;

  if (!input.storyTitle.trim()) errors.push("عنوان القصة مطلوب.");
  if (!input.characterDescription.trim()) errors.push("وصف الشخصية مطلوب.");
  if (!input.storyText.trim()) errors.push("نص القصة مطلوب.");
  if (scenes.length !== 8) errors.push("يجب إدخال مشاهد 8 صفحات بالضبط.");
  if (prompts.length !== 8) errors.push("يجب إدخال Prompts لثماني صفحات بالضبط.");
  if (scenes.some((page, index) => page.pageNumber !== index + 1 || !page.scene.trim())) {
    errors.push("كل صفحة يجب أن تحتوي مشهدًا وبترقيم من 1 إلى 8.");
  }
  if (prompts.some((page, index) => page.pageNumber !== index + 1 || !page.prompt.trim())) {
    errors.push("كل صفحة يجب أن تحتوي Leonardo Prompt وبترقيم من 1 إلى 8.");
  }

  if (input.storyText.trim().length < 240) warnings.push("نص القصة قصير وقد يحتاج إلى مراجعة بشرية.");
  if (input.storyText.split(/\s+/).filter(Boolean).length > 3500) warnings.push("نص القصة طويل وقد يحتاج إلى تقليص قبل التنسيق.");

  return storyValidationResultSchema.parse({
    errors,
    warnings,
    pageCount: Math.max(scenes.length, prompts.length),
    checkedAt: new Date().toISOString(),
  });
}

export function emptyStoryPages() {
  return Array.from({ length: 8 }, (_, index) => ({
    pageNumber: index + 1,
    scene: "",
    prompt: "",
  }));
}
