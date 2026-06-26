import { NextRequest, NextResponse } from 'next/server'
import { hashPassword, ADMIN_SESSION_COOKIE } from '@/lib/admin/auth'

export async function middleware(req: NextRequest) {
  if (req.nextUrl.pathname === '/admin/login') {
    return NextResponse.next()
  }

  const sessionCookie = req.cookies.get(ADMIN_SESSION_COOKIE)?.value
  const expected = await hashPassword(process.env.ADMIN_PASSWORD ?? '')

  if (!sessionCookie || sessionCookie !== expected) {
    return NextResponse.redirect(new URL('/admin/login', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
