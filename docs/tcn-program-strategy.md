# TCN Program Strategy — Ambassador/Affiliate Program, Categorized Search, Ratings, Outreach

Status: **§1.2 (Ambassador grade) and §4 (Invitations) are implemented** — see `supabase/migration_0003_whatsapp_funnel.sql`, `lib/connectors/grade.ts`, `app/api/admin/invitations/`, and `docs/whatsapp-funnel-scripts.md` for the shipped version. §1.1 (referrer-type rates), §2 (categories), §3 (ratings), and §5 (PrimeTurf phase tagging beyond the bare `market_phase` column) are still design-only. Schema/field names below match what's actually in the database — this doc stays the reference for what to build next.

## Why this exists

The Connection Network (TCN) already works end-to-end for a single vendor (PrimeTurf): connectors join, submit referrals, get paid a flat 5% + R500 on a won deal, and every step is recorded on a public hash-chain ledger. What's missing is everything needed to grow this into a real multi-vendor network:

- A lot of businesses are already informally "connected" (word of mouth, WhatsApp groups, past conversations) but have never actually signed up on the platform. They need to be invited, one at a time, and tracked through that funnel.
- Connectors currently have one flat reward regardless of how much they refer or how they refer it. There's no reason for a top performer to behave differently from someone who refers once and disappears.
- The vendor directory has no categories or search — a connector who wants to refer "someone who does rentals" or "turf" has to scroll every vendor.
- Reviews exist but aren't aggregated into anything a connector or prospective customer can act on at a glance (e.g. "70% overall").

This document designs all four pieces. It intentionally does not include any WhatsApp funnel campaign copy or content — that lives in `docs/whatsapp-funnel-scripts.md`, kept separate from this structural design.

---

## 1. Graded Ambassador / Affiliate Program

Two independent axes, both layered on top of the vendor's own terms (`vendors.tier1_pct`, `vendors.tier1_flat_cents`, `vendors.tier2_override_pct` — unchanged, vendors keep setting their own base rate).

### 1.1 Referrer type (per-vendor rate override, optional) — not yet implemented

Some referrer types justify a higher base rate because they carry lower acquisition cost / higher trust than a cold connector — this was already drafted informally for PrimeTurf and is generalized here:

| Connector type | Suggested rate | Rationale |
|---|---|---|
| Architect / Designer | 10% | Every specification they produce is close to a zero-CAC close |
| Property Developer | 7.5% + framework bonus | Volume + locked-in pricing |
| Pool builder / Landscaper | 7.5% | Adjacent service, same buyer, warm referral |
| Estate agent | 5% | Pre-listing motivation, fast close cycle |
| Builder / Contractor | 5% | Project-adjacent, medium trust transfer |
| School / Body Corporate | 5% | B2B volume potential, slower cycle |
| Default connector | vendor's standard rate | No override |

Schema (still needed): a `vendor_connector_type_rates` table (`vendor_id`, `connector_type`, `pct_override`, `flat_override_cents`) so each vendor can opt into these rates or leave them at their own default. Note: `connectors.connector_type` already exists (added in migration_0003) but currently only distinguishes broad self-declared intent (referrer/supplier/explorer, set via the WhatsApp `A`/`B`/`C` reply) — it is not yet wired to this professional-type rate table.

### 1.2 Ambassador grade (network-wide, performance-based) — implemented

Independent of vendor or type — this is about how much a connector has actually delivered across the whole network, and it unlocks perks rather than changing anyone's base commission unexpectedly:

- **Grade 1 — Connector** (default, everyone starts here): standard terms from 1.1, no extra perks.
- **Grade 2 — Active Partner**: auto-promoted at 5 lifetime closes (the "3 closed referrals in a rolling 30 days" alternate trigger described here originally was not implemented — only the simpler lifetime-count trigger shipped, see `lib/connectors/grade.ts`). Unlocks:
  - "Starter Pack" — branded WhatsApp link card, flyer templates, before/after image kit. **Not automated** — the promotion message tells the connector it's coming, but actually sending it is still a manual admin step.
  - Monthly bonus for closing 3+ referrals in a calendar month — **not implemented**, no code tracks or pays this yet.
  - Their own upline override raised from the vendor's default to a flat 15% on tier-2 commissions earned from people they've personally recruited into the network. **Implemented** — `overridePctForGrade()` in `lib/connectors/grade.ts`, applied in the referral-won flow.
- **Grade 3 — Ambassador**: auto-promoted at 10 lifetime closes (the "R50,000 cumulative referred revenue" alternate trigger was not implemented) or admin-appointed directly (admin appointment isn't wired up yet either — grade is currently only ever set by the automatic check). Unlocks everything in Grade 2, plus:
  - Priority routing — **not implemented**.
  - Leaderboard placement — **not implemented**, no leaderboard UI exists yet.
  - Eligibility for community-specific flat bonuses (e.g. a R750-per-closed-lead role) — **not implemented**, remains a manually-arranged appointment, not a system feature.

Schema (implemented): `connectors.grade` (enum: `connector` / `active_partner` / `ambassador`), grade changes recorded as ledger entry type `grade_promoted` (payload: connector id, from/to grade, lifetime closes) so promotions are auditable exactly like everything else on the ledger.

---

## 2. Categorized vendor search — not yet implemented

Fixed, extensible top-level taxonomy so the network scales beyond landscaping without becoming unsearchable:

- Landscaping & Turf
- Property & Rentals
- Home Services & Trades
- Professional Services
- Events & Hospitality
- Other

(This list is already in use as the category dropdown on `/admin/invitations` — see `components/InvitationForm.tsx` — but it's only applied to invitations so far, not to `vendors` itself or to any public search/filter UI.)

Each vendor selects one or more categories at signup (`vendors/signup`). The public vendor directory (`/vendors`) gets a category filter plus free-text search, so a connector can quickly find "who in the network does X" instead of scrolling everyone.

Schema: `vendors.categories` (text array) is the simplest fit given the current schema style (no join tables elsewhere); a `vendor_categories` join table is the alternative if categories need their own metadata (icon, sort order) later.

---

## 3. Ratings — overall % plus breakdown — not yet implemented

Today `reviews` stores a single 1–5 `rating`, ledger-backed, with no aggregation shown anywhere. Extend it:

- Add three sub-scores per review: `service_rating`, `product_rating`, `reward_rating` (each 1–5), alongside the existing `rating`.
- Vendor profile page shows an **Overall %** (average of the three sub-scores, scaled to 100 — e.g. "70% overall") plus a breakdown bar for Service / Product / Reward, so a connector deciding whether to refer someone can see at a glance whether the service is good, the product is good, and the reward is worth it.
- Aggregation is read-side only (a view, e.g. `vendor_rating_summary`, computed from `reviews`) — writes stay exactly as they are today (ledger entry first, then the review row referencing it).

---

## 4. Outreach / invitation layer ("clean ledger" for signups) — implemented

The existing `ledger_entries` hash chain stays exactly as-is — it's the trust mechanism for already-onboarded vendors and connectors and was not reset or touched. What's new is a separate, parallel tracking layer for the businesses that are informally connected but haven't signed up yet:

- `invitations` table (implemented, migration_0003): `id`, `business_name`, `contact_whatsapp`, `category`, `market_phase` (see §5), `status` (`pending` → `sent` → `opened` → `signed`), `invited_by`, `invite_token` (unique), `sent_at`, `signed_at`, `created_at`.
- Admin page `/admin/invitations` (implemented) to add known-but-unsigned businesses one at a time and generate a personalized one-time invite link per business: `/vendors/signup?invite=TOKEN`, which the vendor-signup API detects and uses to mark the invitation `signed` + notify the original WhatsApp number once they complete signup. **Bulk import is not implemented** — businesses are added one at a time through the form, matching how you described reaching out to them anyway.
- Sending the invite itself is a manual admin click per business (implemented as a "Send invite" button, not automated) — the system's job is only to track where each business currently sits in that funnel so nobody gets missed or re-invited by accident.
- **Not implemented**: the `opened` status (would need click-tracked redirect), and any automated reminder for stale `pending`/`sent` invitations.

---

## 5. PrimeTurf's 3-phase market rollout — schema only, no tooling yet

This is a PrimeTurf-specific targeting tag, not a network-wide category — kept separate from §2 so vendor categories and PrimeTurf's own go-to-market sequencing never get confused with each other:

1. **Phase 1 — Standard**: homeowners, schools, parks.
2. **Phase 2 — Premium**: luxury estates, golf estates, restaurants.
3. **Phase 3 — Water-restricted**: properties facing the next water-restriction level — PrimeTurf's own research (ASQ1) found water restrictions to be the dominant conversion driver in 42% of closes, so this is the highest-urgency segment, not the first one targeted.

Stored as `invitations.market_phase` (implemented, selectable in the `/admin/invitations` form) — `referrals.market_phase` was not added; there's no reporting or filtering by phase yet, just the raw tag on each invitation.

---

## Open decisions

- **Settled for now**: grade promotion uses lifetime-closes only (5 → Active Partner, 10 → Ambassador), and the upline override bump is a flat 15%. Revisit if this proves too fast/slow in practice, or add the rolling-30-day and cumulative-revenue alternate triggers described above.
- **Still open**: the §1.1 referrer-type rate table (Architect 10%, Estate agent 5%, etc.) — not built, needs sign-off on whether it's worth the added complexity before building `vendor_connector_type_rates`.
- **Still open**: the §2 category list — currently only used for invitations, not vendors. Confirm before it's used on the actual vendor signup form, since renaming/merging categories after vendors have picked them is harder than adding them now.
- **Still open**: who appoints someone to Ambassador manually (e.g. the R750 community-moderator bonus role) and how that's recorded — currently grade is only ever set by the automatic lifetime-closes check, there's no admin override UI.
