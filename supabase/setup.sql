-- Connection Network — complete database setup.
-- Paste this whole file into the Supabase SQL editor and run it.
-- Idempotent: safe on a fresh database and safe to re-run on the existing one.
-- Generated from schema.sql + migration_0002..0006. Keep in sync if those change.

-- ============================================================
-- supabase/schema.sql
-- ============================================================
-- The Connection Network — Database Schema
-- Run this in your Supabase SQL editor.

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ── VENDORS ─────────────────────────────────────────────
-- Each vendor (e.g. PrimeTurf) defines its own reward + eco-pledge terms.
create table if not exists vendors (
  id uuid default uuid_generate_v4() primary key,
  slug text not null unique,
  name text not null,
  whatsapp_number text,
  website text,
  -- reward terms (generalizes PrimeTurf's "5% + R500" structure)
  tier1_pct numeric(5,2) not null default 5.00,            -- % of job value to the direct connector
  tier1_flat_cents bigint not null default 0,              -- flat closing bonus to the direct connector
  tier2_override_pct numeric(5,2) not null default 10.00,  -- % of the tier-1 payout passed up to the upline connector
  currency text not null default 'ZAR',
  -- eco-centric / unity pledge — the vendor's public commitment, shown on its profile
  eco_pledge_pct numeric(5,2) not null default 0,           -- % of profit pledged per sale (community/eco fund)
  eco_practices text,
  active boolean not null default true,
  -- self-service onboarding (vendors who sign up via /vendors/signup instead of being seeded)
  contact_person text,
  looking_for text,            -- what kind of leads this vendor wants
  password_hash text,          -- set at signup; lets the vendor log in to their own dashboard
  created_at timestamptz default now() not null
);

-- ── CONNECTORS ──────────────────────────────────────────
-- Network-wide referrers. upline_connector_id enables the 2nd tier:
-- whoever recruited a connector earns an override on that connector's payouts.
create table if not exists connectors (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  whatsapp_number text not null unique,
  referral_code text not null unique,
  upline_connector_id uuid references connectors(id) on delete set null,
  agreement_signed_at timestamptz,
  created_at timestamptz default now() not null
);

create index if not exists idx_connectors_upline on connectors(upline_connector_id);

-- ── REFERRALS ───────────────────────────────────────────
create table if not exists referrals (
  id uuid default uuid_generate_v4() primary key,
  connector_id uuid references connectors(id) on delete set null not null,
  vendor_id uuid references vendors(id) on delete cascade not null,
  lead_name text not null,
  lead_contact text not null,
  note text,
  status text not null default 'submitted'
    check (status in ('submitted','contacted','quoted','won','lost')),
  job_value_cents bigint,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index if not exists idx_referrals_connector on referrals(connector_id);
create index if not exists idx_referrals_vendor on referrals(vendor_id);

-- ── LEDGER (hash-chained, append-only, publicly verifiable) ────
-- Every event that matters for trust — a referral closing, a commission
-- payout, a review, a vendor's eco-pledge being honoured — is appended
-- here. Each row's hash commits to the previous row's hash, so altering or
-- deleting history breaks the chain detectably. Writes go through
-- append_ledger_entry() below, never direct inserts, so the chain can't
-- fork under concurrent writers.
create table if not exists ledger_entries (
  seq bigint generated always as identity primary key,
  entry_type text not null
    check (entry_type in (
      'connector_joined','referral_submitted','referral_won',
      'commission_tier1_paid','commission_tier2_paid',
      'eco_pledge_honoured','review_submitted',
      'vendor_joined','agreement_signed','whatsapp_message_received'
    )),
  payload jsonb not null,
  payload_hash text not null,
  prev_hash text not null,
  hash text not null,
  created_at timestamptz default now() not null
);

create index if not exists idx_ledger_created_at on ledger_entries(created_at);

-- ── REVIEWS ─────────────────────────────────────────────
-- Reviews are written through the ledger (ledger_entry_seq) so a review's
-- content and timestamp are tamper-evident, not just a mutable row.
create table if not exists reviews (
  id uuid default uuid_generate_v4() primary key,
  vendor_id uuid references vendors(id) on delete cascade not null,
  referral_id uuid references referrals(id) on delete set null,
  reviewer_name text not null,
  rating smallint not null check (rating between 1 and 5),
  comment text,
  ledger_entry_seq bigint references ledger_entries(seq) not null,
  created_at timestamptz default now() not null
);

create index if not exists idx_reviews_vendor on reviews(vendor_id);

-- ── PAYOUTS ─────────────────────────────────────────────
create table if not exists payouts (
  id uuid default uuid_generate_v4() primary key,
  connector_id uuid references connectors(id) on delete cascade not null,
  referral_id uuid references referrals(id) on delete cascade not null,
  tier smallint not null check (tier in (1,2)),
  amount_cents bigint not null,
  ledger_entry_seq bigint references ledger_entries(seq) not null,
  created_at timestamptz default now() not null
);

create index if not exists idx_payouts_connector on payouts(connector_id);

-- ── updated_at trigger (same convention as InsightForge) ──
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists update_referrals_updated_at on referrals;
create trigger update_referrals_updated_at
  before update on referrals
  for each row execute function update_updated_at_column();

-- ── append_ledger_entry() ───────────────────────────────
-- The only way rows get into ledger_entries. Holds a transaction-scoped
-- advisory lock so two concurrent appends can never read the same "last
-- hash" and fork the chain. payload_hash/hash are computed from the
-- payload's own jsonb->text normalization, which Postgres applies
-- consistently for the same logical input — so re-deriving the hash later
-- (in verify_ledger_chain) from the stored row reproduces the same value.
create or replace function append_ledger_entry(p_entry_type text, p_payload jsonb)
returns ledger_entries
language plpgsql
as $$
declare
  v_prev_hash text;
  v_next_seq bigint;
  v_payload_hash text;
  v_hash text;
  v_row ledger_entries;
begin
  perform pg_advisory_xact_lock(hashtext('ledger_entries_chain'));

  select coalesce(max(seq), 0),
         coalesce((select hash from ledger_entries order by seq desc limit 1), repeat('0', 64))
    into v_next_seq, v_prev_hash
    from ledger_entries;

  v_next_seq := v_next_seq + 1;
  v_payload_hash := encode(digest(p_payload::text, 'sha256'), 'hex');
  v_hash := encode(digest(v_next_seq::text || ':' || v_prev_hash || ':' || v_payload_hash, 'sha256'), 'hex');

  insert into ledger_entries (entry_type, payload, payload_hash, prev_hash, hash)
  values (p_entry_type, p_payload, v_payload_hash, v_prev_hash, v_hash)
  returning * into v_row;

  return v_row;
end;
$$;

-- ── verify_ledger_chain() ────────────────────────────────
-- Recomputes every hash from genesis and confirms it matches what's
-- stored. Anyone can call this with the anon key — no admin access
-- required to verify the network hasn't quietly rewritten its own history.
create or replace function verify_ledger_chain()
returns table(valid boolean, broken_at_seq bigint, total_entries bigint)
language plpgsql
as $$
declare
  rec record;
  v_prev_hash text := repeat('0', 64);
  v_expected_hash text;
  v_payload_hash text;
begin
  for rec in select seq, payload, payload_hash, prev_hash, hash from ledger_entries order by seq asc loop
    v_payload_hash := encode(digest(rec.payload::text, 'sha256'), 'hex');
    v_expected_hash := encode(digest(rec.seq::text || ':' || v_prev_hash || ':' || v_payload_hash, 'sha256'), 'hex');

    if rec.payload_hash <> v_payload_hash or rec.prev_hash <> v_prev_hash or rec.hash <> v_expected_hash then
      return query select false, rec.seq, (select count(*) from ledger_entries);
      return;
    end if;

    v_prev_hash := rec.hash;
  end loop;

  return query select true, null::bigint, (select count(*) from ledger_entries);
end;
$$;

grant execute on function verify_ledger_chain() to anon, authenticated;

-- ── Row Level Security ──────────────────────────────────
-- The ledger and vendor directory are publicly READABLE — that's the point
-- of "transparent and undeniable" — but only the service role can write.
-- All writes go through server-side API routes / the functions above.
alter table vendors enable row level security;
alter table connectors enable row level security;
alter table referrals enable row level security;
alter table ledger_entries enable row level security;
alter table reviews enable row level security;
alter table payouts enable row level security;

drop policy if exists "public_read_vendors" on vendors;
create policy "public_read_vendors" on vendors for select using (true);

drop policy if exists "public_read_ledger" on ledger_entries;
create policy "public_read_ledger" on ledger_entries for select using (true);

drop policy if exists "public_read_reviews" on reviews;
create policy "public_read_reviews" on reviews for select using (true);

drop policy if exists "service_role_all_vendors" on vendors;
create policy "service_role_all_vendors" on vendors for all using (auth.role() = 'service_role');

drop policy if exists "service_role_all_connectors" on connectors;
create policy "service_role_all_connectors" on connectors for all using (auth.role() = 'service_role');

drop policy if exists "service_role_all_referrals" on referrals;
create policy "service_role_all_referrals" on referrals for all using (auth.role() = 'service_role');

drop policy if exists "service_role_all_ledger" on ledger_entries;
create policy "service_role_all_ledger" on ledger_entries for all using (auth.role() = 'service_role');

drop policy if exists "service_role_all_reviews" on reviews;
create policy "service_role_all_reviews" on reviews for all using (auth.role() = 'service_role');

drop policy if exists "service_role_all_payouts" on payouts;
create policy "service_role_all_payouts" on payouts for all using (auth.role() = 'service_role');

-- ============================================================
-- supabase/migration_0002_self_service.sql
-- ============================================================
-- Migration for instances that already ran the original schema.sql.
-- Adds self-service vendor onboarding/login columns and new ledger entry types.
-- Safe to run multiple times (uses IF NOT EXISTS / DO blocks).

alter table vendors add column if not exists contact_person text;
alter table vendors add column if not exists looking_for text;
alter table vendors add column if not exists password_hash text;

alter table ledger_entries drop constraint if exists ledger_entries_entry_type_check;
alter table ledger_entries add constraint ledger_entries_entry_type_check
  check (entry_type in (
    'connector_joined','referral_submitted','referral_won',
    'commission_tier1_paid','commission_tier2_paid',
    'eco_pledge_honoured','review_submitted',
    'vendor_joined','agreement_signed','whatsapp_message_received'
  ));

-- ============================================================
-- supabase/migration_0003_email.sql
-- ============================================================
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor)
-- Adds email collection, password reset OTP columns

alter table vendors add column if not exists email text;
alter table vendors add column if not exists reset_otp text;
alter table vendors add column if not exists reset_otp_expires_at timestamptz;

alter table connectors add column if not exists email text;

-- ============================================================
-- supabase/migration_0003_whatsapp_funnel.sql
-- ============================================================
-- Migration: connector grading, referrer type, and vendor outreach invitations.
-- Powers the WhatsApp connector funnel (type selection, grade promotion) and
-- the admin invitation flow for onboarding known-but-unsigned businesses.
-- Safe to run multiple times.

alter table connectors add column if not exists connector_type text
  check (connector_type in ('referrer', 'supplier', 'explorer'));
alter table connectors add column if not exists grade text not null default 'connector'
  check (grade in ('connector', 'active_partner', 'ambassador'));

-- ── INVITATIONS ─────────────────────────────────────────
-- Tracks outreach to businesses that are already informally connected to
-- the network but haven't signed up yet. Deliberately separate from
-- ledger_entries: this holds prospect contact numbers, which the public
-- ledger never does, and it isn't network activity worth publishing.
create table if not exists invitations (
  id uuid default uuid_generate_v4() primary key,
  business_name text not null,
  contact_whatsapp text,
  category text,
  market_phase text check (market_phase is null or market_phase in ('phase_1_standard', 'phase_2_premium', 'phase_3_water_restricted')),
  status text not null default 'pending'
    check (status in ('pending', 'sent', 'opened', 'signed')),
  invited_by text,
  invite_token text not null unique default replace(uuid_generate_v4()::text, '-', ''),
  sent_at timestamptz,
  signed_at timestamptz,
  created_at timestamptz default now() not null
);

create index if not exists idx_invitations_status on invitations(status);

alter table ledger_entries drop constraint if exists ledger_entries_entry_type_check;
alter table ledger_entries add constraint ledger_entries_entry_type_check
  check (entry_type in (
    'connector_joined','referral_submitted','referral_won',
    'commission_tier1_paid','commission_tier2_paid',
    'eco_pledge_honoured','review_submitted',
    'vendor_joined','agreement_signed','whatsapp_message_received',
    'grade_promoted'
  ));

-- Same access pattern as connectors: service role only, no public read —
-- invitations hold prospect contact numbers, not public network activity.
alter table invitations enable row level security;
drop policy if exists "service_role_all_invitations" on invitations;
create policy "service_role_all_invitations" on invitations for all using (auth.role() = 'service_role');

-- ============================================================
-- supabase/migration_0004_request_routing.sql
-- ============================================================
-- Migration: MVP request-routing engine.
-- Vendor category/location tags + request category/location/source capture.
-- Deterministic category(+location) matching only -- no rating/availability
-- weighting, no scoring formula, per the agreed MVP scope. Safe to run
-- multiple times.

alter table vendors add column if not exists category text;
alter table vendors add column if not exists location text;

alter table referrals add column if not exists category text;
alter table referrals add column if not exists location text;
alter table referrals add column if not exists source text not null default 'connector';

alter table referrals drop constraint if exists referrals_source_check;
alter table referrals add constraint referrals_source_check
  check (source in ('connector', 'whatsapp_request'));

-- ============================================================
-- supabase/migration_0005_webhook_idempotency.sql
-- ============================================================
-- Idempotency for the WhatsApp webhook. Meta re-delivers an event if the
-- endpoint does not acknowledge quickly enough; without a dedup key the same
-- inbound message can create duplicate referrals and duplicate ledger entries.
-- The webhook claims each Meta message id once (INSERT → unique violation means
-- "already handled, skip").

create table if not exists processed_whatsapp_messages (
  message_id text primary key,
  processed_at timestamptz not null default now()
);

-- ============================================================
-- supabase/migration_0006_payouts_unique.sql
-- ============================================================
-- Idempotency backstop for the "won" transition. The application-level guard
-- in app/api/referrals/[id]/status/route.ts (conditional UPDATE ... WHERE
-- status <> 'won') should already prevent this, but a unique constraint means
-- a bug or a direct DB write can never silently create duplicate payouts for
-- the same referral/tier — which previously meant duplicate, real, billed
-- WhatsApp template sends per re-fire. Safe to run more than once.

alter table payouts drop constraint if exists payouts_referral_tier_unique;
alter table payouts add constraint payouts_referral_tier_unique unique (referral_id, tier);

-- ============================================================
-- supabase/migration_0007_rls_performance.sql
-- ============================================================
-- Performance: wrap auth.role() in a scalar subquery in the service-role RLS
-- policies so Postgres evaluates it once per statement (cached via initPlan)
-- instead of once per row -- see Supabase's "Auth RLS Initialization Plan"
-- performance advisor. Read-only public policies (public_read_*) use a bare
-- `true` and have no function call to optimize, so they're untouched.
-- Safe to run more than once.

drop policy if exists "service_role_all_vendors" on vendors;
create policy "service_role_all_vendors" on vendors for all using ((select auth.role()) = 'service_role');

drop policy if exists "service_role_all_connectors" on connectors;
create policy "service_role_all_connectors" on connectors for all using ((select auth.role()) = 'service_role');

drop policy if exists "service_role_all_referrals" on referrals;
create policy "service_role_all_referrals" on referrals for all using ((select auth.role()) = 'service_role');

drop policy if exists "service_role_all_ledger" on ledger_entries;
create policy "service_role_all_ledger" on ledger_entries for all using ((select auth.role()) = 'service_role');

drop policy if exists "service_role_all_reviews" on reviews;
create policy "service_role_all_reviews" on reviews for all using ((select auth.role()) = 'service_role');

drop policy if exists "service_role_all_payouts" on payouts;
create policy "service_role_all_payouts" on payouts for all using ((select auth.role()) = 'service_role');

drop policy if exists "service_role_all_invitations" on invitations;
create policy "service_role_all_invitations" on invitations for all using ((select auth.role()) = 'service_role');

-- ============================================================
-- supabase/migration_0008_realtime_dashboard_auth.sql
-- ============================================================
-- Captures RLS/schema that was applied directly to production outside the
-- documented migration workflow, so `setup.sql` matches reality. This is a
-- second, parallel auth path: Supabase Auth (auth.uid()) + a user_roles
-- table linking an auth user to their vendor_id/connector_id, used for
-- direct browser reads and Realtime Authorization on the connector/vendor
-- dashboards -- separate from and in addition to the app's primary custom
-- JWT session system (lib/auth/session.ts) used by the API routes.
--
-- As of writing, no application code creates Supabase Auth users or
-- populates user_roles, so these policies are currently inert (auth.uid()
-- is null for every request the app makes) -- this migration only documents
-- the deployed shape, it does not wire up the feature. Safe to run more
-- than once.

create table if not exists user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  vendor_id uuid references vendors(id) on delete set null,
  connector_id uuid references connectors(id) on delete set null,
  role text not null check (role in ('vendor', 'connector')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_user_roles_vendor_id on user_roles(vendor_id);
create index if not exists idx_user_roles_connector_id on user_roles(connector_id);

create or replace function set_user_roles_updated_at()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_user_roles_updated_at on user_roles;
create trigger trg_user_roles_updated_at
  before update on user_roles
  for each row execute function set_user_roles_updated_at();

alter table user_roles enable row level security;

drop policy if exists "user_roles_select_own" on user_roles;
create policy "user_roles_select_own" on user_roles for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "user_roles_update_own" on user_roles;
create policy "user_roles_update_own" on user_roles for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "user_roles_upsert_own" on user_roles;
create policy "user_roles_upsert_own" on user_roles for insert
  to authenticated
  with check (user_id = auth.uid());

-- ── Owner-scoped reads on existing tables, in addition to the
-- service-role-only policies -- lets an authenticated Supabase Auth user
-- with a matching user_roles row read their own data directly. ──

drop policy if exists "vendor_read_own" on vendors;
create policy "vendor_read_own" on vendors for select
  to authenticated
  using (exists (
    select 1 from user_roles ur
    where ur.user_id = auth.uid() and ur.role = 'vendor' and ur.vendor_id = vendors.id
  ));

drop policy if exists "connector_read_own" on connectors;
create policy "connector_read_own" on connectors for select
  to authenticated
  using (exists (
    select 1 from user_roles ur
    where ur.user_id = auth.uid() and ur.role = 'connector' and ur.connector_id = connectors.id
  ));

drop policy if exists "referrals_read_own" on referrals;
create policy "referrals_read_own" on referrals for select
  to authenticated
  using (exists (
    select 1 from user_roles ur
    where ur.user_id = auth.uid()
      and (
        (ur.role = 'vendor' and referrals.vendor_id = ur.vendor_id)
        or (ur.role = 'connector' and referrals.connector_id = ur.connector_id)
      )
  ));

drop policy if exists "ledger_read_own" on ledger_entries;
create policy "ledger_read_own" on ledger_entries for select
  to authenticated
  using (exists (
    select 1 from user_roles ur
    where ur.user_id = auth.uid()
      and (
        (ur.role = 'vendor' and (ledger_entries.payload ->> 'vendor_id')::uuid = ur.vendor_id)
        or (ur.role = 'connector' and (ledger_entries.payload ->> 'connector_id')::uuid = ur.connector_id)
      )
  ));

drop policy if exists "payouts_read_own" on payouts;
create policy "payouts_read_own" on payouts for select
  to authenticated
  using (exists (
    select 1 from user_roles ur
    where ur.user_id = auth.uid() and ur.role = 'connector' and payouts.connector_id = ur.connector_id
  ));

drop policy if exists "reviews_read_own" on reviews;
create policy "reviews_read_own" on reviews for select
  to authenticated
  using (exists (
    select 1 from user_roles ur
    where ur.user_id = auth.uid() and ur.role = 'vendor' and reviews.vendor_id = ur.vendor_id
  ));

-- ── Realtime Authorization: private per-dashboard broadcast channels,
-- topic-named "connector:<connector_id>:dashboard" / "vendor:<vendor_id>:dashboard". ──

alter table realtime.messages enable row level security;

drop policy if exists "connector_dashboard_receive_by_phone" on realtime.messages;
create policy "connector_dashboard_receive_by_phone" on realtime.messages for select
  to authenticated
  using (
    split_part(topic, ':', 1) = 'connector'
    and split_part(topic, ':', 3) = 'dashboard'
    and exists (
      select 1 from user_roles ur
      where ur.user_id = auth.uid()
        and ur.role = 'connector'
        and ur.connector_id = (split_part(realtime.messages.topic, ':', 2))::uuid
    )
  );

drop policy if exists "vendor_dashboard_receive_by_phone" on realtime.messages;
create policy "vendor_dashboard_receive_by_phone" on realtime.messages for select
  to authenticated
  using (
    split_part(topic, ':', 1) = 'vendor'
    and split_part(topic, ':', 3) = 'dashboard'
    and exists (
      select 1 from user_roles ur
      where ur.user_id = auth.uid()
        and ur.role = 'vendor'
        and ur.vendor_id = (split_part(realtime.messages.topic, ':', 2))::uuid
    )
  );

-- ============================================================
-- supabase/migration_0009_bridge_identity_unique.sql
-- ============================================================
-- Data-integrity backstop for the bridge-identity feature (lib/auth/bridge.ts):
-- enforces "at most one Supabase Auth identity per vendor/connector" as a hard
-- constraint, so user_roles can never accumulate two rows both satisfying
-- `ur.vendor_id = X` (or connector_id) for different user_ids -- which would
-- otherwise silently widen who satisfies a given vendor's/connector's RLS
-- checks. Also makes the user_roles upsert in createBridgeSession() well
-- defined. Replaces the plain (non-unique) indexes from migration_0008.
-- Safe to run more than once.

drop index if exists idx_user_roles_vendor_id;
create unique index if not exists idx_user_roles_vendor_id_unique
  on user_roles(vendor_id) where vendor_id is not null;

drop index if exists idx_user_roles_connector_id;
create unique index if not exists idx_user_roles_connector_id_unique
  on user_roles(connector_id) where connector_id is not null;

-- ============================================================
-- supabase/migration_0010_referral_workflow.sql
-- ============================================================
-- Vendor referral workflow — accept/decline framing, full status-transition
-- logging, and inviting WhatsApp-sourced leads to become connectors.
-- Previously only the 'won' transition was written to the ledger;
-- 'contacted'/'quoted'/'lost' updated the row silently. Safe to run more
-- than once.

alter table referrals add column if not exists connector_invite_sent_at timestamptz;

alter table ledger_entries drop constraint if exists ledger_entries_entry_type_check;
alter table ledger_entries add constraint ledger_entries_entry_type_check
  check (entry_type in (
    'connector_joined','referral_submitted','referral_won',
    'commission_tier1_paid','commission_tier2_paid',
    'eco_pledge_honoured','review_submitted',
    'vendor_joined','agreement_signed','whatsapp_message_received',
    'grade_promoted','referral_status_changed','connector_invited'
  ));

-- Make PostgREST expose the new tables/columns immediately.
notify pgrst, 'reload schema';

-- ============================================================
-- supabase/migration_0011_state_machine_hardening.sql
-- ============================================================
-- Migration tracking (applied_migrations, backfilled through this file) and
-- an atomic commission-write path (process_won_commissions()) replacing six
-- independent, non-transactional round trips in the 'won' status
-- transition with one function call. Safe to run more than once.

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

create index if not exists idx_referrals_vendor_created on referrals(vendor_id, created_at desc);
create index if not exists idx_referrals_connector_status on referrals(connector_id, status);
create index if not exists idx_ledger_entry_type on ledger_entries(entry_type);

-- Make PostgREST expose the new function/tables immediately.
notify pgrst, 'reload schema';

-- ============================================================
-- supabase/migration_0012_admin_overview.sql
-- ============================================================
-- Quote value capture, payout paid-tracking, and the ledger entry type
-- backing the admin "mark paid" action. Safe to run more than once.

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
