import { buildSellerTelegramUrl } from "./telegram";

export function buildOrderMessage(input: { name: string; age: string; adventure: string; contact: string; hasPreview: boolean }) {
  return `مرحباً، أبغى أطلب قصة مخصصة لطفلي%0Aالاسم: ${encodeURIComponent(input.name)}%0Aالعمر: ${encodeURIComponent(input.age)}%0Aالمغامرة: ${encodeURIComponent(input.adventure)}%0Aوسيلة التواصل: ${encodeURIComponent(input.contact || "تيليجرام")}%0Aالمعاينة: ${input.hasPreview ? "تمت المشاهدة" : "لم تُنشأ بعد"}`;
}

export function buildOrderTelegramUrl(input: Parameters<typeof buildOrderMessage>[0]) {
  return buildSellerTelegramUrl(buildOrderMessage(input));
}
