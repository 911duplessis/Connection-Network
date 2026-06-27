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
