import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase'
import { ADMIN_SESSION_COOKIE, verifyAdminToken } from '@/lib/admin/auth'

// Manual admin override for the routing engine's vendor match. Not
// ledger-logged -- an internal correction, not a public trust event,
// consistent with how vendor activation toggles are handled today.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { vendorId } = await req.json()

  const cookieStore = await cookies()
  const adminCookie = cookieStore.get(ADMIN_SESSION_COOKIE)?.value
  const isAdmin = await verifyAdminToken(adminCookie)

  if (!isAdmin) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 })
  }

  if (!vendorId) {
    return NextResponse.json({ error: 'vendorId is required' }, { status: 400 })
  }

  const { error } = await supabaseAdmin.from('referrals').update({ vendor_id: vendorId }).eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
