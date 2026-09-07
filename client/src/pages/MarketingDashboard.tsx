import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Copy, Link2, Megaphone } from "lucide-react";
import { useMemo, useState } from "react";

const sources = ["instagram", "tiktok", "whatsapp", "telegram", "google"] as const;
export default function MarketingDashboard() {
  const settings = trpc.settings.get.useQuery();
  const [source, setSource] = useState<(typeof sources)[number]>("instagram");
  const [campaign, setCampaign] = useState("");
  const [content, setContent] = useState("");
  const [copied, setCopied] = useState(false);
  const url = useMemo(() => { const base = window.location.origin; const params = new URLSearchParams({ utm_source: source, utm_medium: source === "google" ? "cpc" : "social", utm_campaign: campaign || "new_campaign", utm_content: content || "default" }); return `${base}/?${params.toString()}`; }, [source, campaign, content]);
  const copy = async () => { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1800); };
  return <AdminLayout title="التسويق" description="أنشئي رابطاً لكل إعلان أو منشور، ثم استخدميه لمعرفة مصدر المحادثات والطلبات."><section className="marketing-card"><div className="section-card-heading"><div><span className="section-label">رابط حملة جديد</span><h2>جهّزي رابط الإعلان</h2></div><Megaphone size={23} /></div><div className="settings-grid"><label>المنصة<select value={source} onChange={event => setSource(event.target.value as typeof source)}>{sources.map(item => <option key={item} value={item}>{item}</option>)}</select></label><label>اسم الحملة<input value={campaign} onChange={event => setCampaign(event.target.value)} placeholder="مثال: launch_september" /></label><label>اسم الإعلان أو المحتوى<input value={content} onChange={event => setContent(event.target.value)} placeholder="مثال: reel_01" /></label></div><div className="campaign-url"><Link2 size={17} /><code>{url}</code><button type="button" className="admin-save-button" onClick={copy}><Copy size={15} /> {copied ? "تم النسخ" : "نسخ الرابط"}</button></div></section><section className="marketing-card"><div className="section-card-heading"><div><span className="section-label">طريقة الاستخدام</span><h2>كيف تقيسين النتائج؟</h2></div></div><ol className="marketing-steps"><li>أنشئي رابطاً مختلفاً لكل إعلان أو منشور.</li><li>ضعي الرابط في الإعلان بدل رابط الموقع العادي.</li><li>افتحي قسم الطلبات وراقبي مصدر الإحالة لكل محادثة.</li><li>قارني عدد الطلبات المدفوعة مع تكلفة الحملة في قسم المصاريف.</li></ol><p className="settings-help">المصدر يحفظ مع الطلب لمدة 30 يوماً. معرّف تيليجرام الحالي: <b>{settings.data?.telegramHandle ?? "—"}</b></p></section></AdminLayout>;
}
