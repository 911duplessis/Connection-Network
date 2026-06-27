import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { hashPassword } from '@/lib/admin/auth'
import { signVendorSession, VENDOR_SESSION_COOKIE } from '@/lib/vendor/auth'

export async function POST(req: Request) {
  const { whatsappNumber, password } = await req.json()

  if (!whatsappNumber || !password) {
    return NextResponse.json({ error: 'whatsappNumber and password are required' }, { status: 400 })
  }

  const { data: vendor } = await supabaseAdmin
    .from('vendors')
    .select('id, password_hash')
    .eq('whatsapp_number', whatsappNumber)
    .single()

  if (!vendor || !vendor.password_hash) {
    return NextResponse.json({ error: 'Invalid WhatsApp number or password' }, { status: 401 })
  }

  const candidateHash = await hashPassword(password)
  if (candidateHash !== vendor.password_hash) {
    return NextResponse.json({ error: 'Invalid WhatsApp number or password' }, { status: 401 })
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set(VENDOR_SESSION_COOKIE, await signVendorSession(vendor.id, vendor.password_hash), {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  })
  return res
}
