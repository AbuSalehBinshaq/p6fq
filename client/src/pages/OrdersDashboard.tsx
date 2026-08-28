import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";
import { contactMethodLabels, formatChildAgeRange, orderStatusLabels, type OrderStatus } from "@shared/orderFlow";
import { formatCurrency, paymentStatusLabels, type PaymentStatus } from "@shared/finance";
import { CheckCircle2, ExternalLink, MessageCircle, RefreshCw, Search, WalletCards } from "lucide-react";
import { useMemo, useState } from "react";

type OrderDraft = {
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  orderAmount: string;
  adminNotes: string;
};

function initialDraft(order: { status: OrderStatus; paymentStatus: PaymentStatus; orderAmount: number; adminNotes: string | null }): OrderDraft {
  return {
    status: order.status,
    paymentStatus: order.paymentStatus ?? "unpaid",
    orderAmount: String(order.orderAmount ?? 0),
    adminNotes: order.adminNotes ?? "",
  };
}

export default function OrdersDashboard() {
  const orders = trpc.orders.list.useQuery();
  const utils = trpc.useUtils();
  const update = trpc.orders.update.useMutation({
    onSuccess: () => {
      void utils.orders.list.invalidate();
      void utils.summary.monthly.invalidate();
    },
  });
  const [drafts, setDrafts] = useState<Record<string, OrderDraft>>({});
  const [query, setQuery] = useState("");

  const filteredOrders = useMemo(() => {
    const allOrders = orders.data ?? [];
    const normalized = query.trim().toLowerCase();
    if (!normalized) return allOrders;
    return allOrders.filter(order => [order.reference, order.childName, order.childInterest, order.contactValue].join(" ").toLowerCase().includes(normalized));
  }, [orders.data, query]);

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
    update.mutate({
      reference: order.reference,
      status: draft.status,
      adminNotes: draft.adminNotes,
      orderAmount: Number(draft.orderAmount) || 0,
      paymentStatus: draft.paymentStatus,
    });
  };

  return (
    <AdminLayout title="الطلبات" description="تابعي كل طلب من أول محادثة إلى التسليم، وسجّلي قيمته المالية من نفس المكان.">
      <div className="admin-toolbar">
        <label className="admin-search"><Search size={16} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="ابحثي بالاسم أو رقم الطلب…" /></label>
        <button className="admin-ghost-button" onClick={() => void orders.refetch()} disabled={orders.isFetching}><RefreshCw size={15} className={orders.isFetching ? "spin" : ""} /> تحديث</button>
      </div>

      <section className="admin-stat-grid" aria-label="إحصاءات الطلبات">
        <article className="admin-stat-card"><span>إجمالي الطلبات</span><strong>{totalOrders}</strong><small>كل الطلبات المسجلة</small></article>
        <article className="admin-stat-card mint-stat"><span>طلبات مفتوحة</span><strong>{openOrders}</strong><small>تحتاج متابعة أو قرار</small></article>
        <article className="admin-stat-card gold-stat"><span>طلبات مدفوعة</span><strong>{paidOrders}</strong><small>تم تأكيد الدفع</small></article>
        <article className="admin-stat-card peach-stat"><span>قيمة الطلبات</span><strong>{formatCurrency(orderValue)}</strong><small>حسب المبالغ المدخلة</small></article>
      </section>

      {orders.isLoading ? <div className="admin-empty"><RefreshCw size={30} className="spin" /><p>جاري جلب الطلبات…</p></div> : orders.error ? <div className="admin-error"><p>تعذر جلب الطلبات. تأكدي من صلاحية الدخول ثم حاولي مرة أخرى.</p></div> : filteredOrders.length === 0 ? <div className="admin-empty"><MessageCircle size={32} /><h2>{query ? "ما لقينا طلب بهذا البحث" : "ما وصل طلب بعد"}</h2><p>{query ? "جربي كلمة بحث مختلفة أو امسحي البحث لعرض كل الطلبات." : "بيظهر هنا كل عميل يبدأ النموذج من الموقع."}</p></div> : <div className="orders-list">{filteredOrders.map(order => {
        const draft = draftFor(order);
        return <article className="order-item" key={order.reference}>
          <div className="order-main">
            <div className="order-reference"><span>{order.reference}</span><span className={`status-pill status-${draft.status}`}>{orderStatusLabels[draft.status]}</span></div>
            <h2>{order.childName} <small>· {formatChildAgeRange(order.childAge)}</small></h2>
            <p><b>الاهتمام:</b> {order.childInterest}</p>
            <p><b>التواصل:</b> {contactMethodLabels[order.contactMethod]} — {order.contactValue}</p>
            <div className="order-meta"><span>وصل {new Date(order.createdAt).toLocaleString("ar-AE")}</span><span>{order.telegramOpenedAt ? "فتح تيليجرام" : "لم يؤكد فتح تيليجرام"}</span><span>{order.ownerNotifiedAt ? "تم إرسال التنبيه" : "بدون تنبيه"}</span></div>
          </div>
          <div className="order-actions">
            <div className="order-finance-heading"><WalletCards size={16} /><span>التفاصيل المالية</span></div>
            <div className="order-form-grid">
              <label>حالة الطلب<select value={draft.status} onChange={event => changeDraft(order.reference, { status: event.target.value as OrderStatus })}>{Object.entries(orderStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <label>المبلغ (د.إ)<input inputMode="decimal" type="number" min="0" step="0.01" value={draft.orderAmount} onChange={event => changeDraft(order.reference, { orderAmount: event.target.value })} /></label>
              <label>حالة الدفع<select value={draft.paymentStatus} onChange={event => changeDraft(order.reference, { paymentStatus: event.target.value as PaymentStatus })}>{Object.entries(paymentStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            </div>
            <label>ملاحظاتك<textarea rows={2} value={draft.adminNotes} onChange={event => changeDraft(order.reference, { adminNotes: event.target.value })} placeholder="مثال: أرسل المعاينة يوم الخميس" /></label>
            <div className="order-action-row"><button className="admin-save-button" onClick={() => saveOrder(order)} disabled={update.isPending}>{update.isPending ? "جاري الحفظ…" : <><CheckCircle2 size={15} /> حفظ التعديلات</>}</button>{order.contactMethod === "telegram" && <a href={`https://t.me/${order.contactValue.replace(/^@/, "")}`} target="_blank" rel="noreferrer">فتح تيليجرام <ExternalLink size={14} /></a>}</div>
          </div>
        </article>;
      })}</div>}
    </AdminLayout>
  );
}
