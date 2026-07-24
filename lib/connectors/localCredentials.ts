'use client'

// Client-side only convenience so a connector doesn't have to retype their
// WhatsApp number + referral code on every vendor page / dashboard visit.
// Never sent anywhere -- purely a local autofill, not a session/auth
// mechanism (the app has no connector session at all, see CLAUDE.md).
const STORAGE_KEY = 'tcn_connector_credentials'

export interface ConnectorCredentials {
  whatsappNumber: string
  referralCode: string
}

export function saveConnectorCredentials(creds: ConnectorCredentials): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(creds))
  } catch {
    // Storage unavailable (private browsing, quota, etc.) -- autofill is a
    // convenience, never something to break the page over.
  }
}

export function clearConnectorCredentials(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Ignore -- worst case the next visit still shows stale autofill.
  }
}

export function getConnectorCredentials(): ConnectorCredentials | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (typeof parsed?.whatsappNumber === 'string' && typeof parsed?.referralCode === 'string') {
      return parsed
    }
    return null
  } catch {
    return null
  }
}
