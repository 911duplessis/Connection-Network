import { SignJWT, jwtVerify, decodeJwt } from 'jose'
import { sha256Hex } from '@/lib/auth/sha256'

// Signed session tokens (HS256 JWTs). The signing key is a server-only secret,
// so tokens cannot be forged even if a password hash leaks — unlike the previous
// scheme where the cookie was a deterministic digest of the password itself.
// Edge-safe: this module only depends on `jose`, never on bcrypt.

const ALG = 'HS256'
const EXPIRY = '7d'

function secretKey(): Uint8Array {
  const s = process.env.SESSION_SECRET
  if (!s || s.length < 16) {
    throw new Error(
      'SESSION_SECRET is not set (or shorter than 16 chars). Set a strong random value in the environment before authentication can work.'
    )
  }
  return new TextEncoder().encode(s)
}

export async function createAdminToken(): Promise<string> {
  return new SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime(EXPIRY)
    .sign(secretKey())
}

export async function verifyAdminToken(token: string | undefined): Promise<boolean> {
  if (!token) return false
  try {
    const { payload } = await jwtVerify(token, secretKey())
    return payload.role === 'admin'
  } catch {
    return false
  }
}

// Non-secret fingerprint of the vendor's current password hash. Embedding it in
// the token preserves the original design property that changing the password
// invalidates existing sessions, without needing a server-side session table.
async function passwordFingerprint(passwordHash: string): Promise<string> {
  return (await sha256Hex(passwordHash)).slice(0, 16)
}

export async function createVendorToken(vendorId: string, passwordHash: string): Promise<string> {
  return new SignJWT({ vendorId, ph: await passwordFingerprint(passwordHash) })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime(EXPIRY)
    .sign(secretKey())
}

export async function verifyVendorToken(
  token: string | undefined,
  currentPasswordHash: string | null
): Promise<string | null> {
  if (!token || !currentPasswordHash) return null
  try {
    const { payload } = await jwtVerify(token, secretKey())
    const vendorId = typeof payload.vendorId === 'string' ? payload.vendorId : null
    if (!vendorId) return null
    if (payload.ph !== (await passwordFingerprint(currentPasswordHash))) return null
    return vendorId
  } catch {
    return null
  }
}

// Reads the vendorId claim out of a vendor session token WITHOUT verifying its
// signature. This exists only to solve the chicken-and-egg problem of needing
// a vendor's password_hash (to verify the token) before knowing which vendor
// the token even claims to be. Never treat this as an authorization decision —
// always follow it with verifyVendorToken() against the fetched password hash,
// and compare its return value against this claimed id before trusting it.
export function unsafeDecodeVendorId(token: string | undefined): string | null {
  if (!token) return null
  try {
    const payload = decodeJwt(token)
    return typeof payload.vendorId === 'string' ? payload.vendorId : null
  } catch {
    return null
  }
}
