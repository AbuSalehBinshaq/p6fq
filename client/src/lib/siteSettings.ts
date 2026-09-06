import { trpc } from "@/lib/trpc";
import { defaultSiteSettings, type SiteSettings } from "@shared/siteSettings";

export function useSiteSettings(): SiteSettings {
  const query = trpc.site.settings.useQuery(undefined, { staleTime: 60_000 });
  return { ...defaultSiteSettings, ...(query.data ?? {}) };
}
