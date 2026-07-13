import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { normalizeWhatsAppNumber } from '@/lib/whatsapp/normalize'
import { notify } from '@/lib/whatsapp/client'
import { sendEmail } from '@/lib/email/client'

export async function POST(req: Request) {
  const { whatsappNumber: raw } = await req.json()
  if (!raw) return NextResponse.json({ error: 'whatsappNumber is required' }, { status: 400 })

  const whatsappNumber = normalizeWhatsAppNumber(raw)

  const { data: connector } = await supabaseAdmin
    .from('connectors')
    .select('name, referral_code, email, whatsapp_number')
    .eq('whatsapp_number', whatsappNumber)
    .maybeSingle()

  if (connector) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://connection-network.vercel.app'

    await notify(
      connector.whatsapp_number,
      `Hi ${connector.name}, your Connection Network referral code is: ${connector.referral_code}. ` +
        `Use it with your WhatsApp number to log in at ${appUrl}/connector/dashboard`
    )

    await sendEmail({
      to: connector.email,
      subject: `Your referral code: ${connector.referral_code}`,
      html: `<p>Hi ${connector.name},</p>
<p>Your referral code is: <strong style="font-size:24px">${connector.referral_code}</strong></p>
<p>Use it with your WhatsApp number to log in to your dashboard: <a href="${appUrl}/connector/dashboard">${appUrl}/connector/dashboard</a></p>
<p>— The Connection Network</p>`,
    })
  }

  // Always return success — don't reveal whether the number is registered
  return NextResponse.json({ ok: true })
}
