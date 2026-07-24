-- Migration: referral state-machine hardening.
--
-- Two independent fixes, both flagged by the architecture audit:
--
-- 1. Migration tracking. Nothing in this repo has ever recorded which
--    migrations a given database has actually run -- which is exactly how
--    migration_0010's app code shipped to production before its own
--    migration had been applied. `applied_migrations` is a plain ledger
--    (not tamper-evident like ledger_entries -- this is an internal ops
--    table, not a public trust record) that every future migration file
--    should end by inserting its own name into. Backfilled here with every
--    migration through 0010 so history isn't lost.
--
-- 2. Atomic commission writes. The 'won' transition in
--    app/api/referrals/[id]/status/route.ts used to make six independent,
--    non-transactional round trips (referral_won ledger entry -> tier1
--    ledger entry -> tier1 payout insert -> tier2 ledger entry -> tier2
--    payout insert -> eco_pledge ledger entry). Any one of those failing
--    after an earlier one committed left the referral in a state the
--    ledger and payouts table disagreed about -- a real integrity gap in
--    the one flow where TCN's entire trust proposition is "this number is
--    correct." process_won_commissions() does all of it inside a single
--    Postgres function call, so it either all lands or none of it does.
--    Commission math itself stays in lib/commission/calc.ts (pure,
--    unchanged) -- only the write sequence moves into the database.
--
-- Safe to run more than once.

create table if not exists applied_migrations (
  name text primary key,
  applied_at timestamptz not null default now()
);

insert into applied_migrations (name) values
  ('schema.sql'),
  ('migration_0002_self_service.sql'),
  ('migration_0003_email.sql'),
  ('migration_0003_whatsapp_funnel.sql'),
  ('migration_0004_request_routing.sql'),
  ('migration_0005_webhook_idempotency.sql'),
  ('migration_0006_payouts_unique.sql'),
  ('migration_0007_rls_performance.sql'),
  ('migration_0008_realtime_dashboard_auth.sql'),
  ('migration_0009_bridge_identity_unique.sql'),
  ('migration_0010_referral_workflow.sql'),
  ('migration_0011_state_machine_hardening.sql')
on conflict (name) do nothing;

-- ── process_won_commissions() ───────────────────────────
-- Called once from the 'won' branch of PATCH /api/referrals/:id/status,
-- after the referral row itself has already been flipped to 'won' by the
-- existing double-fire-guarded UPDATE. Every commission-related write from
-- that point on happens inside this one function call, so it's one
-- transaction: either the full ledger + payout trail lands, or none of it
-- does -- there is no longer a state where a referral is 'won' with a
-- half-recorded commission trail. `on conflict do nothing` on the payout
-- inserts is a belt-and-braces backstop on top of the existing
-- payouts_referral_tier_unique constraint (migration_0006), not a change
-- in intended behavior -- this function only ever runs once per
-- transition thanks to the caller's existing guard.
create or replace function process_won_commissions(
  p_referral_id uuid,
  p_vendor_slug text,
  p_connector_id uuid,
  p_job_value_cents bigint,
  p_tier1_amount_cents bigint,
  p_upline_connector_id uuid,
  p_tier2_amount_cents bigint,
  p_eco_pledge_pct numeric
)
returns jsonb
language plpgsql
as $$
declare
  v_tier1_entry ledger_entries;
  v_tier2_entry ledger_entries;
begin
  perform append_ledger_entry('referral_won', jsonb_build_object(
    'referralId', p_referral_id,
    'vendorSlug', p_vendor_slug,
    'connectorId', p_connector_id,
    'jobValueCents', p_job_value_cents
  ));

  v_tier1_entry := append_ledger_entry('commission_tier1_paid', jsonb_build_object(
    'referralId', p_referral_id,
    'connectorId', p_connector_id,
    'amountCents', p_tier1_amount_cents
  ));

  insert into payouts (connector_id, referral_id, tier, amount_cents, ledger_entry_seq)
  values (p_connector_id, p_referral_id, 1, p_tier1_amount_cents, v_tier1_entry.seq)
  on conflict (referral_id, tier) do nothing;

  if p_upline_connector_id is not null and p_tier2_amount_cents > 0 then
    v_tier2_entry := append_ledger_entry('commission_tier2_paid', jsonb_build_object(
      'referralId', p_referral_id,
      'connectorId', p_upline_connector_id,
      'amountCents', p_tier2_amount_cents
    ));

    insert into payouts (connector_id, referral_id, tier, amount_cents, ledger_entry_seq)
    values (p_upline_connector_id, p_referral_id, 2, p_tier2_amount_cents, v_tier2_entry.seq)
    on conflict (referral_id, tier) do nothing;
  end if;

  if p_eco_pledge_pct > 0 then
    perform append_ledger_entry('eco_pledge_honoured', jsonb_build_object(
      'referralId', p_referral_id,
      'vendorSlug', p_vendor_slug,
      'ecoPledgePct', p_eco_pledge_pct,
      'jobValueCents', p_job_value_cents
    ));
  end if;

  return jsonb_build_object('tier1Seq', v_tier1_entry.seq, 'tier2Seq', v_tier2_entry.seq);
end;
$$;

-- ── Composite indexes flagged in the audit ──────────────
-- Invisible at current volume, will matter once dashboards and the grade-
-- promotion count query are scanning thousands of rows instead of dozens.
create index if not exists idx_referrals_vendor_created on referrals(vendor_id, created_at desc);
create index if not exists idx_referrals_connector_status on referrals(connector_id, status);
create index if not exists idx_ledger_entry_type on ledger_entries(entry_type);

-- Make PostgREST expose the new function/tables immediately.
notify pgrst, 'reload schema';
