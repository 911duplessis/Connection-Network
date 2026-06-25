import { supabaseAdmin } from '@/lib/supabase'
import type { LedgerEntryType } from './types'

export async function appendLedgerEntry(entryType: LedgerEntryType, payload: Record<string, unknown>) {
  const { data, error } = await supabaseAdmin
    .rpc('append_ledger_entry', { p_entry_type: entryType, p_payload: payload })
    .single()

  if (error) throw error
  return data as { seq: number; hash: string; entry_type: string; payload: Record<string, unknown>; created_at: string }
}
