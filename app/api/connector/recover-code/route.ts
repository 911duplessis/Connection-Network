import { NextResponse } from 'next/server'
import { normalizeWhatsAppNumber } from '@/lib/whatsapp/normalize'
import { recoverConnectorCode } from '@/lib/connectors/recoverCode'

export async function POST(req: Request) {
  const { whatsappNumber: raw } = await req.json()
  if (!raw) return NextResponse.json({ error: 'whatsappNumber is required' }, { status: 400 })

  await recoverConnectorCode(normalizeWhatsAppNumber(raw))

  // Always return success — don't reveal whether the number is registered
  return NextResponse.json({ ok: true })
}
