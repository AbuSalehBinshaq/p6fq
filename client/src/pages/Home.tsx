import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { SELLER_TELEGRAM_HANDLE, SELLER_TELEGRAM_URL } from "@shared/telegram";
import { buildOrderMessage, buildOrderTelegramUrl } from "@shared/order";
import { selectThemeForOrder } from "@shared/themeFlow";
import { getPreviewSummary, storyThemes, type StoryTheme } from "@shared/storyCatalog";
import { ArrowLeft, Check, ChevronDown, Clock3, Download, ImagePlus, LockKeyhole, MessageCircle, Sparkles, Star, Trash2, WandSparkles } from "lucide-react";

const heroImage = "/assets/batal-story-hero.png";
const paymentUrl = "https://pay.ziina.com/bu.y/jf0YuQuy8";

const realBeforeAfterPairs = [
  { title: "سعيد يجرب لأول مرة", age: "3–6 سنوات", before: "/assets/story1-original.jpeg", after: "/assets/story1-page-01.png" },
  { title: "صالح والحقيقة الشجاعة", age: "5–8 سنوات", before: "/assets/story2-original.jpg", after: "/assets/story2-page-01.png" },
] as const;

const beforeAfterPairs = [
  ["/assets/batal-story-pair-1.png", "راشد · مغامرة الصحراء"],
  ["/assets/batal-story-pair-2.png", "جود · رحلة بين النجوم"],
  ["/assets/batal-story-pair-3.png", "آدم · مدينة المرجان"],
  ["/assets/batal-story-pair-4.png", "ليان · سر الغابة"],
  ["/assets/batal-story-pair-5.png", "سلمان · قلعة القمر"],
] as const;

const faqItems = [
  ["متى توصل المعاينة؟", "غالباً نرسلها لك بسرعة بعد استلام الطلب، وبحد أقصى خلال 24 ساعة عند الضغط. تشوفينها براحتك، وإذا أعجبتك نكمل ملف الـPDF."],
  ["ماذا أستلم بالضبط؟", "ملف PDF عربي مخصص من 8 صفحات باسم طفلك، فيه قصة مناسبة لعمره وشخصية مستوحاة من صورته، جاهز للقراءة والحفظ والمشاركة مع العائلة."],
  ["متى أدفع؟", "ما فيه دفع عند إرسال الطلب. الدفع يكون فقط بعد ما تشوفين المعاينة وتعجبك، وبعدها نرسل لك رابط زيينة."],
  ["هل تحفظون صورة طفلي؟", "نستخدم الصورة لإنشاء المعاينة والقصة فقط. لا ننشرها ولا نستخدمها للتسويق أو تدريب النماذج دون موافقة منفصلة. نحذف الصورة والمعاينة والبيانات بعد إتمام الطلب وبحد أقصى خلال 7 أيام، أو فوراً عند طلبك."],
  ["متى يوصل الـPDF بعد الدفع؟", "بعد اعتماد المعاينة وإتمام الدفع، نرسل لك ملف الـPDF المخصص من 8 صفحات بحد أقصى خلال 24 ساعة."],
];

export default function Home() {
  const orderRef = useRef<HTMLElement>(null);
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [adventure, setAdventure] = useState("");
  const [selectedTheme, setSelectedTheme] = useState("");
  const [contact, setContact] = useState("");
  const [imageData, setImageData] = useState<string | null>(null);
  const [imageName, setImageName] = useState("");
  const [consent, setConsent] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [approvedPreview, setApprovedPreview] = useState(false);
  const [previewStory, setPreviewStory] = useState<StoryTheme | null>(null);

  const goToOrder = (theme?: StoryTheme) => {
    const scrollToOrder = () => orderRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    if (theme) {
      const selection = selectThemeForOrder(theme, scrollToOrder);
      setSelectedTheme(selection.selectedTheme);
      setAdventure(selection.adventure);
      return;
    }
    scrollToOrder();
  };

  const onFileChange = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("اختاري صورة بصيغة JPG أو PNG");
    if (file.size > 5 * 1024 * 1024) return toast.error("حجم الصورة يجب أن يكون أقل من 5 ميجابايت");
    const reader = new FileReader();
    reader.onload = () => { setImageData(String(reader.result)); setImageName(file.name); };
    reader.readAsDataURL(file);
  };

  const submitOrder = async () => {
    if (!name.trim() || !age || !adventure.trim() || !imageData || !consent) return toast.error("كملي البيانات ووافقي على استخدام الصورة أولاً");
    const orderInput = { name: name.trim(), age, adventure: adventure.trim(), contact, hasPreview: false };
    const message = buildOrderMessage(orderInput);
    await navigator.clipboard?.writeText(decodeURIComponent(message.replaceAll("%0A", "\n")));
    setSubmitted(true);
    window.open(buildOrderTelegramUrl(orderInput), "_blank", "noopener,noreferrer");
    toast.success("فتحنا لك تيليجرام لإرسال طلب المعاينة");
  };

  return (
    <main dir="rtl" className="min-h-screen overflow-hidden bg-[#fbf8f1] text-[#172b3a]">
      <div className="announcement"><span>عرض الإطلاق</span><b>أول 10 ملفات PDF بـ 17 د.إ</b><span className="announcement-dot">•</span><span>ادفعي فقط بعد اعتماد المعاينة</span></div>
      <nav className="site-nav container">
        <a href="#top" className="brand" aria-label="بطل قصتي"><span className="brand-mark"><Sparkles size={17} /></span><span>بطل قصتي</span></a>
        <div className="nav-links"><a href="#themes">الثيمات</a><a href="#examples">قبل وبعد</a><a href="#how">كيف تعمل؟</a><a href="#faq">الأسئلة الشائعة</a></div>
        <Button onClick={() => goToOrder()} className="nav-cta">ابدئي الآن <ArrowLeft size={16} /></Button>
      </nav>

      <section id="top" className="hero container">
        <div className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-star">✦</span> قصة عربية مخصصة حول طفلك</div>
          <h1>طفلك مو بطل<br /><em>قصة عادية.</em></h1>
          <p className="hero-lede">نحوّل صورته إلى شخصية قصصية لطيفة، ونكتب له ملف PDF من 8 صفحات يكون هو بطل مغامرته. <strong>اطلبي المعاينة أولاً، وإذا عجبتك ادفعي بعدها.</strong></p>
          <div className="hero-offer"><div><small>بدل</small><s>39 د.إ</s><strong>17 د.إ</strong></div><span>لأول 10 طلبات فقط<br /><b>PDF مخصص من 8 صفحات</b></span></div>
          <div className="hero-actions"><Button onClick={() => goToOrder()} className="primary-cta">اطلبي معاينته مجاناً <ArrowLeft size={18} /></Button><a className="text-link" href="#themes"><span className="play-dot">↓</span> شوفي الثيمات</a></div>
          <div className="hero-trust"><span><Check size={15} /> بدون دفع قبل المعاينة</span><span><Clock3 size={15} /> معاينة سريعة</span><span><LockKeyhole size={15} /> صورك بخصوصية</span></div>
        </div>
        <div className="hero-art"><div className="sun-stamp">PDF<br /><strong>خاص فيه</strong></div><img src={heroImage} alt="غلاف PDF لطفل في مغامرة قصصية مع ثعلب لطيف" /><div className="floating-note"><span className="note-icon">✦</span><span>مو PDF عام<br /><strong>قصته هو</strong></span></div></div>
      </section>

      <section className="proof-strip"><div className="container proof-inner"><span className="proof-label">وش بيصير؟</span><span><Star size={15} fill="currentColor" /> باسمه وشخصيته</span><span><WandSparkles size={15} /> معاينة قبل الدفع</span><span><Download size={15} /> PDF من 8 صفحات</span><span><Clock3 size={15} /> تسليم خلال 24 ساعة بعد الدفع</span></div></section>

      <section id="themes" className="catalog-section container"><div className="section-heading"><div><div className="section-kicker">اختاري عالمه</div><h2>قصص تبدأ من اهتمامه<br /><span>وتنتهي بذكرى له.</span></h2></div><a className="see-all" href="#order">أرسلي فكرتك الخاصة <ArrowLeft size={15} /></a></div><p className="section-intro wide-intro">هذه ثيمات نبدأ منها، ونقدر نكتب له مغامرة مختلفة تماماً إذا عنده فكرة في باله.</p><div className="catalog-grid">{storyThemes.map((story) => <article className={`catalog-card ${story.tone}`} key={story.title}><div className="catalog-image"><img src={story.image} alt={`مثال قصة ${story.title}`} /><span>{story.tag}</span></div><div className="catalog-body"><div className="catalog-meta"><span>{story.age}</span><span>PDF مخصص</span></div><h3>{story.title}</h3><p>{story.description}</p><div className="catalog-actions"><button className="preview-story-button" onClick={() => setPreviewStory(story)}>شوفي المعاينة <WandSparkles size={14} /></button><button onClick={() => goToOrder(story)}>خصصي هذه القصة <ArrowLeft size={15} /></button></div></div></article>)}</div></section>

      <section id="examples" className="before-after-section container"><div className="section-heading"><div><div className="section-kicker">شوفي التحويل</div><h2>من صورة طفلك<br /><span>إلى شخصيته القصصية.</span></h2></div><div className="example-badge"><b>7</b><span>أمثلة<br />قبل وبعد</span></div></div><p className="section-intro">شوفي أمثلة فعلية من القصص الجديدة: الصورة الأصلية للطفل، ثم ظهوره كشخصية داخل غلاف القصة.</p><div className="real-before-after-grid">{realBeforeAfterPairs.map((item) => <figure className="real-before-after-card" key={item.title}><div className="real-before-after-visual"><div className="real-before-after-side"><span>قبل · الصورة الأصلية</span><img src={item.before} alt={`الصورة الأصلية لطفل قصة ${item.title}`} /></div><div className="real-before-after-arrow">←</div><div className="real-before-after-side"><span>بعد · الشخصية القصصية</span><img src={item.after} alt={`شخصية قصة ${item.title} بعد التحويل`} /></div></div><figcaption><strong>{item.title}</strong><small>{item.age} · مثال من أعمالنا</small></figcaption></figure>)}</div><div className="example-divider"><span>أمثلة توضيحية إضافية</span></div><div className="before-after-gallery">{beforeAfterPairs.map(([src, title]) => <figure className="before-after-board" key={src}><div className="board-labels"><span>الصورة الأصلية</span><b>←</b><span>الشخصية القصصية</span></div><img src={src} alt={`مثال قبل وبعد ${title}: نفس الطفل في صورة أصلية وشخصية قصصية`} /><figcaption><strong>{title}</strong><small>مثال توضيحي، وليس طلب عميل حقيقي</small></figcaption></figure>)}</div></section>

      {previewStory && <div className="preview-modal-backdrop" role="presentation" onClick={() => setPreviewStory(null)}><div className="preview-modal" role="dialog" aria-modal="true" aria-labelledby="preview-title" onClick={(event) => event.stopPropagation()}><button className="preview-close" aria-label="إغلاق المعاينة" onClick={() => setPreviewStory(null)}>×</button><div className="section-kicker">معاينة القصة</div><h2 id="preview-title">{previewStory.title}</h2><p className="preview-modal-lede">{getPreviewSummary(previewStory)} الملف النهائي يكون PDF مخصص باسم طفلك وشخصيته.</p><div className="preview-modal-pages">{previewStory.previewImages.map((image, index) => <img key={image} src={image} alt={`${previewStory.title} — صفحة معاينة ${index + 1}`} />)}</div><button className="primary-cta preview-order-button" onClick={() => { setPreviewStory(null); goToOrder(previewStory); }}>أبي أخصص هذه القصة <ArrowLeft size={17} /></button></div></div>}

      <section className="case-study-section container"><div className="case-study-copy"><div className="section-kicker">مثال حقيقي من البداية للنهاية</div><h2>شوفي قصة <span>أحمد.</span></h2><p>هذه صورة أحمد الأصلية، وبعدها غلاف قصته وبعض صفحات الـPDF التي صارت فيها شخصيته هي البطل. هذا بالضبط الشكل الذي نجهزه لك بعد إرسال الصورة.</p><div className="case-study-note"><Check size={16} /> دراسة حالة حقيقية بموافقة ولي الأمر — مثال توضيحي لنتيجة الخدمة، وليست منتجاً مستقلاً للبيع</div></div><div className="case-study-visual"><div className="case-original"><span>قبل</span><img src="/assets/ahmad-original.jpeg" alt="الصورة الأصلية لأحمد" /></div><div className="case-arrow">←</div><div className="case-pdf"><span>بعد</span><div className="case-pages"><img src="/assets/ahmad-page-1.png" alt="غلاف قصة أحمد بصيغة PDF" /><img src="/assets/ahmad-page-2.png" alt="صفحة من قصة أحمد بصيغة PDF" /><img src="/assets/ahmad-page-3.png" alt="صفحة إضافية من قصة أحمد بصيغة PDF" /></div></div></div></section>

      <section className="story-section container"><div className="section-kicker">وش تستلمين؟</div><h2>ملف صغير،<br /><span>وذكرى كبيرة.</span></h2><p className="section-intro">PDF لطيف تقدرين تفتحينه معه وقت النوم، تحفظينه، وترسلينه للعائلة. لا شحن ولا انتظار طويل.</p><div className="feature-grid"><article className="feature-card feature-peach"><div className="feature-number">01</div><div className="feature-icon">♥</div><h3>مصمم له</h3><p>اسمه وشخصيته واهتماماته داخل الأحداث، مو مجرد اسم على الغلاف.</p></article><article className="feature-card feature-blue"><div className="feature-number">02</div><div className="feature-icon">↗</div><h3>PDF عربي</h3><p>8 صفحات جاهزة للحفظ والقراءة من الجوال أو التابلت ومشاركة العائلة.</p></article><article className="feature-card feature-yellow"><div className="feature-number">03</div><div className="feature-icon">✦</div><h3>تدفعين بعدين</h3><p>نرسل المعاينة أولاً، ولا تدفعين إلا بعد ما تشوفينها وتعجبك.</p></article></div></section>

      <section id="how" className="how-section"><div className="container"><div className="how-header"><div><div className="section-kicker">كيف تعمل؟</div><h2>من صورة إلى قصة<br /><span>بأربع خطوات.</span></h2></div><div className="hand-note">لا دفع الآن<br /><span>شوفي أولاً ↙</span></div></div><div className="steps"><div className="step"><div className="step-num">1</div><div><h3>اختاري الثيم</h3><p>اختاري من الثيمات أو اكتبي فكرة المغامرة التي يحبها طفلك.</p></div></div><div className="step"><div className="step-num">2</div><div><h3>أرسلي الصورة</h3><p>الاسم والعمر وصورة واضحة، مع موافقة ولي الأمر.</p></div></div><div className="step"><div className="step-num">3</div><div><h3>نرسل المعاينة</h3><p>نحوّل الصورة إلى شخصية قصصية ونرسل لك المعاينة غالباً بسرعة.</p></div></div><div className="step"><div className="step-num">4</div><div><h3>اعتمدي وادفعي</h3><p>إذا أعجبتك، تدفعين عبر زيينة ونرسل PDF خلال 24 ساعة كحد أقصى.</p></div></div></div></div></section>

      <section ref={orderRef} id="order" className="order-section container"><div className="order-intro"><div className="section-kicker">ابدئي بدون مخاطرة</div><h2>جاهزين نبدأ<br /><span>حكايته؟</span></h2><p>أرسلي التفاصيل الآن. نجهز المعاينة ونرسلها على تيليجرام. الدفع لاحقاً فقط إذا أعجبتك.</p><div className="offer-card"><div><small>سعر الإطلاق</small><strong>17 د.إ</strong><s>39 د.إ</s></div><span>لأول 10 ملفات PDF<br /><b>8 صفحات مخصصة</b></span></div><div className="pdf-delivery"><Clock3 size={17} /><span><b>المعاينة غالباً بسرعة</b><br />وبحد أقصى خلال 24 ساعة عند الضغط.</span></div><div className="pdf-delivery"><Download size={17} /><span><b>التسليم بعد الدفع</b><br />ملف PDF عربي من 8 صفحات خلال 24 ساعة كحد أقصى.</span></div><div className="payment-methods"><b>الدفع بعد اعتماد المعاينة عبر زيينة</b><span>Apple Pay · Google Pay · Visa · Mastercard · Amex</span></div></div><div className="order-card"><div className="order-card-head"><span className="card-step">الخطوة الأخيرة / بدون دفع</span><h3>بيانات بطل القصة</h3><p>نحتاجها عشان نجهز أول تصور له.</p>{selectedTheme && <div className="selected-theme">الثيم المختار: <b>{selectedTheme}</b></div>}</div><div className="form-grid"><label>اسم الطفل<input value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: ريان" /></label><label>العمر<select value={age} onChange={(e) => setAge(e.target.value)}><option value="">اختاري العمر</option>{Array.from({ length: 13 }, (_, i) => i + 2).map((n) => <option key={n} value={n}>{n} سنوات</option>)}</select></label></div><label>فكرة المغامرة<input value={adventure} onChange={(e) => setAdventure(e.target.value)} placeholder="مثال: رائد فضاء يكتشف كوكباً جديداً" /></label><label>كيف نتواصل معك؟<input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="يوزر تيليجرام أو رقم واتساب" /></label><div className="upload-wrap"><label className={`upload-box ${imageData ? "has-image" : ""}`}><input type="file" accept="image/png,image/jpeg" onChange={(e) => onFileChange(e.target.files?.[0])} />{imageData ? <><img src={imageData} alt="الصورة المختارة" /><span className="upload-overlay">تغيير الصورة</span></> : <><span className="upload-icon"><ImagePlus size={21} /></span><strong>ارفعي صورة طفلك</strong><small>JPG أو PNG — حتى 5MB</small></>}</label>{imageName && <button className="remove-file" onClick={() => { setImageData(null); setImageName(""); }}><Trash2 size={14} /> إزالة الصورة</button>}</div><label className="consent"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} /><span>أقرّ بأنني ولي الأمر أو لدي موافقة ولي الأمر على استخدام هذه الصورة لإنشاء المعاينة والقصة. <a href="#privacy">أعرف كيف نحميها.</a></span></label><Button type="button" onClick={submitOrder} className="preview-cta"><MessageCircle size={18} /> أرسل الطلب واستلم المعاينة</Button><small className="telegram-hint">سيفتح تيليجرام مباشرة مع <a href={SELLER_TELEGRAM_URL} target="_blank" rel="noreferrer">@{SELLER_TELEGRAM_HANDLE}</a>، بدون دفع الآن.</small>{submitted && <label className="approval-check"><input type="checkbox" checked={approvedPreview} onChange={(e) => setApprovedPreview(e.target.checked)} /><span>وصلتني المعاينة واعتمدتها، وأريد الانتقال للدفع.</span></label>}{submitted && approvedPreview && <details className="payment-details" open><summary>رابط الدفع بعد اعتماد المعاينة</summary><div><p>سعر الإطلاق <b>17 د.إ</b> لأول 10 طلبات. بعد الدفع نرسل ملف الـPDF من 8 صفحات خلال 24 ساعة كحد أقصى.</p><a href={paymentUrl} target="_blank" rel="noreferrer">فتح الدفع عبر زيينة ↗</a></div></details>}{submitted && <div className="sent-message"><Check size={18} /> تم تجهيز الطلب. أرسل الرسالة في تيليجرام، وسنرجع لك بالمعاينة.</div>}</div></section>

      <section id="privacy" className="privacy-section"><div className="container privacy-inner"><div className="privacy-seal"><LockKeyhole size={28} /><span>خصوصية<br /><strong>أولاً</strong></span></div><div><div className="section-kicker">طمأنينة لك، قبل أي شيء</div><h2>صورة طفلك <span>مو منتج.</span></h2><p>نستخدم الصورة للمعاينة والقصة فقط. لا ننشرها ولا نبيعها ولا نستخدمها للتسويق أو تدريب النماذج دون إذن منفصل. نحذف الصورة والمعاينة والبيانات بعد إتمام الطلب وبحد أقصى خلال 7 أيام، أو فوراً عند طلبك.</p><div className="privacy-points"><span><Check size={15} /> موافقة ولي الأمر مطلوبة</span><span><Check size={15} /> لا نشر ولا مشاركة عامة</span><span><Check size={15} /> حذف عند الطلب</span></div></div></div></section>

      <section id="faq" className="faq-section container"><div className="section-kicker">قبل ما تبدين</div><h2>أسئلة في بالك؟</h2><div className="faq-list">{faqItems.map(([q, a], i) => <div className={`faq-item ${openFaq === i ? "open" : ""}`} key={q}><button onClick={() => setOpenFaq(openFaq === i ? -1 : i)}><span>{q}</span><ChevronDown size={18} /></button>{openFaq === i && <p>{a}</p>}</div>)}</div></section>

      <section className="closing-cta"><div className="container closing-inner"><div><div className="section-kicker">أول 10 ملفات PDF تبدأ اليوم</div><h2>خلّيه يشوف نفسه<br /><em>بطل الحكاية.</em></h2><p>اطلبي المعاينة أولاً. شوفي النتيجة. وقرري براحتك.</p></div><Button onClick={() => goToOrder()} className="closing-button">ابدئي طلب المعاينة <ArrowLeft size={18} /></Button></div></section>
      <footer className="site-footer container"><span className="brand"><span className="brand-mark"><Sparkles size={14} /></span> بطل قصتي</span><span>PDF عربي مخصص · 8 صفحات · المعاينة قبل الدفع · @{SELLER_TELEGRAM_HANDLE}</span></footer>
    </main>
  );
}
