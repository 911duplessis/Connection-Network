-- Captures RLS/schema that was applied directly to production outside the
-- documented migration workflow, so `setup.sql` matches reality. This is a
-- second, parallel auth path: Supabase Auth (auth.uid()) + a user_roles
-- table linking an auth user to their vendor_id/connector_id, used for
-- direct browser reads and Realtime Authorization on the connector/vendor
-- dashboards -- separate from and in addition to the app's primary custom
-- JWT session system (lib/auth/session.ts) used by the API routes.
--
-- As of writing, no application code creates Supabase Auth users or
-- populates user_roles, so these policies are currently inert (auth.uid()
-- is null for every request the app makes) -- this migration only documents
-- the deployed shape, it does not wire up the feature. Safe to run more
-- than once.

create table if not exists user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  vendor_id uuid references vendors(id) on delete set null,
  connector_id uuid references connectors(id) on delete set null,
  role text not null check (role in ('vendor', 'connector')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_user_roles_vendor_id on user_roles(vendor_id);
create index if not exists idx_user_roles_connector_id on user_roles(connector_id);

create or replace function set_user_roles_updated_at()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_user_roles_updated_at on user_roles;
create trigger trg_user_roles_updated_at
  before update on user_roles
  for each row execute function set_user_roles_updated_at();

alter table user_roles enable row level security;

drop policy if exists "user_roles_select_own" on user_roles;
create policy "user_roles_select_own" on user_roles for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "user_roles_update_own" on user_roles;
create policy "user_roles_update_own" on user_roles for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "user_roles_upsert_own" on user_roles;
create policy "user_roles_upsert_own" on user_roles for insert
  to authenticated
  with check (user_id = auth.uid());

-- ── Owner-scoped reads on existing tables, in addition to the
-- service-role-only policies -- lets an authenticated Supabase Auth user
-- with a matching user_roles row read their own data directly. ──

drop policy if exists "vendor_read_own" on vendors;
create policy "vendor_read_own" on vendors for select
  to authenticated
  using (exists (
    select 1 from user_roles ur
    where ur.user_id = auth.uid() and ur.role = 'vendor' and ur.vendor_id = vendors.id
  ));

drop policy if exists "connector_read_own" on connectors;
create policy "connector_read_own" on connectors for select
  to authenticated
  using (exists (
    select 1 from user_roles ur
    where ur.user_id = auth.uid() and ur.role = 'connector' and ur.connector_id = connectors.id
  ));

drop policy if exists "referrals_read_own" on referrals;
create policy "referrals_read_own" on referrals for select
  to authenticated
  using (exists (
    select 1 from user_roles ur
    where ur.user_id = auth.uid()
      and (
        (ur.role = 'vendor' and referrals.vendor_id = ur.vendor_id)
        or (ur.role = 'connector' and referrals.connector_id = ur.connector_id)
      )
  ));

drop policy if exists "ledger_read_own" on ledger_entries;
create policy "ledger_read_own" on ledger_entries for select
  to authenticated
  using (exists (
    select 1 from user_roles ur
    where ur.user_id = auth.uid()
      and (
        (ur.role = 'vendor' and (ledger_entries.payload ->> 'vendor_id')::uuid = ur.vendor_id)
        or (ur.role = 'connector' and (ledger_entries.payload ->> 'connector_id')::uuid = ur.connector_id)
      )
  ));

drop policy if exists "payouts_read_own" on payouts;
create policy "payouts_read_own" on payouts for select
  to authenticated
  using (exists (
    select 1 from user_roles ur
    where ur.user_id = auth.uid() and ur.role = 'connector' and payouts.connector_id = ur.connector_id
  ));

drop policy if exists "reviews_read_own" on reviews;
create policy "reviews_read_own" on reviews for select
  to authenticated
  using (exists (
    select 1 from user_roles ur
    where ur.user_id = auth.uid() and ur.role = 'vendor' and reviews.vendor_id = ur.vendor_id
  ));

-- ── Realtime Authorization: private per-dashboard broadcast channels,
-- topic-named "connector:<connector_id>:dashboard" / "vendor:<vendor_id>:dashboard". ──

alter table realtime.messages enable row level security;

drop policy if exists "connector_dashboard_receive_by_phone" on realtime.messages;
create policy "connector_dashboard_receive_by_phone" on realtime.messages for select
  to authenticated
  using (
    split_part(topic, ':', 1) = 'connector'
    and split_part(topic, ':', 3) = 'dashboard'
    and exists (
      select 1 from user_roles ur
      where ur.user_id = auth.uid()
        and ur.role = 'connector'
        and ur.connector_id = (split_part(realtime.messages.topic, ':', 2))::uuid
    )
  );

drop policy if exists "vendor_dashboard_receive_by_phone" on realtime.messages;
create policy "vendor_dashboard_receive_by_phone" on realtime.messages for select
  to authenticated
  using (
    split_part(topic, ':', 1) = 'vendor'
    and split_part(topic, ':', 3) = 'dashboard'
    and exists (
      select 1 from user_roles ur
      where ur.user_id = auth.uid()
        and ur.role = 'vendor'
        and ur.vendor_id = (split_part(realtime.messages.topic, ':', 2))::uuid
    )
  );
