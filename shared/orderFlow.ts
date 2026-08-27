import { z } from "zod";

export const SELLER_TELEGRAM_HANDLE = "p6_fq";

export const contactMethodLabels = {
  telegram: "تيليجرام",
  whatsapp: "واتساب",
  phone: "اتصال",
} as const;

export const orderStatusLabels = { conversation_started: "بدأت المحادثة", awaiting_photo: "بانتظار الصورة", preview_in_progress: "المعاينة قيد التجهيز", preview_shared: "أُرسلت المعاينة", awaiting_approval: "بانتظار القرار", approved_for_payment: "جاهز للدفع", paid: "تم الدفع", delivered: "تم التسليم", cancelled: "ملغى" } as const;
export const orderStatusValues = Object.keys(orderStatusLabels) as [keyof typeof orderStatusLabels, ...(keyof typeof orderStatusLabels)[]];
export type OrderStatus = keyof typeof orderStatusLabels;

export const childAgeRanges = [
  { value: 4, label: "3–5 سنوات" },
  { value: 7, label: "6–8 سنوات" },
  { value: 10, label: "9–11 سنة" },
  { value: 13, label: "12–14 سنة" },
] as const;

export function formatChildAgeRange(childAge: number) {
  return childAgeRanges.find(range => range.value === childAge)?.label ?? `${childAge} سنوات`;
}

export const conversationRequestSchema = z.object({
  childName: z.string().trim().min(2, "اكتبي اسم الطفل كما تحبين أن يظهر في قصته.").max(80),
  childAge: z.number().int().min(2, "العمر المتاح يبدأ من سنتين.").max(14, "اكتبي عمراً بين سنتين و14 سنة."),
  childInterest: z.string().trim().min(2, "اكتبي اهتماماً أو فكرة يحبها الطفل.").max(180),
  contactMethod: z.enum(["telegram", "whatsapp", "phone"]),
  contactValue: z.string().trim().min(3, "أضيفي وسيلة تواصل صحيحة.").max(120),
  privacyConsent: z.boolean().refine(value => value, {
    message: "نحتاج موافقتك على حفظ بيانات البداية لبدء المحادثة.",
  }),
});

export type ConversationRequest = z.infer<typeof conversationRequestSchema>;

export function buildConversationTelegramMessage(input: ConversationRequest, reference: string) {
  return [
    "مرحباً، أبغى أبدأ تفاهم بخصوص قصة مخصصة لطفلي.",
    `رقم الطلب: ${reference}`,
    `اسم الطفل: ${input.childName}`,
    `العمر: ${formatChildAgeRange(input.childAge)}`,
    `اهتمامه أو فكرة القصة: ${input.childInterest}`,
    `أفضل وسيلة للتواصل: ${contactMethodLabels[input.contactMethod]} — ${input.contactValue}`,
    "بعد التفاهم المبدئي سأرسل صورة واضحة للطفل هنا داخل تيليجرام.",
  ].join("\n");
}

export function buildConversationTelegramUrl(input: ConversationRequest, reference: string) {
  return `https://t.me/${SELLER_TELEGRAM_HANDLE}?text=${encodeURIComponent(buildConversationTelegramMessage(input, reference))}`;
}
