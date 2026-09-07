import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Copy, Link2, Plus, RefreshCw, Save } from "lucide-react";
import { useState } from "react";

const campaignQuery = "utm_source=telegram&utm_medium=group&utm_campaign=telegram_admin";

export default function PartnersDashboard() {
  const partners = trpc.partners.list.useQuery();
  const utils = trpc.useUtils();
  const [name, setName] = useState("");
  const [commissionType, setCommissionType] = useState<"fixed" | "percent">("fixed");
  const [commissionValue, setCommissionValue] = useState("0");
  const create = trpc.partners.create.useMutation({ onSuccess: () => { setName(""); setCommissionValue("0"); void utils.partners.list.invalidate(); } });
  const update = trpc.partners.update.useMutation({ onSuccess: () => void utils.partners.list.invalidate() });
  const baseUrl = window.location.origin;
  const createPartner = (event: React.FormEvent) => { event.preventDefault(); create.mutate({ name, commissionType, commissionValue }); };
  const copy = async (value: string) => { await navigator.clipboard?.writeText(value); };

  return <AdminLayout title="الشركاء" description="أضيفي اسم الشريك فقط، وسيُنشئ النظام كوداً عشوائياً وروابط جاهزة تلقائياً.">
    <section className="settings-card" style={{ marginBottom: "1.5rem" }}><div className="section-card-heading"><div><span className="section-label">شريك جديد</span><h2>إنشاء كود تلقائي</h2></div><Plus size={19} /></div>
      <form className="settings-grid" onSubmit={createPartner}>
        <label>اسم الشريك<input value={name} onChange={e => setName(e.target.value)} placeholder="مثال: أم حليمة" required /></label>
        <label>نوع العمولة<select value={commissionType} onChange={e => setCommissionType(e.target.value as "fixed" | "percent")}><option value="fixed">مبلغ ثابت لكل طلب</option><option value="percent">نسبة مئوية</option></select></label>
        <label>قيمة العمولة<input inputMode="decimal" value={commissionValue} onChange={e => setCommissionValue(e.target.value)} placeholder="0" required /></label>
        <div className="settings-actions" style={{ gridColumn: "1 / -1" }}><button className="admin-save-button" disabled={create.isPending}><Plus size={15} /> {create.isPending ? "جاري الإنشاء…" : "إضافة وإنشاء الرابط"}</button>{create.error && <span className="admin-error">{create.error.message}</span>}</div>
      </form>
    </section>
    <section className="orders-list"><div className="section-card-heading"><div><span className="section-label">الأكواد الحالية</span><h2>روابط الشركاء</h2></div><button className="admin-ghost-button" onClick={() => void partners.refetch()}><RefreshCw size={15} /> تحديث</button></div>
      {(partners.data ?? []).map(partner => { const shortLink = `${baseUrl}/partner/${partner.code}`; const longLink = `${baseUrl}/?partner=${partner.code}&${campaignQuery}`; return <article className="order-item" key={partner.id}><div className="order-main"><div className="order-reference"><span>{partner.name}</span><span className={partner.active ? "status-pill status-paid" : "status-pill status-cancelled"}>{partner.active ? "فعال" : "موقوف"}</span></div><p><b>الكود التلقائي:</b> <span dir="ltr">{partner.code}</span></p><p><b>العمولة:</b> {partner.commissionType === "percent" ? `${partner.commissionValue}%` : `${partner.commissionValue} د.إ`} لكل طلب مدفوع</p><div className="order-meta"><span>سيظهر اسم «{partner.name}» عند وصول طلب بهذا الكود</span></div></div><div className="order-actions"><label>الرابط الكامل مع حملة Telegram<input dir="ltr" readOnly value={longLink} /></label><div className="order-action-row"><button className="admin-ghost-button" onClick={() => void copy(longLink)}><Copy size={15} /> نسخ الكامل</button><label>الرابط المختصر<input dir="ltr" readOnly value={shortLink} /></label><button className="admin-ghost-button" onClick={() => void copy(shortLink)}><Copy size={15} /> نسخ المختصر</button><a href={shortLink} target="_blank" rel="noreferrer"><Link2 size={15} /> تجربة الرابط</a><button className="admin-save-button" onClick={() => update.mutate({ id: partner.id, active: !partner.active })} disabled={update.isPending}><Save size={15} /> {partner.active ? "إيقاف" : "تفعيل"}</button></div></div></article>; })}
      {!partners.isLoading && !(partners.data ?? []).length && <div className="admin-empty"><p>لم تتم إضافة شركاء بعد.</p></div>}
    </section>
  </AdminLayout>;
}
