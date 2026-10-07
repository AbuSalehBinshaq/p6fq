import { invokeLLM, type InvokeResult } from "./_core/llm";
import {
  generatedResponseToDraft,
  storyGenerationResponseSchema,
  validateStoryProduction,
  type StoryProductionDraft,
} from "../shared/storyProduction";

export type StoryGenerationInput = {
  reference: string;
  childName: string;
  childAge: number;
  storyIdea: string;
  educationalValue: string;
  additionalNotes: string;
};

export class StoryOutputValidationError extends Error {
  constructor(message: string, readonly rawOutput: string) {
    super(message);
    this.name = "StoryOutputValidationError";
  }
}

const generationSystemPrompt = `أنت كاتب قصص أطفال عربية محترف. أخرج JSON صالحًا فقط، بدون Markdown أو شرح خارج JSON.

القواعد:
- اكتب بالعربية، واجعل الطفل هو بطل القصة.
- القصة مناسبة لعمر الطفل وممتعة وليست تقريرًا أو إجابة آلية.
- استخدم القيمة التعليمية الوحيدة المقدمة في الطلب كهدف القصة، ولا تضف قيمًا تعليمية أخرى من عندك.
- يجب أن تكون هناك 8 صفحات بالضبط، بأرقام page من 1 إلى 8 دون تكرار أو نقص.
- لكل صفحة scene واضح، ولكل صفحة leonardo prompt بصري مستقل يحافظ على اتساق الشخصية.
- لا تضع اسم الطفل داخل Leonardo prompt حتى لا يظهر الاسم كنص داخل الصورة.
- لا تطلب من Leonardo كتابة أي نص أو حروف داخل الصورة.
- character_description يجب أن يكون واضحًا ومفيدًا لاحقًا لإنشاء الشخصية.
- أعد المفاتيح التالية بالضبط: story_brief, story_title, character_description, story_text, page_scenes, leonardo_prompts.
- story_brief يجب أن يعكس بيانات الطلب النصية.
- أخرج JSON فقط.`;

function contentToText(content: InvokeResult["choices"][number]["message"]["content"]): string {
  if (typeof content === "string") return content;
  return content.map(part => part.type === "text" ? part.text : "").join("\n").trim();
}

export function buildStoryGenerationMessages(input: StoryGenerationInput) {
  return [
    { role: "system" as const, content: generationSystemPrompt },
    {
      role: "user" as const,
      content: JSON.stringify({
        child_name: input.childName,
        child_age: input.childAge,
        story_idea: input.storyIdea,
        educational_value: input.educationalValue,
        additional_notes: input.additionalNotes,
      }),
    },
  ];
}

function firstDefined(record: Record<string, unknown>, ...keys: string[]): unknown {
  for (const key of keys) if (record[key] !== undefined) return record[key];
  return undefined;
}

function normalizeGeneratedJson(value: unknown, input: StoryGenerationInput): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const source = value as Record<string, unknown>;
  const normalizePages = (pages: unknown, textKey: "scene" | "prompt") => {
    if (!Array.isArray(pages)) return pages;
    return pages.map((item, index) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return item;
      const page = item as Record<string, unknown>;
      return {
        page: firstDefined(page, "page", "pageNumber", "page_number") ?? index + 1,
        [textKey]: firstDefined(page, textKey, textKey === "scene" ? "description" : "visual_prompt", textKey === "scene" ? "visual_description" : "leonardoPrompt"),
      };
    });
  };

  // The brief is sourced from the submitted order; requiring the model to echo it
  // in a particular casing needlessly caused otherwise usable generations to fail.
  return {
    story_brief: {
      child_name: input.childName,
      child_age: input.childAge,
      story_idea: input.storyIdea,
      educational_value: input.educationalValue,
      additional_notes: input.additionalNotes,
    },
    story_title: firstDefined(source, "story_title", "storyTitle", "title"),
    character_description: firstDefined(source, "character_description", "characterDescription"),
    story_text: firstDefined(source, "story_text", "storyText"),
    page_scenes: normalizePages(firstDefined(source, "page_scenes", "pageScenes"), "scene"),
    leonardo_prompts: normalizePages(firstDefined(source, "leonardo_prompts", "leonardoPrompts"), "prompt"),
  };
}

function describeSchemaIssues(issues: Array<{ path: PropertyKey[]; message: string }>): string {
  return issues.slice(0, 8).map(issue => `${issue.path.map(String).join(".") || "<root>"}: ${issue.message}`).join("; ");
}

export function parseGeneratedStoryResponse(input: StoryGenerationInput, response: InvokeResult): StoryProductionDraft {
  const choice = response.choices?.[0];
  if (!choice) throw new Error("DeepSeek returned no choices.");
  if (choice.finish_reason !== "stop") throw new Error(`DeepSeek generation was incomplete (finish_reason: ${choice.finish_reason ?? "unknown"}).`);

  const text = contentToText(choice.message.content);
  if (!text) throw new Error("DeepSeek returned empty content.");

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error("DeepSeek returned malformed JSON.");
  }

  const parsed = storyGenerationResponseSchema.safeParse(normalizeGeneratedJson(json, input));
  if (!parsed.success) throw new Error(`DeepSeek response failed story validation: ${describeSchemaIssues(parsed.error.issues)}. Please retry once; if it repeats, check the model output format.`);

  const draft = generatedResponseToDraft(input.reference, parsed.data);
  const validation = validateStoryProduction(draft);
  if (validation.errors.length > 0) throw new Error(`Generated story failed local validation: ${validation.errors.join(" ")}`);
  return draft;
}

export async function generateStoryProductionWithOutput(input: StoryGenerationInput, callLLM: typeof invokeLLM = invokeLLM): Promise<{ draft: StoryProductionDraft; rawOutput: string }> {
  const response = await callLLM({
    messages: buildStoryGenerationMessages(input),
    response_format: { type: "json_object" },
    max_tokens: 12000,
  });
  const rawOutput = contentToText(response.choices?.[0]?.message?.content ?? "");
  try {
    return { draft: parseGeneratedStoryResponse(input, response), rawOutput };
  } catch (error) {
    if (error instanceof Error && rawOutput) throw new StoryOutputValidationError(error.message, rawOutput);
    throw error;
  }
}

export async function generateStoryProduction(input: StoryGenerationInput, callLLM: typeof invokeLLM = invokeLLM): Promise<StoryProductionDraft> {
  return (await generateStoryProductionWithOutput(input, callLLM)).draft;
}
