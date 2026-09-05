import { useSiteSettings } from "@/lib/siteSettings";
import { useEffect } from "react";

export default function SiteRuntime() {
  const settings = useSiteSettings();
  useEffect(() => {
    document.title = `${settings.brandName} | قصة عربية مخصصة لطفلك`;
    const description = document.querySelector('meta[name="description"]');
    if (description) description.setAttribute("content", settings.metaDescription);
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.setAttribute("href", window.location.origin + "/");
    if (settings.gaMeasurementId && !document.querySelector(`[data-ga-id="${settings.gaMeasurementId}"]`)) {
      const script = document.createElement("script");
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(settings.gaMeasurementId)}`;
      script.dataset.gaId = settings.gaMeasurementId;
      document.head.appendChild(script);
      window.dataLayer = window.dataLayer || [];
      window.gtag = window.gtag || ((...args: unknown[]) => window.dataLayer.push(args));
      window.gtag("js", new Date());
      window.gtag("config", settings.gaMeasurementId, { send_page_view: false });
    }
    if (settings.clarityProjectId && !document.querySelector(`[data-clarity-id="${settings.clarityProjectId}"]`)) {
      const script = document.createElement("script");
      script.async = true;
      script.dataset.clarityId = settings.clarityProjectId;
      script.text = `(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${settings.clarityProjectId}");`;
      document.head.appendChild(script);
    }
  }, [settings.gaMeasurementId, settings.clarityProjectId]);
  return null;
}

declare global {
  interface Window {
    dataLayer: unknown[];
  }
}
