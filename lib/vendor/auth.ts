import { createVendorToken, verifyVendorToken } from '@/lib/auth/session'

export const VENDOR_SESSION_COOKIE = 'vendor_session'

// Backed by signed JWTs (see lib/auth/session). The token embeds a fingerprint
// of the vendor's current password_hash, so changing the password still
// invalidates old sessions — but the token itself is signed with a server
// secret and can no longer be forged from a leaked password hash.
export async function signVendorSession(vendorId: string, passwordHash: string): Promise<string> {
  return createVendorToken(vendorId, passwordHash)
}

export async function verifyVendorSession(
  cookieValue: string | undefined,
  passwordHash: string | null
): Promise<string | null> {
  return verifyVendorToken(cookieValue, passwordHash)
}
