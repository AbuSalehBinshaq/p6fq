import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { campaignQueryString, trackCampaignLanding, trackEvent } from "@/lib/analytics";
import { useSiteSettings } from "@/lib/siteSettings";
import { contentImageLoadingProps, heroImageLoadingProps } from "@shared/imageLoading";
import { childAgeRanges, type ConversationRequest } from "@shared/orderFlow";
import { ArrowLeft, Check, ChevronDown, Clock3, Heart, ImagePlus, LockKeyhole, MessageCircle, Quote, Sparkles, Star, X } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";

const ASSETS = {
  hero: "/assets/batal-story-hero.webp",
  saeedOriginal: "/assets/story1-original.webp",
  saeedPages: ["/assets/story1-page-01.webp", "/assets/story1-page-02.webp", "/assets/story1-page-03.webp"],
  salehOriginal: "/assets/story2-original.webp",
  salehPages: ["/assets/story2-page-01.webp", "/assets/story2-page-02.webp", "/assets/story2-page-03.webp"],
};

const offer = { before: 47.2, after: 23.6, durationHours: 48 };

const evidence = [
  { title: "سعيد يجرب لأول مرة", age: "3–6 سنوات", before: ASSETS.saeedOriginal, pages: ASSETS.saeedPages, story: "حكاية هادئة عن الخطوة الصغيرة التي تتحول إلى شجاعة حقيقية." },
  { title: "صالح والحقيقة الشجاعة", age: "5–8 سنوات", before: ASSETS.salehOriginal, pages: ASSETS.salehPages, story: "قصة دافئة عن الصدق والاعتراف بالخطأ والشجاعة." },
];

const testimonials = [
  { quote: "أحببت أني شفت المعاينة قبل الدفع، وكانت الفكرة قريبة من اهتمام طفلي.", name: "أم طفل — نص تجريبي" },
  { quote: "الخطوات كانت واضحة والتواصل شخصي، وهذا أكثر شيء طمّنني.", name: "ولي أمر — نص تجريبي" },
  { quote: "الهدية مختلفة وجميلة، وطفلي فرح لأنه صار بطل القصة.", name: "أم طفلة — نص تجريبي" },
];

const faq = [
  ["ماذا أستلم؟", "ملف PDF عربي مخصص من 8 صفحات، بغلاف يحمل شخصية طفلك وحكاية مناسبة لعمره."],
  ["متى أدفع؟", "تشاهدين المعاينة أولاً، ولا يكون الدفع إلا بعد أن تقتنعي بالنتيجة."],
  ["هل أرسل صورة طفلي هنا؟", "لا. تبدأين ببيانات بسيطة فقط، وترسلين الصورة داخل تيليجرام بعد التفاهم."],
];

const initialForm: ConversationRequest = { childName: "", childAge: 0, childInterest: "", contactMethod: "telegram", contactValue: "", privacyConsent: false };
const countdownKey = "batal-offer-ends-at";

function formatTime(value: number) {
  const total = Math.max(0, value);
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return { days: String(days).padStart(2, "0"), hours: String(hours).padStart(2, "0"), minutes: String(minutes).padStart(2, "0"), seconds: String(seconds).padStart(2, "0") };
}

export default function Home() {
  const settings = useSiteSettings();
  const conversationRef = useRef<HTMLElement>(null);
  const formViewed = useRef(false);
  const formStarted = useRef(false);
  const [form, setForm] = useState<ConversationRequest>(initialForm);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [gallery, setGallery] = useState<(typeof evidence)[number] | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [, setLocation] = useLocation();

  const startConversation = trpc.orders.startConversation.useMutation({
    onSuccess: data => {
      trackEvent("conversation_request_submitted");
      sessionStorage.setItem("batal-conversation", JSON.stringify(data));
      const campaignQuery = campaignQueryString();
      setLocation(`/thanks?order=${encodeURIComponent(data.reference)}${campaignQuery ? `&${campaignQuery}` : ""}`);
    },
  });

  useEffect(() => {
    trackCampaignLanding();
    const section = conversationRef.current;
    if (!section || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !formViewed.current) {
        formViewed.current = true;
        trackEvent("form_view");
        observer.disconnect();
      }
    }, { threshold: 0.35 });
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const stored = window.localStorage.getItem(countdownKey);
    const endsAt = stored ? Number(stored) : Date.now() + offer.durationHours * 60 * 60 * 1000;
    if (!stored) window.localStorage.setItem(countdownKey, String(endsAt));
    const tick = () => setRemaining(Math.max(0, Math.floor((endsAt - Date.now()) / 1000)));
    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, []);

  const scrollToConversation = () => conversationRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); startConversation.mutate(form); };
  const time = formatTime(remaining ?? 0);

  return (
    <main dir="rtl" className="landing-shell">
      <div className="top-strip"><b>عرض الإطلاق لفترة محدودة</b><span>{settings.announcement}</span><span>رد خلال 24 ساعة</span></div>
      <nav className="site-nav page-width" aria-label="التنقل الرئيسي">
        <a href="#top" className="brand"><span className="brand-icon"><Sparkles size={18} /></span><span>بطل قصتي</span></a>
        <div className="nav-links"><a href="#offer">السعر</a><a href="#examples">أمثلة</a><a href="#reviews">آراء العملاء</a><a href="#conversation">ابدئي الآن</a></div>
        <Button className="nav-button" onClick={scrollToConversation}>ابدئي محادثة <ArrowLeft size={16} /></Button>
      </nav>

      <section id="top" className="hero page-width compact-hero">
        <div className="hero-copy">
          <div className="eyebrow"><span>✦</span> قصة عربية مخصصة لطفلك</div>
          <h1>{settings.heroTitle}<br /><em>{settings.heroSubtitle}</em></h1>
          <p className="hero-lede">نحوّل اهتمامه الصغير إلى مغامرة عربية دافئة يكون هو بطلها. نتفاهم معك أولاً، ثم نرسل لك معاينة قبل الدفع.</p>
          <div className="human-promise"><div className="promise-number">01</div><p><b>ما تحتاجين تعرفين أي شيء تقني.</b><br />قولي لنا شو يحب طفلك، ونحن نمشي معك خطوة بخطوة.</p></div>
          <div className="hero-actions"><Button className="primary-button" onClick={scrollToConversation}>خلينا نبدأ قصته <MessageCircle size={19} /></Button><a href="#examples" className="quiet-link"><span>↓</span> شوفي النتيجة</a></div>
          <div className="hero-anchors"><span><Check size={15} /> لا صورة في الموقع</span><span><Check size={15} /> لا دفع الآن</span><span><Check size={15} /> تواصل بشري</span></div>
        </div>
        <div className="hero-visual" aria-label="مثال غلاف قصة مخصصة"><div className="hero-wash" /><img src={ASSETS.hero} alt="مثال غلاف حكاية عربية لطفل" {...heroImageLoadingProps} /><div className="hero-sticker"><small>مو ملف عام</small><b>حكايته هو</b></div><div className="hero-note"><Heart size={16} fill="currentColor" /><span>كل تفصيلة تبدأ<br /><b>من طفلك</b></span></div></div>
      </section>

      <section id="offer" className="offer-section page-width"><div className="offer-card"><div><span className="section-label">عرض الإطلاق الحالي</span><h2>خلي قصته تبدأ اليوم</h2><p>قصة PDF عربية مخصصة من 8 صفحات، مع معاينة قبل الدفع.</p></div><div className="price-block"><span className="old-price">قبل الخصم <s>{offer.before} د.إ</s></span><strong>{offer.after} <small>د.إ</small></strong><span className="save-badge">وفّري {offer.before - offer.after} د.إ</span></div><div className="countdown" aria-live="polite"><span>ينتهي العرض خلال</span><div><b>{time.days}</b><i>يوم</i><b>{time.hours}</b><i>ساعة</i><b>{time.minutes}</b><i>دقيقة</i><b>{time.seconds}</b><i>ثانية</i></div></div><Button className="offer-button" onClick={scrollToConversation}>أبي قصة طفلي <ArrowLeft size={17} /></Button></div><div className="offer-facts" aria-label="بيانات الخدمة"><span><b>8</b> صفحات عربية</span><span><b>24</b> ساعة للرد</span><span><b>0</b> صورة أو دفع في البداية</span><span><b>100%</b> معاينة قبل الدفع</span></div></section>

      <section className="value-section page-width compact-section"><div className="section-heading"><div><span className="section-label">ليش يحبونها الأهل؟</span><h2>تجربة بسيطة،<br /><em>وأثرها كبير.</em></h2></div><p>ما تحتاجين خبرة أو تجهيزات. قولي لنا عن طفلك، ونمشي معك خطوة بخطوة.</p></div><div className="value-grid"><article className="value-card peach"><div className="value-icon"><Star size={22} fill="currentColor" /></div><h3>يشوف نفسه بطلاً</h3><p>اسمه واهتمامه داخل مغامرة كُتبت له وحده.</p></article><article className="value-card mint"><div className="value-icon"><Heart size={22} fill="currentColor" /></div><h3>ذكرى جاهزة للحفظ</h3><p>PDF عربي من 8 صفحات تقرئينه معه وقت النوم.</p></article><article className="value-card gold"><div className="value-icon"><ImagePlus size={22} /></div><h3>معاينة قبل الدفع</h3><p>تشوفين النتيجة أولاً وتقررين براحتك.</p></article></div></section>

      <section id="examples" className="examples-section page-width compact-section"><div className="section-heading"><div><span className="section-label">دليل واضح، مو وعود</span><h2>من طفلك كما هو،<br /><em>إلى بطل في عالمه.</em></h2></div><p>أمثلة حقيقية أُنجزت بموافقة أولياء الأمور. اضغطي لمشاهدة الصفحات.</p></div><div className="evidence-grid">{evidence.map(item => <article className="evidence-card" key={item.title}><div className="evidence-images"><div><span>الصورة الأصلية</span><img src={item.before} alt={`الصورة الأصلية لقصة ${item.title}`} {...contentImageLoadingProps} /></div><strong>←</strong><div><span>من القصة</span><img src={item.pages[0]} alt={`صفحة من قصة ${item.title}`} {...contentImageLoadingProps} /></div></div><div className="evidence-copy"><div><small>{item.age}</small><h3>{item.title}</h3><p>{item.story}</p></div><button onClick={() => setGallery(item)}>شوفي الصفحات <ArrowLeft size={15} /></button></div></article>)}</div></section>

      <section id="reviews" className="reviews-section"><div className="page-width"><div className="section-heading"><div><span className="section-label">آراء العملاء</span><h2>كلامهم عن<br /><em>التجربة.</em></h2></div><p>قسم جاهز لإضافة المراجعات الموثقة من عملائك. النصوص الحالية أمثلة مؤقتة للمراجعة وليست شهادات منشورة.</p></div><div className="reviews-grid">{testimonials.map(item => <article className="review-card" key={item.name}><Quote size={22} /><div className="stars" aria-label="تقييم تجريبي"><Star size={15} fill="currentColor" /><Star size={15} fill="currentColor" /><Star size={15} fill="currentColor" /><Star size={15} fill="currentColor" /><Star size={15} fill="currentColor" /></div><p>“{item.quote}”</p><b>{item.name}</b></article>)}</div></div></section>

      <section className="journey-section compact-journey"><div className="page-width"><div className="journey-heading"><div><span className="section-label">كيف نمشي معك؟</span><h2>أربع خطوات،<br /><em>ولا وحدة معقدة.</em></h2></div><p>نطلب الصورة فقط بعد الاتفاق، ونرسل المعاينة قبل الدفع.</p></div><div className="journey-grid"><article><b>1</b><h3>قولي لنا شو يحب</h3><p>الاسم والعمر واهتمام بسيط.</p></article><article><b>2</b><h3>نتفاهم في تيليجرام</h3><p>نقترح الجو والشخصية المناسبة.</p></article><article><b>3</b><h3>ترسلين الصورة</h3><p>بعد الاتفاق وداخل المحادثة فقط.</p></article><article><b>4</b><h3>تشوفين ثم تقررين</h3><p>الدفع فقط إذا حبيتي النتيجة.</p></article></div></div></section>

      <section ref={conversationRef} id="conversation" className="conversation-section page-width compact-section"><div className="conversation-intro"><span className="section-label">ابدئي بالأسهل</span><h2>قولي لنا عن طفلك.<br /><em>والباقي علينا.</em></h2><p>لن نطلب صورة أو بطاقة أو دفع هنا. املئي البيانات البسيطة، ثم نفتح لك تيليجرام برسالة مرتبة.</p><div className="response-card"><Clock3 size={20} /><div><b>نرد خلال 24 ساعة كحد أقصى</b><span>محادثة مع شخص، مو نظام معقد.</span></div></div><div className="response-card"><LockKeyhole size={20} /><div><b>خصوصية ووضوح</b><span>الصورة تُرسل بعد الاتفاق فقط.</span></div></div></div><div className="conversation-card clarity-mask" data-clarity-mask="true"><form onSubmit={submit} onFocusCapture={() => { if (!formStarted.current) { formStarted.current = true; trackEvent("form_start"); } }} noValidate><div className="form-head"><span>خطوة قصيرة · بدون التزام</span><h3>نبدأ الحكاية من هنا</h3><p>المعلومات تساعدنا نفهم طفلك قبل المحادثة.</p></div><div className="form-row"><label>اسم الطفل<input value={form.childName} onChange={event => setForm({ ...form, childName: event.target.value })} placeholder="اكتبي الاسم" /></label><label>العمر<select value={form.childAge || ""} onChange={event => setForm({ ...form, childAge: Number(event.target.value) })}><option value="">اختاري العمر</option>{childAgeRanges.map(ageRange => <option key={ageRange.value} value={ageRange.value}>{ageRange.label}</option>)}</select></label></div><label>شو يحب طفلك أو شو تتمنين تكون قصته؟<textarea value={form.childInterest} onChange={event => setForm({ ...form, childInterest: event.target.value })} placeholder="مثال: يحب الفضاء" rows={3} /></label><div className="form-row"><label>وسيلة الرد<select value="telegram" disabled><option value="telegram">تيليجرام</option></select></label><label>يوزر تيليجرام<input value={form.contactValue} onChange={event => setForm({ ...form, contactValue: event.target.value })} placeholder="مثال: @yourname" /></label></div><label className="consent-row"><input type="checkbox" checked={form.privacyConsent} onChange={event => setForm({ ...form, privacyConsent: event.target.checked })} /><span>أوافق على <a href="/privacy" target="_blank" rel="noreferrer">سياسة الخصوصية</a> وحفظ بيانات البداية لبدء المحادثة فقط.</span></label>{startConversation.error && <p className="form-error">{startConversation.error.message}</p>}<Button type="submit" className="form-button" disabled={startConversation.isPending}>{startConversation.isPending ? "نرتب رسالتك..." : <>ابدئي محادثة شخصية <MessageCircle size={19} /></>}</Button><p className="form-footnote"><LockKeyhole size={14} /> لا صورة ولا دفع في هذه المرحلة.</p></form></div></section>

      <section className="faq-section page-width compact-section"><span className="section-label">أسئلة سريعة</span><h2>تبين تعرفين أكثر؟</h2><div className="faq-list">{faq.map(([question, answer], index) => <div className={`faq-item ${openFaq === index ? "open" : ""}`} key={question}><button onClick={() => setOpenFaq(openFaq === index ? null : index)}><span>{question}</span><ChevronDown size={19} /></button>{openFaq === index && <p>{answer}</p>}</div>)}</div></section>
      <footer className="site-footer page-width"><span className="brand"><span className="brand-icon"><Sparkles size={15} /></span> بطل قصتي</span><span>قصة دافئة تبدأ بمحادثة بسيطة</span><a href="/privacy">سياسة الخصوصية</a></footer>
      {gallery && <div className="gallery-backdrop" role="presentation" onClick={() => setGallery(null)}><div className="gallery-modal" role="dialog" aria-modal="true" aria-labelledby="gallery-title" onClick={event => event.stopPropagation()}><button className="gallery-close" aria-label="إغلاق المعاينة" onClick={() => setGallery(null)}><X size={21} /></button><span className="section-label">صفحات من القصة</span><h3 id="gallery-title">{gallery.title}</h3><p>{gallery.story}</p><div className="gallery-pages">{gallery.pages.map((page, index) => <img src={page} key={page} alt={`${gallery.title} — صفحة ${index + 1}`} {...contentImageLoadingProps} />)}</div></div></div>}
    </main>
  );
}
