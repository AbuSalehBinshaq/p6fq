export const defaultSiteSettings = {
  brandName: "بطل قصتي",
  priceAed: "17",
  pdfPages: "8",
  responseHours: "24",
  telegramHandle: "AtharAe_bot",
  announcement: "بداية لطيفة، بلا التزام · تفاهم شخصي قبل الصورة والدفع · رد خلال 24 ساعة كحد أقصى",
  heroTitle: "مو بس قصة باسم طفلك.",
  heroSubtitle: "هذه ذكرى تقول له: أنت مهم.",
  metaDescription: "قصة عربية مخصصة لطفلك، يصير هو بطلها. تفاهم شخصي، معاينة قبل الدفع، ولا صورة في الموقع.",
  gaMeasurementId: "G-SCDX40T1V2",
  clarityProjectId: "y8v55mr0iy",
} as const;

export type SiteSettings = { [K in keyof typeof defaultSiteSettings]: string };
export type EditableSiteSettings = SiteSettings;

export const siteSettingLabels: Record<keyof SiteSettings, string> = {
  brandName: "اسم العلامة",
  priceAed: "السعر بالدرهم",
  pdfPages: "عدد صفحات PDF",
  responseHours: "مدة الرد بالساعات",
  telegramHandle: "معرّف تيليجرام بدون @",
  announcement: "الشريط العلوي",
  heroTitle: "العنوان الرئيسي",
  heroSubtitle: "الجملة أسفل العنوان",
  metaDescription: "وصف الموقع لمحركات البحث والمشاركة",
  gaMeasurementId: "Google Analytics Measurement ID",
  clarityProjectId: "Microsoft Clarity Project ID",
};

export function withDefaultSiteSettings(values?: Partial<SiteSettings>): SiteSettings {
  return { ...defaultSiteSettings, ...(values ?? {}) };
}

export function sanitizeSiteSettings(input: Record<string, unknown>): SiteSettings {
  const result = { ...defaultSiteSettings } as Record<string, string>;
  for (const key of Object.keys(defaultSiteSettings)) {
    const value = input[key];
    if (typeof value === "string" && value.trim().length <= 1000) result[key] = value.trim();
  }
  return result as SiteSettings;
}
