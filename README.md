# The Connection Network

A network-wide referral platform that generalizes PrimeTurf's existing
"5% of job value + R500 closing bonus" Connection Network program
(see `PrimeTurf/connection-network.html`) into a multi-vendor, multi-tier
affiliate structure with a publicly verifiable, tamper-evident ledger.

## Documentation

- **`docs/tcn-program-strategy.md`** — the product design: ambassador
  grading, categorized vendor search, ratings, and the outreach invitation
  layer. States what's implemented vs. still just designed.
- **`docs/developer-handoff-guide.md`** — the technical brief for anyone
  joining the project: what's live, what's next (including the client's
  target request-routing engine architecture), accounts/APIs needed.
- **`docs/whatsapp-funnel-scripts.md`** — the exact WhatsApp copy shipped
  in the webhook and the admin invitation flow.

## Why this exists

Three sibling repos already prototype pieces of this:

- **PrimeTurf** runs the original Connection Network referral page —
  WhatsApp-coordinated, single vendor, single-tier, reward terms hard-coded
  into the HTML.
- **Kopano-** is "The Connection Network — Proposal Engine": a JSON-driven
  static site generator that assembles multi-vendor proposals under the TCN
  umbrella while keeping each vendor's branding separate.
- **InsightForge** is a real Next.js + Supabase app with multi-tenant data
  isolation, proving the stack can run a live, stateful business platform
  for PrimeTurf for free (Supabase + Vercel free tiers).

This repo combines those: a real app (InsightForge's stack) that turns the
single-vendor referral page (PrimeTurf) into a network any vendor can join,
with the proposal engine's multi-partner spirit (Kopano-) generalized into
data instead of hand-authored JSON per deal.

## Core model

- **Vendors** — businesses receiving referrals (PrimeTurf is the first).
  Each sets its own `tier1_pct` + `tier1_flat_cents` (the direct connector's
  reward — defaults mirror PrimeTurf's 5% + R500) and `tier2_override_pct`
  (what the connector's *upline* earns on top, see below), plus an
  `eco_pledge_pct` — the % of profit per sale the vendor publicly commits to
  the community/eco fund. This is the "amount of profit you are willing to
  contribute" piece, made visible on the vendor's public page instead of
  asserted in a pitch deck.

- **Connectors** — network-wide referrers, not scoped to one vendor. A
  connector can recruit other connectors (`upline_connector_id`); this is
  the tiered structure: Tier 1 is the direct connector's reward, Tier 2 is
  an override the *upline* earns when their recruit closes a referral.
  Connectors also carry a self-declared `connector_type` (referrer /
  supplier / explorer, set via a WhatsApp reply) and a performance-based
  `grade` (`connector` → `active_partner` → `ambassador`) that's promoted
  automatically after 5 and 10 lifetime closes — an Active Partner or
  Ambassador earns a bumped 15% upline override instead of the vendor's
  default, and every promotion is itself recorded on the public ledger.

- **The public ledger** (`ledger_entries`) — every event that matters for
  trust (a referral closing, a commission paid, a review submitted, an eco
  pledge honoured, a grade promotion) is appended here through a Postgres
  function (`append_ledger_entry`, see `supabase/schema.sql`) that
  hash-chains each row to the previous one:
  `hash = sha256(seq : prev_hash : payload_hash)`. Editing or deleting any
  past row breaks every hash after it — detectably, by anyone, via the
  public `verify_ledger_chain()` function (no admin credentials needed,
  callable with just the anon key). This is the "undeniable, transparent"
  mechanism the platform is built around — a tamper-evident log rather than
  a real blockchain, so there are no wallets, no gas fees, and no crypto
  onboarding for WhatsApp-based connectors.

- **Outreach invitations** (`invitations`) — a separate, non-public tracking
  layer for businesses that are already informally connected to the network
  but haven't signed up yet. An admin adds them one at a time from
  `/admin/invitations`, sends a personalized WhatsApp invite with a one-time
  signup link, and the platform automatically marks the invitation `signed`
  and confirms via WhatsApp once they complete vendor signup through that
  link. Kept deliberately separate from `ledger_entries` — it holds prospect
  contact numbers, not public network activity.

## Core features

- **Vendor self-signup** (`/vendors/signup`) — any business can list itself,
  set its own reward terms, and is created `active: false` pending admin
  approval (toggle from `/admin`). Signing up via an invitation link
  (`?invite=TOKEN`) automatically closes the loop on that invitation.
- **Vendor login + dashboard** (`/vendor-login`, `/vendor/dashboard`) — each
  vendor gets a password-protected session (same SHA-256 cookie pattern as
  admin) scoped to just their own referrals; they can update status and
  trigger commission payouts the same way admins do.
- **Connector dashboard** (`/connector/dashboard`) — no password: a
  connector looks themselves up with the WhatsApp number + referral code
  they joined with, and sees their referrals, Tier 1 earnings, Tier 2
  override earnings, and current grade.
- **Partner agreement signing** — built into `/join`: a connector reads the
  network-wide terms and checks a box before submitting, which sets
  `agreement_signed_at` and appends an `agreement_signed` ledger entry.
- **WhatsApp inbound webhook** (`/api/whatsapp/webhook`) — live keyword
  routing (`CONNECT`, `JOIN`, `READY`, `ACTIVE`, `STAY`, `OUT`), connector-type
  selection (`A`/`B`/`C`), and referral-code-personalized joins
  (`JOIN <code>`); see `docs/whatsapp-funnel-scripts.md` for the exact copy
  and `/guide/whatsapp-setup` for the setup walkthrough.
- **Admin outreach invitations** (`/admin/invitations`) — add a known,
  not-yet-signed-up business, send it a personalized WhatsApp invite, and
  track pending → sent → signed status.
- **Global navigation** — every page links back to Home, Vendors, Become a
  Connector, Vendor Sign Up, the Public Ledger, and Vendor/Admin login, so
  there are no dead ends.

## Architecture

```
app/
  page.tsx                  network landing page
  join/page.tsx              connector signup (WhatsApp number + optional upline code + agreement)
  vendors/page.tsx           public vendor directory
  vendors/signup/page.tsx     vendor self-signup form (reads ?invite= token)
  vendors/[slug]/page.tsx    vendor profile: reward terms, eco pledge, reviews, refer-a-lead form
  vendor-login/page.tsx      vendor login
  vendor/dashboard/page.tsx  per-vendor referral dashboard (session-scoped)
  connector/dashboard/page.tsx  connector lookup dashboard (WhatsApp number + referral code)
  guide/whatsapp-setup/page.tsx  plain-language Meta WhatsApp Cloud API setup guide
  ledger/page.tsx            public transparency feed + "verify chain" button
  admin/page.tsx             admin dashboard: vendor approvals + all referrals
  admin/invitations/page.tsx admin outreach invitations: add + send + track status
  api/
    connectors/route.ts             POST — join the network, generates a referral code
    vendors/route.ts                POST — vendor self-signup (handles ?invite= token)
    vendor/login/route.ts           POST — vendor session login
    vendor/logout/route.ts          POST — vendor session logout
    admin/vendors/[id]/toggle/route.ts  PATCH — admin activates/deactivates a vendor
    admin/invitations/route.ts          POST — admin creates an outreach invitation
    admin/invitations/[id]/send/route.ts  POST — admin sends the WhatsApp invite
    connector/lookup/route.ts       POST — connector dashboard lookup
    referrals/route.ts              POST — connector submits a lead to a vendor
    referrals/[id]/status/route.ts  PATCH — admin or matching vendor updates status; "won"
                                     triggers the tiered commission calculation, ledger entries,
                                     and a grade-promotion check
    reviews/route.ts                POST — review, appended to the ledger before being stored
    ledger/route.ts                 GET — public ledger feed
    ledger/verify/route.ts          GET — recomputes and verifies the whole chain
    whatsapp/webhook/route.ts       GET (Meta verify handshake) / POST (inbound messages)
lib/
  supabase.ts              browser (anon) + admin (service role) clients
  admin/auth.ts             admin session cookie (SHA-256 signed)
  vendor/auth.ts            vendor session cookie (SHA-256 signed, per-vendor)
  connectors/grade.ts       ambassador grade thresholds + promotion + override-bump logic
  ledger/
    hashChain.ts            appendLedgerEntry() — calls the Postgres function
    verify.ts                verifyLedgerChain() — calls verify_ledger_chain()
    types.ts                 LedgerEntryType union
  commission/
    calc.ts                  calculateCommission() — pure, no DB/DOM, mirrors
                              ENGINCONFIGURATION's calc.js portability principle
  whatsapp/
    client.ts                 sendWhatsAppText() / notify() — outbound Meta Cloud API calls
supabase/
  schema.sql                          tables, RLS, the hash-chain Postgres functions
  migration_0002_self_service.sql     idempotent migration for already-deployed instances
  migration_0003_whatsapp_funnel.sql  connector grading, connector_type, invitations table
scripts/
  seed-primeturf.ts          seeds PrimeTurf as the first vendor with its real terms
```

## Getting started (first deploy)

Same caveat as InsightForge: these steps need a live Supabase project and
can't be run from a sandboxed dev environment.

1. **Run the migrations in order** in the Supabase SQL editor:
   `supabase/schema.sql`, then `supabase/migration_0002_self_service.sql`,
   then `supabase/migration_0003_whatsapp_funnel.sql`. Together they enable
   `pgcrypto`/`uuid-ossp`, create all tables, RLS policies (the ledger and
   vendor directory are publicly *readable* — that's the point — but only
   the service role can write), the two ledger functions, and the
   connector grading / invitations additions.
2. **Set `.env.local`** from `.env.example` with your Supabase URL/keys.
3. `npm install`
4. **Seed PrimeTurf** as the first vendor (real terms from its existing
   referral page — 5% + R500, network-wide upline override defaulted to
   10%, a starter 2% eco pledge):
   ```bash
   npm run seed:primeturf
   ```
5. **Seed a root connector.** `/join` always requires a valid upline
   referral code (TCN grows by invitation only — see
   `app/api/connectors/route.ts`), so a fresh deployment has no code
   anyone can invite from yet. Seed exactly one connector with no upline,
   then hand its code to whoever should recruit the first real connector:
   ```bash
   ROOT_CONNECTOR_WHATSAPP=27xxxxxxxxxx ROOT_CONNECTOR_NAME="Your Name" npm run seed:root-connector
   ```
6. `npm run dev` — join at `/join` with the root connector's code as the
   upline, browse vendors at `/vendors`, watch the feed at `/ledger`.
6. **Admin dashboard**: visit `/admin`, sign in with `ADMIN_PASSWORD` (set
   in `.env.local`), manage referral status and vendor approvals, and add
   outreach invitations from `/admin/invitations`.

## WhatsApp notifications

Connectors and vendors get a WhatsApp message on key events (connector
joins, referral submitted, deal won, commission/override paid, grade
promotion) via Meta's free WhatsApp Cloud API. Without credentials set,
notifications silently no-op — the app works fine, you just don't get the
messages.

To enable them:

1. Create a free [Meta for Developers](https://developers.facebook.com/)
   account and a new app with the **WhatsApp** product added.
2. In the app's WhatsApp → API Setup page, grab the **temporary access
   token** and **Phone Number ID** (a test number is provided free; you can
   add your own number later).
3. Add a recipient test number (Meta requires this for unverified apps) or
   apply for production access to message any number.
4. Set `WHATSAPP_ACCESS_TOKEN` and `WHATSAPP_PHONE_NUMBER_ID` in
   `.env.local`.

One caveat: Meta only allows free-form text messages to someone who
messaged your business number in the last 24 hours. For messages *you*
initiate (referral/payout notifications), Meta requires a pre-approved
**message template** for reliable delivery outside that window — create
one under WhatsApp → Message Templates in Meta Business Manager once
you're ready to go beyond testing.

For the full step-by-step walkthrough (Business verification, generating a
permanent token, wiring the webhook), see **`/guide/whatsapp-setup`** on the
live site — it's written for non-technical setup, explicitly distinguishes
this from the unrelated "Meta Verified" badge, and links straight to the
relevant Meta for Developers pages. The inbound webhook
(`/api/whatsapp/webhook`) is already built and does the Meta verify-token
handshake plus keyword routing (`CONNECT`, `JOIN`, `READY`, `A`/`B`/`C`,
etc. — see `docs/whatsapp-funnel-scripts.md` for the full script); it
activates automatically once `WHATSAPP_ACCESS_TOKEN`,
`WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_APP_SECRET`, and `WHATSAPP_VERIFY_TOKEN`
are set. `WHATSAPP_APP_SECRET` is required for the webhook to accept any
inbound message — it verifies Meta's `X-Hub-Signature-256` header so the
endpoint can't be used to inject forged events into the public ledger; the
webhook rejects all POSTs with 401 until it's set.

## Roadmap

The next major phase under discussion is a request-routing engine — users
submitting a need directly (e.g. "I need a plumber in Randburg") with the
system automatically matching a vendor, rather than relying on a connector
who already knows who to refer to. That's a genuine scope increase with two
open decisions (does TCN ever hold payment, and does auto-matching apply
everywhere or just to connector-less leads) — see
**`docs/developer-handoff-guide.md`, Part II** for the full reconciliation
against this codebase before anyone starts building it.

## Deployment

Designed for zero recurring cost: Vercel's free tier for hosting, Supabase's
free tier for Postgres + auth-free service-role API routes. The hash-chain
verification runs entirely as a Postgres function, so "verify the ledger"
costs a database round trip, not a server.
