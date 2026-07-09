import { hashPassword } from '@/lib/admin/auth'

export const VENDOR_SESSION_COOKIE = 'vendor_session'

// Cookie carries the vendor id plus a signature derived from that vendor's
// current password_hash, so changing the password invalidates old sessions
// without needing a server-side session table.
export async function signVendorSession(vendorId: string, passwordHash: string): Promise<string> {
  const sig = await hashPassword(`${vendorId}:${passwordHash}`)
  return `${vendorId}.${sig}`
}

export async function verifyVendorSession(
  cookieValue: string | undefined,
  passwordHash: string | null
): Promise<string | null> {
  if (!cookieValue || !passwordHash) return null
  const [vendorId, sig] = cookieValue.split('.')
  if (!vendorId || !sig) return null
  const expected = await hashPassword(`${vendorId}:${passwordHash}`)
  return sig === expected ? vendorId : null
}
