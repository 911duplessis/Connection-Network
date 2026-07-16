-- Idempotency backstop for the "won" transition. The application-level guard
-- in app/api/referrals/[id]/status/route.ts (conditional UPDATE ... WHERE
-- status <> 'won') should already prevent this, but a unique constraint means
-- a bug or a direct DB write can never silently create duplicate payouts for
-- the same referral/tier — which previously meant duplicate, real, billed
-- WhatsApp template sends per re-fire. Safe to run more than once.

alter table payouts drop constraint if exists payouts_referral_tier_unique;
alter table payouts add constraint payouts_referral_tier_unique unique (referral_id, tier);
