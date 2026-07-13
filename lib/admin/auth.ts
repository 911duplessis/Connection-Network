export const ADMIN_SESSION_COOKIE = 'admin_session'

// Admin sessions are now signed JWTs (see lib/auth/session). Re-exported here so
// existing imports from '@/lib/admin/auth' keep working.
export { createAdminToken, verifyAdminToken } from '@/lib/auth/session'
