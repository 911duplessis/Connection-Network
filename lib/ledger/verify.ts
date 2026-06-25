import { supabase } from '@/lib/supabase'

export interface ChainVerification {
  valid: boolean
  brokenAtSeq: number | null
  totalEntries: number
}

export async function verifyLedgerChain(): Promise<ChainVerification> {
  const { data, error } = await supabase.rpc('verify_ledger_chain').single()
  if (error) throw error
  return {
    valid: data.valid as boolean,
    brokenAtSeq: data.broken_at_seq as number | null,
    totalEntries: Number(data.total_entries),
  }
}
