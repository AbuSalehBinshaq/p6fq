import AdminLayout from "@/components/AdminLayout";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { storyOrderStatusLabels, storyPaymentStatusLabels, type StoryOrderStatus, type StoryPaymentStatus } from "@shared/storyOrders";
import { emptyStoryPages, storyProductionStatusLabels, storyProductionStatusValues, type StoryProductionStatus } from "@shared/storyProduction";
import { FileText, Image, RefreshCw, Save, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type ProductionForm = {
  reference: string;
  storyBrief: { childName: string; childAge: number; storyIdea: string; educationalValue: string; additionalNotes: string; characterDescription: string };
  storyTitle: string;
  characterDescription: string;
  storyText: string;
  pageScenes: Array<{ pageNumber: number; scene: string }>;
  leonardoPrompts: Array<{ pageNumber: number; prompt: string }>;
  productionStatus: StoryProductionStatus;
};

function formFromOrder(reference: string, order?: { childName: string; childAge: number; storyIdea: string; educationalValue: string; additionalNotes: string }): ProductionForm {
  return {
    reference,
    storyBrief: { childName: order?.childName ?? "", childAge: order?.childAge ?? 2, storyIdea: order?.storyIdea ?? "", educationalValue: order?.educationalValue ?? "", additionalNotes: order?.additionalNotes ?? "", characterDescription: "" },
    storyTitle: "",
    characterDescription: "",
    storyText: "",
    pageScenes: emptyStoryPages().map(page => ({ pageNumber: page.pageNumber, scene: page.scene })),
    leonardoPrompts: emptyStoryPages().map(page => ({ pageNumber: page.pageNumber, prompt: page.prompt })),
    productionStatus: "draft",
  };
}

export default function StoryOrdersDashboard() {
  const orders = trpc.storyOrders.list.useQuery(undefined, { refetchInterval: 15000 });
  const [selectedReference, setSelectedReference] = useState<string | null>(null);
  const selected = trpc.storyOrders.get.useQuery({ reference: selectedReference! }, { enabled: Boolean(selectedReference) });
  const photo = trpc.storyOrders.photoUrl.useQuery({ reference: selectedReference! }, { enabled: Boolean(selectedReference) });
  const production = trpc.storyOrders.production.useQuery({ reference: selectedReference! }, { enabled: Boolean(selectedReference) });
  const [form, setForm] = useState<ProductionForm | null>(null);
  const update = trpc.storyOrders.updateStatus.useMutation({ onSuccess: () => { void orders.refetch(); void selected.refetch(); toast.success("تم حفظ حالة الطلب."); } });
  const saveProduction = trpc.storyOrders.saveProduction.useMutation({ onSuccess: () => { void production.refetch(); toast.success("تم حفظ ملف الإنتاج ونتيجة التحقق."); } });
  const productionErrors = production.data?.validationResult.errors ?? [];
  const productionWarnings = production.data?.validationResult.warnings ?? [];

  useEffect(() => {
    if (!selectedReference) { setForm(null); return; }
    if (production.data) {
      setForm({ reference: selectedReference, storyBrief: production.data.storyBrief, storyTitle: production.data.storyTitle, characterDescription: production.data.characterDescription, storyText: production.data.storyText, pageScenes: production.data.pageScenes, leonardoPrompts: production.data.leonardoPrompts, productionStatus: production.data.productionStatus });
    } else if (selected.data) {
      setForm(formFromOrder(selectedReference, selected.data));
    }
  }, [selectedReference, selected.data, production.data]);

  const canSave = useMemo(() => Boolean(form && !saveProduction.isPending), [form, saveProduction.isPending]);
  const close = () => setSelectedReference(null);
  const updateForm = <K extends keyof ProductionForm>(key: K, value: ProductionForm[K]) => setForm(current => current ? { ...current, [key]: value } : current);

  return <AdminLayout title="طلبات القصص" description="طلبات الإنتاج الجديدة منفصلة عن استفسارات Telegram القديمة.">
    <div className="admin-toolbar"><span className="record-count">{orders.data?.length ?? 0} طلب قصة</span><button className="admin-ghost-button" type="button" onClick={() => void orders.refetch()} disabled={orders.isFetching}><RefreshCw size={14} className={orders.isFetching ? "spin" : ""} /> تحديث</button></div>
    {orders.isLoading ? <div className="admin-empty"><RefreshCw size={30} className="spin" /><p>جاري جلب طلبات القصص…</p></div> : orders.error ? <div className="admin-error">تعذر جلب طلبات القصص.</div> : !orders.data?.length ? <div className="admin-empty"><FileText size={30} /><h2>لا توجد طلبات قصص بعد</h2><p>ستظهر هنا الطلبات التي تصل من صفحة /order.</p></div> : <div className="story-admin-list">{orders.data.map(order => <article className="story-admin-card" key={order.reference}><div><span className="order-reference">{order.reference}</span><h2>{order.childName}</h2><p>{order.storyIdea}</p><div className="order-meta"><span>{new Date(order.createdAt).toLocaleString("ar-AE")}</span><span>{storyPaymentStatusLabels[order.paymentStatus]}</span></div></div><div className="story-admin-card-actions"><span className={`status-pill status-${order.status}`}>{storyOrderStatusLabels[order.status]}</span><button className="admin-save-button" type="button" onClick={() => setSelectedReference(order.reference)}>فتح التفاصيل</button></div></article>)}</div>}
    {selectedReference && <div className="story-detail-backdrop" role="presentation" onClick={close}><section className="story-detail-panel story-production-panel" role="dialog" aria-modal="true" onClick={event => event.stopPropagation()}><button className="story-detail-close" type="button" onClick={close} aria-label="إغلاق"><X size={18} /></button>{selected.isLoading || !selected.data || !form ? <div className="admin-empty">جاري تحميل التفاصيل…</div> : <>
      <span className="section-label">تفاصيل طلب القصة</span><h2>{selected.data.reference}</h2>
      <div className="story-detail-grid"><p><b>اسم الطفل:</b> {selected.data.childName}</p><p><b>العمر:</b> {selected.data.childAge} سنوات</p><p><b>تاريخ الطلب:</b> {new Date(selected.data.createdAt).toLocaleString("ar-AE")}</p><p><b>الدفع:</b> {storyPaymentStatusLabels[selected.data.paymentStatus]}</p></div>
      <h3>فكرة القصة</h3><p>{selected.data.storyIdea}</p><h3>القيمة التعليمية</h3><p>{selected.data.educationalValue}</p>{selected.data.additionalNotes && <><h3>ملاحظات</h3><p>{selected.data.additionalNotes}</p></>}
      {photo.data?.url && <a className="story-photo-link" href={photo.data.url} target="_blank" rel="noreferrer"><Image size={17} /> فتح صورة الطفل برابط موقّع قصير العمر</a>}
      <div className="story-detail-controls"><label>حالة الطلب<select value={selected.data.status} onChange={event => update.mutate({ reference: selected.data!.reference, status: event.target.value as StoryOrderStatus, paymentStatus: selected.data!.paymentStatus })}>{Object.entries(storyOrderStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>حالة الدفع<select value={selected.data.paymentStatus} onChange={event => update.mutate({ reference: selected.data!.reference, status: selected.data!.status, paymentStatus: event.target.value as StoryPaymentStatus })}>{Object.entries(storyPaymentStatusLabels).map(([value, label]) => <option key={value} value={label === storyPaymentStatusLabels.paid ? "paid" : "unpaid"}>{label}</option>)}</select></label></div>
      <hr className="story-production-divider" /><div className="story-production-heading"><div><span className="section-label">Story Production</span><h3>ملف الإنتاج اليدوي</h3></div><span className="production-note">لا يوجد توليد آلي أو إرسال صورة إلى LLM</span></div>
      <label>حالة الإنتاج<select value={form.productionStatus} onChange={event => updateForm("productionStatus", event.target.value as StoryProductionStatus)}>{storyProductionStatusValues.map(value => <option key={value} value={value}>{storyProductionStatusLabels[value]}</option>)}</select></label>
      <label>عنوان القصة<input value={form.storyTitle} onChange={event => updateForm("storyTitle", event.target.value)} maxLength={240} /></label>
      <label>وصف الشخصية الكرتونية<textarea value={form.characterDescription} onChange={event => updateForm("characterDescription", event.target.value)} maxLength={2000} /></label>
      <label>نص القصة<textarea className="story-production-story-text" value={form.storyText} onChange={event => updateForm("storyText", event.target.value)} maxLength={16000} /></label>
      <h4>مشاهد الصفحات وLeonardo Prompts — 8 صفحات بالضبط</h4>
      <div className="story-production-pages">{form.pageScenes.map((page, index) => <fieldset key={page.pageNumber}><legend>الصفحة {page.pageNumber}</legend><label>المشهد<Textarea value={page.scene} onChange={event => { const pages = [...form.pageScenes]; pages[index] = { ...page, scene: event.target.value }; updateForm("pageScenes", pages); }} /></label><label>Leonardo Prompt<Textarea value={form.leonardoPrompts[index]?.prompt ?? ""} onChange={event => { const prompts = [...form.leonardoPrompts]; prompts[index] = { pageNumber: page.pageNumber, prompt: event.target.value }; updateForm("leonardoPrompts", prompts); }} /></label></fieldset>)}</div>
      {(productionErrors.length > 0 || productionWarnings.length > 0) && <div className="story-validation-result"><b>نتيجة التحقق المحلي</b>{productionErrors.length > 0 && <div><strong>أخطاء مانعة:</strong><ul>{productionErrors.map(error => <li key={error}>{error}</li>)}</ul></div>}{productionWarnings.length > 0 && <div><strong>تحذيرات للمراجعة البشرية:</strong><ul>{productionWarnings.map(warning => <li key={warning}>{warning}</li>)}</ul></div>}</div>}
      <button className="admin-save-button story-production-save" type="button" disabled={!canSave} onClick={() => form && saveProduction.mutate(form)}><Save size={16} /> {saveProduction.isPending ? "جاري الحفظ…" : "حفظ ملف الإنتاج"}</button>
    </>}</section></div>}
  </AdminLayout>;
}
