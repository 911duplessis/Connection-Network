export interface VendorRewardConfig {
  tier1Pct: number
  tier1FlatCents: number
  tier2OverridePct: number
}

export interface CommissionBreakdown {
  tier1AmountCents: number
  tier2AmountCents: number
  hasTier2: boolean
}

export function calculateCommission(
  jobValueCents: number,
  config: VendorRewardConfig,
  hasUpline: boolean
): CommissionBreakdown {
  const tier1AmountCents = Math.round(jobValueCents * (config.tier1Pct / 100)) + config.tier1FlatCents
  const tier2AmountCents = hasUpline ? Math.round(tier1AmountCents * (config.tier2OverridePct / 100)) : 0
  return { tier1AmountCents, tier2AmountCents, hasTier2: hasUpline }
}
