import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Terms of Service — The Connection Network',
}

const EFFECTIVE_DATE = '1 July 2026'

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mt-10">
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      <div className="mt-3 space-y-3 text-sm text-white/65 [&_strong]:text-white/80">{children}</div>
    </section>
  )
}

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <p className="text-xs font-semibold uppercase tracking-widest text-cobalt">Legal</p>
      <h1 className="mt-3 text-3xl font-bold text-white">Terms of Service</h1>
      <p className="mt-3 text-sm text-white/40">Effective date: {EFFECTIVE_DATE}</p>
      <p className="mt-4 text-sm text-white/65">
        These Terms of Service govern your use of The Connection Network platform (&quot;TCN&quot;, &quot;we&quot;,
        &quot;us&quot;). By registering as a connector or vendor, or by using the platform in any way, you
        agree to these terms. Jurisdiction: South Africa.
      </p>

      <Section id="definitions" title="1. Definitions">
        <p><strong>Platform</strong> — The Connection Network website, API, and associated services.</p>
        <p><strong>Vendor</strong> — A business that lists itself on the platform to receive referral leads.</p>
        <p><strong>Connector</strong> — An individual or entity that submits referrals on behalf of one or more vendors.</p>
        <p><strong>Referral</strong> — An introduction of a potential customer to a vendor, submitted via the platform.</p>
        <p><strong>Commission</strong> — A reward paid by a vendor to a connector when a referred job is confirmed as won.</p>
        <p><strong>Ledger</strong> — The platform&apos;s public, hash-chained, append-only record of all trust events.</p>
      </Section>

      <Section id="relationship" title="2. Nature of the relationship">
        <p>
          The Connection Network is a platform that facilitates introductions between vendors and
          connectors. TCN is <strong>not a party to any referral transaction</strong>, does not
          guarantee that any referral will result in a job or payment, and is not responsible for
          disputes between vendors and connectors.
        </p>
        <p>
          <strong>Connectors are independent introducers, not employees, agents, or
          contractors of TCN or of any vendor.</strong> Joining the network creates no employment
          relationship, no exclusive arrangement, and no obligation to refer.
        </p>
        <p>
          <strong>Vendors are independent businesses, not agents or representatives of
          TCN.</strong> Listing on the platform does not create any partnership or joint venture.
        </p>
      </Section>

      <Section id="commissions" title="3. Commission terms">
        <p>
          Each vendor sets its own commission terms (Tier 1 percentage, flat closing bonus, Tier 2
          upline override, and eco pledge percentage). These terms are published publicly on the
          vendor&apos;s listing before any connector submits a referral — connectors accept the terms in
          force at the time they submit.
        </p>
        <p>
          Commissions are earned only when a vendor marks a referral as{' '}
          <strong>won</strong>. TCN records the resulting payout event on the public ledger.
          TCN does not handle commission payments — payment is the vendor&apos;s sole responsibility,
          to be made directly to the connector using the details and amount shown on the ledger.
        </p>
        <p>
          Vendors may update their commission terms at any time; updated terms apply to future
          referral submissions only, not to existing open referrals.
        </p>
      </Section>

      <Section id="ledger" title="4. The public ledger">
        <p>
          TCN maintains a public, hash-chained ledger that records join events, referral outcomes,
          commission payouts, eco pledge fulfilments, and reviews. Each entry is cryptographically
          linked to the previous entry; altering or removing any record breaks the chain detectably.
        </p>
        <p>
          <strong>The ledger is append-only and public.</strong> By joining as a connector or
          vendor, you accept that certain information (your display name, referral code, commission
          events, and reviews) will be permanently and publicly visible on the ledger and cannot be
          removed.
        </p>
        <p>
          The ledger does not store phone numbers or raw message content. Connector WhatsApp numbers
          are stored securely in the platform&apos;s database for operational purposes only and are not
          displayed publicly.
        </p>
      </Section>

      <Section id="accounts" title="5. Accounts and access">
        <p>
          Connectors are identified by their WhatsApp number and referral code — no password is
          required. You are responsible for keeping your referral code confidential.
        </p>
        <p>
          Vendors set a password at signup. You are responsible for keeping your credentials
          secure. TCN is not liable for unauthorised access resulting from shared or compromised
          credentials.
        </p>
        <p>
          TCN reserves the right to suspend or deactivate any vendor or connector account that is
          found to submit fraudulent referrals, abuse the platform, or violate these terms, without
          prior notice and without liability.
        </p>
      </Section>

      <Section id="data" title="6. Data and privacy">
        <p>
          TCN collects only the minimum information required to operate the platform: name,
          WhatsApp number, and (for vendors) business details and a hashed password. We do not sell
          your data. WhatsApp numbers are used only for platform notifications.
        </p>
        <p>
          Ledger events are publicly accessible by design. Do not submit information in referral
          notes or lead details that you do not want associated with the public event record
          attached to that transaction.
        </p>
      </Section>

      <Section id="liability" title="7. Limitation of liability">
        <p>
          The platform is provided &quot;as is&quot; without warranties of any kind. TCN makes no guarantee
          of uptime, referral conversion, commission payment by vendors, or accuracy of
          vendor-provided information.
        </p>
        <p>
          To the maximum extent permitted by South African law, TCN&apos;s liability to any connector
          or vendor for any claim arising from use of the platform is limited to the amount (if
          any) paid to TCN in the 12 months preceding the claim. Since the platform charges no
          fees, this limit is effectively zero.
        </p>
        <p>
          Vendors are solely responsible for paying commissions owed to connectors. TCN is not a
          guarantor of vendor payment.
        </p>
      </Section>

      <Section id="disputes" title="8. Disputes">
        <p>
          Disputes between vendors and connectors regarding referral outcomes or commission
          payments should be resolved between the parties directly, using the ledger as an
          objective factual record.
        </p>
        <p>
          These terms are governed by the laws of the Republic of South Africa. Any disputes
          arising under these terms shall be subject to the jurisdiction of the South African
          courts.
        </p>
      </Section>

      <Section id="changes" title="9. Changes to these terms">
        <p>
          We may update these terms from time to time. Updated terms will be published on this
          page with a new effective date. Continued use of the platform after the updated effective
          date constitutes acceptance of the revised terms. We will not retroactively alter the
          terms applicable to referrals already in progress at the time of any update.
        </p>
      </Section>

      <div className="mt-12 flex flex-wrap gap-4 text-sm">
        <Link href="/partner-agreement" className="text-cobalt underline">
          Partner agreement →
        </Link>
        <Link href="/" className="text-white/40 hover:text-white">
          ← Back to home
        </Link>
      </div>
    </main>
  )
}
