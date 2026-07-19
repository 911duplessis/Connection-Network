-- Performance: wrap auth.role() in a scalar subquery in the service-role RLS
-- policies so Postgres evaluates it once per statement (cached via initPlan)
-- instead of once per row -- see Supabase's "Auth RLS Initialization Plan"
-- performance advisor. Read-only public policies (public_read_*) use a bare
-- `true` and have no function call to optimize, so they're untouched.
-- Safe to run more than once.

drop policy if exists "service_role_all_vendors" on vendors;
create policy "service_role_all_vendors" on vendors for all using ((select auth.role()) = 'service_role');

drop policy if exists "service_role_all_connectors" on connectors;
create policy "service_role_all_connectors" on connectors for all using ((select auth.role()) = 'service_role');

drop policy if exists "service_role_all_referrals" on referrals;
create policy "service_role_all_referrals" on referrals for all using ((select auth.role()) = 'service_role');

drop policy if exists "service_role_all_ledger" on ledger_entries;
create policy "service_role_all_ledger" on ledger_entries for all using ((select auth.role()) = 'service_role');

drop policy if exists "service_role_all_reviews" on reviews;
create policy "service_role_all_reviews" on reviews for all using ((select auth.role()) = 'service_role');

drop policy if exists "service_role_all_payouts" on payouts;
create policy "service_role_all_payouts" on payouts for all using ((select auth.role()) = 'service_role');

drop policy if exists "service_role_all_invitations" on invitations;
create policy "service_role_all_invitations" on invitations for all using ((select auth.role()) = 'service_role');
