-- ═══════════════════════════════════════════════════════════════
-- Connection Network — Cumulative Schema Sync
-- Run this once in Supabase Dashboard → SQL Editor.
-- Every statement is idempotent (IF NOT EXISTS / DROP … IF EXISTS).
-- Safe to re-run if something fails partway through.
-- ═══════════════════════════════════════════════════════════════

-- ─── Migration 0002: Self-service vendor onboarding ───────────
alter table vendors add column if not exists contact_person text;
alter table vendors add column if not exists looking_for text;
alter table vendors add column if not exists password_hash text;

-- ─── Migration 0003a: Email / password-reset ──────────────────
alter table vendors add column if not exists email text;
alter table vendors add column if not exists reset_otp text;
alter table vendors add column if not exists reset_otp_expires_at timestamptz;

alter table connectors add column if not exists email text;

-- ─── Migration 0003b: WhatsApp funnel ────────────────────────
alter table connectors add column if not exists connector_type text
  check (connector_type in ('referrer', 'supplier', 'explorer'));
alter table connectors add column if not exists grade text not null default 'connector'
  check (grade in ('connector', 'active_partner', 'ambassador'));

create table if not exists invitations (
  id uuid default uuid_generate_v4() primary key,
  business_name text not null,
  contact_whatsapp text,
  category text,
  market_phase text check (market_phase is null or market_phase in
    ('phase_1_standard', 'phase_2_premium', 'phase_3_water_restricted')),
  status text not null default 'pending'
    check (status in ('pending', 'sent', 'opened', 'signed')),
  invited_by text,
  invite_token text not null unique default replace(uuid_generate_v4()::text, '-', ''),
  sent_at timestamptz,
  signed_at timestamptz,
  created_at timestamptz default now() not null
);

create index if not exists idx_invitations_status on invitations(status);

alter table invitations enable row level security;
drop policy if exists "service_role_all_invitations" on invitations;
create policy "service_role_all_invitations" on invitations
  for all using (auth.role() = 'service_role');

-- ─── Migration 0004: Request routing ─────────────────────────
alter table vendors add column if not exists category text;
alter table vendors add column if not exists location text;

alter table referrals add column if not exists category text;
alter table referrals add column if not exists location text;
alter table referrals add column if not exists source text not null default 'connector';

alter table referrals drop constraint if exists referrals_source_check;
alter table referrals add constraint referrals_source_check
  check (source in ('connector', 'whatsapp_request'));

-- ─── Migration 0005: WhatsApp webhook idempotency ─────────────
create table if not exists processed_whatsapp_messages (
  message_id text primary key,
  processed_at timestamptz not null default now()
);

-- ─── Ledger entry type allowlist (cumulative, final state) ────
alter table ledger_entries drop constraint if exists ledger_entries_entry_type_check;
alter table ledger_entries add constraint ledger_entries_entry_type_check
  check (entry_type in (
    'connector_joined', 'referral_submitted', 'referral_won',
    'commission_tier1_paid', 'commission_tier2_paid',
    'eco_pledge_honoured', 'review_submitted',
    'vendor_joined', 'agreement_signed', 'whatsapp_message_received',
    'grade_promoted'
  ));
