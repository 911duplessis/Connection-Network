import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { normalizeWhatsAppNumber } from '@/lib/whatsapp/normalize'
import { notify } from '@/lib/whatsapp/client'
import { sendEmail } from '@/lib/email/client'

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function POST(req: Request) {
  const { whatsappNumber: raw } = await req.json()
  if (!raw) return NextResponse.json({ error: 'whatsappNumber is required' }, { status: 400 })

  const whatsappNumber = normalizeWhatsAppNumber(raw)
  const { data: vendor } = await supabaseAdmin
    .from('vendors')
    .select('id, name, contact_person, email, whatsapp_number')
    .eq('whatsapp_number', whatsappNumber)
    .maybeSingle()

  if (vendor) {
    const otp = generateOtp()
    const expires = new Date(Date.now() + 15 * 60 * 1000).toISOString()

    await supabaseAdmin
      .from('vendors')
      .update({ reset_otp: otp, reset_otp_expires_at: expires })
      .eq('id', vendor.id)

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://connection-network.vercel.app'

    await sendEmail({
      to: vendor.email,
      subject: `Your password reset code: ${otp}`,
      html: `<p>Hi ${vendor.contact_person},</p>
<p>Your password reset code is: <strong style="font-size:24px">${otp}</strong></p>
<p>This code expires in 15 minutes.</p>
<p>Enter it here: <a href="${appUrl}/vendor-reset-password">${appUrl}/vendor-reset-password</a></p>
<p>If you didn't request this, you can ignore this email.</p>
<p>— The Connection Network</p>`,
    })

    await notify(
      vendor.whatsapp_number,
      `Your Connection Network password reset code is: ${otp}. It expires in 15 minutes. Enter it at ${appUrl}/vendor-reset-password`
    )
  }

  // Always return success to avoid leaking whether the number is registered
  return NextResponse.json({ ok: true })
}
