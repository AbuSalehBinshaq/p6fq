import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { formatCurrency, formatMonthLabel } from "@shared/finance";
import { Download, FileSpreadsheet, TrendingDown, TrendingUp, WalletCards } from "lucide-react";
import { useMemo, useState } from "react";
import * as XLSX from "xlsx";

function currentMonth() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export default function MonthlySummary() {
  const [selectedMonth, setSelectedMonth] = useState(currentMonth());
  const summary = trpc.summary.monthly.useQuery({ month: selectedMonth });
  const expenses = trpc.expenses.list.useQuery({ month: selectedMonth });
  const orders = trpc.orders.list.useQuery();
  const monthOrders = useMemo(() => (orders.data ?? []).filter(order => {
    const date = new Date(order.createdAt);
    const orderMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    return orderMonth === selectedMonth;
  }), [orders.data, selectedMonth]);
  const maxCategoryAmount = Math.max(...(summary.data?.expenseCategories ?? []).map(item => item.amount), 1);
  const isPositive = (summary.data?.netProfit ?? 0) >= 0;

  const downloadExcel = () => {
    const workbook = XLSX.utils.book_new();
    const summaryRows = [
      ["بطل قصتي — ملخص الشهر", formatMonthLabel(selectedMonth)],
      [],
      ["المؤشر", "القيمة"],
      ["عدد الطلبات", summary.data?.orderCount ?? 0],
      ["الطلبات المدفوعة", summary.data?.paidOrderCount ?? 0],
      ["قيمة الطلبات المسجلة", summary.data?.orderValue ?? 0],
      ["المبلغ المحصل", summary.data?.collectedRevenue ?? 0],
      ["إجمالي المصاريف", summary.data?.totalExpenses ?? 0],
      ["الصافي بعد المصاريف", summary.data?.netProfit ?? 0],
    ];
    const orderRows = [["رقم الطلب", "اسم الطفل", "الاهتمام", "الحالة", "حالة الدفع", "المبلغ (د.إ)", "تاريخ الطلب"], ...monthOrders.map(order => [order.reference, order.childName, order.childInterest, order.status, order.paymentStatus, Number(order.orderAmount ?? 0), new Date(order.createdAt).toLocaleDateString("ar-AE")])];
    const expenseRows = [["التاريخ", "الوصف", "التصنيف", "المبلغ (د.إ)", "الملاحظات"], ...(expenses.data ?? []).map(expense => [expense.expenseDate, expense.description, expense.category, Number(expense.amount), expense.notes || ""])];
    const categoryRows = [["تصنيف المصروف", "الإجمالي (د.إ)"], ...(summary.data?.expenseCategories ?? []).map(item => [item.category, item.amount])];
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(summaryRows), "ملخص الشهر");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(orderRows), "الطلبات");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(expenseRows), "المصاريف");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(categoryRows), "تصنيفات المصاريف");
    XLSX.writeFile(workbook, `batal-story-${selectedMonth}.xlsx`);
  };

  return (
    <AdminLayout title="ملخص الشهر" description="لقطة واحدة تساعدك تعرفين وش دخل، وش طلع، ووش النتيجة الفعلية لهذا الشهر.">
      <div className="summary-toolbar"><label><span>اختاري الشهر</span><input type="month" value={selectedMonth} onChange={event => setSelectedMonth(event.target.value)} /></label><button className="admin-export-button" onClick={downloadExcel} disabled={!summary.data}><Download size={16} /> تحميل Excel</button></div>

      {summary.isLoading ? <div className="admin-empty"><WalletCards size={30} /><p>جاري تجهيز ملخص {formatMonthLabel(selectedMonth)}…</p></div> : summary.error ? <div className="admin-error"><p>تعذر تجهيز الملخص. حاولي تحديث الصفحة.</p></div> : <>
        <section className="summary-hero-card"><div><span className="admin-kicker">النتيجة النهائية · {formatMonthLabel(selectedMonth)}</span><h2>هذا الشهر بالصورة الكاملة</h2><p>{isPositive ? "النتيجة موجبة. ممتاز، استمري بتسجيل كل حركة أولاً بأول." : "المصاريف أعلى من المبلغ المحصل حالياً. راجعي الحركات المسجلة قبل اتخاذ أي قرار."}</p></div><div className={`summary-net-value ${isPositive ? "positive" : "negative"}`}><small>الصافي بعد المصاريف</small><strong>{formatCurrency(summary.data?.netProfit ?? 0)}</strong><span>{isPositive ? <><TrendingUp size={15} /> نتيجة موجبة</> : <><TrendingDown size={15} /> يحتاج مراجعة</>}</span></div></section>
        <section className="summary-stat-grid">
          <article className="summary-stat revenue-card"><span>المبلغ المحصل</span><strong>{formatCurrency(summary.data?.collectedRevenue ?? 0)}</strong><small>{summary.data?.paidOrderCount ?? 0} طلبات مدفوعة</small></article>
          <article className="summary-stat expense-card"><span>إجمالي المصاريف</span><strong>{formatCurrency(summary.data?.totalExpenses ?? 0)}</strong><small>{expenses.data?.length ?? 0} عمليات مسجلة</small></article>
          <article className="summary-stat orders-card"><span>قيمة الطلبات المسجلة</span><strong>{formatCurrency(summary.data?.orderValue ?? 0)}</strong><small>{summary.data?.orderCount ?? 0} طلبات في الشهر</small></article>
        </section>
        <section className="summary-grid">
          <article className="summary-panel"><div className="section-card-heading"><div><span className="admin-kicker">توزيع المصاريف</span><h2>وين راحت المصاريف؟</h2></div><TrendingDown size={21} /></div>{summary.data?.expenseCategories.length ? <div className="category-bars">{summary.data.expenseCategories.map(item => <div className="category-bar" key={item.category}><div><span>{item.category}</span><b>{formatCurrency(item.amount)}</b></div><div className="bar-track"><span style={{ width: `${Math.max((item.amount / maxCategoryAmount) * 100, 4)}%` }} /></div></div>)}</div> : <div className="panel-empty">ما فيه مصاريف مسجلة في هذا الشهر.</div>}</article>
          <article className="summary-panel summary-notes"><div className="section-card-heading"><div><span className="admin-kicker">قراءة سريعة</span><h2>وش يعني الرقم؟</h2></div><FileSpreadsheet size={21} /></div><div className="summary-breakdown"><p><span>المبلغ المحصل</span><b>{formatCurrency(summary.data?.collectedRevenue ?? 0)}</b></p><p><span>ناقص المصاريف</span><b className="red-number">− {formatCurrency(summary.data?.totalExpenses ?? 0)}</b></p><p className="final-line"><span>الصافي</span><b>{formatCurrency(summary.data?.netProfit ?? 0)}</b></p></div><div className="summary-tip"><WalletCards size={16} /><span>الطلبات غير المدفوعة ما تدخل في الصافي إلا بعد تسجيل حالة الدفع كـ «مدفوع».</span></div></article>
        </section>
      </>}
    </AdminLayout>
  );
}
