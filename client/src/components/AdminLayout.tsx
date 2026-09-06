import { BarChart3, ClipboardList, Home, ReceiptText, Settings, Sparkles } from "lucide-react";
import { useLocation } from "wouter";

const navItems = [
  { href: "/summary", label: "ملخص الشهر", icon: BarChart3 },
  { href: "/orders", label: "الطلبات", icon: ClipboardList },
  { href: "/expenses", label: "المصاريف", icon: ReceiptText },
  { href: "/settings", label: "الإعدادات", icon: Settings },
];

export default function AdminLayout({ children, title, description }: { children: React.ReactNode; title: string; description: string }) {
  const [location] = useLocation();

  return (
    <main dir="rtl" className="admin-shell">
      <aside className="admin-sidebar">
        <a className="admin-brand" href="/">
          <span className="admin-brand-icon"><Sparkles size={17} /></span>
          <span><b>بطل قصتي</b><small>لوحة الإدارة</small></span>
        </a>
        <nav className="admin-nav" aria-label="تنقل لوحة الإدارة">
          <span className="admin-nav-label">المتابعة اليومية</span>
          {navItems.map(({ href, label, icon: Icon }) => (
            <a key={href} href={href} className={location === href ? "active" : ""}>
              <Icon size={17} />
              <span>{label}</span>
            </a>
          ))}
        </nav>
        <div className="admin-sidebar-note">
          <span>مساحتك الهادئة</span>
          <p>سجّلي كل حركة أولاً بأول، وخلي صورة الشهر واضحة قدامك.</p>
        </div>
        <a href="/" className="admin-home-link"><Home size={15} /> العودة للموقع</a>
      </aside>
      <section className="admin-content">
        <header className="admin-page-header">
          <div>
            <span className="admin-kicker">إدارة بطل قصتي</span>
            <h1>{title}</h1>
            <p>{description}</p>
          </div>
        </header>
        {children}
      </section>
    </main>
  );
}
