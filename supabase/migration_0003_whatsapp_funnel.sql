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
