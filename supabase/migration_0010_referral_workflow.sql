-- Migration: vendor referral workflow — accept/decline framing, full
-- status-transition logging, and inviting WhatsApp-sourced leads to become
-- connectors. Safe to run more than once.
--
-- Previously only the 'won' transition was written to the tamper-evident
-- ledger; 'contacted'/'quoted'/'lost' updated the row silently with no
-- ledger entry and no notification to the connector. This closes that gap
-- (new entry type 'referral_status_changed') and adds a second new entry
-- type ('connector_invited') for the vendor-initiated "invite this lead to
-- become a connector" action on whatsapp_request-sourced referrals.

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

-- Make PostgREST expose the new column immediately.
notify pgrst, 'reload schema';
