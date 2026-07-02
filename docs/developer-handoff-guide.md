# TCN Developer Handoff Guide

Objective, technical brief for the developer joining the project. This intentionally contains no campaign copy beyond what's already shipped in `docs/whatsapp-funnel-scripts.md` — new campaign content is supplied separately by the client.

## 1. What's already live

`911duplessis/Connection-Network` — Next.js 15 (App Router) + React 19 + Supabase (Postgres, RLS, no Supabase Auth — custom SHA-256 signed cookie sessions), Tailwind, deployed on Vercel free tier. Working end-to-end:

- Vendor signup (self-service + admin-approved) and vendor login/dashboard.
- Connector signup (`/join`) with an optional one-level upline (`connectors.upline_connector_id`), a self-declared `connector_type` (referrer/supplier/explorer, set via WhatsApp), and a `grade` (connector/active_partner/ambassador).
- Referral submission and lifecycle: `submitted → contacted → quoted → won/lost`.
- On `won`: automatic commission calculation (`lib/commission/calc.ts`), ledger entries, `payouts` rows, WhatsApp notifications, and an automatic grade-promotion check (`lib/connectors/grade.ts`) that bumps a connector's upline override from the vendor default to 15% once they hit Active Partner.
- A Postgres hash-chain public ledger (`ledger_entries`, `append_ledger_entry()`, `verify_ledger_chain()`) — publicly readable and independently verifiable, the trust backbone of the whole platform. Do not modify this chain's logic without understanding it fully; it's intentionally append-only and tamper-evident. Grade promotions are now ledger-backed too (`grade_promoted` entry type).
- Reviews (`POST /api/reviews`), ledger-backed, currently unaggregated (see §2.2 below).
- WhatsApp Cloud API webhook (`app/api/whatsapp/webhook`) — inbound keyword routing including connector-type selection (A/B/C) and referral-code-personalized joins (`JOIN <code>`). See `docs/whatsapp-funnel-scripts.md` for the exact shipped copy.
- Outreach invitations (`invitations` table, `/admin/invitations`, `app/api/admin/invitations/`) — admin adds a known-but-unsigned business, sends a personalized WhatsApp invite with a one-time signup link, and the vendor-signup flow automatically marks the invitation `signed` and confirms via WhatsApp once they complete signup.
- Admin dashboard: vendor approval, referral overview, link to outreach invitations.
- No payment processor integration — payouts are recorded, not disbursed automatically (that stays manual/EFT for now).
- No categories, no rating aggregation, no test suite.

See `docs/tcn-program-strategy.md` for the product/business design behind all of this — read that first, this doc is the "how it's built" companion.

## 2. What's left to build, in order

1. **Categories + vendor directory search** — schema addition (`vendors.categories`) + filter UI on `/vendors`. Low risk, no dependency on anything else.
2. **Ratings sub-scores + aggregation** — extend `reviews` with `service_rating`/`product_rating`/`reward_rating`, add a read-side aggregation view, surface it on vendor profile pages.
3. ~~Ambassador grading~~ — done (see §1). Follow-up: the rolling-30-day and cumulative-revenue promotion triggers described in `docs/tcn-program-strategy.md` §1A aren't implemented — only the simpler lifetime-closes trigger (5/10) is live. Add those if the simpler version proves too slow or too fast in practice.
4. ~~Invitations / outreach tracking layer~~ — done (see §1). Follow-up: no automated reminder for stale `pending`/`sent` invitations, and no `opened` status tracking (needs a click-tracked redirect route).
5. **WhatsApp funnel automation, richer sequences** — the current webhook is still single-message-per-keyword (no multi-step drip sequences, no scheduled sends). If future campaign content needs a multi-day sequence rather than an instant reply, that's new plumbing on top of `lib/whatsapp/`.
6. **Google Business Profile + social platform integration** — read reviews/insights from Google Business Profile, and posting/insights via Meta Graph API (Facebook/Instagram) at minimum. Most account/API-heavy piece, do this last.

## 3. Accounts / APIs required

| Need | For | Notes |
|---|---|---|
| Meta Business account + WhatsApp Cloud API | Already configured and live (`WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET`) | Multi-step drip sequences (item 5 above) will need Meta-approved message templates — factor in template review turnaround time |
| Meta Graph API app (Facebook/Instagram) | Social posting + insights tracking | New — needs a Meta developer app + page/IG business account permissions |
| Google Business Profile API access | Reading reviews/insights per vendor | New — needs OAuth consent from each business's GBP account; this is per-vendor, not a single org-wide credential |
| Supabase project | Already exists | Developer needs to be invited as a collaborator; run `supabase/migration_0003_whatsapp_funnel.sql` if it hasn't been applied yet |
| Vercel project | Already exists | Developer needs to be invited as a collaborator; Vercel Cron is sufficient for any scheduled/automated sends at this scale — no separate queue service needed yet |

## 4. Scale note

Keep the stack small and free-tier for now (it already is — Vercel + Supabase, no paid services), but don't architect anything that assumes a single vendor or a single WhatsApp number. The intent is to grow this network across many vendors and categories over time, so:

- Don't hardcode PrimeTurf-specific values anywhere in shared logic (the commission calc and ledger already get this right — follow that pattern).
- Keep the WhatsApp number/template config per-environment-variable, not assumed to be singular forever.
- The invitation and ambassador-grading systems now handle any vendor/connector, not just PrimeTurf — keep it that way as they grow.

## 5. Explicit non-goals for the developer

- No campaign copywriting — funnel scripts/content beyond what's in `docs/whatsapp-funnel-scripts.md` come from the client separately.
- No changing the ambassador reward *amounts* or grade thresholds in `lib/connectors/grade.ts` without checking — those are product decisions.
- No outreach to real businesses beyond what the admin explicitly sends via `/admin/invitations` — sending stays a manual, admin-driven action per business.
