import { supabase } from '@/lib/supabase'

export interface ChainVerification {
  valid: boolean
  brokenAtSeq: number | null
  totalEntries: number
}

export async function verifyLedgerChain(): Promise<ChainVerification> {
  const { data, error } = await supabase.rpc('verify_ledger_chain').single()
  if (error) throw error
  const result = data as { valid: boolean; broken_at_seq: number | null; total_entries: number }
  return {
    valid: result.valid,
    brokenAtSeq: result.broken_at_seq,
    totalEntries: Number(result.total_entries),
  }
}
