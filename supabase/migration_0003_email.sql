-- Run this in the Supabase SQL editor (Dashboard → SQL Editor)
-- Adds email collection, password reset OTP columns

alter table vendors add column if not exists email text;
alter table vendors add column if not exists reset_otp text;
alter table vendors add column if not exists reset_otp_expires_at timestamptz;

alter table connectors add column if not exists email text;
