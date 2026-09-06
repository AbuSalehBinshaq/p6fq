import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { siteSettingLabels, type SiteSettings } from "@shared/siteSettings";
import { CheckCircle2, RotateCcw, Save, Settings2 } from "lucide-react";
import { useEffect, useState } from "react";

const textFields: (keyof SiteSettings)[] = ["brandName", "announcement", "heroTitle", "heroSubtitle", "metaDescription"];
const numericFields: (keyof SiteSettings)[] = ["priceAed", "pdfPages", "responseHours"];

export default function SettingsDashboard() {
  const settings = trpc.settings.get.useQuery();
  const defaults = trpc.settings.defaults.useQuery();
  const update = trpc.settings.update.useMutation({ onSuccess: data => { setForm(data); setSaved(true); void settings.refetch(); } });
  const [form, setForm] = useState<SiteSettings | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => { if (settings.data && !form) setForm(settings.data); }, [settings.data, form]);
  const setValue = (key: keyof SiteSettings, value: string) => { setSaved(false); setForm(current => current ? { ...current, [key]: value } : current); };
  const reset = () => { if (defaults.data) { setForm(defaults.data); setSaved(false); } };
  const submit = (event: React.FormEvent) => { event.preventDefault(); if (form) update.mutate(form); };

  return <AdminLayout title="الإعدادات" description="غيّري محتوى الموقع وسعره وبيانات التتبع من هنا، بدون الرجوع إلى GitHub أو تعديل ملفات برمجية.">
    {settings.isLoading || !form ? <div className="admin-empty"><Settings2 size={30} className="spin" /><p>جاري تحميل الإعدادات…</p></div> : <form className="settings-form" onSubmit={submit}>
      <section className="settings-card"><div className="section-card-heading"><div><span className="section-label">المحتوى التجاري</span><h2>ما يراه العميل</h2></div><Settings2 size={19} /></div><div className="settings-grid">{textFields.map(key => <label key={key}>{siteSettingLabels[key]}{key === "announcement" || key === "metaDescription" ? <textarea rows={key === "announcement" ? 2 : 3} value={form[key]} onChange={event => setValue(key, event.target.value)} /> : <input value={form[key]} onChange={event => setValue(key, event.target.value)} />}</label>)}{numericFields.map(key => <label key={key}>{siteSettingLabels[key]}<input inputMode="numeric" type="number" min="1" value={form[key]} onChange={event => setValue(key, event.target.value)} /></label>)}<label>{siteSettingLabels.telegramHandle}<input dir="ltr" value={form.telegramHandle} onChange={event => setValue("telegramHandle", event.target.value.replace(/^@/, ""))} /></label></div></section>
      <section className="settings-card"><div className="section-card-heading"><div><span className="section-label">التحليلات</span><h2>قياس الزيارات والحملات</h2></div></div><p className="settings-help">هذه المعرّفات عامة وليست كلمات مرور. تتركينها كما هي إذا كانت الحسابات الحالية لك، أو تستبدلينها بمعرّفات حساباتك.</p><div className="settings-grid"><label>{siteSettingLabels.gaMeasurementId}<input dir="ltr" placeholder="G-XXXXXXXXXX" value={form.gaMeasurementId} onChange={event => setValue("gaMeasurementId", event.target.value)} /></label><label>{siteSettingLabels.clarityProjectId}<input dir="ltr" placeholder="xxxxxxxxxx" value={form.clarityProjectId} onChange={event => setValue("clarityProjectId", event.target.value)} /></label></div></section>
      <div className="settings-actions"><button type="submit" className="admin-save-button" disabled={update.isPending}><Save size={15} /> {update.isPending ? "جاري الحفظ…" : "حفظ الإعدادات"}</button><button type="button" className="admin-ghost-button" onClick={reset}><RotateCcw size={15} /> استعادة الافتراضي</button>{saved && <span className="settings-saved"><CheckCircle2 size={15} /> تم الحفظ</span>}</div>
    </form>}
  </AdminLayout>;
}
