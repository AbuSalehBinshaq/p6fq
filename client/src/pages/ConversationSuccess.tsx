import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { trackEvent } from "@/lib/analytics";
import { ArrowLeft, Check, ClipboardCheck, LockKeyhole, MessageCircle, Sparkles } from "lucide-react";
import { useMemo } from "react";
import { useLocation } from "wouter";

type ConversationSession = { reference: string; telegramUrl: string };

function readConversationSession(): ConversationSession | null {
  try {
    const raw = sessionStorage.getItem("batal-conversation");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ConversationSession;
    return parsed.reference && parsed.telegramUrl ? parsed : null;
  } catch {
    return null;
  }
}

export default function ConversationSuccess() {
  const [, setLocation] = useLocation();
  const reference = useMemo(() => new URLSearchParams(window.location.search).get("ref"), []);
  const session = useMemo(() => readConversationSession(), []);
  const orderReference = session?.reference ?? reference ?? "—";
  const markTelegramOpened = trpc.orders.markTelegramOpened.useMutation();

  const openTelegram = () => {
    if (orderReference.startsWith("BS-")) markTelegramOpened.mutate({ reference: orderReference });
    trackEvent("telegram_handoff_opened");
    window.open(session?.telegramUrl ?? "https://t.me/p6_fq", "_blank", "noopener,noreferrer");
  };

  return <main dir="rtl" className="success-page">
    <header className="success-nav"><button onClick={() => setLocation("/")} className="success-brand"><span><Sparkles size={17} /></span> بطل قصتي</button></header>
    <section className="success-panel">
      <div className="success-check"><Check size={35} /></div>
      <span className="section-label">تم ترتيب بداية الحكاية</span>
      <h1>باقي خطوة واحدة:<br /><em>افتحي تيليجرام وتكلمي معنا.</em></h1>
      <p>سجّلنا تفاصيل البداية، وجهزنا لك رسالة مرتبة حتى ما تعيدين كتابة شيء. بعد فتح المحادثة، نكمل التفاهم معك شخصياً ونطلب الصورة فقط عندما ترتاحين.</p>
      <div className="reference-box"><ClipboardCheck size={19} /><span>رقمك المرجعي</span><b>{orderReference}</b></div>
      <Button className="success-telegram" onClick={openTelegram}>فتح تيليجرام وبدء التفاهم <MessageCircle size={19} /></Button>
      <div className="success-steps"><div><b>1</b><span>راجعي الرسالة الجاهزة ثم أرسليها.</span></div><div><b>2</b><span>نتفاهم معك على الفكرة والشخصية.</span></div><div><b>3</b><span>ترسلين الصورة بعد الاتفاق داخل تيليجرام.</span></div></div>
      <p className="success-privacy"><LockKeyhole size={14} /> لا صورة ولا دفع تم طلبهما في الموقع.</p>
      <button className="back-home" onClick={() => setLocation("/")}>العودة وتعديل التفاصيل <ArrowLeft size={15} /></button>
    </section>
  </main>;
}
