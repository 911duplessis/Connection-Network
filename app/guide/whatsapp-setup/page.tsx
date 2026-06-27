export default function WhatsAppSetupGuidePage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-2xl font-bold">Connecting WhatsApp (Meta Cloud API)</h1>
      <p className="mt-3 text-white/70">
        This connects your vendor WhatsApp number to The Connection Network so leads and connector
        messages flow through automatically. The webhook code is already built — you only need to do
        the steps below once, then drop three values into Vercel.
      </p>
      <p className="mt-2 text-sm text-white/50">
        (Hierdie is die laaste stap om jou WhatsApp te koppel — volg net die nommers onder een vir een.)
      </p>

      <ol className="mt-10 space-y-8">
        <li>
          <h2 className="text-lg font-semibold text-gold">1. Create a Meta Business account</h2>
          <p className="mt-2 text-sm text-white/70">
            Go to{' '}
            <a href="https://business.facebook.com" target="_blank" rel="noopener noreferrer" className="text-cobalt underline">
              business.facebook.com
            </a>{' '}
            and create a Business account using your business details (name, address, the WhatsApp number you
            want customers to message). If you already have one for PrimeTurf's Facebook/Instagram, reuse it.
          </p>
        </li>

        <li>
          <h2 className="text-lg font-semibold text-gold">2. Verify your business</h2>
          <p className="mt-2 text-sm text-white/70">
            In Business Settings →{' '}
            <a
              href="https://business.facebook.com/business/info"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cobalt underline"
            >
              Business Info
            </a>
            , click "Start Verification" and follow the prompts — you'll need a company document (CIPC
            registration, tax certificate, or similar). This step is the one most people get stuck on; it can
            take a few days for Meta to approve. Outbound messages will still work in test mode before
            verification finishes, just to a limited set of test numbers.
          </p>
        </li>

        <li>
          <h2 className="text-lg font-semibold text-gold">3. Create a WhatsApp Business app</h2>
          <p className="mt-2 text-sm text-white/70">
            Go to{' '}
            <a
              href="https://developers.facebook.com/apps"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cobalt underline"
            >
              developers.facebook.com/apps
            </a>{' '}
            → Create App → choose "Business" as the type → add the "WhatsApp" product to the app from the
            dashboard. Meta gives you a free test phone number immediately so you can start before your own
            number is approved.
          </p>
        </li>

        <li>
          <h2 className="text-lg font-semibold text-gold">4. Generate a permanent access token</h2>
          <p className="mt-2 text-sm text-white/70">
            In your app dashboard → WhatsApp → API Setup, the temporary token shown only lasts 24 hours. For a
            permanent one: System Users (Business Settings → Users → System Users) → create a system user →
            assign your WhatsApp app to it → generate a token with the{' '}
            <code className="rounded bg-white/10 px-1 py-0.5 text-xs">whatsapp_business_messaging</code> permission.
            Copy this token — it's your <code className="rounded bg-white/10 px-1 py-0.5 text-xs">WHATSAPP_ACCESS_TOKEN</code>.
          </p>
        </li>

        <li>
          <h2 className="text-lg font-semibold text-gold">5. Copy your phone number ID</h2>
          <p className="mt-2 text-sm text-white/70">
            Still on the WhatsApp → API Setup page, copy the "Phone number ID" shown under your number — this is
            your <code className="rounded bg-white/10 px-1 py-0.5 text-xs">WHATSAPP_PHONE_NUMBER_ID</code>.
          </p>
        </li>

        <li>
          <h2 className="text-lg font-semibold text-gold">6. Add the three env vars to Vercel</h2>
          <p className="mt-2 text-sm text-white/70">
            In your Vercel project → Settings → Environment Variables, add:
          </p>
          <ul className="mt-3 space-y-1 text-sm text-white/70">
            <li>
              <code className="rounded bg-white/10 px-1 py-0.5 text-xs">WHATSAPP_ACCESS_TOKEN</code> — the
              permanent token from step 4
            </li>
            <li>
              <code className="rounded bg-white/10 px-1 py-0.5 text-xs">WHATSAPP_PHONE_NUMBER_ID</code> — the
              ID from step 5
            </li>
            <li>
              <code className="rounded bg-white/10 px-1 py-0.5 text-xs">WHATSAPP_VERIFY_TOKEN</code> — make up
              any random string yourself, e.g. <code className="rounded bg-white/10 px-1 py-0.5 text-xs">tcn-verify-2026</code>
            </li>
          </ul>
          <p className="mt-3 text-sm text-white/70">Redeploy after saving so the new values take effect.</p>
        </li>

        <li>
          <h2 className="text-lg font-semibold text-gold">7. Point the webhook at this site</h2>
          <p className="mt-2 text-sm text-white/70">
            Back in the app dashboard → WhatsApp → Configuration → Webhook → Edit. Set the Callback URL to{' '}
            <code className="rounded bg-white/10 px-1 py-0.5 text-xs">https://connection-network.vercel.app/api/whatsapp/webhook</code>{' '}
            and the Verify Token to the exact same string you used for{' '}
            <code className="rounded bg-white/10 px-1 py-0.5 text-xs">WHATSAPP_VERIFY_TOKEN</code> above. Click
            Verify and Save, then subscribe to the <code className="rounded bg-white/10 px-1 py-0.5 text-xs">messages</code> field.
          </p>
        </li>
      </ol>

      <p className="mt-10 rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-white/70">
        That's it — the moment those three values are saved and the webhook is verified, inbound messages
        start logging to the public ledger automatically and outbound notifications (referral updates,
        commission payouts) start sending for real. No further code changes are needed on our side.
      </p>
    </main>
  )
}
