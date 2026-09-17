import { ArrowLeft, Check, ChevronRight, CircleHelp, Heart, LockKeyhole, MessageCircle, ShieldCheck, Sparkles, Trash2 } from "lucide-react";
import { analyticsPrivacyDisclosure, dataWeCollect, dataWeDoNotCollectOnSite, privacyCommitments, privacyPolicyMeta } from "@shared/privacyPolicy";
import { useLocation } from "wouter";

export default function PrivacyPolicy() {
  const [, setLocation] = useLocation();
  return <main dir="rtl" className="privacy-page">
    <header className="privacy-nav page-width">
      <button onClick={() => setLocation("/")} className="privacy-brand"><span><Sparkles size={17} /></span> أثر</button>
      <button onClick={() => setLocation("/")} className="privacy-back">العودة للصفحة الرئيسية <ArrowLeft size={16} /></button>
    </header>
    <section className="privacy-hero">
      <div className="page-width">
        <div className="privacy-kicker"><ShieldCheck size={17} /> خصوصيتكم جزء من الثقة</div>
        <h1>خصوصية طفلك<br /><em>ليست تفصيلة جانبية.</em></h1>
        <p>في أثر، نبدأ بأقل قدر ممكن من المعلومات ونشرح لك كل خطوة قبل أن نطلبها. هذه السياسة توضح ببساطة ما الذي نحفظه في مسار الاستفسار الحالي، وما الذي سيُطلب لاحقاً عند إطلاق مسار طلب القصة، وكيف يمكنك التحكم في بياناتك.</p>
        <div className="privacy-date"><span>آخر تحديث</span><b>{privacyPolicyMeta.effectiveDate}</b></div>
      </div>
    </section>

    <section className="privacy-summary page-width" aria-label="ملخص سياسة الخصوصية">
      <article><span className="summary-icon coral"><Heart size={20} /></span><div><b>ولي الأمر هو من يبدأ الطلب</b><p>الخدمة موجهة للوالدين أو الأوصياء، وليست للأطفال لبدء تواصل مستقل.</p></div></article>
      <article><span className="summary-icon mint"><LockKeyhole size={20} /></span><div><b>لا صورة ولا دفع في مسار الاستفسار</b><p>لا توجد حالياً خانة رفع صور ولا إدخال بيانات بطاقة داخل صفحة البداية.</p></div></article>
      <article><span className="summary-icon gold"><MessageCircle size={20} /></span><div><b>طلب القصة سيكون منفصلاً</b><p>عند إطلاقه، سيحتوي على موافقة واضحة ورفع خاص للصورة، دون تغيير مسار الاستفسار الحالي.</p></div></article>
    </section>

    <section className="privacy-content page-width">
      <aside className="privacy-aside"><span>في هذه الصفحة</span><a href="#collect">المعلومات التي نحفظها</a><a href="#not-collect">ما لا نطلبه في الموقع</a><a href="#use">كيف نستخدم المعلومات</a><a href="#analytics">قياس الزيارة</a><a href="#images">صور الأطفال والمحادثة</a><a href="#rights">حقوقك وخياراتك</a><a href="#contact">تواصل معنا</a></aside>
      <div className="privacy-article">
        <section id="collect" className="policy-block"><div className="policy-number">01</div><div><h2>المعلومات التي نحفظها عند بدء المحادثة</h2><p>عندما تعبّين نموذج البداية، نحفظ التفاصيل التي اخترتِ إرسالها حتى نتمكن من فهم طلبك والرد عليك شخصياً. وتشمل:</p><ul>{dataWeCollect.map(item => <li key={item}><Check size={17} />{item}</li>)}</ul><p className="policy-note">لا نطلب الاسم الكامل للطفل أو تفاصيله المدرسية أو عنوانه المنزلي في نموذج البداية.</p></div></section>
        <section id="not-collect" className="policy-block"><div className="policy-number">02</div><div><h2>ما لا نطلبه في هذا الموقع</h2><p>صفحة أثر لا تجمع هذه المعلومات من خلال نموذج الطلب:</p><ul className="not-collect-list">{dataWeDoNotCollectOnSite.map(item => <li key={item}><span>—</span>{item}</li>)}</ul></div></section>
        <section id="use" className="policy-block"><div className="policy-number">03</div><div><h2>كيف نستخدم معلومات البداية</h2><p>نستخدم البيانات فقط للتواصل بشأن قصتك المخصصة، وفهم عمر الطفل واهتمامه، ومتابعة حالة الطلب التي بدأتيها. قد نستخدم سجلات تقنية محدودة لحماية الموقع واكتشاف الأعطال، لكننا لا نبيع معلوماتك أو نؤجرها ولا نبني ملفات إعلانية عنك أو عن طفلك.</p><div className="commitment-grid">{privacyCommitments.map(([title, detail]) => <article key={title}><b>{title}</b><p>{detail}</p></article>)}</div></div></section>
        <section id="analytics" className="policy-block"><div className="policy-number">04</div><div><h2>{analyticsPrivacyDisclosure.title}</h2><p>{analyticsPrivacyDisclosure.detail}</p><p className="policy-note">يمكنك طلب حذف بيانات بداية الطلب عبر المحادثة. بيانات التحليل المجهّلة لا تُستخدم للتعريف بالطفل أو لعرض إعلانات موجهة إليه.</p></div></section>
        <section id="images" className="policy-block"><div className="policy-number">05</div><div><h2>صور الأطفال ومساران مختلفان</h2><p>مسار الاستفسار الحالي لا يطلب ولا يستقبل صور الأطفال. عند إطلاق مسار طلب القصة، سيُطلب رفع الصورة فقط بعد موافقة واضحة من ولي الأمر، وستُحفظ في مساحة خاصة مرتبطة بالطلب، لا داخل ملفات الموقع العامة.</p><div className="image-policy-card"><LockKeyhole size={21} /><div><b>قبل إرسال صورة</b><span>تأكدي أنك ولي الأمر أو لديك موافقته، ولا ترسلي إلا ما يلزم للقصة. لن تُستخدم الصورة في التحليلات أو التسويق دون موافقة منفصلة، وسيتم توضيح مدة الاحتفاظ بها وخيارات الحذف.</span></div></div><p>في المرحلة الحالية، إذا اخترتِ المتابعة عبر تيليجرام، يمكن أن نطلب الصورة داخل المحادثة بعد التفاهم. سيبقى هذا المسار منفصلاً عن مسار طلب القصة القادم.</p></div></section>
        <section id="rights" className="policy-block"><div className="policy-number">06</div><div><h2>حقوقك وخياراتك</h2><p>لديك الحق في معرفة البيانات الأساسية التي نحتفظ بها عن طلبك، وتحديث وسيلة التواصل أو تفاصيل البداية، وطلب حذف بيانات بدء المحادثة أو عدم إكمال الطلب. نراجع هذه الطلبات شخصياً عبر وسيلة التواصل التي بدأنا منها، للتأكد من حماية خصوصيتك.</p><div className="rights-row"><div><CircleHelp size={19} /><span>اسألي عن أي استخدام للبيانات</span></div><div><ChevronRight size={19} /><span>اطلبي تصحيح التفاصيل</span></div><div><Trash2 size={19} /><span>اطلبي حذف بيانات البداية</span></div></div></div></section>
        <section id="contact" className="policy-block contact-block"><div className="policy-number">07</div><div><h2>أي سؤال عن الخصوصية؟</h2><p>إذا رغبتِ في سؤال أو تعديل أو حذف متعلق ببياناتك أو ببيانات طفلك، تواصلي معنا مباشرة. اكتبي «طلب خصوصية» في أول الرسالة حتى نعطيه الأولوية.</p><a href={privacyPolicyMeta.contactUrl} target="_blank" rel="noreferrer">التواصل عبر تيليجرام <MessageCircle size={17} /></a></div></section>
      </div>
    </section>
    <section className="privacy-closing"><div className="page-width"><p>سياسة تشغيلية واضحة لخدمة أثر</p><h2>نطلب أقل قدر ممكن،<br /><em>ونشرح لك قبل كل خطوة.</em></h2><button onClick={() => setLocation("/")}>العودة وبدء محادثة <ArrowLeft size={17} /></button></div></section>
    <footer className="privacy-footer page-width"><span>© أثر</span><button onClick={() => setLocation("/")}>الصفحة الرئيسية</button></footer>
  </main>;
}
