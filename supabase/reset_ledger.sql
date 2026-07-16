-- The Connection Network — Full data reset (run manually in Supabase SQL editor)
-- WARNING: IRREVERSIBLE. Wipes every vendor, connector, referral, payout,
-- review, and the entire ledger, then restarts the hash chain from genesis.
-- Run this ONLY when you actually want to start the network over from zero —
-- e.g. wiping test data before a real launch. There is no undo and no backup
-- taken by this script.
--
-- SAFETY GATE: this script will do nothing until you delete the line below
-- that starts with "do $$". That line intentionally aborts the script so a
-- copy-paste-and-run-everything habit can't wipe production by accident.

do $$ begin raise exception 'reset_ledger.sql: remove this safety-gate line to actually run the reset'; end $$;

truncate table payouts, reviews, referrals, ledger_entries, connectors, vendors restart identity cascade;

-- sanity check: should report a fresh, valid, empty chain
select * from verify_ledger_chain();
