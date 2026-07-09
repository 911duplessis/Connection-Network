import Link from 'next/link'

const sections = [
  {
    title: 'Getting started',
    items: [
      {
        q: 'What is The Connection Network?',
        a: 'A zero-cost-to-join referral platform. Vendors list their business and set the reward terms. Connectors introduce clients and earn commission when a job is won. Every referral and payout is recorded on a public, tamper-evident ledger — so everyone can verify what was earned and when.',
      },
      {
        q: 'Is there a fee to join?',
        a: 'No. Vendors pay nothing to list. Connectors pay nothing to join. Vendors only pay a reward when a referral converts into a confirmed job.',
      },
    ],
  },
  {
    title: 'For vendors',
    items: [
      {
        q: 'How do I know my sign-up was received?',
        a: (
          <>
            Immediately after submitting the sign-up form you&apos;ll see a confirmation screen with your
            reference number (your listing slug). If you provided an email address, a confirmation email
            is sent. Once the WhatsApp API is active, you&apos;ll also get a WhatsApp message. Your reference
            number lets you preview your listing at{' '}
            <code className="rounded bg-white/10 px-1">/vendors/[your-reference]</code> straight away.
          </>
        ),
      },
      {
        q: 'When will my listing go live?',
        a: 'An admin reviews new sign-ups and activates them, usually within 24 hours. Once activated, your listing appears on the vendor directory and you\'ll receive an email notification.',
      },
      {
        q: 'How do I log in to my vendor dashboard?',
        a: (
          <>
            Go to{' '}
            <Link href="/vendor-login" className="text-cobalt underline">
              /vendor-login
            </Link>{' '}
            and enter the WhatsApp number and password you chose when you signed up.
          </>
        ),
      },
      {
        q: 'I forgot my dashboard password. How do I reset it?',
        a: (
          <>
            Go to{' '}
            <Link href="/vendor-forgot-password" className="text-cobalt underline">
              Forgot password
            </Link>
            . Enter your WhatsApp number and we&apos;ll send a 6-digit reset code to your email and WhatsApp.
            The code is valid for 15 minutes.
          </>
        ),
      },
      {
        q: 'How do referral rewards work?',
        a: 'You set your own terms when you sign up. Tier 1 is paid to the connector who introduced the client (a percentage of the job value, plus an optional flat bonus). Tier 2 is an override paid to that connector\'s upline — a percentage of what the Tier 1 connector earned.',
      },
    ],
  },
  {
    title: 'For connectors',
    items: [
      {
        q: 'How do I join as a connector?',
        a: (
          <>
            Go to{' '}
            <Link href="/join" className="text-cobalt underline">
              Become a Connector
            </Link>
            . Enter your name, WhatsApp number, and optionally an email address. Read and accept the
            partner agreement. Your referral code is shown immediately and emailed to you if you
            provided an address.
          </>
        ),
      },
      {
        q: 'I forgot my referral code. How do I get it back?',
        a: (
          <>
            Go to the{' '}
            <Link href="/connector/dashboard" className="text-cobalt underline">
              Connector Dashboard
            </Link>{' '}
            and click &ldquo;Forgot your referral code?&rdquo; Enter your WhatsApp number and we&apos;ll
            send your code to your WhatsApp and email.
          </>
        ),
      },
      {
        q: 'How do I submit a referral?',
        a: (
          <>
            Browse the{' '}
            <Link href="/vendors" className="text-cobalt underline">
              vendor directory
            </Link>
            , open a vendor&apos;s listing, and fill in the referral form. You&apos;ll need the lead&apos;s
            name and contact details and your own referral code.
          </>
        ),
      },
      {
        q: 'When do I get paid?',
        a: 'Once the vendor marks a referral as won (job confirmed), the commission is recorded on the public ledger. The vendor then processes the payout manually — bank transfer or however you agree. The ledger shows what is owed so nothing can be disputed.',
      },
      {
        q: 'What is a Tier 2 override?',
        a: 'If you recruit other connectors using your referral code as their upline code, you earn a Tier 2 override on every commission they earn — on top of your own Tier 1 referrals. The override percentage is set by each vendor.',
      },
    ],
  },
  {
    title: 'Technical / other',
    items: [
      {
        q: 'What is the Public Ledger?',
        a: (
          <>
            Every event (vendor join, connector join, referral submitted, payout made) is appended to
            a SHA-256 hash chain. Each entry includes the hash of the previous entry, so any tampering
            breaks the chain. Anyone can verify it at{' '}
            <Link href="/ledger" className="text-cobalt underline">
              /ledger
            </Link>
            .
          </>
        ),
      },
      {
        q: 'I still need help. Who do I contact?',
        a: (
          <>
            WhatsApp us at{' '}
            <a href="https://wa.me/27721234567" className="text-cobalt underline">
              +27 72 123 4567
            </a>{' '}
            or email{' '}
            <a href="mailto:support@connection-network.vercel.app" className="text-cobalt underline">
              support@connection-network.vercel.app
            </a>
            . We aim to respond within one business day.
          </>
        ),
      },
    ],
  },
]

export default function HelpPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-2xl font-bold">Help &amp; FAQ</h1>
      <p className="mt-2 text-white/60">
        Can&apos;t find what you need?{' '}
        <a href="mailto:support@connection-network.vercel.app" className="text-cobalt underline">
          Contact support
        </a>
        .
      </p>

      <div className="mt-10 space-y-10">
        {sections.map((section) => (
          <div key={section.title}>
            <h2 className="text-lg font-semibold text-white/80">{section.title}</h2>
            <div className="mt-4 space-y-6">
              {section.items.map((item) => (
                <div key={item.q}>
                  <h3 className="font-medium text-white">{item.q}</h3>
                  <p className="mt-1 text-sm text-white/60">{item.a}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 rounded-lg border border-white/10 bg-white/5 p-6">
        <h2 className="font-semibold">Still stuck?</h2>
        <p className="mt-2 text-sm text-white/60">
          WhatsApp us directly or email support and we&apos;ll sort it out for you.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <a
            href="mailto:support@connection-network.vercel.app"
            className="rounded-md bg-cobalt px-4 py-2 text-sm font-semibold text-white"
          >
            Email support
          </a>
          <Link
            href="/ledger"
            className="rounded-md border border-white/20 px-4 py-2 text-sm text-white/70 hover:text-white"
          >
            View public ledger
          </Link>
        </div>
      </div>
    </main>
  )
}
