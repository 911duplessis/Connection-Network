om Connection Network

A network-wide referral platform that generalizes PrimeTurf's existing
"5% of job value + R500 closing bonus" Connection Network program
(see `PrimeTurf/connection-network.html`) into a multi-vendor, 2-tier
affiliate structure with a publicly verifiable, tamper-evident ledger.

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
  the 2-tier structure: Tier 1 is the direct connector's reward, Tier 2 is
  an override the *upline* earns when their recruit closes a referral.

- **The public ledger** (`ledger_entries`) — every event that matters for
  trust (a referral closing, a commission paid, a review submitted, an eco
  pledge honoured) is appended here through a Postgres function
  (`append_ledger_entry`, see `supabase/schema.sql`) that hash-chains each
  row to the previous one: `hash = sha256(seq : prev_hash : payload_hash)`.
  Editing or deleting any past row breaks every hash after it — detectably,
  by anyone, via the public `verify_ledger_chain()` function (no admin
  credentials needed, callable with just the anon key). This is the
  "undeniable, transparent" mechanism the platform is built around — a
  tamper-evident log rather than a real blockchain, so there are no wallets,
  no gas fees, and no crypto onboarding for WhatsApp-based connectors.

## Architecture

```
app/
  page.tsx                 network landing page
  join/page.tsx             connector signup (WhatsApp number + optional upline code)
  vendors/page.tsx          public vendor directory
  vendors/[slug]/page.tsx   vendor profile: reward terms, eco pledge, reviews, refer-a-lead form
  ledger/page.tsx           public transparency feed + "verify chain" button
  api/
    connectors/route.ts            POST — join the network, generates a referral code
    referrals/route.ts             POST — connector submits a lead to a vendor
    referrals/[id]/status/route.ts PATCH — vendor updates status; "won" triggers the
                                    2-tier commission calculation and ledger entries
    reviews/route.ts               POST — review, appended to the ledger before being stored
    ledger/route.ts                GET — public ledger feed
    ledger/verify/route.ts         GET — recomputes and verifies the whole chain
lib/
  supabase.ts              browser (anon) + admin (service role) clients
  ledger/
    hashChain.ts            appendLedgerEntry() — calls the Postgres function
    verify.ts                verifyLedgerChain() — calls verify_ledger_chain()
    types.ts                 LedgerEntryType union
  commission/
    calc.ts                  calculateCommission() — pure, no DB/DOM, mirrors
                              ENGINCONFIGURATION's calc.js portability principle
supabase/
  schema.sql                tables, RLS, the hash-chain Postgres functions
scripts/
  seed-primeturf.ts          seeds PrimeTurf as the first vendor with its real terms
```

## Getting started (first deploy)

Same caveat as InsightForge: these steps need a live Supabase project and
can't be run from a sandboxed dev environment.

1. **Run `supabase/schema.sql`** in the Supabase SQL editor. It enables
   `pgcrypto`/`uuid-ossp`, creates all tables, RLS policies (the ledger and
   vendor directory are publicly *readable* — that's the point — but only
   the service role can write), and the two ledger functions.
2. **Set `.env.local`** from `.env.example` with your Supabase URL/keys.
3. `npm install`
4. **Seed PrimeTurf** as the first vendor (real terms from its existing
   referral page — 5% + R500, network-wide upline override defaulted to
   10%, a starter 2% eco pledge):
   ```bash
   npm run seed:primeturf
   ```
5. `npm run dev` — join at `/join`, browse vendors at `/vendors`, watch the
   feed at `/ledger`.

## Deployment

Designed for zero recurring cost: Vercel's free tier for hosting, Supabase's
free tier for Postgres + auth-free service-role API routes. The hash-chain
verification runs entirely as a Postgres function, so "verify the ledger"
costs a database round trip, not a server.
