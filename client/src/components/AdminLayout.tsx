import { BarChart3, ClipboardList, Home, LogOut, Megaphone, ReceiptText, Settings, Sparkles } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

const navItems = [
  { href: "/admin/summary", label: "ملخص الشهر", icon: BarChart3 }, { href: "/admin/orders", label: "الطلبات", icon: ClipboardList }, { href: "/admin/expenses", label: "المصاريف", icon: ReceiptText }, { href: "/admin/marketing", label: "المسوقون والعمولات", icon: Megaphone }, { href: "/admin/settings", label: "الإعدادات", icon: Settings },
];
export default function AdminLayout({ children, title, description }: { children: React.ReactNode; title: string; description: string }) {
  const [location, setLocation] = useLocation(); const status = trpc.auth.status.useQuery(); const logout = trpc.auth.logout.useMutation({ onSuccess: () => setLocation("/admin/login") });
  if (!status.isLoading && !status.data?.authenticated) { if (location !== "/admin/login") setLocation("/admin/login"); return null; }
  return <main dir="rtl" className="admin-shell"><aside className="admin-sidebar"><a className="admin-brand" href="/admin"><span className="admin-brand-icon"><Sparkles size={17} /></span><span><b>أثر</b><small>لوحة الإدارة</small></span></a><nav className="admin-nav" aria-label="تنقل لوحة الإدارة"><span className="admin-nav-label">إدارة المشروع</span>{navItems.map(({ href, label, icon: Icon }) => <a key={href} href={href} className={location === href ? "active" : ""}><Icon size={17} /><span>{label}</span></a>)}</nav><div className="admin-sidebar-note"><span>مساحتك الهادئة</span><p>الطلبات والتسويق والإعدادات في مكان واحد.</p></div><a href="/" className="admin-home-link"><Home size={15} /> العودة للموقع</a><button className="admin-logout-button" onClick={() => logout.mutate()}><LogOut size={15} /> تسجيل الخروج</button></aside><section className="admin-content"><header className="admin-page-header"><div><span className="admin-kicker">إدارة أثر</span><h1>{title}</h1><p>{description}</p></div></header>{children}</section></main>;
}
