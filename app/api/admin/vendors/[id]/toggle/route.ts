import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase'
import { ADMIN_SESSION_COOKIE, verifyAdminToken } from '@/lib/admin/auth'
import { notify } from '@/lib/whatsapp/client'
import { sendEmail } from '@/lib/email/client'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { active } = await req.json()

  const cookieStore = await cookies()
  const adminCookie = cookieStore.get(ADMIN_SESSION_COOKIE)?.value
  const isAdmin = await verifyAdminToken(adminCookie)

  if (!isAdmin) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 })
  }

  const { data: vendor, error } = await supabaseAdmin
    .from('vendors')
    .update({ active: !!active })
    .eq('id', id)
    .select('name, contact_person, whatsapp_number, email, slug')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  if (active && vendor) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://connection-network.vercel.app'
    await notify(
      vendor.whatsapp_number,
      `Great news, ${vendor.contact_person}! Your ${vendor.name} listing on The Connection Network is now live. ` +
        `Connectors can find and refer clients to you here: ${appUrl}/vendors/${vendor.slug}`
    )
    await sendEmail({
      to: vendor.email,
      subject: `Your listing is live — ${vendor.name}`,
      html: `<p>Hi ${vendor.contact_person},</p>
<p>Great news — your <strong>${vendor.name}</strong> listing on The Connection Network is now live and visible to all connectors.</p>
<p>Your public listing: <a href="${appUrl}/vendors/${vendor.slug}">${appUrl}/vendors/${vendor.slug}</a></p>
<p>Log in to your vendor dashboard to track referrals: <a href="${appUrl}/vendor-login">${appUrl}/vendor-login</a></p>
<p>— The Connection Network</p>`,
    })
  }

  return NextResponse.json({ ok: true })
}
