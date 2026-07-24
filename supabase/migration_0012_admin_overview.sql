-- Migration: quote value, payout paid-tracking, and the ledger entry type
-- that backs the admin "mark paid" action.
--
-- Two gaps this closes, both raised directly from live usage of the admin
-- dashboard:
--
-- 1. Moving a referral to 'quoted' was a bare status flag -- no amount was
--    ever captured. quoted_value_cents mirrors how job_value_cents already
--    works at the 'won' transition, so "what was actually proposed" is a
--    real, storable number, not just an implied status.
--
-- 2. A payout row has only ever meant "commission calculated," never
--    "commission actually paid out" -- there was no way to distinguish
--    money owed from money sent. payouts.paid_at (null = owed, timestamp =
--    paid) plus the new 'payout_marked_paid' ledger entry type makes "this
--    connector was actually paid" a provable, tamper-evident event, the
--    same way every other trust-relevant event on this platform is.
--
-- Safe to run more than once.

alter table referrals add column if not exists quoted_value_cents bigint;
alter table payouts add column if not exists paid_at timestamptz;

alter table ledger_entries drop constraint if exists ledger_entries_entry_type_check;
alter table ledger_entries add constraint ledger_entries_entry_type_check
  check (entry_type in (
    'connector_joined','referral_submitted','referral_won',
    'commission_tier1_paid','commission_tier2_paid',
    'eco_pledge_honoured','review_submitted',
    'vendor_joined','agreement_signed','whatsapp_message_received',
    'grade_promoted','referral_status_changed','connector_invited',
    'payout_marked_paid'
  ));

insert into applied_migrations (name) values ('migration_0012_admin_overview.sql')
on conflict (name) do nothing;

-- Make PostgREST expose the new columns immediately.
notify pgrst, 'reload schema';
