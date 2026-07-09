-- The Connection Network — Full data reset (run manually in Supabase SQL editor)
-- WARNING: irreversible. Wipes every vendor, connector, referral, payout,
-- review, and the entire ledger, then restarts the hash chain from genesis.
-- Run this only when you actually want to start the network over from zero.

truncate table payouts, reviews, referrals, ledger_entries, connectors, vendors restart identity cascade;

-- sanity check: should report a fresh, valid, empty chain
select * from verify_ledger_chain();
