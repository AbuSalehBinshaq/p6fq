import { useRef, useState } from "react";
import { useLocation } from "wouter";
import { ArrowRight, Check, ImagePlus, LockKeyhole, Sparkles } from "lucide-react";
import { childAgeRanges } from "@shared/orderFlow";
import { STORY_PHOTO_MAX_BYTES, STORY_PHOTO_TYPES } from "@shared/storyOrders";

const encode = (value: string) => encodeURIComponent(value);

export default function StoryOrder() {
  const [, setLocation] = useLocation();
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ childName: "", childAge: "", storyIdea: "", educationalValue: "", additionalNotes: "", privacyConsent: false });
  const [photo, setPhoto] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const update = (key: keyof typeof form, value: string | boolean) => setForm(current => ({ ...current, [key]: value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setError("");
    if (!photo) return setError("أضيفي صورة واحدة واضحة للطفل.");
    if (!STORY_PHOTO_TYPES.includes(photo.type as (typeof STORY_PHOTO_TYPES)[number])) return setError("الصورة يجب أن تكون JPEG أو PNG أو WebP.");
    if (photo.size > STORY_PHOTO_MAX_BYTES) return setError("حجم الصورة يجب ألا يتجاوز 8MB.");
    if (!form.privacyConsent) return setError("وافقي على استخدام الصورة لتنفيذ القصة.");
    setSubmitting(true);
    try {
      const response = await fetch("/api/story-orders", { method: "POST", headers: { "Content-Type": "application/octet-stream", "x-story-photo-type": photo.type, "x-story-child-name": encode(form.childName), "x-story-child-age": form.childAge, "x-story-idea": encode(form.storyIdea), "x-story-educational-value": encode(form.educationalValue), "x-story-additional-notes": encode(form.additionalNotes), "x-story-privacy-consent": String(form.privacyConsent) }, body: await photo.arrayBuffer() });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || "تعذر إرسال الطلب.");
      setLocation(`/story-thanks?reference=${encodeURIComponent(result.reference)}`);
    } catch (submitError) { setError(submitError instanceof Error ? submitError.message : "تعذر إرسال الطلب."); }
    finally { setSubmitting(false); }
  };

  return <main dir="rtl" className="story-order-page"><header className="story-order-nav"><button className="story-order-brand" onClick={() => setLocation("/")}><span><Sparkles size={17} /></span> أثر</button><span>طلب قصة أطفال عربية مخصصة</span></header><section className="story-order-shell"><div className="story-order-intro"><span className="section-label">بداية قصة طفلك</span><h1>خلّي طفلك<br /><em>بطل الحكاية.</em></h1><p>أرسلي التفاصيل والصورة في نموذج واحد. نراجع البداية ثم نتواصل معك لتأكيد الخطوة التالية يدويًا.</p><div className="story-order-facts"><span><Check size={15} /> 8 صفحات</span><span><Check size={15} /> 2–3 أيام عمل</span><span><Check size={15} /> مراجعة بسيطة واحدة</span></div></div><form className="story-order-form" onSubmit={submit}><div className="story-form-section"><span className="section-label">بيانات الطفل</span><div className="story-form-grid"><label>اسم الطفل<input required minLength={2} maxLength={80} value={form.childName} onChange={event => update("childName", event.target.value)} placeholder="الاسم الذي تحبين ظهوره في القصة" /></label><label>العمر<select required value={form.childAge} onChange={event => update("childAge", event.target.value)}><option value="">اختاري العمر</option>{childAgeRanges.map(range => <option key={range.value} value={range.value}>{range.label}</option>)}</select></label></div></div><div className="story-form-section"><span className="section-label">فكرة الحكاية</span><label>ما الذي يحبه الطفل أو ما فكرة القصة؟<textarea required minLength={2} maxLength={1200} rows={4} value={form.storyIdea} onChange={event => update("storyIdea", event.target.value)} placeholder="مثال: يحب الفضاء ويتمنى اكتشاف كوكب جديد" /></label><label>ما القيمة أو السلوك الذي تريدين تعليمه؟<textarea required minLength={2} maxLength={600} rows={3} value={form.educationalValue} onChange={event => update("educationalValue", event.target.value)} placeholder="مثال: الشجاعة في تجربة شيء جديد" /></label><label>ملاحظات إضافية <span className="optional-label">اختياري</span><textarea maxLength={1600} rows={3} value={form.additionalNotes} onChange={event => update("additionalNotes", event.target.value)} placeholder="أي تفاصيل تساعدنا على فهم شخصيته أو الجو الذي يحبّه" /></label></div><div className="story-form-section"><span className="section-label">صورة الطفل</span><button type="button" className="photo-dropzone" onClick={() => fileRef.current?.click()}><ImagePlus size={24} /><strong>{photo ? photo.name : "اختاري صورة واحدة واضحة"}</strong><span>JPEG أو PNG أو WebP — حتى 8MB</span></button><input ref={fileRef} className="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp" onChange={event => setPhoto(event.target.files?.[0] ?? null)} /><p className="story-privacy-note"><LockKeyhole size={15} /> الصورة تحفظ مرتبطة بطلبك ولا تظهر للعامة. نستخدمها لتنفيذ القصة فقط.</p></div><label className="story-consent"><input type="checkbox" checked={form.privacyConsent} onChange={event => update("privacyConsent", event.target.checked)} /> أوافق على استخدام صورة الطفل وبيانات الطلب لتنفيذ القصة المخصصة، وفق <a href="/privacy">سياسة الخصوصية</a>.</label>{error && <p className="story-form-error">{error}</p>}<div className="story-submit-row"><button className="primary-button" type="submit" disabled={submitting}>{submitting ? "جاري إرسال الطلب…" : "إرسال طلب القصة"}<ArrowRight size={17} /></button><span>السعر: 23.60 د.إ</span></div></form></section></main>;
}
