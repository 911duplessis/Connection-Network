import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyPassword, hashPassword } from '@/lib/auth/password'
import { signVendorSession, VENDOR_SESSION_COOKIE } from '@/lib/vendor/auth'
import { normalizeWhatsAppNumber } from '@/lib/whatsapp/normalize'

export async function POST(req: Request) {
  const { whatsappNumber: rawWhatsappNumber, password } = await req.json()

  if (!rawWhatsappNumber || !password) {
    return NextResponse.json({ error: 'whatsappNumber and password are required' }, { status: 400 })
  }

  const { data: vendor } = await supabaseAdmin
    .from('vendors')
    .select('id, password_hash')
    .eq('whatsapp_number', normalizeWhatsAppNumber(rawWhatsappNumber))
    .single()

  if (!vendor || !vendor.password_hash) {
    return NextResponse.json({ error: 'Invalid WhatsApp number or password' }, { status: 401 })
  }

  const { ok, needsUpgrade } = await verifyPassword(password, vendor.password_hash)
  if (!ok) {
    return NextResponse.json({ error: 'Invalid WhatsApp number or password' }, { status: 401 })
  }

  // Transparently migrate a legacy unsalted-SHA-256 hash to bcrypt on successful
  // login, so existing accounts are upgraded without any forced password reset.
  let effectiveHash = vendor.password_hash
  if (needsUpgrade) {
    const upgraded = await hashPassword(password)
    const { error: upgradeError } = await supabaseAdmin
      .from('vendors')
      .update({ password_hash: upgraded })
      .eq('id', vendor.id)
    if (!upgradeError) effectiveHash = upgraded
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set(VENDOR_SESSION_COOKIE, await signVendorSession(vendor.id, effectiveHash), {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  })
  return res
}
