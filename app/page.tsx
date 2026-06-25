import Link from 'next/link'

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
      <div className="text-2xl font-bold text-gold">{value}</div>
      <div className="text-sm text-white/60">{label}</div>
    </div>
  )
}

export default function Home() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <section className="text-center">
        <h1 className="text-4xl font-bold sm:text-5xl">
          Find the need. Make the link. <span className="text-cobalt">Share the value.</span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-white/70">
          The Connection Network rewards honest referrals and honest reviews — every commission,
          every rating, and every eco pledge recorded on a public, tamper-evident ledger. No
          monthly fees, no hidden cuts.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Link href="/join" className="rounded-md bg-cobalt px-6 py-3 font-semibold text-white">
            Become a connector
          </Link>
          <Link href="/ledger" className="rounded-md border border-white/20 px-6 py-3 font-semibold">
            View the public ledger
          </Link>
        </div>
      </section>

      <section className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label="Monthly platform fees" value="R0" />
        <Stat label="Tier 1" value="Direct connector reward" />
        <Stat label="Tier 2" value="Upline override" />
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
