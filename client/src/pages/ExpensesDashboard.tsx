import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { expenseCategories, formatCurrency, formatMonthLabel } from "@shared/finance";
import { CalendarDays, Plus, ReceiptText, Trash2 } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";

function localDateValue() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function monthValue(date: string) {
  return date.slice(0, 7);
}

export default function ExpensesDashboard() {
  const [selectedMonth, setSelectedMonth] = useState(monthValue(localDateValue()));
  const [form, setForm] = useState<{ description: string; category: (typeof expenseCategories)[number]; amount: string; expenseDate: string; notes: string }>({ description: "", category: expenseCategories[0], amount: "", expenseDate: localDateValue(), notes: "" });
  const expenses = trpc.expenses.list.useQuery({ month: selectedMonth });
  const utils = trpc.useUtils();
  const createExpense = trpc.expenses.create.useMutation({
    onSuccess: () => {
      setForm({ description: "", category: expenseCategories[0], amount: "", expenseDate: localDateValue(), notes: "" });
      void utils.expenses.list.invalidate();
      void utils.summary.monthly.invalidate();
    },
  });
  const deleteExpense = trpc.expenses.delete.useMutation({
    onSuccess: () => {
      void utils.expenses.list.invalidate();
      void utils.summary.monthly.invalidate();
    },
  });

  const total = useMemo(() => (expenses.data ?? []).reduce((sum, expense) => sum + Number(expense.amount), 0), [expenses.data]);
  const topCategory = useMemo(() => {
    const totals = (expenses.data ?? []).reduce<Record<string, number>>((result, expense) => {
      result[expense.category] = (result[expense.category] ?? 0) + Number(expense.amount);
      return result;
    }, {});
    return Object.entries(totals).sort(([, first], [, second]) => second - first)[0];
  }, [expenses.data]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    createExpense.mutate({ ...form, amount: Number(form.amount), category: form.category as (typeof expenseCategories)[number] });
  };

  const remove = (id: number) => {
    if (window.confirm("حذف هذا المصروف؟ لا يمكن التراجع عن الحذف.")) deleteExpense.mutate({ id });
  };

  return (
    <AdminLayout title="المصاريف" description="سجّلي تكاليف التشغيل أولاً بأول، وخلّي كل مبلغ مربوطاً بتاريخه وتصنيفه.">
      <div className="month-toolbar"><label><CalendarDays size={16} /> عرض شهر <input type="month" value={selectedMonth} onChange={event => setSelectedMonth(event.target.value)} /></label><span>{formatMonthLabel(selectedMonth)}</span></div>

      <section className="admin-stat-grid expense-stat-grid" aria-label="ملخص المصاريف">
        <article className="admin-stat-card peach-stat"><span>إجمالي المصاريف</span><strong>{formatCurrency(total)}</strong><small>خلال {formatMonthLabel(selectedMonth)}</small></article>
        <article className="admin-stat-card mint-stat"><span>عدد العمليات</span><strong>{expenses.data?.length ?? 0}</strong><small>مصروف مسجّل هذا الشهر</small></article>
        <article className="admin-stat-card gold-stat"><span>أعلى تصنيف</span><strong>{topCategory?.[0] ?? "—"}</strong><small>{topCategory ? formatCurrency(topCategory[1]) : "لا توجد بيانات بعد"}</small></article>
      </section>

      <section className="expense-form-card">
        <div className="section-card-heading"><div><span className="admin-kicker">إضافة حركة جديدة</span><h2>سجّلي المصروف</h2></div><ReceiptText size={23} /></div>
        <form onSubmit={submit} className="expense-form">
          <label>وصف المصروف<input required minLength={2} maxLength={160} value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} placeholder="مثال: اشتراك أداة تصميم" /></label>
          <label>التصنيف<select value={form.category} onChange={event => setForm({ ...form, category: event.target.value as (typeof expenseCategories)[number] })}>{expenseCategories.map(category => <option key={category}>{category}</option>)}</select></label>
          <label>المبلغ (د.إ)<input required type="number" min="0.01" step="0.01" inputMode="decimal" value={form.amount} onChange={event => setForm({ ...form, amount: event.target.value })} placeholder="0.00" /></label>
          <label>التاريخ<input required type="date" value={form.expenseDate} onChange={event => setForm({ ...form, expenseDate: event.target.value })} /></label>
          <label className="wide-field">ملاحظة اختيارية<textarea maxLength={500} rows={2} value={form.notes} onChange={event => setForm({ ...form, notes: event.target.value })} placeholder="أي تفاصيل تساعدك تراجعين المصروف لاحقاً" /></label>
          <button type="submit" className="admin-save-button" disabled={createExpense.isPending}><Plus size={16} /> {createExpense.isPending ? "جاري الإضافة…" : "إضافة المصروف"}</button>
        </form>
        {createExpense.error && <p className="form-error">{createExpense.error.message || "ما قدرنا نضيف المصروف. راجعي البيانات وحاولي مرة ثانية."}</p>}
      </section>

      <section className="expense-list-card">
        <div className="section-card-heading"><div><span className="admin-kicker">سجل الشهر</span><h2>المصاريف المسجلة</h2></div><span className="record-count">{expenses.data?.length ?? 0} عمليات</span></div>
        {expenses.isLoading ? <div className="admin-table-empty">جاري تحميل المصاريف…</div> : expenses.error ? <div className="admin-table-empty">تعذر تحميل المصاريف.</div> : expenses.data?.length === 0 ? <div className="admin-table-empty"><ReceiptText size={28} /><p>ما فيه مصاريف مسجلة في هذا الشهر.</p></div> : <div className="expenses-table-wrap"><table className="expenses-table"><thead><tr><th>التاريخ</th><th>الوصف</th><th>التصنيف</th><th>المبلغ</th><th>ملاحظات</th><th><span className="sr-only">الإجراء</span></th></tr></thead><tbody>{expenses.data?.map(expense => <tr key={expense.id}><td>{new Date(`${expense.expenseDate}T00:00:00`).toLocaleDateString("ar-AE")}</td><td><b>{expense.description}</b></td><td><span className="category-pill">{expense.category}</span></td><td className="amount-cell">{formatCurrency(Number(expense.amount))}</td><td className="notes-cell">{expense.notes || "—"}</td><td><button className="icon-danger-button" title="حذف المصروف" onClick={() => remove(expense.id)} disabled={deleteExpense.isPending}><Trash2 size={15} /></button></td></tr>)}</tbody></table></div>}
      </section>
    </AdminLayout>
  );
}
