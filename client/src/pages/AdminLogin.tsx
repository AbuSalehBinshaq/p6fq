import { trpc } from "@/lib/trpc";
import { LockKeyhole, Sparkles } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { useLocation } from "wouter";

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const status = trpc.auth.status.useQuery();
  const login = trpc.auth.login.useMutation({ onSuccess: () => { void status.refetch(); setLocation("/admin"); } });
  const [password, setPassword] = useState("");
  useEffect(() => { if (status.data?.authenticated) setLocation("/admin"); }, [status.data, setLocation]);
  const submit = (event: FormEvent) => { event.preventDefault(); login.mutate({ password }); };
  return <main dir="rtl" className="admin-login-shell"><form className="admin-login-card" onSubmit={submit}><div className="admin-login-brand"><span><Sparkles size={20} /></span><b>أثر</b><small>مساحة الإدارة والتسويق</small></div><div className="admin-login-icon"><LockKeyhole size={22} /></div><h1>تسجيل الدخول</h1><p>ادخلي إلى لوحة التحكم لإدارة الطلبات والحملات والإعدادات.</p><label>كلمة مرور الإدارة<input autoFocus type="password" value={password} onChange={event => setPassword(event.target.value)} placeholder="أدخلي كلمة المرور" /></label><button className="admin-save-button" disabled={login.isPending}>{login.isPending ? "جاري التحقق…" : "دخول لوحة التحكم"}</button>{login.error && <div className="form-error">{login.error.message}</div>}<a href="/">العودة إلى الموقع</a></form></main>;
}
