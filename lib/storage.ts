/**
 * lib/storage.ts — time-limited browser storage for data the user enters or
 * uploads (Excel workbook, last calculation, Individual inputs, Sale Assistant
 * selection). Each key gets a sibling "<key>__saved_at" timestamp; anything
 * older than DATA_RETENTION_MS — or with no timestamp — is removed on read and
 * by purgeExpiredData(). Preferences (theme, tiers, staff centers, robot) are
 * not covered: they are configuration, not user data. The user can opt out of
 * expiry entirely via the "Keep data on this device" setting (isPersistEnabled).
 */
import { DATA_RETENTION_MS } from './config'

const STAMP = '__saved_at'

/** Preference key: when 'true', data is kept indefinitely instead of expiring. */
const PERSIST_KEY = 'sic_persist_data'

type Kind = 'local' | 'session'

/** Whether the user chose to keep entered/uploaded data instead of auto-clearing it after 1 hour. */
export function isPersistEnabled(): boolean {
  try {
    return localStorage.getItem(PERSIST_KEY) === 'true'
  } catch {
    return false
  }
}

export function setPersistEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(PERSIST_KEY, String(enabled))
  } catch {
    /* ignore */
  }
}

/** Keys that hold entered/uploaded data and must expire. */
export const EXPIRING_KEYS: { kind: Kind; key: string }[] = [
  { kind: 'local', key: 'sic_bulk_upload' },
  { kind: 'local', key: 'sic_bulk_results' },
  { kind: 'session', key: 'sic_individual_inputs' },
  { kind: 'session', key: 'sic_sale_quote' },
]

const area = (kind: Kind): Storage => (kind === 'local' ? localStorage : sessionStorage)

function isFresh(store: Storage, key: string): boolean {
  if (isPersistEnabled()) return true
  const saved = Number(store.getItem(key + STAMP))
  return saved > 0 && Date.now() - saved < DATA_RETENTION_MS
}

/** Returns the stored string, or null if absent/expired (expired data is deleted). */
export function getFresh(kind: Kind, key: string): string | null {
  try {
    const store = area(kind)
    const value = store.getItem(key)
    if (value === null) return null
    if (isFresh(store, key)) return value
    store.removeItem(key)
    store.removeItem(key + STAMP)
  } catch {
    /* storage unavailable */
  }
  return null
}

/**
 * Saves a value and (re)starts its retention clock — but only when the value
 * actually changed, so reloading the page cannot keep old data alive.
 */
export function setFresh(kind: Kind, key: string, value: string): void {
  try {
    const store = area(kind)
    if (store.getItem(key) === value && isFresh(store, key)) return
    store.setItem(key, value)
    store.setItem(key + STAMP, String(Date.now()))
  } catch {
    /* storage full or unavailable */
  }
}

/** Deletes every expired entry. Returns true if anything was removed. */
export function purgeExpiredData(): boolean {
  let removed = false
  for (const { kind, key } of EXPIRING_KEYS) {
    try {
      const store = area(kind)
      if (store.getItem(key) !== null && !isFresh(store, key)) {
        store.removeItem(key)
        store.removeItem(key + STAMP)
        removed = true
      }
    } catch {
      /* ignore */
    }
  }
  return removed
}

/** Removes an entry and its retention timestamp. */
export function clearFresh(kind: Kind, key: string): void {
  try {
    const store = area(kind)
    store.removeItem(key)
    store.removeItem(key + STAMP)
  } catch {
    /* ignore */
  }
}

/** Milliseconds until the soonest-expiring stored entry is deleted; null if none is stored. */
export function msUntilNextExpiry(): number | null {
  if (isPersistEnabled()) return null
  let soonest: number | null = null
  for (const { kind, key } of EXPIRING_KEYS) {
    try {
      const store = area(kind)
      if (store.getItem(key) === null) continue
      const left = Number(store.getItem(key + STAMP)) + DATA_RETENTION_MS - Date.now()
      const clamped = Number.isFinite(left) ? Math.max(0, left) : 0
      if (soonest === null || clamped < soonest) soonest = clamped
    } catch {
      /* ignore */
    }
  }
  return soonest
}

/** Restarts the retention clock (another full period) for every entry currently stored. */
export function extendExpiry(): void {
  for (const { kind, key } of EXPIRING_KEYS) {
    try {
      const store = area(kind)
      if (store.getItem(key) !== null) store.setItem(key + STAMP, String(Date.now()))
    } catch {
      /* ignore */
    }
  }
}
