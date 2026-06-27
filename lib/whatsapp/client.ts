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
