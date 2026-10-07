import { z } from "zod";

export const storyOrderStatusLabels = {
  new: "طلب جديد",
  awaiting_payment: "بانتظار تأكيد الدفع",
  paid: "تم التأكيد يدويًا",
  writing: "قيد كتابة القصة",
  character: "قيد إعداد الشخصية",
  illustrations: "قيد تجهيز الرسومات",
  review: "قيد المراجعة",
  ready: "جاهز للتسليم",
  delivered: "تم التسليم",
  cancelled: "ملغى",
} as const;

export const storyOrderStatusValues = Object.keys(storyOrderStatusLabels) as [keyof typeof storyOrderStatusLabels, ...(keyof typeof storyOrderStatusLabels)[]];
export type StoryOrderStatus = keyof typeof storyOrderStatusLabels;

export const storyPaymentStatusLabels = { unpaid: "غير مدفوع", paid: "تم التأكيد يدويًا" } as const;
export type StoryPaymentStatus = keyof typeof storyPaymentStatusLabels;

export const storyOrderInputSchema = z.object({
  childName: z.string().trim().min(2, "اكتبي اسم الطفل.").max(80),
  childAge: z.number().int().min(2, "العمر يبدأ من سنتين.").max(14, "اكتبي عمرًا بين سنتين و14 سنة."),
  storyIdea: z.string().trim().min(2, "اكتبي ما يحبه الطفل أو فكرة القصة.").max(1200),
  educationalValue: z.string().trim().min(2, "اكتبي القيمة أو السلوك المطلوب تعليمه.").max(600),
  additionalNotes: z.string().trim().max(1600).default(""),
  privacyConsent: z.boolean().refine(Boolean, "نحتاج موافقتك على استخدام الصورة لتنفيذ القصة."),
});

export type StoryOrderInput = z.infer<typeof storyOrderInputSchema>;
export const STORY_PHOTO_MAX_BYTES = 8 * 1024 * 1024;
export const STORY_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const STORY_PHOTO_EXTENSIONS = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" } as const;
export const storyOrderReferenceSchema = z.string().regex(/^ST-[A-Z0-9_-]{10}$/);

export function storyPhotoExtension(contentType: string) {
  return STORY_PHOTO_EXTENSIONS[contentType as keyof typeof STORY_PHOTO_EXTENSIONS] ?? null;
}

export function isSupportedStoryPhoto(contentType: string, data: Uint8Array) {
  if (contentType === "image/jpeg") return data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff;
  if (contentType === "image/png") return data.length >= 8 && data.slice(0, 8).every((value, index) => value === [137, 80, 78, 71, 13, 10, 26, 10][index]);
  if (contentType === "image/webp") return data.length >= 12 && new TextDecoder().decode(data.slice(0, 4)) === "RIFF" && new TextDecoder().decode(data.slice(8, 12)) === "WEBP";
  return false;
}

export type StoryOrderRecord = StoryOrderInput & {
  reference: string;
  status: StoryOrderStatus;
  paymentStatus: StoryPaymentStatus;
  photoStorageKey: string | null;
  photoContentType: string | null;
  photoSizeBytes: number | null;
  createdAt: Date;
  updatedAt: Date;
};
