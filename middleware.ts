import { NextRequest, NextResponse } from 'next/server'
import { ADMIN_SESSION_COOKIE, verifyAdminToken } from '@/lib/admin/auth'

export async function middleware(req: NextRequest) {
  if (req.nextUrl.pathname === '/admin/login') {
    return NextResponse.next()
  }

  const sessionCookie = req.cookies.get(ADMIN_SESSION_COOKIE)?.value

  if (!(await verifyAdminToken(sessionCookie))) {
    return NextResponse.redirect(new URL('/admin/login', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
