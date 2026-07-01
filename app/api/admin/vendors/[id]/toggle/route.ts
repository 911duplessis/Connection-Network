import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase'
import { hashPassword, ADMIN_SESSION_COOKIE } from '@/lib/admin/auth'
import { notify } from '@/lib/whatsapp/client'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { active } = await req.json()

  const cookieStore = await cookies()
  const adminCookie = cookieStore.get(ADMIN_SESSION_COOKIE)?.value
  const isAdmin = !!adminCookie && adminCookie === (await hashPassword(process.env.ADMIN_PASSWORD ?? ''))

  if (!isAdmin) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 })
  }

  const { data: vendor, error } = await supabaseAdmin
    .from('vendors')
    .update({ active: !!active })
    .eq('id', id)
    .select('name, contact_person, whatsapp_number, slug')
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
  }

  return NextResponse.json({ ok: true })
}
