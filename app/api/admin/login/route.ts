import { NextResponse } from 'next/server'
import { ADMIN_SESSION_COOKIE, createAdminToken } from '@/lib/admin/auth'

export async function POST(req: Request) {
  const { password } = await req.json()

  if (!process.env.ADMIN_PASSWORD) {
    console.error('[admin/login] ADMIN_PASSWORD is not set in this environment')
    return NextResponse.json(
      { error: 'Admin login is not configured on this deployment (ADMIN_PASSWORD missing)' },
      { status: 500 }
    )
  }

  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
  }

  // createAdminToken() throws if SESSION_SECRET is unset/too short -- surface
  // that as a distinct, honest error instead of letting it 500 into the
  // generic "Invalid password" the frontend used to show for any failure.
  // This exact failure mode has silently broken admin login here before.
  let token: string
  try {
    token = await createAdminToken()
  } catch (err) {
    console.error('[admin/login] failed to create session token', err)
    return NextResponse.json(
      { error: 'Server session is misconfigured (SESSION_SECRET missing or invalid) — this is not a wrong password' },
      { status: 500 }
    )
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  })
  return res
}
