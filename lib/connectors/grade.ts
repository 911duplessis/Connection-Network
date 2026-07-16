import { supabaseAdmin } from '@/lib/supabase'
import { appendLedgerEntry } from '@/lib/ledger/hashChain'
import { notify } from '@/lib/whatsapp/client'

export type ConnectorGrade = 'connector' | 'active_partner' | 'ambassador'

// Lifetime closed-referral counts required to reach each grade. Promotion
// only ever moves forward — a slow month never demotes anyone.
const GRADE_THRESHOLDS: Record<Exclude<ConnectorGrade, 'connector'>, number> = {
  active_partner: 5,
  ambassador: 10,
}

const GRADE_MESSAGES: Record<Exclude<ConnectorGrade, 'connector'>, string> = {
  active_partner:
    "You've just hit Active Partner status — 5 closed referrals in, nice work. Your starter pack (flyers, branded WhatsApp link, before/after image kit) is on its way, and your upline override on anyone you recruit just went up.",
  ambassador:
    "You're now an Ambassador — the top tier of The Connection Network. You'll get first look at new leads in your area before anyone else, plus leaderboard status. Thank you for carrying this network.",
}

// The upline override percentage an Active Partner+ connector earns on
// tier-2 commissions from people they've recruited, replacing the vendor's
// default override for that specific upline relationship.
export const PROMOTED_OVERRIDE_PCT = 15

export function overridePctForGrade(grade: ConnectorGrade, vendorDefaultPct: number): number {
  return grade === 'connector' ? vendorDefaultPct : PROMOTED_OVERRIDE_PCT
}

/**
 * Called after a referral is marked won. Checks the connector's lifetime
 * closed-referral count and promotes their grade if they've crossed a
 * threshold, recording the promotion on the public ledger and notifying
 * them. Never throws — a promotion-check failure must not break the
 * referral/payout flow that triggered it.
 */
export async function maybePromoteConnectorGrade(
  connectorId: string,
  whatsappNumber: string | null
): Promise<void> {
  try {
    const { data: connector } = await supabaseAdmin
      .from('connectors')
      .select('grade')
      .eq('id', connectorId)
      .single()

    if (!connector || connector.grade === 'ambassador') return

    const { count } = await supabaseAdmin
      .from('referrals')
      .select('id', { count: 'exact', head: true })
      .eq('connector_id', connectorId)
      .eq('status', 'won')

    const lifetimeCloses = count ?? 0

    let nextGrade: Exclude<ConnectorGrade, 'connector'> | null = null
    if (lifetimeCloses >= GRADE_THRESHOLDS.ambassador) {
      nextGrade = 'ambassador'
    } else if (connector.grade === 'connector' && lifetimeCloses >= GRADE_THRESHOLDS.active_partner) {
      nextGrade = 'active_partner'
    }

    if (!nextGrade || nextGrade === connector.grade) return

    await supabaseAdmin.from('connectors').update({ grade: nextGrade }).eq('id', connectorId)

    await appendLedgerEntry('grade_promoted', {
      connectorId,
      fromGrade: connector.grade,
      toGrade: nextGrade,
      lifetimeCloses,
    })

    await notify(whatsappNumber, GRADE_MESSAGES[nextGrade])
  } catch (err) {
    console.error('[grade] promotion check failed', err)
  }
}
