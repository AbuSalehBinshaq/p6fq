import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";
import { contactMethodLabels, formatChildAgeRange, orderStatusLabels, type OrderStatus } from "@shared/orderFlow";
import { formatCurrency, paymentStatusLabels, type PaymentStatus } from "@shared/finance";
import { CheckCircle2, Clock3, ExternalLink, Filter, MessageCircle, RefreshCw, Search, WalletCards } from "lucide-react";
import { useMemo, useState } from "react";

type OrderDraft = { status: OrderStatus; paymentStatus: PaymentStatus; orderAmount: string; adminNotes: string };
type StatusFilter = "all" | OrderStatus;
type PaymentFilter = "all" | PaymentStatus;

function initialDraft(order: { status: OrderStatus; paymentStatus: PaymentStatus; orderAmount: number; adminNotes: string | null }): OrderDraft {
  return { status: order.status, paymentStatus: order.paymentStatus ?? "unpaid", orderAmount: String(order.orderAmount ?? 0), adminNotes: order.adminNotes ?? "" };
}

function isNewOrder(createdAt: string | Date) {
  return Date.now() - new Date(createdAt).getTime() < 24 * 60 * 60 * 1000;
}

export default function OrdersDashboard() {
  const orders = trpc.orders.list.useQuery();
  const utils = trpc.useUtils();
  const update = trpc.orders.update.useMutation({ onSuccess: () => { void utils.orders.list.invalidate(); void utils.summary.monthly.invalidate(); } });
  const [drafts, setDrafts] = useState<Record<string, OrderDraft>>({});
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [newOnly, setNewOnly] = useState(false);

  const sourceOptions = useMemo(() => {
    const sources = new Set((orders.data ?? []).map(order => order.referralCode ?? "مباشر"));
    return Array.from(sources).sort((a, b) => a.localeCompare(b, "ar"));
  }, [orders.data]);

  const filteredOrders = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return (orders.data ?? []).filter(order => {
      const matchesQuery = !normalized || [order.reference, order.childName, order.childInterest, order.contactValue, order.referralCode ?? ""].join(" ").toLowerCase().includes(normalized);
      const matchesStatus = statusFilter === "all" || order.status === statusFilter;
      const matchesPayment = paymentFilter === "all" || order.paymentStatus === paymentFilter;
      const matchesSource = sourceFilter === "all" || (order.referralCode ?? "مباشر") === sourceFilter;
      const matchesNew = !newOnly || isNewOrder(order.createdAt);
      return matchesQuery && matchesStatus && matchesPayment && matchesSource && matchesNew;
    });
  }, [orders.data, paymentFilter, query, sourceFilter, statusFilter, newOnly]);

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
  const newOrders = orders.data?.filter(order => isNewOrder(order.createdAt)).length ?? 0;
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
  const clearFilters = () => { setQuery(""); setStatusFilter("all"); setPaymentFilter("all"); setSourceFilter("all"); setNewOnly(false); };
  const hasFilters = Boolean(query || statusFilter !== "all" || paymentFilter !== "all" || sourceFilter !== "all" || newOnly);

  return <AdminLayout title="الطلبات" description="تابعي كل طلب من أول محادثة إلى التسليم، وسجّلي قيمته المالية من نفس المكان.">
    <div className="admin-toolbar">
      <label className="admin-search"><Search size={16} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="ابحثي بالاسم أو رقم الطلب…" /></label>
      <div className="admin-toolbar-actions"><span className="record-count">عرض {filteredOrders.length} من {totalOrders}</span><button className="admin-ghost-button" onClick={() => void orders.refetch()} disabled={orders.isFetching}><RefreshCw size={15} className={orders.isFetching ? "spin" : ""} /> تحديث</button></div>
    </div>

    <section className="admin-stat-grid" aria-label="إحصاءات الطلبات">
      <article className="admin-stat-card"><span>إجمالي الطلبات</span><strong>{totalOrders}</strong><small>كل الطلبات المسجلة</small></article>
      <article className="admin-stat-card mint-stat"><span>طلبات مفتوحة</span><strong>{openOrders}</strong><small>تحتاج متابعة أو قرار</small></article>
      <article className="admin-stat-card gold-stat"><span>طلبات جديدة</span><strong>{newOrders}</strong><small>خلال آخر 24 ساعة</small></article>
      <article className="admin-stat-card peach-stat"><span>قيمة المدفوع</span><strong>{formatCurrency(orders.data?.filter(order => order.paymentStatus === "paid").reduce((total, order) => total + Number(order.orderAmount ?? 0), 0) ?? 0)}</strong><small>{paidOrders} طلب مدفوع من أصل {totalOrders}</small></article>
    </section>

    <section className="orders-filter-panel" aria-label="تصفية الطلبات">
      <div className="filter-panel-heading"><div><span className="section-label"><Filter size={14} /> تنظيم المتابعة</span><h2>اختاري ما تريدين متابعته</h2></div>{hasFilters && <button className="filter-clear-button" onClick={clearFilters}>مسح الفلاتر</button>}</div>
      <div className="orders-filter-grid">
        <label>حالة الطلب<select value={statusFilter} onChange={event => setStatusFilter(event.target.value as StatusFilter)}><option value="all">كل الحالات</option>{Object.entries(orderStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label>حالة الدفع<select value={paymentFilter} onChange={event => setPaymentFilter(event.target.value as PaymentFilter)}><option value="all">كل حالات الدفع</option>{Object.entries(paymentStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label>مصدر الطلب<select value={sourceFilter} onChange={event => setSourceFilter(event.target.value)}><option value="all">كل المصادر</option>{sourceOptions.map(source => <option key={source} value={source}>{source}</option>)}</select></label>
        <label className="filter-check"><input type="checkbox" checked={newOnly} onChange={event => setNewOnly(event.target.checked)} /><span>الجديدة خلال 24 ساعة</span></label>
      </div>
    </section>

    {referralSummary.length > 0 && <section className="referral-summary" aria-label="ملخص مصادر الطلبات"><div className="referral-summary-heading"><div><span>مصادر الطلبات</span><h2>من أين تأتي المحادثات؟</h2></div><small>الإسناد محفوظ مع الطلب ولا يعتمد على كلام العميل.</small></div><div className="referral-summary-grid">{referralSummary.map(([source, count]) => <button className={`referral-summary-card ${sourceFilter === source ? "selected" : ""}`} key={source} onClick={() => setSourceFilter(source)}><b>{source}</b><span>{count} {count === 1 ? "طلب" : "طلبات"}</span></button>)}</div></section>}

    {orders.isLoading ? <div className="admin-empty"><RefreshCw size={30} className="spin" /><p>جاري جلب الطلبات…</p></div> : orders.error ? <div className="admin-error"><p>تعذر جلب الطلبات. تأكدي من صلاحية الدخول ثم حاولي مرة أخرى.</p></div> : filteredOrders.length === 0 ? <div className="admin-empty"><MessageCircle size={32} /><h2>{hasFilters ? "ما فيه طلب يطابق الفلاتر" : "ما وصل طلب بعد"}</h2><p>{hasFilters ? "غيّري الفلاتر أو امسحيها لعرض كل الطلبات." : "بيظهر هنا كل عميل يبدأ النموذج من الموقع."}</p>{hasFilters && <button className="filter-clear-button" onClick={clearFilters}>عرض كل الطلبات</button>}</div> : <div className="orders-list">{filteredOrders.map(order => { const draft = draftFor(order); const fresh = isNewOrder(order.createdAt); return <article className={`order-item ${fresh ? "is-new-order" : ""}`} key={order.reference}><div className="order-main"><div className="order-reference"><span>{order.reference}</span><span className={`status-pill status-${draft.status}`}>{orderStatusLabels[draft.status]}</span>{fresh && <span className="new-order-badge"><Clock3 size={12} /> جديد</span>}</div><h2>{order.childName} <small>· {formatChildAgeRange(order.childAge)}</small></h2><p><b>الاهتمام:</b> {order.childInterest}</p><p><b>التواصل:</b> {contactMethodLabels[order.contactMethod]} — {order.contactValue}</p><div className="order-meta"><span>وصل {new Date(order.createdAt).toLocaleString("ar-AE")}</span><span>{order.telegramOpenedAt ? "فتح تيليجرام" : "لم يؤكد فتح تيليجرام"}</span><span>{order.ownerNotifiedAt ? "تم إرسال التنبيه" : "بدون تنبيه"}</span><span className={order.referralCode ? "referral-badge" : "direct-badge"}>{order.referralCode ? `إحالة: ${order.referralCode}` : "طلب مباشر"}</span></div></div><div className="order-actions"><div className="order-finance-heading"><WalletCards size={16} /><span>التفاصيل المالية والمتابعة</span></div><div className="order-form-grid"><label>حالة الطلب<select value={draft.status} onChange={event => changeDraft(order.reference, { status: event.target.value as OrderStatus })}>{Object.entries(orderStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>المبلغ (د.إ)<input inputMode="decimal" type="number" min="0" step="0.01" value={draft.orderAmount} onChange={event => changeDraft(order.reference, { orderAmount: event.target.value })} /></label><label>حالة الدفع<select value={draft.paymentStatus} onChange={event => changeDraft(order.reference, { paymentStatus: event.target.value as PaymentStatus })}>{Object.entries(paymentStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div><label>ملاحظاتك<textarea rows={2} value={draft.adminNotes} onChange={event => changeDraft(order.reference, { adminNotes: event.target.value })} placeholder="مثال: أرسل المعاينة يوم الخميس" /></label><div className="order-action-row"><button className="admin-save-button" onClick={() => saveOrder(order)} disabled={update.isPending}>{update.isPending ? "جاري الحفظ…" : <><CheckCircle2 size={15} /> حفظ التعديلات</>}</button>{order.contactMethod === "telegram" && <a href={`https://t.me/${order.contactValue.replace(/^@/, "")}`} target="_blank" rel="noreferrer">فتح تيليجرام <ExternalLink size={14} /></a>}</div></div></article>; })}</div>}
  </AdminLayout>;
}
