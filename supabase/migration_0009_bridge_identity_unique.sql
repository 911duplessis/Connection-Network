-- Data-integrity backstop for the bridge-identity feature (lib/auth/bridge.ts):
-- enforces "at most one Supabase Auth identity per vendor/connector" as a hard
-- constraint, so user_roles can never accumulate two rows both satisfying
-- `ur.vendor_id = X` (or connector_id) for different user_ids -- which would
-- otherwise silently widen who satisfies a given vendor's/connector's RLS
-- checks. Also makes the user_roles upsert in createBridgeSession() well
-- defined. Replaces the plain (non-unique) indexes from migration_0008.
-- Safe to run more than once.

drop index if exists idx_user_roles_vendor_id;
create unique index if not exists idx_user_roles_vendor_id_unique
  on user_roles(vendor_id) where vendor_id is not null;

drop index if exists idx_user_roles_connector_id;
create unique index if not exists idx_user_roles_connector_id_unique
  on user_roles(connector_id) where connector_id is not null;
