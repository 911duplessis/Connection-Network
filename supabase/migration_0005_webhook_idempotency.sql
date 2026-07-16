-- Idempotency for the WhatsApp webhook. Meta re-delivers an event if the
-- endpoint does not acknowledge quickly enough; without a dedup key the same
-- inbound message can create duplicate referrals and duplicate ledger entries.
-- The webhook claims each Meta message id once (INSERT → unique violation means
-- "already handled, skip").

create table if not exists processed_whatsapp_messages (
  message_id text primary key,
  processed_at timestamptz not null default now()
);
