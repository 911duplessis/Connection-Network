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
