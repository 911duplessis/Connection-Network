# TCN Developer Handoff Guide

Objective, technical brief for the developer joining the project. Two parts: what's actually live today (Part I), and the client's target architecture for the request-routing engine, reconciled against the real schema (Part II). No campaign copy beyond what's already shipped in `docs/whatsapp-funnel-scripts.md` — new campaign content is supplied separately by the client.

---

## Part I — What's already live

`911duplessis/Connection-Network` — Next.js 15 (App Router) + React 19 + Supabase (Postgres, RLS, no Supabase Auth — custom SHA-256 signed cookie sessions), Tailwind, deployed on Vercel free tier. Working end-to-end:

- Vendor signup (self-service + admin-approved) and vendor login/dashboard. Signup now also captures a vendor's `category` (from the shared taxonomy in `lib/routing/categories.ts`) and free-text `location`, used by the routing engine below.
- Connector signup (`/join`) with an optional one-level upline (`connectors.upline_connector_id`), a self-declared `connector_type` (referrer/supplier/explorer, set via WhatsApp), and a `grade` (connector/active_partner/ambassador).
- Referral submission and lifecycle: `submitted → contacted → quoted → won/lost`. Referrals now also carry `category`, `location`, and `source` (`'connector'` or `'whatsapp_request'`) — see Part II.
- A public, unauthenticated lead-intake endpoint (`POST /api/leads`) that resolves to a fixed `DIRECT-UNASSIGNED` connector and an `unassigned` vendor bucket for manual admin triage. Shares its constants (`lib/routing/constants.ts`) with the new WhatsApp request-capture flow in Part II.
- On `won`: automatic commission calculation (`lib/commission/calc.ts`), ledger entries, `payouts` rows, WhatsApp notifications, and an automatic grade-promotion check (`lib/connectors/grade.ts`) that bumps a connector's upline override from the vendor default to 15% once they hit Active Partner.
- A Postgres hash-chain public ledger (`ledger_entries`, `append_ledger_entry()`, `verify_ledger_chain()`) — publicly readable and independently verifiable, the trust backbone of the whole platform. Do not modify this chain's logic without understanding it fully; it's intentionally append-only and tamper-evident. Grade promotions are ledger-backed too (`grade_promoted` entry type).
- Reviews (`POST /api/reviews`), ledger-backed, currently unaggregated (see `docs/tcn-program-strategy.md` §3).
- WhatsApp Cloud API webhook (`app/api/whatsapp/webhook`) — inbound keyword routing including connector-type selection (A/B/C), referral-code-personalized joins (`JOIN <code>`), and now free-text request capture for anyone not already a connector/vendor (see Part II). See `docs/whatsapp-funnel-scripts.md` for the exact shipped keyword copy.
- Outreach invitations (`invitations` table, `/admin/invitations`, `app/api/admin/invitations/`) — admin adds a known-but-unsigned business, sends a personalized WhatsApp invite with a one-time signup link, and the vendor-signup flow automatically marks the invitation `signed` and confirms via WhatsApp once they complete signup.
- Admin dashboard: vendor approval, referral overview with vendor reassignment (`app/api/admin/referrals/[id]/reassign`) and category/location/source visible per referral, link to outreach invitations.
- No payment processor integration — payouts are recorded, not disbursed automatically (that stays manual/EFT for now; see the platform-fee question below, which bears directly on whether this stays true).
- No categories directory/search UI on `/vendors` (vendors have a `category` field now, but no public filter/search yet), no rating aggregation, no test suite.

See `docs/tcn-program-strategy.md` for the product/business design behind all of this.

---

## Part II — Request routing engine

The client's MVP spec for this phase describes TCN as *"a request-to-fulfilment routing network where users submit needs, and the system connects them to the most suitable vendors or affiliates, tracks fulfilment, and distributes value through a structured commission ledger."* That's a bigger idea than the full spec below implies — the client has since scoped this down explicitly, and **the MVP core is now implemented**:

- WhatsApp request capture — done (`app/api/whatsapp/webhook/route.ts`, the fallback branch after keyword matching, for any sender who isn't already a recognized connector or vendor).
- Request storage — done (`referrals.category`, `referrals.location`, `referrals.source`, migration `supabase/migration_0004_request_routing.sql`).
- Basic rule-based matching (category + optional location) — done (`lib/routing/match.ts`, `lib/routing/detect.ts`). **Deterministic filter, not a weighted score** — no rating/availability inputs exist, and none were requested for MVP. Rule: filter active vendors by exact `category` match; among ties, prefer a `location` substring match; otherwise take the first; if no category is detected or nothing matches, fall back to the existing `unassigned` vendor bucket so a request is never dropped.
- Category/location detection is keyword lookup, not NLP (`lib/routing/detect.ts`'s `CATEGORY_KEYWORDS` table and a best-effort `"... in <place>"` regex) — per the client's "no AI complexity" constraint.
- Manual admin override — done (`app/api/admin/referrals/[id]/reassign/route.ts`, a reassign `<select>` in `components/ReferralRow.tsx`). Not ledger-logged — an internal correction, not a public trust event, consistent with vendor activation toggles.
- Vendor assignment — done, via the matching rule above; a WhatsApp-captured request always gets a `vendor_id` (a real match or the `unassigned` bucket), same as `/api/leads`.
- Status tracking — **reused, not reinvented**: a WhatsApp-captured request is an ordinary `referrals` row and flows through the exact same `submitted → contacted → quoted → won/lost` lifecycle and `PATCH /api/referrals/[id]/status` endpoint as a connector-submitted referral, so commission calc, grade promotion, and ledger entries on `won` already work on it with zero extra code. No new statuses were added, per the client's explicit instruction.

**What was explicitly excluded from this round, and remains so:**

1. **Ratings-weighted / availability-weighted scoring.** The client's original spec included a `match_score = category(50%) + location(20%) + vendor_rating(20%) + availability(10%)` formula. None of that shipped — matching is the simple deterministic filter above. Building the weighted version would need vendor rating aggregation (`docs/tcn-program-strategy.md` §3, unbuilt) and a new `availability` field (doesn't exist anywhere) — do not add either without explicit client sign-off, since the client specifically ruled out "additional modules or architectural decisions" for this round.
2. **Does TCN ever hold the money?** Unresolved. The client's original commission-split example (Job Value R1000 → Vendor R850, Affiliate R100, Platform R50) implies TCN collects the full payment and disburses three ways. Today it does not, and this round didn't change that: the vendor is paid directly by the customer and separately pays the connector's commission themselves (manually, off-platform); the ledger records what's owed, it doesn't move money, and there's still no platform-fee line at all. Do not build toward a payment-custody model without explicit sign-off — it's a much larger scope increase (escrow, a payment processor integration, likely compliance implications) than anything shipped so far.
3. **Vendor category/location editing after signup.** These fields are captured once, at vendor signup. There's no edit UI yet for an already-active vendor to change them — a known, small gap, not silently built.
4. **Categories directory/search UI on `/vendors`.** Vendors have a `category` now (used internally for matching), but the public vendor directory still has no filter/search by it — that's the separate, still-unbuilt Part III item below.

### Files that implement the MVP routing engine

- `supabase/migration_0004_request_routing.sql` — `vendors.category`, `vendors.location`, `referrals.category`, `referrals.location`, `referrals.source`.
- `lib/routing/constants.ts` — shared `UNASSIGNED_CONNECTOR_CODE` / `UNASSIGNED_VENDOR_SLUG`, extracted so `app/api/leads/route.ts` and the webhook capture branch don't duplicate the literals.
- `lib/routing/categories.ts` — the shared category taxonomy, used by vendor signup, `components/InvitationForm.tsx`, and `lib/routing/detect.ts`'s keyword table, so there's one list, not several.
- `lib/routing/detect.ts` — `detectCategory()` / `detectLocation()`, keyword-lookup only.
- `lib/routing/match.ts` — `findMatchingVendor()`, the deterministic filter described above.
- `app/api/whatsapp/webhook/route.ts` — the request-capture fallback branch.
- `app/api/admin/referrals/[id]/reassign/route.ts` — admin-only manual override.
- `components/ReferralRow.tsx`, `app/admin/page.tsx` — category/location/source display + reassign control.
- `app/vendors/signup/page.tsx`, `app/api/vendors/route.ts` — category/location capture at signup.

---

## Part III — What's left to build, in order

1. **Categories directory/search UI on `/vendors`** — the `vendors.category` field exists and is used for routing, but there's still no public filter/search UI. Low risk, no dependency on anything else.
2. **Ratings sub-scores + aggregation** — extend `reviews` with `service_rating`/`product_rating`/`reward_rating`, add a read-side aggregation view, surface it on vendor profile pages. Prerequisite if the routing engine is ever upgraded to weighted scoring (see Part II, item 1 above) — do not build the weighting itself without separate sign-off even once this exists.
3. **Vendor category/location edit UI** — currently signup-only; add an edit surface (likely on `/vendor/dashboard`) so an existing vendor can update these without a direct DB edit.
4. ~~Ambassador grading~~ — done. Follow-up: the rolling-30-day and cumulative-revenue promotion triggers described in `docs/tcn-program-strategy.md` §1.2 aren't implemented — only the simpler lifetime-closes trigger (5/10) is live.
5. ~~Invitations / outreach tracking layer~~ — done. Follow-up: no automated reminder for stale `pending`/`sent` invitations, and no `opened` status tracking (needs a click-tracked redirect route).
6. ~~Request-routing engine (MVP)~~ — done, see Part II. Follow-up items are the four exclusions listed there, each requiring separate sign-off before building.
7. **WhatsApp funnel automation, richer sequences** — the webhook is still single-message-per-reply (no multi-step drip sequences, no scheduled sends). If future campaign content needs a multi-day sequence rather than an instant reply, that's new plumbing on top of `lib/whatsapp/`.
8. **Google Business Profile + social platform integration** — read reviews/insights from Google Business Profile, and posting/insights via Meta Graph API (Facebook/Instagram) at minimum. Most account/API-heavy piece, do this last.

## Accounts / APIs required

| Need | For | Notes |
|---|---|---|
| Meta Business account + WhatsApp Cloud API | Already configured and live (`WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET`) | The MVP routing engine's request capture reuses this — no new WhatsApp setup needed. Multi-step drip sequences (item 7 above) will need Meta-approved message templates when built |
| Meta Graph API app (Facebook/Instagram) | Social posting + insights tracking | New — needs a Meta developer app + page/IG business account permissions |
| Google Business Profile API access | Reading reviews/insights per vendor | New — needs OAuth consent from each business's GBP account; this is per-vendor, not a single org-wide credential |
| Payment processor (e.g. Paystack, Yoco, PayFast) | Only if the "does TCN hold the money" question above is answered yes | Not needed at all under the current record-only ledger model, and not needed by the MVP routing engine |
| Supabase project | Already exists | Developer needs to be invited as a collaborator; run migrations in order — `schema.sql`, `migration_0002`, `migration_0003`, `migration_0004_request_routing.sql` |
| Vercel project | Already exists | Developer needs to be invited as a collaborator; Vercel Cron is sufficient for any scheduled/automated sends at this scale — no separate queue service needed yet |

## Scale note

Keep the stack small and free-tier for now (it already is — Vercel + Supabase, no paid services), but don't architect anything that assumes a single vendor or a single WhatsApp number. The intent is to grow this network across many vendors and categories over time, so:

- Don't hardcode PrimeTurf-specific values anywhere in shared logic (the commission calc and ledger already get this right — follow that pattern).
- Keep the WhatsApp number/template config per-environment-variable, not assumed to be singular forever.
- The invitation, ambassador-grading, and routing systems already handle any vendor/connector/category, not just PrimeTurf's — keep it that way as they grow.

## Success criteria (Part II, MVP scope)

Treat the routing engine as done for this round when: a user can submit a request via WhatsApp with no prior relationship to any connector, the system assigns a matching vendor by category(+location) or falls back to the unassigned bucket, an admin can manually reassign it, the vendor completes the job through the existing status pipeline, and commission is recorded correctly against the existing ledger/payouts tables — not a new, parallel ledger. This is already true as of this round's changes.

## Explicit non-goals for the developer

- No campaign copywriting — funnel scripts/content beyond what's in `docs/whatsapp-funnel-scripts.md` come from the client separately.
- No changing the ambassador reward *amounts* or grade thresholds in `lib/connectors/grade.ts` without checking — those are product decisions.
- No outreach to real businesses beyond what the admin explicitly sends via `/admin/invitations` — sending stays a manual, admin-driven action per business.
- No rating/availability-weighted matching, no `match_score` formula, and no building toward the "TCN holds the money" model — all three require explicit client sign-off first, per the exclusions in Part II.
- Speed and a working end-to-end flow over scalability polish for the MVP phase, per the client's own priority order — optimize later, once the flow is proven.
