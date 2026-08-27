export const campaignParameterNames = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
] as const;

export type CampaignParameterName = (typeof campaignParameterNames)[number];
export type CampaignParameters = Partial<Record<CampaignParameterName, string>>;

const safeCampaignValue = /^[a-z0-9][a-z0-9_-]{0,79}$/i;

/**
 * Keeps campaign reporting limited to the four standard UTM fields. Query
 * parameters unrelated to campaign attribution are intentionally discarded.
 */
export function readCampaignParameters(search: string): CampaignParameters {
  const query = new URLSearchParams(search);

  return campaignParameterNames.reduce<CampaignParameters>((parameters, key) => {
    const value = query.get(key)?.trim();
    if (value && safeCampaignValue.test(value)) parameters[key] = value;
    return parameters;
  }, {});
}

export function hasCampaignParameters(parameters: CampaignParameters): boolean {
  return Object.keys(parameters).length > 0;
}

export function campaignParametersToQuery(parameters: CampaignParameters): string {
  return new URLSearchParams(parameters).toString();
}
