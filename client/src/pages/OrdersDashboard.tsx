import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";
import { contactMethodLabels, formatChildAgeRange, orderStatusLabels, type OrderStatus } from "@shared/orderFlow";
import { formatCurrency, paymentStatusLabels, type PaymentStatus } from "@shared/finance";
import { Check, CheckCircle2, Copy, ExternalLink, MessageCircle, RefreshCw, RotateCcw, Search, Send, SlidersHorizontal, WalletCards } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type OrderDraft = { status: OrderStatus; paymentStatus: PaymentStatus; orderAmount: string; adminNotes: string };
type StatusFilter = "all" | OrderStatus;

function initialDraft(order: { status: OrderStatus; paymentStatus: PaymentStatus; orderAmount: number; adminNotes: string | null; referralCode?: string | null }): OrderDraft {
  return { status: order.status, paymentStatus: order.paymentStatus ?? "unpaid", orderAmount: String(order.orderAmount ?? 0), adminNotes: order.adminNotes ?? "" };
}

export default function OrdersDashboard() {
  const orders = trpc.orders.list.useQuery(undefined, { refetchInterval: 10000, refetchIntervalInBackground: true });
  const utils = trpc.useUtils();
  const [savingReference, setSavingReference] = useState<string | null>(null);
  const update = trpc.orders.update.useMutation({ onMutate: variables => setSavingReference(variables.reference), onSuccess: () => { void utils.orders.list.invalidate(); void utils.summary.monthly.invalidate(); toast.success("تم حفظ تعديلات الطلب."); }, onSettled: () => setSavingReference(null) });
  const [drafts, setDrafts] = useState<Record<string, OrderDraft>>({});
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [onlyOpen, setOnlyOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [replyChatId, setReplyChatId] = useState("");
  const [replyMessage, setReplyMessage] = useState("");
  const sendReply = trpc.telegram.sendReply.useMutation({ onSuccess: () => { setReplyMessage(""); toast.success("تم إرسال الرسالة عبر البوت."); } });

  const filteredOrders = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return (orders.data ?? []).filter(order => {
      const matchesQuery = !normalized || [order.reference, order.childName, order.childInterest, order.contactValue, order.referralCode ?? ""].join(" ").toLowerCase().includes(normalized);
      const matchesStatus = statusFilter === "all" || order.status === statusFilter;
      const matchesOpen = !onlyOpen || !["delivered", "cancelled"].includes(order.status);
      return matchesQuery && matchesStatus && matchesOpen;
    });
  }, [orders.data, query, statusFilter, onlyOpen]);
  const referralSummary = useMemo(() => {
    const counts = new Map<string, number>();
    for (const order of orders.data ?? []) {
      const source = order.referralCode ?? "مباشر";
      counts.set(source, (counts.get(source) ?? 0) + 1);
    }
    return Array.from(counts.entries()).sort(([, a], [, b]) => b - a);
  }, [orders.data]);

  const totalOrders = orders.data?.length ?? 0;
  const paidOrders = orders.data?.filter(order => order.paymentStatus === "paid").length ?? 0;
  const openOrders = orders.data?.filter(order => !["delivered", "cancelled"].includes(order.status)).length ?? 0;
  const orderValue = orders.data?.reduce((total, order) => total + Number(order.orderAmount ?? 0), 0) ?? 0;
  const draftFor = (order: (typeof filteredOrders)[number]) => drafts[order.reference] ?? initialDraft(order);
  const changeDraft = (reference: string, changes: Partial<OrderDraft>) => {
    const order = orders.data?.find(item => item.reference === reference);
    if (!order) return;
    setDrafts(current => ({ ...current, [reference]: { ...initialDraft(order), ...current[reference], ...changes } }));
  };
  const saveOrder = (order: (typeof filteredOrders)[number]) => {
    const draft = draftFor(order);
    update.mutate({ reference: order.reference, status: draft.status, adminNotes: draft.adminNotes, orderAmount: Number(draft.orderAmount) || 0, paymentStatus: draft.paymentStatus });
  };
  const resetDraft = (reference: string) => setDrafts(current => { const next = { ...current }; delete next[reference]; return next; });
  const copyText = async (value: string, key: string) => {
    try { await navigator.clipboard.writeText(value); setCopied(key); window.setTimeout(() => setCopied(current => current === key ? null : current), 1600); }
    catch { toast.error("تعذر النسخ. حاولي تحديد النص ونسخه يدوياً."); }
  };
  const clearFilters = () => { setQuery(""); setStatusFilter("all"); setOnlyOpen(false); };

  return <AdminLayout title="الطلبات" description="تابعي كل طلب من أول محادثة إلى التسليم، وسجّلي قيمته المالية من نفس المكان.">
      <div className="admin-toolbar"><label className="admin-search"><Search size={16} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="ابحثي بالاسم أو رقم الطلب…" /></label><div className="admin-toolbar-actions"><span className="auto-refresh-status"><span className="auto-refresh-dot" /> يتحدث تلقائياً</span><span className="record-count">{orders.dataUpdatedAt ? `آخر تحديث ${new Date(orders.dataUpdatedAt).toLocaleTimeString("ar-AE", { hour: "2-digit", minute: "2-digit" })}` : ""}</span><button className="admin-ghost-button" type="button" onClick={() => void orders.refetch()} disabled={orders.isFetching}><RefreshCw size={14} className={orders.isFetching ? "spin" : ""} /> تحديث</button></div></div>
      <section className="orders-filter-panel"><div className="filter-panel-heading"><div><span className="section-label"><SlidersHorizontal size={13} /> تصفية الطلبات</span><h2>{filteredOrders.length} من {totalOrders} طلب</h2></div>{(query || statusFilter !== "all" || onlyOpen) && <button className="filter-clear-button" type="button" onClick={clearFilters}>مسح الفلاتر</button>}</div><div className="orders-filter-grid"><label>حالة الطلب<select value={statusFilter} onChange={event => setStatusFilter(event.target.value as StatusFilter)}><option value="all">كل الحالات ({totalOrders})</option>{Object.entries(orderStatusLabels).map(([value, label]) => <option key={value} value={value}>{label} ({orders.data?.filter(order => order.status === value).length ?? 0})</option>)}</select></label><label className="filter-check"><input type="checkbox" checked={onlyOpen} onChange={event => setOnlyOpen(event.target.checked)} /> عرض الطلبات المفتوحة فقط</label></div></section>
    <section className="admin-stat-card" style={{ marginBottom: "1.5rem", textAlign: "right" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.35rem" }}><Send size={17} /><strong>إرسال رسالة مباشرة عبر البوت</strong></div><p className="settings-help" style={{ margin: "0 0 0.75rem" }}>انسخي Chat ID من إشعار البوت والصقيه هنا، ثم اكتبي الرسالة. يجب أن يكون العميل قد بدأ المحادثة مع البوت أولاً.</p>
      <div className="order-form-grid">
        <label>Chat ID من إشعار البوت<input inputMode="numeric" value={replyChatId} onChange={event => setReplyChatId(event.target.value)} placeholder="مثال: 123456789" /></label>
        <label style={{ gridColumn: "1 / -1" }}>نص الرد<textarea rows={3} value={replyMessage} onChange={event => setReplyMessage(event.target.value)} placeholder="اكتبي ردك هنا…" /></label>
      </div>
      <div className="order-action-row" style={{ marginTop: "0.75rem" }}><button className="admin-save-button" onClick={() => sendReply.mutate({ chatId: replyChatId.trim(), message: replyMessage })} disabled={sendReply.isPending || !replyChatId.trim() || !replyMessage.trim()}>{sendReply.isPending ? "جاري الإرسال…" : <><Send size={15} /> إرسال الرد</>}</button>{sendReply.isSuccess && <span>تم إرسال الرد للعميل.</span>}{sendReply.error && <span className="admin-error">تعذر الإرسال: {sendReply.error.message}</span>}</div>
    </section>
    <section className="admin-stat-grid" aria-label="إحصاءات الطلبات"><article className="admin-stat-card"><span>إجمالي الطلبات</span><strong>{totalOrders}</strong><small>كل الطلبات المسجلة</small></article><article className="admin-stat-card mint-stat"><span>طلبات مفتوحة</span><strong>{openOrders}</strong><small>تحتاج متابعة أو قرار</small></article><article className="admin-stat-card gold-stat"><span>طلبات مدفوعة</span><strong>{paidOrders}</strong><small>تم تأكيد الدفع</small></article><article className="admin-stat-card peach-stat"><span>قيمة الطلبات</span><strong>{formatCurrency(orderValue)}</strong><small>حسب المبالغ المدخلة</small></article></section>
    {referralSummary.length > 0 && <section className="referral-summary" aria-label="ملخص إحالات الأدمن"><div className="referral-summary-heading"><div><span>مصادر الطلبات</span><h2>كل رمز يوصلك بالأدمن الصحيح</h2></div><small>الإسناد محفوظ مع الطلب ولا يعتمد على كلام العميل.</small></div><div className="referral-summary-grid">{referralSummary.map(([source, count]) => <div className="referral-summary-card" key={source}><b>{source}</b><span>{count} {count === 1 ? "طلب" : "طلبات"}</span></div>)}</div></section>}
    {orders.isLoading ? <div className="admin-empty"><RefreshCw size={30} className="spin" /><p>جاري جلب الطلبات…</p></div> : orders.error ? <div className="admin-error"><p>تعذر جلب الطلبات. تأكدي من صلاحية الدخول ثم حاولي مرة أخرى.</p></div> : filteredOrders.length === 0 ? <div className="admin-empty"><MessageCircle size={32} /><h2>{query ? "ما لقينا طلب بهذا البحث" : "ما وصل طلب بعد"}</h2><p>{query ? "جربي كلمة بحث مختلفة أو امسحي البحث لعرض كل الطلبات." : "بيظهر هنا كل عميل يبدأ النموذج من الموقع."}</p></div> : <div className="orders-list">{filteredOrders.map(order => { const draft = draftFor(order); return <article className="order-item" key={order.reference}><div className="order-main"><div className="order-reference"><span>{order.reference}</span><span className={`status-pill status-${draft.status}`}>{orderStatusLabels[draft.status]}</span></div><h2>{order.childName} <small>· {formatChildAgeRange(order.childAge)}</small></h2><p><b>الاهتمام:</b> {order.childInterest}</p><p><b>التواصل:</b> {contactMethodLabels[order.contactMethod]} — {order.contactValue}</p><div className="order-meta"><span>وصل {new Date(order.createdAt).toLocaleString("ar-AE")}</span><span>{order.telegramOpenedAt ? "فتح تيليجرام" : "لم يؤكد فتح تيليجرام"}</span><span>{order.ownerNotifiedAt ? "تم إرسال التنبيه" : "بدون تنبيه"}</span><span className={order.referralCode ? "referral-badge" : "direct-badge"}>{order.referralCode ? `إحالة: ${order.referralCode}` : "طلب مباشر"}</span></div><div className="order-copy-actions"><button type="button" className="copy-inline-button" onClick={() => void copyText(order.reference, `ref-${order.reference}`)}>{copied === `ref-${order.reference}` ? <Check size={13} /> : <Copy size={13} />} {copied === `ref-${order.reference}` ? "تم النسخ" : "نسخ رقم الطلب"}</button>{order.contactMethod === "telegram" && <button type="button" className="copy-inline-button" onClick={() => void copyText(order.contactValue.replace(/^@/, ""), `contact-${order.reference}`)}>{copied === `contact-${order.reference}` ? <Check size={13} /> : <Copy size={13} />} {copied === `contact-${order.reference}` ? "تم النسخ" : "نسخ المعرف"}</button>}</div></div><div className="order-actions"><div className="order-finance-heading"><WalletCards size={16} /><span>التفاصيل المالية</span></div><div className="order-form-grid"><label>حالة الطلب<select value={draft.status} onChange={event => changeDraft(order.reference, { status: event.target.value as OrderStatus })}>{Object.entries(orderStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>المبلغ (د.إ)<input inputMode="decimal" type="number" min="0" step="0.01" value={draft.orderAmount} onChange={event => changeDraft(order.reference, { orderAmount: event.target.value })} /></label><label>حالة الدفع<select value={draft.paymentStatus} onChange={event => changeDraft(order.reference, { paymentStatus: event.target.value as PaymentStatus })}>{Object.entries(paymentStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div><label>ملاحظاتك<textarea rows={2} value={draft.adminNotes} onChange={event => changeDraft(order.reference, { adminNotes: event.target.value })} placeholder="مثال: أرسل المعاينة يوم الخميس" /></label><div className="order-action-row"><button className="admin-save-button" onClick={() => saveOrder(order)} disabled={savingReference !== null}>{savingReference === order.reference ? "جاري الحفظ…" : <><CheckCircle2 size={15} /> حفظ التعديلات</>}</button>{drafts[order.reference] && <button className="admin-ghost-button" type="button" onClick={() => resetDraft(order.reference)} disabled={savingReference !== null}><RotateCcw size={14} /> إلغاء التعديلات</button>}{order.contactMethod === "telegram" && <a href={`https://t.me/${order.contactValue.replace(/^@/, "")}`} target="_blank" rel="noreferrer">فتح تيليجرام <ExternalLink size={14} /></a>}</div></div></article>; })}</div>}
  </AdminLayout>;
}
