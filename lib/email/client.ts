import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
const FROM = 'The Connection Network <noreply@connection-network.vercel.app>'

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string | null | undefined
  subject: string
  html: string
}): Promise<void> {
  if (!to) return
  if (!resend) {
    console.warn('[email] RESEND_API_KEY not set, skipping email to', to)
    return
  }
  try {
    await resend.emails.send({ from: FROM, to, subject, html })
  } catch (err) {
    console.error('[email] send error', err)
  }
}
