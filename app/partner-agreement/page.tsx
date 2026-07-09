import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Partner Agreement — The Connection Network',
}

function Clause({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-white/50">
        {n}
      </span>
      <span className="text-sm text-white/65">{children}</span>
    </li>
  )
}

export default function PartnerAgreementPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <p className="text-xs font-semibold uppercase tracking-widest text-cobalt">Legal</p>
      <h1 className="mt-3 text-3xl font-bold text-white">Partner Agreement</h1>
      <p className="mt-3 text-sm text-white/40">
        This agreement governs the relationship between The Connection Network and any individual
        or entity that registers as a connector ("you"). By joining the network, you accept these terms.
      </p>

      <section className="mt-10">
        <h2 className="font-semibold text-white">Reward structure</h2>
        <p className="mt-2 text-sm text-white/65">
          Each vendor on the network publishes its own reward terms before any connector submits a
          referral. The terms you see on a vendor's listing — including Tier 1 reward percentage,
          closing bonus, and any Tier 2 upline override — are the terms that apply to referrals you
          submit to that vendor. These terms are recorded on the public ledger when a deal closes and
          cannot be retroactively altered.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="font-semibold text-white">Agreement terms</h2>
        <ol className="mt-4 space-y-4">
          <Clause n={1}>
            <strong className="text-white/80">Commission triggers on confirmed jobs only.</strong>{' '}
            Your Tier 1 reward is calculated on the final confirmed job value (including any
            add-ons agreed at quote stage) when the vendor marks the referral as{' '}
            <span className="rounded bg-white/10 px-1 py-0.5 font-mono text-xs">won</span> in their
            dashboard. No commission is earned on leads that are lost, cancelled, or remain in any
            other status.
          </Clause>
          <Clause n={2}>
            <strong className="text-white/80">Tier 2 upline override.</strong>{' '}
            If you recruit other connectors using your referral code, you automatically earn a Tier 2
            override on every Tier 1 commission they earn. The override percentage is set by the
            vendor and published on their listing. No action is needed from you — the platform
            calculates and records the upline payout automatically.
          </Clause>
          <Clause n={3}>
            <strong className="text-white/80">Zero cost to join and remain active.</strong>{' '}
            There are no joining fees, monthly subscription fees, or minimum referral targets.
            You may stop submitting referrals at any time without penalty.
          </Clause>
          <Clause n={4}>
            <strong className="text-white/80">Independent introducer, not an employee.</strong>{' '}
            Your role as a connector is that of an independent introducer. This agreement creates
            no employment relationship, agency arrangement, or exclusivity obligation between you
            and The Connection Network or any vendor.
          </Clause>
          <Clause n={5}>
            <strong className="text-white/80">Honest referrals only.</strong>{' '}
            You agree to submit only genuine, first-hand referrals — real introductions to real
            potential customers. Submitting fabricated, duplicate, or self-referral leads is a
            breach of this agreement and may result in your account being deactivated and prior
            commissions voided.
          </Clause>
          <Clause n={6}>
            <strong className="text-white/80">All events recorded on the public ledger.</strong>{' '}
            Your join, every referral you submit, every commission event, and any review you
            receive is appended to The Connection Network's public, tamper-evident ledger. These
            records are permanent and publicly visible. Your name and referral code will appear
            on the ledger.
          </Clause>
          <Clause n={7}>
            <strong className="text-white/80">Terms may be updated.</strong>{' '}
            The Connection Network may update these terms from time to time. Updated terms will be
            published at{' '}
            <Link href="/partner-agreement" className="text-cobalt underline">
              connection-network.vercel.app/partner-agreement
            </Link>
            . Continued activity on the network after an update constitutes acceptance.
          </Clause>
          <Clause n={8}>
            <strong className="text-white/80">Governing law.</strong>{' '}
            This agreement is governed by the laws of the Republic of South Africa.
          </Clause>
        </ol>
      </section>

      <div className="mt-12 rounded-lg border border-cobalt/30 bg-cobalt/10 p-5">
        <p className="text-sm text-white/80">
          Ready to join? The agreement is accepted digitally when you complete the{' '}
          <Link href="/join" className="text-cobalt underline">
            connector sign-up form
          </Link>
          . Your acceptance is recorded on the public ledger as an{' '}
          <span className="rounded bg-white/10 px-1 py-0.5 font-mono text-xs">agreement_signed</span>{' '}
          entry — permanent and verifiable by anyone.
        </p>
      </div>

      <div className="mt-8 flex flex-wrap gap-4 text-sm">
        <Link href="/join" className="rounded-lg bg-cobalt px-6 py-2.5 font-semibold text-white hover:bg-cobalt/90">
          Join the network →
        </Link>
        <Link href="/terms" className="text-white/40 underline hover:text-white">
          Full Terms of Service
        </Link>
        <Link href="/" className="text-white/40 hover:text-white">
          ← Home
        </Link>
      </div>
    </main>
  )
}
