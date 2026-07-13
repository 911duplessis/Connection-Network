import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase'
import { hashPassword, ADMIN_SESSION_COOKIE } from '@/lib/admin/auth'
import { sendWhatsAppText } from '@/lib/whatsapp/client'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const cookieStore = await cookies()
  const adminCookie = cookieStore.get(ADMIN_SESSION_COOKIE)?.value
  const isAdmin = !!adminCookie && adminCookie === (await hashPassword(process.env.ADMIN_PASSWORD ?? ''))

  if (!isAdmin) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 })
  }

  const { data: invitation } = await supabaseAdmin.from('invitations').select('*').eq('id', id).single()

  if (!invitation) {
    return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
  }

  if (!invitation.contact_whatsapp) {
    return NextResponse.json({ error: 'This invitation has no WhatsApp number set' }, { status: 400 })
  }

  const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL}/vendors/signup?invite=${invitation.invite_token}`

  await sendWhatsAppText({
    to: invitation.contact_whatsapp,
    body: `Hi ${invitation.business_name}, we're building The Connection Network — a referral network where connectors send you warm leads and you only pay when you close. No cost to join. Want in? Set your own terms here: ${inviteLink}`,
  })

  const { error } = await supabaseAdmin
    .from('invitations')
    .update({ status: 'sent', sent_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
