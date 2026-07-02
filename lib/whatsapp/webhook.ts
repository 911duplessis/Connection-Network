// Verifies Meta's X-Hub-Signature-256 header: HMAC-SHA256 over the exact raw
// request body, keyed with the Meta App Secret. Must run on the raw text
// before any JSON.parse, since the signature commits to the original bytes.
export async function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  appSecret: string | undefined
): Promise<boolean> {
  if (!appSecret) return false
  if (!signatureHeader?.startsWith('sha256=')) return false

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(appSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sigBuffer = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody))
  const computedHex = Array.from(new Uint8Array(sigBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

  return computedHex === signatureHeader.slice('sha256='.length)
}
