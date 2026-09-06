import { z } from "zod";

export const paymentStatusLabels = {
  unpaid: "غير مدفوع",
  partial: "مدفوع جزئياً",
  paid: "مدفوع",
} as const;

export const paymentStatusValues = Object.keys(paymentStatusLabels) as [keyof typeof paymentStatusLabels, ...(keyof typeof paymentStatusLabels)[]];
export type PaymentStatus = keyof typeof paymentStatusLabels;

export const expenseCategories = [
  "أدوات وبرامج",
  "تسويق وإعلانات",
  "تصميم وإنتاج",
  "شحن وتوصيل",
  "تشغيل ومصاريف عامة",
  "أخرى",
] as const;

export const expenseInputSchema = z.object({
  description: z.string().trim().min(2, "اكتب وصف المصروف.").max(160),
  category: z.enum(expenseCategories),
  amount: z.number().finite().positive("أدخل مبلغاً أكبر من صفر.").max(999999999),
  expenseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "اختر تاريخاً صحيحاً."),
  notes: z.string().trim().max(500),
});

export type ExpenseInput = z.infer<typeof expenseInputSchema>;

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("ar-AE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value) + " د.إ";
}

export function formatMonthLabel(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  if (!year || !monthNumber) return month;
  return new Intl.DateTimeFormat("ar-AE", { month: "long", year: "numeric" }).format(new Date(year, monthNumber - 1, 1));
}
