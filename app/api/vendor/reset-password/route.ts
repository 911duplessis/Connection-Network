import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { normalizeWhatsAppNumber } from '@/lib/whatsapp/normalize'
import { hashPassword } from '@/lib/admin/auth'

export async function POST(req: Request) {
  const { whatsappNumber: raw, otp, password } = await req.json()

  if (!raw || !otp || !password) {
    return NextResponse.json({ error: 'whatsappNumber, otp, and password are required' }, { status: 400 })
  }

  if (password.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
  }

  const whatsappNumber = normalizeWhatsAppNumber(raw)

  const { data: vendor } = await supabaseAdmin
    .from('vendors')
    .select('id, reset_otp, reset_otp_expires_at')
    .eq('whatsapp_number', whatsappNumber)
    .maybeSingle()

  if (!vendor || vendor.reset_otp !== otp) {
    return NextResponse.json({ error: 'Invalid reset code' }, { status: 400 })
  }

  if (!vendor.reset_otp_expires_at || new Date(vendor.reset_otp_expires_at) < new Date()) {
    return NextResponse.json({ error: 'Reset code has expired. Please request a new one.' }, { status: 400 })
  }

  const password_hash = await hashPassword(password)

  const { error } = await supabaseAdmin
    .from('vendors')
    .update({ password_hash, reset_otp: null, reset_otp_expires_at: null })
    .eq('id', vendor.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
