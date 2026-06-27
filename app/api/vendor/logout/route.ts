import { NextResponse } from 'next/server'
import { VENDOR_SESSION_COOKIE } from '@/lib/vendor/auth'

export async function POST() {
  const res = NextResponse.json({ ok: true })
  res.cookies.delete(VENDOR_SESSION_COOKIE)
  return res
}
