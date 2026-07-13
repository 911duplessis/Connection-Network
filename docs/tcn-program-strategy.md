# TCN Program Strategy — Ambassador/Affiliate Program, Categorized Search, Ratings, Outreach

Status: design document, not yet implemented. Schema/field names below are chosen to slot directly into the existing tables in `supabase/schema.sql` and `supabase/migration_0002_self_service.sql` — this doc is written so a migration can be written straight from it.

## Why this exists

The Connection Network (TCN) already works end-to-end for a single vendor (PrimeTurf): connectors join, submit referrals, get paid a flat 5% + R500 on a won deal, and every step is recorded on a public hash-chain ledger. What's missing is everything needed to grow this into a real multi-vendor network:

- A lot of businesses are already informally "connected" (word of mouth, WhatsApp groups, past conversations) but have never actually signed up on the platform. They need to be invited, one at a time, and tracked through that funnel.
- Connectors currently have one flat reward regardless of how much they refer or how they refer it. There's no reason for a top performer to behave differently from someone who refers once and disappears.
- The vendor directory has no categories or search — a connector who wants to refer "someone who does rentals" or "turf" has to scroll every vendor.
- Reviews exist but aren't aggregated into anything a connector or prospective customer can act on at a glance (e.g. "70% overall").

This document designs all four pieces. It intentionally does not include any WhatsApp funnel campaign copy or content — that's supplied separately and lives in its own place, not mixed in with this structural design.

---

## 1. Graded Ambassador / Affiliate Program

Two independent axes, both layered on top of the vendor's own terms (`vendors.tier1_pct`, `vendors.tier1_flat_cents`, `vendors.tier2_override_pct` — unchanged, vendors keep setting their own base rate).

### 1.1 Referrer type (per-vendor rate override, optional)

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

Schema: `connectors.connector_type` (nullable enum/text) + `vendor_connector_type_rates` table (`vendor_id`, `connector_type`, `pct_override`, `flat_override_cents`) so each vendor can opt into these rates or leave them at their own default.

### 1.2 Ambassador grade (network-wide, performance-based)

Independent of vendor or type — this is about how much a connector has actually delivered across the whole network, and it unlocks perks rather than changing anyone's base commission unexpectedly:

- **Grade 1 — Connector** (default, everyone starts here): standard terms from 1.1, no extra perks.
- **Grade 2 — Active Partner**: auto-promoted at 3 closed referrals within a rolling 30 days, or 5 lifetime closes. Unlocks:
  - "Starter Pack" — branded WhatsApp link card, flyer templates, before/after image kit.
  - Monthly bonus for closing 3+ referrals in a calendar month.
  - Their own upline override raised from the current flat 10% to 15% on tier-2 commissions earned from people they've personally recruited into the network.
- **Grade 3 — Ambassador**: auto-promoted at 10 lifetime closes or R50,000 cumulative referred revenue, or admin-appointed directly (e.g. for a trusted community moderator). Unlocks everything in Grade 2, plus:
  - Priority routing — first look at new unassigned/direct leads matching their area or category, before they're opened to the wider network.
  - Leaderboard placement.
  - Eligibility for community-specific flat bonuses (e.g. a R750-per-closed-lead role for someone actively moderating and amplifying posts in a specific Facebook group), stacked on top of their normal commission — this is an appointed role, not automatic.

Schema: `connectors.grade` (enum: `connector` / `active_partner` / `ambassador`), grade changes recorded as a new ledger entry type `grade_promoted` (payload: connector id, old grade, new grade, reason) so promotions are auditable exactly like everything else on the ledger. A `grade_history` view can be derived from ledger entries rather than a separate table.

---

## 2. Categorized vendor search

Fixed, extensible top-level taxonomy so the network scales beyond landscaping without becoming unsearchable:

- Landscaping & Turf
- Property & Rentals
- Home Services & Trades
- Professional Services
- Events & Hospitality
- Other

Each vendor selects one or more categories at signup (`vendors/signup`). The public vendor directory (`/vendors`) gets a category filter plus free-text search, so a connector can quickly find "who in the network does X" instead of scrolling everyone.

Schema: `vendors.categories` (text array) is the simplest fit given the current schema style (no join tables elsewhere); a `vendor_categories` join table is the alternative if categories need their own metadata (icon, sort order) later.

---

## 3. Ratings — overall % plus breakdown

Today `reviews` stores a single 1–5 `rating`, ledger-backed, with no aggregation shown anywhere. Extend it:

- Add three sub-scores per review: `service_rating`, `product_rating`, `reward_rating` (each 1–5), alongside the existing `rating`.
- Vendor profile page shows an **Overall %** (average of the three sub-scores, scaled to 100 — e.g. "70% overall") plus a breakdown bar for Service / Product / Reward, so a connector deciding whether to refer someone can see at a glance whether the service is good, the product is good, and the reward is worth it.
- Aggregation is read-side only (a view, e.g. `vendor_rating_summary`, computed from `reviews`) — writes stay exactly as they are today (ledger entry first, then the review row referencing it).

---

## 4. Outreach / invitation layer ("clean ledger" for signups)

The existing `ledger_entries` hash chain stays exactly as-is — it's the trust mechanism for already-onboarded vendors and connectors and should not be reset or touched. What's new is a separate, parallel tracking layer for the businesses that are informally connected but haven't signed up yet:

- New `invitations` table: `id`, `business_name`, `contact_whatsapp`, `category`, `market_phase` (see §5, nullable), `status` (`pending` → `sent` → `opened` → `signed`), `invited_by`, `invite_token` (unique), `sent_at`, `signed_at`, `created_at`.
- New admin page `/admin/invitations` to bulk-import the list of known-but-unsigned businesses and generate a personalized one-time invite link per business: `/vendors/signup?invite=TOKEN`, which prefills whatever is already known about them.
- Sending the invite itself stays manual — one WhatsApp message at a time, as intended — the system's job is only to track where each business currently sits in that funnel so nobody gets missed or re-invited by accident.

---

## 5. PrimeTurf's 3-phase market rollout

This is a PrimeTurf-specific targeting tag, not a network-wide category — kept separate from §2 so vendor categories and PrimeTurf's own go-to-market sequencing never get confused with each other:

1. **Phase 1 — Standard**: homeowners, schools, parks.
2. **Phase 2 — Premium**: luxury estates, golf estates, restaurants.
3. **Phase 3 — Water-restricted**: properties facing the next water-restriction level — PrimeTurf's own research (ASQ1) found water restrictions to be the dominant conversion driver in 42% of closes, so this is the highest-urgency segment, not the first one targeted.

Stored as `invitations.market_phase` and optionally `referrals.market_phase` (both nullable, PrimeTurf-only usage today, available to any future vendor that wants the same kind of staged rollout).

---

## Open decisions before implementation

- Confirm the Grade 2/3 thresholds (3 closes/30 days, 10 lifetime closes, R50k cumulative) and the specific perk amounts (15% override, R750 community bonus) — these are proposed defaults, not settled numbers.
- Confirm the final category list in §2 before it's used on the signup form (adding categories later is easy; renaming/merging them after vendors have picked them is not).
- Decide who owns bulk-importing the invitation list in §4 (this doc assumes an admin does it manually from existing contacts, not an automated scrape).
