const API_VERSION = 'v21.0'

interface SendTextOptions {
  to: string
  body: string
}

export async function sendWhatsAppText({ to, body }: SendTextOptions): Promise<void> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID

  if (!token || !phoneNumberId) {
    console.warn('[whatsapp] WHATSAPP_ACCESS_TOKEN/WHATSAPP_PHONE_NUMBER_ID not set, skipping send to', to)
    return
  }

  const res = await fetch(`https://graph.facebook.com/${API_VERSION}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body },
    }),
  })

  if (!res.ok) {
    const errorBody = await res.text()
    console.error('[whatsapp] send failed', res.status, errorBody)
  }
}

/**
 * notify() never throws — a WhatsApp delivery failure must not break the
 * referral/payout flow that triggered it.
 */
export async function notify(to: string | null | undefined, body: string): Promise<void> {
  if (!to) return
  try {
    await sendWhatsAppText({ to, body })
  } catch (err) {
    console.error('[whatsapp] notify error', err)
  }
}

interface SendTemplateOptions {
  to: string
  template: string
  languageCode?: string
  bodyParams?: string[]
}

/**
 * Send a pre-approved WhatsApp message template. Business-initiated messages
 * sent outside the 24-hour customer-service window MUST use a template — Meta
 * rejects free-form text there. Returns true only if Meta accepted the send.
 */
export async function sendWhatsAppTemplate({
  to,
  template,
  languageCode = 'en',
  bodyParams = [],
}: SendTemplateOptions): Promise<boolean> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID

  if (!token || !phoneNumberId) {
    console.warn('[whatsapp] credentials not set, skipping template send to', to)
    return false
  }

  const components = bodyParams.length
    ? [{ type: 'body', parameters: bodyParams.map((text) => ({ type: 'text', text })) }]
    : []

  const res = await fetch(`https://graph.facebook.com/${API_VERSION}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: { name: template, language: { code: languageCode }, components },
    }),
  })

  if (!res.ok) {
    console.error('[whatsapp] template send failed', res.status, await res.text())
    return false
  }
  return true
}

/**
 * Business-initiated notification, safe to send at any time. WhatsApp only
 * delivers free-form text within 24h of the recipient's last inbound message;
 * outside that window Meta requires an approved template. notifyEvent() sends
 * via the template when a name is configured (so payout/status messages deliver
 * regardless of the window) and falls back to free-form text otherwise — for
 * local dev, or when the recipient is still inside the 24h window. Never throws.
 */
export async function notifyEvent(
  to: string | null | undefined,
  opts: { template?: string | null; languageCode?: string; bodyParams?: string[]; fallbackText: string }
): Promise<void> {
  if (!to) return
  try {
    if (opts.template) {
      const delivered = await sendWhatsAppTemplate({
        to,
        template: opts.template,
        languageCode: opts.languageCode,
        bodyParams: opts.bodyParams,
      })
      if (delivered) return
      // Template send failed (e.g. not approved yet). Fall back to text so a
      // recipient still inside the 24h window is not left without the message.
    }
    await sendWhatsAppText({ to, body: opts.fallbackText })
  } catch (err) {
    console.error('[whatsapp] notifyEvent error', err)
  }
}
