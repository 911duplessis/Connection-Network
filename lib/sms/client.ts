const TWILIO_API = 'https://api.twilio.com/2010-04-01'

/**
 * sendSms() never throws -- a notification failure must not break the
 * flow that triggered it, matching notify()/sendEmail() in the other
 * outbound clients. No-ops silently if Twilio credentials are unset.
 */
export async function sendSms(to: string | null | undefined, body: string): Promise<void> {
  if (!to) return

  const sid = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  const from = process.env.TWILIO_FROM_NUMBER

  if (!sid || !token || !from) {
    console.warn('[sms] TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN/TWILIO_FROM_NUMBER not set, skipping send to', to)
    return
  }

  try {
    const auth = Buffer.from(`${sid}:${token}`).toString('base64')
    const res = await fetch(`${TWILIO_API}/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: to, From: from, Body: body }),
    })

    if (!res.ok) {
      const errorBody = await res.text()
      console.error('[sms] send failed', res.status, errorBody)
    }
  } catch (err) {
    console.error('[sms] send error', err)
  }
}
