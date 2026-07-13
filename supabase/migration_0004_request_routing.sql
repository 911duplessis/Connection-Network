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
