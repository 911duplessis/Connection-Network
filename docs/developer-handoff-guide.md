# TCN Developer Handoff Guide

Objective, technical brief for the developer joining the project. Two parts: what's actually live today (Part I), and the client's target architecture for the next major phase — a request-routing engine — reconciled against the real schema so nothing here overstates what exists (Part II). No campaign copy beyond what's already shipped in `docs/whatsapp-funnel-scripts.md` — new campaign content is supplied separately by the client.

---

## Part I — What's already live

`911duplessis/Connection-Network` — Next.js 15 (App Router) + React 19 + Supabase (Postgres, RLS, no Supabase Auth — custom SHA-256 signed cookie sessions), Tailwind, deployed on Vercel free tier. Working end-to-end:

- Vendor signup (self-service + admin-approved) and vendor login/dashboard.
- Connector signup (`/join`) with an optional one-level upline (`connectors.upline_connector_id`), a self-declared `connector_type` (referrer/supplier/explorer, set via WhatsApp), and a `grade` (connector/active_partner/ambassador).
- Referral submission and lifecycle: `submitted → contacted → quoted → won/lost`.
- A public, unauthenticated lead-intake endpoint (`POST /api/leads`) that resolves to a fixed `DIRECT-UNASSIGNED` connector and an `unassigned` vendor bucket for manual admin triage — leads that don't come from a specific connector's referral link already have a place to land. This is the seed of Part II's "Request Capture Engine."
- On `won`: automatic commission calculation (`lib/commission/calc.ts`), ledger entries, `payouts` rows, WhatsApp notifications, and an automatic grade-promotion check (`lib/connectors/grade.ts`) that bumps a connector's upline override from the vendor default to 15% once they hit Active Partner.
- A Postgres hash-chain public ledger (`ledger_entries`, `append_ledger_entry()`, `verify_ledger_chain()`) — publicly readable and independently verifiable, the trust backbone of the whole platform. Do not modify this chain's logic without understanding it fully; it's intentionally append-only and tamper-evident. Grade promotions are ledger-backed too (`grade_promoted` entry type).
- Reviews (`POST /api/reviews`), ledger-backed, currently unaggregated (see `docs/tcn-program-strategy.md` §3).
- WhatsApp Cloud API webhook (`app/api/whatsapp/webhook`) — inbound keyword routing including connector-type selection (A/B/C) and referral-code-personalized joins (`JOIN <code>`). See `docs/whatsapp-funnel-scripts.md` for the exact shipped copy.
- Outreach invitations (`invitations` table, `/admin/invitations`, `app/api/admin/invitations/`) — admin adds a known-but-unsigned business, sends a personalized WhatsApp invite with a one-time signup link, and the vendor-signup flow automatically marks the invitation `signed` and confirms via WhatsApp once they complete signup.
- Admin dashboard: vendor approval, referral overview, link to outreach invitations.
- No payment processor integration — payouts are recorded, not disbursed automatically (that stays manual/EFT for now; see the platform-fee question in Part II, which bears directly on whether this stays true).
- No categories, no rating aggregation, no test suite.

See `docs/tcn-program-strategy.md` for the product/business design behind all of this.

---

## Part II — Target architecture: request routing engine (client vision, reconciled)

The client's own MVP spec for the next phase, reproduced below, describes TCN as *"a request-to-fulfilment routing network where users submit needs, and the system connects them to the most suitable vendors or affiliates, tracks fulfilment, and distributes value through a structured commission ledger."* That is a meaningfully bigger idea than what's live today: right now, a **connector** (a person who already knows a vendor) manually chooses who to refer a lead to. The spec describes the system **automatically matching** an incoming request to the best vendor by a scoring formula, with no connector required. Both models can coexist — an automated request→match flow, alongside the existing connector-refers-someone-they-know flow — but that's a real product decision, not a given, so it's called out explicitly rather than silently assumed.

### Terminology map (spec term → what exists → the gap)

| Spec term | Existing equivalent | Gap to close |
|---|---|---|
| `users` (customer/vendor/affiliate/admin roles) | Split across `vendors`, `connectors`, and the single `ADMIN_PASSWORD` env var | No unified `users` table; no `location` field anywhere yet |
| `requests` | `referrals` (connector-submitted) + `POST /api/leads` (connector-less, admin-triaged) | No `category`, `location`, or `budget` fields; status enum differs (`submitted/contacted/quoted/won/lost` vs. the spec's `NEW/ASSIGNED/IN_PROGRESS/COMPLETE`) |
| `vendors` | `vendors` | No `location`, no `service_categories` (category taxonomy is designed but unbuilt, `docs/tcn-program-strategy.md` §2), no aggregated `rating_score` (ratings are designed but unbuilt, §3) |
| `affiliates` | `connectors` | Already richer than the spec here: referral code, upline, `grade`, `connector_type` all exist |
| `matches` (the routing engine) | Nothing | Fully unbuilt. Today, matching is a human connector's judgment call, not a system decision |
| `ledger` (commission ledger) | `ledger_entries` (hash-chained, append-only, publicly verifiable) + `payouts` | Already more rigorous than a flat ledger table — but see the platform-fee gap below |

### Two open decisions before this gets built

1. **Does TCN ever hold the money?** The spec's commission example (Job Value R1000 → Vendor R850, Affiliate R100, Platform R50) implies TCN collects the full payment and disburses three ways. Today it does not: the vendor is paid directly by the customer, and separately pays the connector's commission themselves (manually, off-platform) — the ledger *records* what's owed, it doesn't *move* money, and there is currently no platform-fee line at all (100% of the tier-1/tier-2 split goes to connectors). Becoming an actual payment custodian is a much larger scope increase — escrow handling, a payment processor integration, likely regulatory/compliance implications — than adding a routing engine on top of the existing record-only ledger. Confirm which model before a developer builds toward either one.
2. **Is automatic vendor assignment actually wanted for the connector-referral flow, or only for connector-less requests?** The existing `/api/leads` "unassigned" bucket is the natural home for automatic routing (nobody's chosen a vendor yet) without touching the connector-driven flow at all. Auto-assigning a vendor to a referral a specific connector already submitted to a specific vendor's page would be a different, arguably unwanted, change.

### The routing engine, as specified (not yet built)

Rule-based matching, no AI, per the client's spec:

```
match_score =
    category_match   (50%)
  + location_match    (20%)
  + vendor_rating      (20%)
  + availability       (10%)
```

Highest-scoring vendor is selected; system auto-assigns or an admin can override. **Prerequisites before this can be built at all**, all currently missing: a category taxonomy on vendors (§2 of the strategy doc), a `location` field on vendors and requests, an aggregated `rating_score` (§3 of the strategy doc), and an `availability` flag/field on vendors that doesn't exist in any form today. In other words, this is blocked on the categories + ratings work already queued in Part III below, not just on writing the scoring function itself.

### WhatsApp request-capture flow (as specified)

A generic `"I need X"` intake, distinct from today's flow (a connector who already knows which vendor's page to submit a lead through):

1. User messages the business number with a need (e.g. "I need a plumber in Randburg").
2. System acknowledges ("We are processing your request…"), captures category/location/budget.
3. Routing engine matches a vendor (once built — see above); until then, this can land in the same `unassigned` bucket `/api/leads` already uses, for manual admin assignment.
4. User is notified of the assignment, and again on completion, with a prompt to rate.

This is additive to the existing webhook (`app/api/whatsapp/webhook`) — it needs new inbound parsing (free-text need + location + budget, not just single-word keywords), not a replacement for it.

### Build phases, as specified, reconciled against what's already done

- **Phase 1** (request capture, DB setup, manual admin assignment, basic notifications) — **partially done**: DB, admin dashboard, and notifications already exist; only the WhatsApp free-text request-capture parsing (vs. today's keyword-only webhook) is net-new.
- **Phase 2** (routing engine automation, vendor onboarding, affiliate tracking, commission ledger) — vendor onboarding, affiliate (connector) tracking, and the commission ledger are **already done and more advanced than specified** (hash-chained, tamper-evident, ambassador grading). Only the routing/scoring engine itself is net-new, and it's blocked on the categories/ratings/location prerequisites above.
- **Phase 3** (analytics dashboard, optimization, scaling architecture) — not started, genuinely post-MVP as specified.

### Non-negotiable constraints, as specified

1. WhatsApp is an interface layer only — the routing engine (once built) is the core product logic, not WhatsApp itself.
2. The commission ledger must exist from day one — already true, and already stronger than the spec (tamper-evident hash chain vs. a flat table).
3. No AI/ML in the routing engine for MVP — plain rule-based scoring only.
4. No mobile apps at this stage.

---

## Part III — What's left to build, in order

1. **Categories + vendor directory search** — schema addition (`vendors.categories`) + filter UI on `/vendors`. Low risk, no dependency on anything else, and now also a hard prerequisite for the routing engine in Part II.
2. **Ratings sub-scores + aggregation** — extend `reviews` with `service_rating`/`product_rating`/`reward_rating`, add a read-side aggregation view, surface it on vendor profile pages. Also a routing-engine prerequisite (`vendor_rating`).
3. **`location` field + `availability` flag on vendors** — net-new, not previously scoped anywhere; needed before any routing/scoring work starts.
4. **Routing engine** (Part II) — once 1–3 exist. Resolve the two open decisions above first.
5. ~~Ambassador grading~~ — done. Follow-up: the rolling-30-day and cumulative-revenue promotion triggers described in `docs/tcn-program-strategy.md` §1.2 aren't implemented — only the simpler lifetime-closes trigger (5/10) is live.
6. ~~Invitations / outreach tracking layer~~ — done. Follow-up: no automated reminder for stale `pending`/`sent` invitations, and no `opened` status tracking (needs a click-tracked redirect route).
7. **WhatsApp funnel automation, richer sequences** — the current webhook is still single-message-per-keyword (no multi-step drip sequences, no free-text request parsing yet). Both the Part II request-capture flow and any future drip campaigns land here.
8. **Google Business Profile + social platform integration** — read reviews/insights from Google Business Profile, and posting/insights via Meta Graph API (Facebook/Instagram) at minimum. Most account/API-heavy piece, do this last.

## Accounts / APIs required

| Need | For | Notes |
|---|---|---|
| Meta Business account + WhatsApp Cloud API | Already configured and live (`WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET`) | Multi-step drip sequences and free-text request capture will need Meta-approved message templates — factor in template review turnaround time |
| Meta Graph API app (Facebook/Instagram) | Social posting + insights tracking | New — needs a Meta developer app + page/IG business account permissions |
| Google Business Profile API access | Reading reviews/insights per vendor | New — needs OAuth consent from each business's GBP account; this is per-vendor, not a single org-wide credential |
| Payment processor (e.g. Paystack, Yoco, PayFast) | Only if decision 1 above lands on "TCN holds the money" | Not needed at all under the current record-only ledger model |
| Supabase project | Already exists | Developer needs to be invited as a collaborator; run `supabase/migration_0003_whatsapp_funnel.sql` if it hasn't been applied yet |
| Vercel project | Already exists | Developer needs to be invited as a collaborator; Vercel Cron is sufficient for any scheduled/automated sends at this scale — no separate queue service needed yet |

## Scale note

Keep the stack small and free-tier for now (it already is — Vercel + Supabase, no paid services), but don't architect anything that assumes a single vendor or a single WhatsApp number. The intent is to grow this network across many vendors and categories over time, so:

- Don't hardcode PrimeTurf-specific values anywhere in shared logic (the commission calc and ledger already get this right — follow that pattern).
- Keep the WhatsApp number/template config per-environment-variable, not assumed to be singular forever.
- The invitation and ambassador-grading systems already handle any vendor/connector, not just PrimeTurf — keep it that way as they grow, and design the routing engine (Part II) the same way from the start rather than hardcoding a single vendor's category set.

## Success criteria (Part II, once built)

A developer should treat the routing engine as done when: a user can submit a request via WhatsApp with no prior relationship to any connector, the system assigns a matching vendor (or an admin overrides it), the vendor completes the job, the system logs the transaction, and commission is recorded correctly against the existing ledger/payouts tables — not a new, parallel ledger.

## Estimated build time (Part II only, per client's own estimate)

MVP request-routing addition: 2–4 weeks once the categories/ratings/location prerequisites in Part III are in place. Full platform, including Google Business/social integration: 6–10 weeks. These are the client's estimates, not independently validated against this codebase's actual complexity.

## Explicit non-goals for the developer

- No campaign copywriting — funnel scripts/content beyond what's in `docs/whatsapp-funnel-scripts.md` come from the client separately.
- No changing the ambassador reward *amounts* or grade thresholds in `lib/connectors/grade.ts` without checking — those are product decisions.
- No outreach to real businesses beyond what the admin explicitly sends via `/admin/invitations` — sending stays a manual, admin-driven action per business.
- No building toward the "TCN holds the money" model (payment processor, escrow) without explicit client sign-off — see decision 1 in Part II.
- Speed and a working end-to-end flow over scalability polish for the MVP phase, per the client's own priority order — optimize later, once the flow is proven.
