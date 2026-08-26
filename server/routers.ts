import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { generateImage } from "./_core/imageGeneration";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

export function buildCharacterPrompt(input: { name: string; age: number; adventure: string }) {
  return `Create a gentle, wholesome children's storybook character inspired by the uploaded child's photo. Preserve only broad, non-sensitive visual traits such as approximate hairstyle, hair color, skin tone, face shape, and cheerful expression; do not create a photorealistic likeness. The character is ${input.name}, age ${input.age}, preparing for a safe imaginative adventure about ${input.adventure}. Use a premium hand-painted gouache and paper-collage style, soft cream background, ink navy, saffron gold, coral and muted teal accents, friendly proportions, warm light, no text, no logo, no watermark, no scary elements, no weapons, no violence, no adult themes. This is a private preview for the parent, not a public portrait.`;
}

const previewInput = z.object({
  name: z.string().trim().min(1).max(40),
  age: z.number().int().min(2).max(14),
  adventure: z.string().trim().min(2).max(160),
  imageDataUrl: z.string().regex(/^data:image\/(png|jpeg|jpg);base64,[A-Za-z0-9+/=]+$/).max(7_000_000),
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  previewCharacter: publicProcedure.input(previewInput).mutation(async ({ input }) => {
    const [, mimeType = "image/jpeg", encoded = ""] = input.imageDataUrl.match(/^data:(image\/\w+);base64,(.+)$/) || [];
    if (!encoded) throw new TRPCError({ code: "BAD_REQUEST", message: "الصورة غير صالحة أو لا يمكن قراءتها." });
    try {
      const result = await generateImage({
        prompt: buildCharacterPrompt(input),
        originalImages: [{ b64Json: encoded, mimeType }],
      });
      if (!result.url) throw new Error("No image URL returned");
      return { url: result.url };
    } catch (error) {
      console.error("[Preview] character generation failed", error);
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "تعذر تجهيز المعاينة الآن. جربي صورة أوضح بعد قليل." });
    }
  }),
});

export type AppRouter = typeof appRouter;
