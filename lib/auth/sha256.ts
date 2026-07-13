// Edge-safe, dependency-free SHA-256 (hex). Used to verify and transparently
// upgrade legacy unsalted password hashes, and to derive a non-secret
// fingerprint of a vendor's current password hash for session invalidation.
// Kept in its own module so the edge middleware (which only needs the session
// helpers) never transitively bundles bcrypt.
export async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
