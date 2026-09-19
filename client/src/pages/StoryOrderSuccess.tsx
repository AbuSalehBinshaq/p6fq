import { Check, Clock3, FileText, LockKeyhole, Sparkles } from "lucide-react";
import { useLocation } from "wouter";

export default function StoryOrderSuccess() {
  const [, setLocation] = useLocation();
  const reference = new URLSearchParams(window.location.search).get("reference") || "—";
  return <main dir="rtl" className="story-success-page"><header className="story-order-nav"><button className="story-order-brand" onClick={() => setLocation("/")}><span><Sparkles size={17} /></span> أثر</button><span>طلب قصة أطفال عربية مخصصة</span></header><section className="story-success-panel"><div className="success-check"><Check size={35} /></div><span className="section-label">تم استلام طلبك</span><h1>بداية الحكاية<br /><em>وصلت لنا.</em></h1><p>شكرًا لك. حفظنا تفاصيل القصة والصورة بشكل مرتبط بطلبك، وسنراجعها قبل التواصل معك للخطوة التالية.</p><div className="story-reference-box"><span>رقم الطلب المرجعي</span><b>{reference}</b></div><div className="story-summary-grid"><div><FileText size={18} /><strong>8 صفحات</strong><span>قصة عربية مخصصة</span></div><div><Clock3 size={18} /><strong>2–3 أيام عمل</strong><span>بعد اكتمال البيانات والصورة وتأكيد الدفع</span></div></div><div className="story-next-step"><b>الخطوة التالية</b><span>نتواصل معك يدويًا لتأكيد التفاصيل والدفع قبل بدء الإنتاج. لم يتم تسجيل دفع إلكتروني.</span></div><p className="success-privacy"><LockKeyhole size={14} /> الصورة مرتبطة بالطلب ولا تظهر للعامة.</p><button className="back-home" onClick={() => setLocation("/")}>العودة إلى الموقع</button></section></main>;
}
