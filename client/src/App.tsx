import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { trackPageView } from "@/lib/analytics";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import SiteRuntime from "./components/SiteRuntime";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import ConversationSuccess from "./pages/ConversationSuccess";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import OrdersDashboard from "./pages/OrdersDashboard";
import ExpensesDashboard from "./pages/ExpensesDashboard";
import MonthlySummary from "./pages/MonthlySummary";
import SettingsDashboard from "./pages/SettingsDashboard";
import AdminLogin from "./pages/AdminLogin";
import MarketingDashboard from "./pages/MarketingDashboard";
import { useEffect } from "react";

function Router() {
  const [location] = useLocation();
  useEffect(() => { trackPageView(location); }, [location]);
  return <Switch>
    <Route path="/" component={Home} /><Route path="/thanks" component={ConversationSuccess} /><Route path="/privacy" component={PrivacyPolicy} />
    <Route path="/admin/login" component={AdminLogin} /><Route path="/admin" component={MonthlySummary} /><Route path="/admin/summary" component={MonthlySummary} /><Route path="/admin/orders" component={OrdersDashboard} /><Route path="/admin/expenses" component={ExpensesDashboard} /><Route path="/admin/settings" component={SettingsDashboard} /><Route path="/admin/marketing" component={MarketingDashboard} />
    <Route path="/summary" component={MonthlySummary} /><Route path="/orders" component={OrdersDashboard} /><Route path="/expenses" component={ExpensesDashboard} /><Route path="/settings" component={SettingsDashboard} />
    <Route path="/404" component={NotFound} /><Route component={NotFound} />
  </Switch>;
}
export default function App() { return <ErrorBoundary><ThemeProvider defaultTheme="light"><TooltipProvider><Toaster richColors position="top-center" /><SiteRuntime /><Router /></TooltipProvider></ThemeProvider></ErrorBoundary>; }
