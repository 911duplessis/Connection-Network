import Image from 'next/image'
import Link from 'next/link'

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
      <div className="text-2xl font-bold text-gold">{value}</div>
      <div className="text-sm text-white/60">{label}</div>
    </div>
  )
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-5">
      <h3 className="font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm text-white/60">{body}</p>
    </div>
  )
}

export default function Home() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <section className="text-center">
        <Image
          src="/tcn-logo.jpg"
          alt="The Connection Network"
          width={72}
          height={72}
          className="mx-auto rounded-full"
        />
        <h1 className="mt-6 text-4xl font-bold sm:text-5xl">
          Find the need. Make the link. <span className="text-cobalt">Share the value.</span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-white/70">
          The Connection Network rewards honest referrals and honest reviews — every commission,
          every rating, and every eco pledge recorded on a public, tamper-evident ledger. No
          monthly fees, no hidden cuts.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link href="/join" className="rounded-md bg-cobalt px-6 py-3 font-semibold text-white">
            Become a connector
          </Link>
          <Link href="/vendors/signup" className="rounded-md border border-white/20 px-6 py-3 font-semibold">
            List your business
          </Link>
          <Link href="/ledger" className="rounded-md border border-white/20 px-6 py-3 font-semibold">
            View the public ledger
          </Link>
        </div>
        <div className="mt-4 flex justify-center gap-4 text-sm text-white/40">
          <Link href="/vendor-login" className="hover:text-white/70">
            Vendor login
          </Link>
          <span>·</span>
          <Link href="/connector/dashboard" className="hover:text-white/70">
            Connector dashboard
          </Link>
          <span>·</span>
          <Link href="/admin" className="hover:text-white/70">
            Admin login
          </Link>
        </div>
      </section>

      <section className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label="Monthly platform fees" value="R0" />
        <Stat label="Tier 1" value="Direct connector reward" />
        <Stat label="Tier 2" value="Upline override" />
      </section>

      <section className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Feature
          title="Public, tamper-evident ledger"
          body="Every join, referral, payout, and review is hash-chained and verifiable by anyone — no edits, no deletions, no disputes."
        />
        <Feature
          title="2-tier rewards"
          body="Connectors earn directly on every referral they make, plus an automatic override on referrals made by people they recruited."
        />
        <Feature
          title="Zero cost to join"
          body="No subscription, no setup fee, no obligation to sell — vendors and connectors only pay out when a deal actually closes."
        />
        <Feature
          title="Instant connection"
          body="WhatsApp-based identity means connectors and vendors are live the moment they sign up — no email verification, no waiting."
        />
      </section>

      <section className="mt-16 rounded-lg border border-white/10 bg-white/5 p-6">
        <h2 className="text-xl font-semibold">Why a public ledger?</h2>
        <p className="mt-2 text-white/70">
          Every connector join, referral, won deal, commission payout, eco pledge, and review is
          appended to a hash-chained ledger. Each entry cryptographically links to the one before
          it, so altering any past record breaks the chain — and anyone can verify the entire
          history with one click, with no wallets, gas fees, or accounts required.
        </p>
      </section>
    </main>
  )
}
