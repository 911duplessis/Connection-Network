import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase'
import { hashPassword, ADMIN_SESSION_COOKIE } from '@/lib/admin/auth'
import { normalizeWhatsAppNumber } from '@/lib/whatsapp/normalize'

async function isAdminRequest(): Promise<boolean> {
  const cookieStore = await cookies()
  const adminCookie = cookieStore.get(ADMIN_SESSION_COOKIE)?.value
  return !!adminCookie && adminCookie === (await hashPassword(process.env.ADMIN_PASSWORD ?? ''))
}

export async function POST(req: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 })
  }

  const { businessName, contactWhatsapp, category, marketPhase, invitedBy } = await req.json()

  if (!businessName) {
    return NextResponse.json({ error: 'businessName is required' }, { status: 400 })
  }

  const { data: invitation, error } = await supabaseAdmin
    .from('invitations')
    .insert({
      business_name: businessName,
      contact_whatsapp: contactWhatsapp ? normalizeWhatsAppNumber(contactWhatsapp) : null,
      category: category || null,
      market_phase: marketPhase || null,
      invited_by: invitedBy || null,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ invitation })
}
