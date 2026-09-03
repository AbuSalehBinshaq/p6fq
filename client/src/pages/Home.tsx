import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { campaignQueryString, trackCampaignLanding, trackEvent } from "@/lib/analytics";
import { contentImageLoadingProps, heroImageLoadingProps } from "@shared/imageLoading";
import { childAgeRanges, type ConversationRequest } from "@shared/orderFlow";
import { supportedPaymentMethods } from "@shared/paymentMethods";
import { ArrowLeft, Check, ChevronDown, Clock3, Heart, ImagePlus, LockKeyhole, MessageCircle, Phone, Quote, Sparkles, Star, UserRound, X } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";

const ASSETS = {
  hero: "/assets/batal-story-hero.png",
  saeedOriginal: "/assets/story1-original.jpeg",
  saeedPage1: "/assets/story1-page-01.png",
  saeedPage2: "/assets/story1-page-02.png",
  saeedPage3: "/assets/story1-page-03.png",
  salehOriginal: "/assets/story2-original.jpg",
  salehPage1: "/assets/story2-page-01.png",
  salehPage2: "/assets/story2-page-02.png",
  salehPage3: "/assets/story2-page-03.png",
  ahmadOriginal: "/assets/ahmad-original.jpeg",
  ahmadPage1: "/assets/ahmad-page-1.png",
  ahmadPage2: "/assets/ahmad-page-2.png",
  ahmadPage3: "/assets/ahmad-page-3.png",
  pair1: "/assets/batal-story-pair-1.png",
  pair2: "/assets/batal-story-pair-2.png",
  pair3: "/assets/batal-story-pair-3.png",
};

const evidence = [
  {
    title: "سعيد يجرب لأول مرة",
    age: "3–6 سنوات",
    before: ASSETS.saeedOriginal,
    pages: [ASSETS.saeedPage1, ASSETS.saeedPage2, ASSETS.saeedPage3],
    story: "حكاية هادئة عن الخطوة الصغيرة التي تتحول إلى شجاعة حقيقية.",
  },
  {
    title: "صالح والحقيقة الشجاعة",
    age: "5–8 سنوات",
    before: ASSETS.salehOriginal,
    pages: [ASSETS.salehPage1, ASSETS.salehPage2, ASSETS.salehPage3],
    story: "قصة دافئة عن الصدق، والاعتراف بالخطأ، وأن الشجاعة قد تبدأ بكلمة بسيطة.",
  },
];

const faq = [
  ["هل أحتاج أعرف في التقنية أو أرفع شيء هنا؟", "أبداً. ارسلي لنا فكرة طفلك ووسيلة التواصل فقط. بعد أن نتفاهم معك شخصياً داخل تيليجرام، نطلب الصورة بوضوح داخل المحادثة."],
  ["ماذا أستلم في النهاية؟", "تستلمين ملف PDF عربي مخصص من 8 صفحات: غلاف يحمل شخصية طفلك، وحكاية مناسبة لعمره، وصفحات جاهزة للقراءة معه أو الاحتفاظ بها ومشاركتها مع العائلة."],
  ["كم السعر ومتى أدفع؟", "سعر الإطلاق الحالي يبدأ من 17 د.إ للملف المخصص من 8 صفحات. إذا احتاجت الفكرة شيئاً إضافياً نوضح السعر لك قبل أي خطوة. الدفع لا يكون إلا بعد أن ترين المعاينة وتقتنعين بها."],
  ["هل أستطيع طلب تعديل؟", "نتفاهم على التفاصيل قبل العمل، ثم ترين المعاينة قبل الدفع. إذا احتاجت القصة تعديلاً بسيطاً يناسب طفلك، نناقشه معك بوضوح قبل أن نكمل."],
  ["هل تحفظون صورة طفلي؟", "لا نطلب الصورة في هذه الصفحة. ترسلينها بعد الاتفاق داخل المحادثة فقط لاستخدامها في المعاينة والقصة. لا ننشرها أو نستخدمها للتسويق من دون موافقتك المنفصلة."],
];

const miniExamples = [
  [ASSETS.pair1, "راشد · مغامرة الصحراء"],
  [ASSETS.pair2, "جود · رحلة بين النجوم"],
  [ASSETS.pair3, "آدم · مدينة المرجان"],
] as const;

const initialForm: ConversationRequest = {
  childName: "",
  childAge: 0,
  childInterest: "",
  contactMethod: "telegram",
  contactValue: "",
  privacyConsent: false,
};

export default function Home() {
  const conversationRef = useRef<HTMLElement>(null);
  const formViewed = useRef(false);
  const formStarted = useRef(false);
  const [form, setForm] = useState<ConversationRequest>(initialForm);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [gallery, setGallery] = useState<(typeof evidence)[number] | null>(null);
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

  const scrollToConversation = () => conversationRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    startConversation.mutate(form);
  };

  return (
    <main dir="rtl" className="landing-shell">
      <div className="top-strip"><span>بداية لطيفة، بلا التزام</span><b>تفاهم شخصي قبل الصورة والدفع</b><span>·</span><span>رد خلال 24 ساعة كحد أقصى</span></div>
      <nav className="site-nav page-width" aria-label="التنقل الرئيسي">
        <a href="#top" className="brand"><span className="brand-icon"><Sparkles size={18} /></span><span>بطل قصتي</span></a>
        <div className="nav-links"><a href="#what-you-get">شو بتستلمين؟</a><a href="#examples">أمثلة حقيقية</a><a href="#how">كيف نبدأ؟</a><a href="#trust">طمأنينة لك</a></div>
        <Button className="nav-button" onClick={scrollToConversation}>ابدئي محادثة <ArrowLeft size={16} /></Button>
      </nav>

      <section id="top" className="hero page-width">
        <div className="hero-copy">
          <div className="eyebrow"><span>✦</span> حكاية عربية لا تشبه أي حكاية أخرى</div>
          <h1>مو بس قصة باسم طفلك.<br /><em>هذه ذكرى تقول له: أنت مهم.</em></h1>
          <p className="hero-lede">نحوّل اهتمامه الصغير إلى مغامرة عربية دافئة، يكون هو بطلها. نتفاهم معك شخصياً أولاً، ثم نطلب الصورة داخل تيليجرام، ونرسل لك معاينة قبل أي دفع.</p>
          <div className="human-promise"><div className="promise-number">01</div><p><b>ما تحتاجين تعرفين أي شيء تقني.</b><br />قولي لنا شو يحب طفلك، ونحن نمشي معك خطوة بخطوة.</p></div>
          <div className="hero-actions"><Button className="primary-button" onClick={scrollToConversation}>خلينا نتفاهم عن قصته <MessageCircle size={19} /></Button><a href="#examples" className="quiet-link"><span>↓</span> شوفي النتيجة أولاً</a></div>
          <div className="hero-anchors"><span><Check size={15} /> لا صورة في الموقع</span><span><Check size={15} /> لا دفع الآن</span><span><Check size={15} /> محادثة بشرية واضحة</span></div>
        </div>
        <div className="hero-visual" aria-label="مثال غلاف قصة مخصصة">
          <div className="hero-wash" />
          <img src={ASSETS.hero} alt="مثال غلاف حكاية عربية لطفل مع شخصية قصصية لطيفة" {...heroImageLoadingProps} />
          <div className="hero-sticker"><small>مو ملف عام</small><b>حكايته هو</b></div>
          <div className="hero-note"><Heart size={16} fill="currentColor" /><span>كل تفصيلة تبدأ<br /><b>من طفلك</b></span></div>
        </div>
      </section>

      <section className="reassurance"><div className="page-width reassurance-inner"><span>ببساطة، شو بيصير؟</span><b>نتفاهم</b><i>←</i><b>ترسلين الصورة في تيليجرام</b><i>←</i><b>تشوفين المعاينة</b><i>←</i><b>تدفعين إذا اقتنعتِ</b></div></section>

      <section id="what-you-get" className="value-section page-width">
        <div className="section-heading"><div><span className="section-label">شو بيوصل لكم في النهاية؟</span><h2>وقت قصير مع حكاية<br /><em>تبقى في الذاكرة.</em></h2></div><p>مو مجرد اسم على غلاف. نكتب القصة حول اهتمامه، ونصنع شخصية قصصية لطيفة مستوحاة منه.</p></div>
        <div className="value-grid">
          <article className="value-card peach"><span>للطفل</span><div className="value-icon"><Star size={22} fill="currentColor" /></div><h3>يشوف نفسه بطلاً</h3><p>يقرأ اسمه داخل مغامرة تشبه ما يحبه، ويشعر أن الحكاية كُتبت له وحده.</p></article>
          <article className="value-card mint"><span>للأهل</span><div className="value-icon"><Heart size={22} fill="currentColor" /></div><h3>ذكرى جاهزة للحفظ</h3><p>PDF عربي من 8 صفحات تفتحينه وقت النوم وتحفظينه أو ترسلينه لمن يحب.</p></article>
          <article className="value-card gold"><span>قبل الدفع</span><div className="value-icon"><ImagePlus size={22} /></div><h3>معاينة على مهل</h3><p>تشوفين النتيجة أولاً وتتفاهمين معنا مباشرة. ما فيه خطوة تجبرك على الاستمرار.</p></article>
        </div>
      </section>

      <section id="examples" className="examples-section page-width">
        <div className="section-heading"><div><span className="section-label">دليل واضح، مو وعود</span><h2>من طفلك كما هو،<br /><em>إلى بطل في عالمه.</em></h2></div><div className="honesty-badge"><b>أمثلة حقيقية</b><span>من قصص أُنجزت بموافقة ولي الأمر</span></div></div>
        <p className="section-copy">هذه أمثلة من أعمالنا: الصورة الأصلية، ثم الصفحات التي يظهر فيها الطفل كشخصية قصصية. اضغطي على أي مثال وشوفي الصفحات بحجم أكبر.</p>
        <div className="evidence-grid">
          {evidence.map(item => <article className="evidence-card" key={item.title}>
            <div className="evidence-images"><div><span>الصورة الأصلية</span><img src={item.before} alt={`الصورة الأصلية لطفل قصة ${item.title}`} {...contentImageLoadingProps} /></div><strong>←</strong><div><span>من القصة</span><img src={item.pages[0]} alt={`صفحة من قصة ${item.title}`} {...contentImageLoadingProps} /></div></div>
            <div className="evidence-copy"><div><small>{item.age}</small><h3>{item.title}</h3><p>{item.story}</p></div><button onClick={() => setGallery(item)}>شوفي الصفحات <ArrowLeft size={15} /></button></div>
          </article>)}
        </div>
        <div className="illustrative-wrap"><div className="illustrative-line"><span>أمثلة توضيحية للشكل الممكن</span></div><p>الأمثلة التالية توضح تنوع العوالم والأساليب فقط، وليست قصص عملاء حقيقيين.</p><div className="mini-grid">{miniExamples.map(([image, title]) => <figure key={title}><img src={image} alt={`مثال توضيحي لشخصية قصصية: ${title}`} {...contentImageLoadingProps} /><figcaption><b>{title}</b><span>مثال توضيحي</span></figcaption></figure>)}</div></div>
      </section>

      <section className="case-study page-width">
        <div className="case-copy"><span className="section-label">قصة أحمد، من البداية للنهاية</span><h2>ما نغيّر الطفل.<br /><em>نفتح له عالماً يناسبه.</em></h2><p>بدأنا بصورة أحمد، ثم حوّلنا ملامحه العامة إلى شخصية مرسومة بلطف، وكتبنا له صفحات يكون فيها هو صاحب القرار والمغامرة.</p><div className="case-note"><Quote size={18} fill="currentColor" /><span>هذه دراسة حالة حقيقية بموافقة ولي الأمر. تعرض النتيجة المتوقعة للخدمة، وليست منتجاً منفصلاً للبيع.</span></div></div>
        <div className="case-visual"><div className="case-photo"><span>قبل</span><img src={ASSETS.ahmadOriginal} alt="الصورة الأصلية لأحمد" {...contentImageLoadingProps} /></div><div className="case-arrow">←</div><div className="case-pages"><span>بعد</span><img src={ASSETS.ahmadPage1} alt="غلاف قصة أحمد" {...contentImageLoadingProps} /><img src={ASSETS.ahmadPage2} alt="صفحة من قصة أحمد" {...contentImageLoadingProps} /><img src={ASSETS.ahmadPage3} alt="صفحة ختامية من قصة أحمد" {...contentImageLoadingProps} /></div></div>
      </section>

      <section id="how" className="journey-section"><div className="page-width"><div className="journey-heading"><div><span className="section-label">كيف نمشي معك؟</span><h2>أربع خطوات بشرية.<br /><em>ولا وحدة منها معقدة.</em></h2></div><p>نحن نفضل أن نتفاهم معك قبل أن نطلب منّك أي شيء حساس أو ندخلك في دفع.</p></div><div className="journey-grid"><article><b>1</b><h3>قولي لنا شو يحب</h3><p>الاسم والعمر وفكرة أو اهتمام بسيط. هذه كل البداية.</p></article><article><b>2</b><h3>نتفاهم في تيليجرام</h3><p>نسأل ونقترح معك الشخصيات والجو الذي يشبه طفلك.</p></article><article><b>3</b><h3>ترسلين الصورة بعد الاتفاق</h3><p>داخل المحادثة فقط، حتى تكونين مرتاحة وفاهمة لماذا نحتاجها.</p></article><article><b>4</b><h3>تشوفين ثم تقررين</h3><p>نرسل المعاينة، ولا يكون الدفع إلا إذا حبيتي النتيجة.</p></article></div></div></section>

      <section id="trust" className="trust-section page-width"><div className="trust-mark"><LockKeyhole size={30} /><span>وضوح<br /><b>وطمأنينة</b></span></div><div><span className="section-label">قبل ما تبدين، هذه وعودنا لك</span><h2>مانباك تقتنعين بسرعة.<br /><em>نبغاك تكونين مرتاحة.</em></h2><div className="trust-list"><p><b>السعر واضح من البداية.</b> سعر الإطلاق الحالي يبدأ من 17 د.إ لملف PDF مخصص من 8 صفحات، وأي إضافة نوضحها قبل أن نبدأ.</p><p><b>الرد شخصي خلال 24 ساعة كحد أقصى.</b> المحادثة مو روبوت، ونتفاهم معك بلغتك وبهدوء.</p><p><b>لا صورة ولا دفع من الموقع.</b> تبدأين كلاماً بسيطاً فقط. بعد التفاهم، ترسلين الصورة داخل تيليجرام إذا ارتحتِ.</p><p><b>المعاينة قبل القرار.</b> نشوف معك إن كانت النتيجة مناسبة، ونناقش التعديل البسيط قبل الدفع.</p></div></div></section>

      <section ref={conversationRef} id="conversation" className="conversation-section page-width">
        <div className="conversation-intro"><span className="section-label">ابدئي بالأسهل</span><h2>قولي لنا عن طفلك.<br /><em>والباقي علينا.</em></h2><p>لن نطلب صورة أو بطاقة أو دفع هنا. عبّي البيانات البسيطة، ثم سيفتح تيليجرام برسالة مرتبة حتى تبدأين التفاهم معنا مباشرة.</p><div className="response-card"><Clock3 size={20} /><div><b>نرد خلال 24 ساعة كحد أقصى</b><span>ورقم طلبك يبقى معنا حتى ما تضيع تفاصيل البداية.</span></div></div><div className="response-card"><Phone size={20} /><div><b>هذه محادثة مع شخص، مو نظام معقد</b><span>اختاري ما يناسبك، واسألي عن أي تفصيلة قبل إرسال الصورة.</span></div></div></div>
        <div className="conversation-card clarity-mask" data-clarity-mask="true">
          <form onSubmit={submit} onFocusCapture={() => {
            if (!formStarted.current) {
              formStarted.current = true;
              trackEvent("form_start");
            }
          }} noValidate data-clarity-mask="true">
            <div className="form-head"><span>خطوة قصيرة · بدون التزام</span><h3>نبدأ الحكاية من هنا</h3><p>المعلومات تساعدنا نفهم طفلك قبل ما نتكلم معك.</p></div>
            <div className="form-row"><label>اسم الطفل<input value={form.childName} onChange={event => setForm({ ...form, childName: event.target.value })} placeholder="اكتبي الاسم الذي تحبين يظهر في القصة" /></label><label>العمر<select value={form.childAge || ""} onChange={event => setForm({ ...form, childAge: Number(event.target.value) })}><option value="">اختاري نطاق العمر</option>{childAgeRanges.map(ageRange => <option key={ageRange.value} value={ageRange.value}>{ageRange.label}</option>)}</select></label></div>
            <label>شو يحب طفلك أو شو تتمنين تكون قصته؟<textarea value={form.childInterest} onChange={event => setForm({ ...form, childInterest: event.target.value })} placeholder="مثال: يحب الفضاء ويتمنى يكتشف كوكباً جديداً" rows={3} /></label>
            <div className="form-row"><label>أفضل وسيلة للرد عليك<select value="telegram" disabled><option value="telegram">تيليجرام</option></select></label><label>يوزر تيليجرام<input value={form.contactValue} onChange={event => setForm({ ...form, contactValue: event.target.value })} placeholder="مثال: @yourname" /></label></div>
            <label className="consent-row"><input type="checkbox" checked={form.privacyConsent} onChange={event => setForm({ ...form, privacyConsent: event.target.checked })} /><span>أوافق على <a href="/privacy" target="_blank" rel="noreferrer">سياسة الخصوصية</a> وحفظ بيانات البداية أعلاه لبدء المحادثة فقط. أفهم أن الصورة سأرسلها لاحقاً داخل تيليجرام بعد التفاهم المبدئي.</span></label>
            {startConversation.error && <p className="form-error">{startConversation.error.message}</p>}
            <Button type="submit" className="form-button" disabled={startConversation.isPending}>{startConversation.isPending ? "نرتب رسالتك..." : <>ابدئي محادثة شخصية <MessageCircle size={19} /></>}</Button>
            <p className="form-footnote"><LockKeyhole size={14} /> لا صورة ولا دفع في هذه المرحلة.</p>
          </form>
        </div>
      </section>

      <section className="faq-section page-width"><span className="section-label">أسئلة مطمئنة قبل المحادثة</span><h2>تبين تعرفين أكثر؟</h2><div className="faq-list">{faq.map(([question, answer], index) => <div className={`faq-item ${openFaq === index ? "open" : ""}`} key={question}><button onClick={() => setOpenFaq(openFaq === index ? null : index)}><span>{question}</span><ChevronDown size={19} /></button>{openFaq === index && <p>{answer}</p>}</div>)}</div></section>

      <section className="closing-section"><div className="page-width closing-inner"><div><span className="section-label">القصة التي يتذكرها ما تبدأ بملف</span><h2>تبدأ من أحد يسمعك،<br /><em>ويسمع طفلك.</em></h2><p>ابدئي برسالة بسيطة. لا صورة ولا دفع الآن.</p></div><Button className="primary-button" onClick={scrollToConversation}>ابدئي التفاهم <ArrowLeft size={18} /></Button></div></section>
      <footer className="site-footer page-width"><span className="brand"><span className="brand-icon"><Sparkles size={15} /></span> بطل قصتي</span><div className="footer-payment" aria-label="وسائل الدفع المتاحة بعد اعتماد المعاينة"><span>الدفع بعد اعتماد المعاينة</span><div className="payment-badges">{supportedPaymentMethods.map(method => <span className={`payment-badge ${method.id}`} key={method.id} aria-label={method.label.replace("\n", " ")}>{method.id === "mastercard" && <i className="mastercard-circles" aria-hidden="true"><b /><b /></i>}<em>{method.label}</em></span>)}</div></div><nav className="footer-links" aria-label="روابط التذييل"><a href="/privacy">سياسة الخصوصية</a></nav></footer>

      {gallery && <div className="gallery-backdrop" role="presentation" onClick={() => setGallery(null)}><div className="gallery-modal" role="dialog" aria-modal="true" aria-labelledby="gallery-title" onClick={event => event.stopPropagation()}><button className="gallery-close" aria-label="إغلاق المعاينة" onClick={() => setGallery(null)}><X size={21} /></button><span className="section-label">صفحات من القصة</span><h3 id="gallery-title">{gallery.title}</h3><p>{gallery.story}</p><div className="gallery-pages">{gallery.pages.map((page, index) => <img src={page} key={page} alt={`${gallery.title} — صفحة ${index + 1}`} {...contentImageLoadingProps} />)}</div></div></div>}
    </main>
  );
}
