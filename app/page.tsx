import Image from 'next/image'
import Link from 'next/link'

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="flex gap-4">
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-cobalt/20 text-sm font-bold text-cobalt">
        {n}
      </div>
      <div>
        <p className="font-semibold text-white">{title}</p>
        <p className="mt-1 text-sm text-white/60">{body}</p>
      </div>
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
    <main>
      {/* ── HERO ────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-white/10 px-6 py-24 text-center">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_50%_0%,rgba(26,111,255,0.12),transparent_70%)]" />
        <div className="mx-auto max-w-3xl">
          <Image
            src="/tcn-logo.jpg"
            alt="The Connection Network"
            width={64}
            height={64}
            className="mx-auto rounded-xl"
          />
          <p className="mt-5 text-xs font-semibold uppercase tracking-widest text-cobalt">
            The Connection Network
          </p>
          <h1 className="mt-3 text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl">
            Get paid to make <span className="text-gold">introductions.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-white/65">
            Spot a need. Connect a vendor. Earn a commission — tracked live on a public,
            tamper-evident ledger that no one can alter or dispute.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link
              href="/join"
              className="rounded-lg bg-cobalt px-8 py-3.5 font-semibold text-white shadow-lg shadow-cobalt/20 transition hover:bg-cobalt/90"
            >
              Become a connector →
            </Link>
            <Link
              href="/vendors/signup"
              className="rounded-lg border border-white/20 px-8 py-3.5 font-semibold text-white transition hover:border-white/40"
            >
              List your business
            </Link>
          </div>
          <div className="mt-6 flex justify-center gap-6 text-sm text-white/40">
            <Link href="/connector/dashboard" className="hover:text-white/70">Connector dashboard</Link>
            <span>·</span>
            <Link href="/vendor-login" className="hover:text-white/70">Vendor login</Link>
            <span>·</span>
            <Link href="/vendors" className="hover:text-white/70">Browse vendors</Link>
          </div>
        </div>
      </section>

      {/* ── STATS BAR ───────────────────────────────────────────────── */}
      <section className="border-b border-white/10 bg-white/[0.02] px-6 py-8">
        <div className="mx-auto grid max-w-4xl grid-cols-2 gap-6 sm:grid-cols-4">
          {[
            { value: 'R0', label: 'Monthly fees' },
            { value: '5 %+', label: 'Tier 1 reward' },
            { value: '2-tier', label: 'Commission structure' },
            { value: '100 %', label: 'Public & verifiable' },
          ].map(({ value, label }) => (
            <div key={label} className="text-center">
              <div className="text-2xl font-bold text-gold">{value}</div>
              <div className="mt-1 text-xs text-white/50">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FOR CONNECTORS ──────────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-6 py-20">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-20">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-cobalt">For connectors</p>
            <h2 className="mt-3 text-3xl font-bold text-white">
              You already know people. Get paid for it.
            </h2>
            <p className="mt-4 text-white/65">
              If you can spot a need and make a warm introduction to the right vendor, you earn a
              commission the moment that job is confirmed. No selling, no cold calling, no monthly
              targets.
            </p>
            <div className="mt-8 space-y-5">
              <Step n="1" title="Spot the need" body="Someone in your network needs a service — a garden done, a project quoted, anything a vendor on the network provides." />
              <Step n="2" title="Submit a referral" body="Visit the vendor's page, enter the lead's name and contact, and submit. Takes under a minute." />
              <Step n="3" title="Get paid when the job closes" body="The vendor marks the deal as won. Your commission is calculated instantly and recorded on the public ledger — permanently." />
            </div>
            <Link
              href="/join"
              className="mt-8 inline-flex rounded-lg bg-cobalt px-7 py-3 font-semibold text-white hover:bg-cobalt/90"
            >
              Join for free →
            </Link>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-white/40">
              Live example — PrimeTurf
            </p>
            <h3 className="mt-3 text-xl font-bold text-white">Artificial grass & landscaping</h3>
            <div className="mt-5 space-y-3">
              {[
                { label: 'Tier 1 reward', value: '5 % of job value + R500 closing bonus' },
                { label: 'Upline override (Tier 2)', value: '10 % of the Tier 1 payout' },
                { label: 'Eco pledge', value: '2 % of profit to community / eco fund' },
                { label: 'Payment trigger', value: 'Job confirmed as won by vendor' },
                { label: 'Joining cost', value: 'Zero' },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-start justify-between gap-4 border-t border-white/10 pt-3">
                  <span className="text-sm text-white/50">{label}</span>
                  <span className="text-right text-sm font-medium text-white">{value}</span>
                </div>
              ))}
            </div>
            <Link
              href="/vendors/primeturf"
              className="mt-6 block rounded-lg border border-white/20 px-5 py-2.5 text-center text-sm font-semibold hover:border-white/40"
            >
              View PrimeTurf's full terms
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOR VENDORS ─────────────────────────────────────────────── */}
      <section className="border-y border-white/10 bg-white/[0.02] px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-cobalt">For vendors</p>
          <h2 className="mt-3 text-3xl font-bold text-white">
            A referral network that works on performance.
          </h2>
          <p className="mt-4 max-w-2xl text-white/65">
            List your business, set your own reward terms, and get warm leads from a growing network
            of connectors who earn only when you earn. No subscription, no ad spend.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Feature title="You set the terms" body="Define your own Tier 1 reward (% + flat bonus), Tier 2 upline override, and eco pledge. Published publicly so connectors know what they'll earn before they refer anyone." />
            <Feature title="Leads arrive on WhatsApp" body="Every new referral triggers a WhatsApp notification to your business number — same channel you already use to run your business." />
            <Feature title="You control the pipeline" body="Mark each lead as contacted, quoted, won, or lost. Commissions are only triggered when you mark a deal as won — you're always in control." />
            <Feature title="Full transparency builds trust" body="Your reward history, eco pledge, and reviews all appear on your public profile, visible to every potential connector and customer." />
            <Feature title="Zero upfront cost" body="No monthly fees, no setup charge, no lock-in. You pay out referral commissions only on jobs that close." />
            <Feature title="Grow your connector team" body="Connectors can recruit other connectors under them. You get a deeper network without managing it — the Tier 2 structure handles upline rewards automatically." />
          </div>
          <Link
            href="/vendors/signup"
            className="mt-10 inline-flex rounded-lg border border-white/20 px-8 py-3 font-semibold hover:border-white/40"
          >
            List your business →
          </Link>
        </div>
      </section>

      {/* ── LEDGER / TRUST ──────────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-6 py-20">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gold">Trust layer</p>
            <h2 className="mt-3 text-3xl font-bold text-white">
              TrustPilot times ten — and you can prove it.
            </h2>
            <p className="mt-4 text-white/65">
              Every referral, payout, eco pledge, and review is appended to a hash-chained ledger.
              Each entry cryptographically links to the one before it: alter or delete any past
              record and the chain breaks — detectably, by anyone, with one click. No wallets,
              no gas fees, no accounts.
            </p>
            <p className="mt-4 text-white/65">
              That's not a trust score assigned by a platform. That's a permanent public record
              that the vendor, the connector, and every future visitor can verify themselves.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/ledger"
                className="rounded-lg bg-gold/10 px-6 py-3 font-semibold text-gold ring-1 ring-gold/30 hover:bg-gold/15"
              >
                View the public ledger →
              </Link>
            </div>
          </div>
          <div className="space-y-3">
            {[
              { type: 'connector_joined', label: 'Connector joined', detail: 'Referral code issued · agreement signed' },
              { type: 'referral_submitted', label: 'Referral submitted', detail: 'Lead introduced to vendor' },
              { type: 'referral_won', label: 'Deal won', detail: 'Job value confirmed' },
              { type: 'commission_tier1_paid', label: 'Tier 1 commission paid', detail: 'Direct connector rewarded' },
              { type: 'review_submitted', label: 'Review submitted', detail: 'Tamper-evident, ledger-anchored' },
            ].map(({ label, detail }) => (
              <div
                key={label}
                className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-3"
              >
                <div className="mt-0.5 h-2 w-2 flex-shrink-0 rounded-full bg-gold" />
                <div>
                  <p className="text-sm font-medium text-white">{label}</p>
                  <p className="text-xs text-white/40">{detail}</p>
                </div>
              </div>
            ))}
            <p className="pl-5 text-xs text-white/30">Each entry hash-chained to the previous · publicly verifiable</p>
          </div>
        </div>
      </section>

      {/* ── ECO PLEDGE ──────────────────────────────────────────────── */}
      <section className="border-t border-white/10 bg-white/[0.02] px-6 py-16 text-center">
        <div className="mx-auto max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-gold">Eco pledge</p>
          <h2 className="mt-3 text-2xl font-bold text-white">
            Vendors who pledge a share of profit to the community.
          </h2>
          <p className="mt-4 text-white/65">
            Any vendor can commit a percentage of their job profit to a community or eco fund.
            That pledge is published on their public profile — and every honoured pledge is
            recorded on the immutable ledger. Not a marketing claim. A recorded fact.
          </p>
        </div>
      </section>

      {/* ── FINAL CTA ───────────────────────────────────────────────── */}
      <section className="px-6 py-20 text-center">
        <div className="mx-auto max-w-xl">
          <h2 className="text-3xl font-bold text-white">Ready to start?</h2>
          <p className="mt-4 text-white/65">
            Join as a connector — free, instant, WhatsApp-based, no password. Or list your
            business as a vendor and open your pipeline to the network.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              href="/join"
              className="rounded-lg bg-cobalt px-8 py-3.5 font-semibold text-white shadow-lg shadow-cobalt/20 hover:bg-cobalt/90"
            >
              Become a connector
            </Link>
            <Link
              href="/vendors/signup"
              className="rounded-lg border border-white/20 px-8 py-3.5 font-semibold hover:border-white/40"
            >
              List your business
            </Link>
          </div>
          <p className="mt-6 text-sm text-white/40">
            Questions?{' '}
            <Link href="/guide/whatsapp-setup" className="text-white/60 underline hover:text-white">
              WhatsApp setup guide
            </Link>
            {' '}·{' '}
            <Link href="/partner-agreement" className="text-white/60 underline hover:text-white">
              Partner agreement
            </Link>
            {' '}·{' '}
            <Link href="/terms" className="text-white/60 underline hover:text-white">
              Terms of service
            </Link>
          </p>
        </div>
      </section>
    </main>
  )
}
