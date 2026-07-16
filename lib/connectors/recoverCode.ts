import { supabaseAdmin } from '@/lib/supabase'
import { notify } from '@/lib/whatsapp/client'
import { sendEmail } from '@/lib/email/client'

// Shared by the web recovery form (app/api/connector/recover-code) and the
// WhatsApp RESET/FORGOT keyword (app/api/whatsapp/webhook) so both entry
// points send the exact same message via the exact same lookup.
export async function recoverConnectorCode(whatsappNumber: string): Promise<{ found: boolean }> {
  const { data: connector } = await supabaseAdmin
    .from('connectors')
    .select('name, referral_code, email, whatsapp_number')
    .eq('whatsapp_number', whatsappNumber)
    .maybeSingle()

  if (!connector) return { found: false }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://connection-network.vercel.app'

  await notify(
    connector.whatsapp_number,
    `Hi ${connector.name}, your Connection Network referral code is: ${connector.referral_code}. ` +
      `Use it with your WhatsApp number to log in at ${appUrl}/connector/dashboard`
  )

  if (connector.email) {
    await sendEmail({
      to: connector.email,
      subject: `Your referral code: ${connector.referral_code}`,
      html: `<p>Hi ${connector.name},</p>
<p>Your referral code is: <strong style="font-size:24px">${connector.referral_code}</strong></p>
<p>Use it with your WhatsApp number to log in to your dashboard: <a href="${appUrl}/connector/dashboard">${appUrl}/connector/dashboard</a></p>
<p>— The Connection Network</p>`,
    })
  }

  return { found: true }
}
