/**
 * lib/config.ts — Single source of truth for app-wide constants.
 *
 * HOW TO UPDATE:
 *   - Version:        bump APP_VERSION here; page.tsx and AboutTab read it automatically
 *   - Default split:  change DEFAULT_P1_SPLIT (0–100; P2 = 100 - P1)
 *   - Default staff:  change DEFAULT_STAFF_COUNT
 *   - Default theme:  change DEFAULT_THEME ('light' | 'dark')
 *   - Default tiers:  change DEFAULT_TIERS (lower bound inclusive, upper bound exclusive)
 *
 * Every component that needs these values imports from here — no more
 * hunting through multiple files to change a default.
 */

/** Displayed in the header, About tab, and page title. */
export const APP_VERSION = '8.7.1'

export interface Tier {
  id: string
  name: string
  min: number
  max: number
  rate: number
  color: string
}

/**
 * Default incentive tier ladder, used until the user customises tiers via
 * Settings (persisted to localStorage['sic_tiers']). Lookup is lower-bound
 * inclusive, upper-bound exclusive — see getTier() in lib/utils.ts.
 */
export const DEFAULT_TIERS: Tier[] = [
  { id: 'tier1', name: 'Tier 1', min: 85, max: 101, rate: 2.5, color: '#2196f3' }, // Blue
  { id: 'tier2', name: 'Tier 2', min: 101, max: 111, rate: 3.0, color: '#9c27b0' }, // Purple
  { id: 'tier3', name: 'Tier 3', min: 111, max: Infinity, rate: 3.5, color: '#4caf50' }, // Green
]

/** Default P1 percentage (0–100). P2 = 100 - DEFAULT_P1_SPLIT. */
export const DEFAULT_P1_SPLIT = 50

/** Default staff count shown in the Individual calculator. */
export const DEFAULT_STAFF_COUNT = 29

/**
 * Default colour theme on first visit.
 * 'light' | 'dark'
 */
export const DEFAULT_THEME: 'light' | 'dark' = 'light'

/**
 * Center names shown in the Bulk Results "Center-wise Stats" section.
 * Edit the display labels here without touching STAFF_CENTERS below.
 */
export const CENTERS: Record<string, string> = {
  C: 'Center C',
  I: 'Center I',
  D: 'Center D',
}

/**
 * Maps each staff member's employee code (format "AE##-###") to a center
 * key from CENTERS above — keyed by code rather than name so this file
 * (committed to a public repo) never contains real staff names.
 *
 * Matched against the uploaded Excel by extracting an "AE##-###"-shaped
 * code out of the staff name cell (see EMPLOYEE_CODE_PATTERN in
 * lib/excelUtils.ts) — this assumes the sheet's name field includes the
 * code (e.g. "Jane Doe AE01-227"). Staff with no code, or a code not
 * listed here, are grouped as "Unassigned" in the center-wise stats.
 *
 * Seeded from code prefix (AE01 -> C, AE02 -> I, AE03 -> D) as a starting
 * point — a few people work across centers regardless of their code
 * prefix, so double check and reassign those manually below.
 */
/** Expected converted clients per working day per staff */
export const BENCHMARK_CLIENTS_PER_DAY = 1

/** Expected packages sold per working day per staff */
export const BENCHMARK_PACKAGES_PER_DAY = 1.25

/** Standard working days in a full month */
export const BENCHMARK_WORKING_DAYS = 26

/** Performance score component weights — must sum to 1.0 */
export const SCORE_WEIGHTS = {
  sales:    0.50,
  clients:  0.20,
  packages: 0.20,
  pace:     0.10,
}

export const STAFF_CENTERS: Record<string, string> = {
  // C (AE01)
  'AE01-227': 'C',
  'AE01-216': 'C',
  'AE01-228': 'C',
  'AE01-194': 'C',
  'AE01-219': 'C',
  'AE01-206': 'C',
  'AE01-207': 'C',
  'AE01-232': 'C',
  'AE01-238': 'C',
  'AE01-217': 'C',

  // I (AE02)
  'AE01-179': 'I',
  'AE02-138': 'I',
  'AE02-137': 'I',
  'AE02-123': 'I',
  'AE02-104': 'I',
  'AE02-141': 'I',
  'AE02-146': 'I',
  'AE01-225': 'I',
  'AE01-234': 'I',
  'AE03-153': 'I',

  // D (AE03)
  'AE03-101': 'D',
  'AE01-229': 'D',
  'AE01-190': 'D',
  'AE03-174': 'D',
  'AE03-176': 'D',
  'AE03-178': 'D',
  'AE02-110': 'D',
  'AE02-111': 'D',
  'AE01-224': 'D',
}
