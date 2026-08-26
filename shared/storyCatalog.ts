export const storyThemes = [
  { title: "سعيد يجرب لأول مرة", tag: "الشجاعة", age: "3–6 سنوات", description: "قصة عن الخطوات الصغيرة والشجاعة التي تبدأ من تجربة بسيطة.", image: "/assets/story1-page-01.png", tone: "blue", previewImages: ["/assets/story1-page-01.png", "/assets/story1-page-02.png", "/assets/story1-page-03.png"] },
  { title: "صالح والحقيقة الشجاعة", tag: "الصدق", age: "5–8 سنوات", description: "قصة دافئة عن الصدق والاعتراف بالخطأ والشجاعة في قول الحقيقة.", image: "/assets/story2-page-01.png", tone: "peach", previewImages: ["/assets/story2-page-01.png", "/assets/story2-page-02.png", "/assets/story2-page-03.png"] },
  { title: "راشد وكوكب الألوان", tag: "فضاء", age: "6–9 سنوات", description: "رحلة بين النجوم يكتشف فيها أن فضوله هو أقوى أدواته.", image: "/assets/batal-story-pair-2.png", tone: "lavender", previewImages: ["/assets/batal-story-pair-2.png"] },
  { title: "جود ومدينة المرجان", tag: "بحر", age: "7–10 سنوات", description: "مغامرة تحت الماء عن الشجاعة والتعاون وحماية البحر.", image: "/assets/batal-story-pair-3.png", tone: "mint", previewImages: ["/assets/batal-story-pair-3.png"] },
] as const;

export type StoryTheme = (typeof storyThemes)[number];

export function getPreviewSummary(story: StoryTheme) {
  return `معاينة ${story.title} — مناسبة لعمر ${story.age}. تشوفين صفحات من الـPDF قبل الطلب.`;
}
