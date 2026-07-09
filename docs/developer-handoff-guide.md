# TCN Developer Handoff Guide

Objective, technical brief for the developer joining the project. This intentionally contains no campaign copy, WhatsApp funnel scripts, or marketing content — that is supplied separately by the client and slots into the automation described in §4 below once it exists. Don't invent campaign content; ask for it.

## 1. What's already live

`911duplessis/Connection-Network` — Next.js 15 (App Router) + React 19 + Supabase (Postgres, RLS, no Supabase Auth — custom SHA-256 signed cookie sessions), Tailwind, deployed on Vercel free tier. Working end-to-end:

- Vendor signup (self-service + admin-approved) and vendor login/dashboard.
- Connector signup (`/join`) with an optional one-level upline (`connectors.upline_connector_id`).
- Referral submission and lifecycle: `submitted → contacted → quoted → won/lost`.
- On `won`: automatic commission calculation (`lib/commission/calc.ts`), ledger entries, `payouts` rows, and WhatsApp notifications to the connector (and upline, if any).
- A Postgres hash-chain public ledger (`ledger_entries`, `append_ledger_entry()`, `verify_ledger_chain()`) — publicly readable and independently verifiable, the trust backbone of the whole platform. Do not modify this chain's logic without understanding it fully; it's intentionally append-only and tamper-evident.
- Reviews (`POST /api/reviews`), ledger-backed, currently unaggregated.
- WhatsApp Cloud API webhook (`app/api/whatsapp/webhook`) — inbound keyword routing (`CONNECT`, `JOIN`, `READY`, etc.) and outbound single-message notifications (`lib/whatsapp/client.ts`). No multi-step automated sequences yet.
- Admin dashboard: vendor approval, referral overview.
- No payment processor integration — payouts are recorded, not disbursed automatically (that stays manual/EFT for now).
- No categories, no rating aggregation, no ambassador/grading system, no test suite.

See `docs/tcn-program-strategy.md` for the product/business design of everything below — read that first, this doc is the "how to build it" companion.

## 2. Build order

1. **Categories + vendor directory search** — schema addition (`vendors.categories`) + filter UI on `/vendors`. Low risk, no dependency on anything else, do this first.
2. **Ratings sub-scores + aggregation** — extend `reviews` with `service_rating`/`product_rating`/`reward_rating`, add a read-side aggregation view, surface it on vendor profile pages.
3. **Ambassador grading** — `connectors.grade`, `connectors.connector_type`, `vendor_connector_type_rates`, auto-promotion logic (likely a Postgres function or a check run inside the existing `won` status-update path), dashboard updates on `/connector/dashboard` and `/admin`.
4. **Invitations / outreach tracking layer** — new `invitations` table, `/admin/invitations` bulk-import + invite-link generation UI, `invite` query param handling on `/vendors/signup`.
5. **WhatsApp funnel automation** — extends `lib/whatsapp/` from single outbound notifications to templated, multi-step automated sequences (e.g. a signup nudge sequence, a re-engagement sequence for `pending`/`sent` invitations). Campaign scripts/copy arrive separately from the client — build the sequencing/templating engine generically enough to accept any script, don't hardcode content.
6. **Google Business Profile + social platform integration** — read reviews/insights from Google Business Profile, and posting/insights via Meta Graph API (Facebook/Instagram) at minimum. This is the most account/API-heavy piece and should come last, after the core platform features are solid.

## 3. Accounts / APIs required

| Need | For | Notes |
|---|---|---|
| Meta Business account + WhatsApp Cloud API | Already partly configured (`WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET` in `.env.example`) | Automated funnel sequences need Meta-approved message templates — factor in template review turnaround time |
| Meta Graph API app (Facebook/Instagram) | Social posting + insights tracking | New — needs a Meta developer app + page/IG business account permissions |
| Google Business Profile API access | Reading reviews/insights per vendor | New — needs OAuth consent from each business's GBP account; this is per-vendor, not a single org-wide credential |
| Supabase project | Already exists | Developer needs to be invited as a collaborator |
| Vercel project | Already exists | Developer needs to be invited as a collaborator; Vercel Cron is sufficient for any scheduled/automated sends at this scale — no separate queue service needed yet |

## 4. Scale note

Keep the stack small and free-tier for now (it already is — Vercel + Supabase, no paid services), but don't architect anything that assumes a single vendor or a single WhatsApp number. The intent is to grow this network across many vendors and categories over time, so:

- Don't hardcode PrimeTurf-specific values anywhere in shared logic (the commission calc and ledger already get this right — follow that pattern).
- Keep the WhatsApp number/template config per-environment-variable, not assumed to be singular forever.
- The invitation and ambassador-grading systems in particular should be built to handle hundreds of vendors/connectors without a redesign, even if today there's only a handful.

## 5. Explicit non-goals for the developer

- No campaign copywriting — funnel scripts/content come from the client separately.
- No changing the ambassador reward *amounts* beyond what's specified in `docs/tcn-program-strategy.md` without checking — those are product decisions.
- No outreach to real businesses — sending invitations stays a manual, admin-driven action, not something to automate end-to-end without sign-off.
