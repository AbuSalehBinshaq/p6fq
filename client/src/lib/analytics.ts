import { campaignParametersToQuery, hasCampaignParameters, readCampaignParameters, type CampaignParameters } from "@shared/campaignTracking";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export type SafeAnalyticsEvent =
  | "campaign_landing"
  | "form_view"
  | "form_start"
  | "conversation_request_submitted"
  | "telegram_handoff_opened";

function campaignParameters(): CampaignParameters {
  return readCampaignParameters(window.location.search);
}

export function campaignQueryString(): string {
  return campaignParametersToQuery(campaignParameters());
}

/**
 * Event names and parameters are closed by design: no caller can attach form
 * values, contact details, child details, or order references to analytics.
 */
export function trackEvent(eventName: SafeAnalyticsEvent): void {
  window.gtag?.("event", eventName, campaignParameters());
}

export function trackPageView(path: string): void {
  window.gtag?.("event", "page_view", { page_path: path, ...campaignParameters() });
}

export function trackCampaignLanding(): void {
  if (hasCampaignParameters(campaignParameters())) trackEvent("campaign_landing");
}
