import bcrypt from 'bcryptjs'
import { sha256Hex } from '@/lib/auth/sha256'

const BCRYPT_ROUNDS = 12

// Hash a new password with bcrypt (salted, adaptive cost).
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS)
}

function isBcryptHash(stored: string): boolean {
  return /^\$2[aby]\$/.test(stored)
}

// Constant-time comparison for equal-length hex strings.
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

// Verify a password against a stored hash. Supports both the new bcrypt format
// and the legacy unsalted SHA-256 hex format. When a legacy hash verifies, the
// caller is told to re-hash with bcrypt (transparent upgrade on login) so that
// existing accounts are migrated without ever locking anyone out.
export async function verifyPassword(
  password: string,
  stored: string | null | undefined
): Promise<{ ok: boolean; needsUpgrade: boolean }> {
  if (!stored) return { ok: false, needsUpgrade: false }
  if (isBcryptHash(stored)) {
    return { ok: await bcrypt.compare(password, stored), needsUpgrade: false }
  }
  const ok = safeEqual(await sha256Hex(password), stored)
  return { ok, needsUpgrade: ok }
}
