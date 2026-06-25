import { NextResponse } from 'next/server'
import { verifyLedgerChain } from '@/lib/ledger/verify'

export async function GET() {
  try {
    const result = await verifyLedgerChain()
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Verification failed' },
      { status: 500 }
    )
  }
}
