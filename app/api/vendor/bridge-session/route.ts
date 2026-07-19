import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase'
import { VENDOR_SESSION_COOKIE, verifyVendorSession, unsafeDecodeVendorId } from '@/lib/vendor/auth'
import { createBridgeSession } from '@/lib/auth/bridge'

export async function POST() {
  const cookieStore = await cookies()
  const vendorCookie = cookieStore.get(VENDOR_SESSION_COOKIE)?.value
  const claimedVendorId = unsafeDecodeVendorId(vendorCookie)

  if (!claimedVendorId) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 })
  }

  const { data: vendor } = await supabaseAdmin
    .from('vendors')
    .select('id, password_hash')
    .eq('id', claimedVendorId)
    .single()

  const verifiedVendorId = await verifyVendorSession(vendorCookie, vendor?.password_hash ?? null)

  if (!verifiedVendorId || !vendor || verifiedVendorId !== vendor.id) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 })
  }

  try {
    const session = await createBridgeSession('vendor', vendor.id)
    return NextResponse.json(session)
  } catch (err) {
    console.error('[bridge-session] vendor bridge failed', err)
    return NextResponse.json({ error: 'Live updates unavailable' }, { status: 503 })
  }
}
