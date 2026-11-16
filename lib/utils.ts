// Utility functions extracted from original HTML

import { STAFF_CENTERS, DEFAULT_TIERS, type Tier } from './config'
import { extractEmployeeCode } from './excelUtils'

export function loadTiers(): Tier[] {
  // Ensure we're in browser environment (Next.js SSR safety)
  if (typeof window === 'undefined') return DEFAULT_TIERS
  
  try {
    const stored = localStorage.getItem('sic_tiers')
    if (!stored) return DEFAULT_TIERS

    const parsed = JSON.parse(stored)
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_TIERS

    // FIX: JSON.stringify converts Infinity to null, restore it
    return parsed.map((tier: Tier) => ({
      ...tier,
      max: tier.max === null ? Infinity : tier.max
    }))
  } catch {
    return DEFAULT_TIERS
  }
}

export function saveTiers(tiers: Tier[]) {
  if (typeof window === 'undefined') return // Safety check for SSR
  localStorage.setItem('sic_tiers', JSON.stringify(tiers))
  localStorage.setItem('sic_tiers_saved_at', new Date().toISOString())
}

export function getTiersSavedAt(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('sic_tiers_saved_at')
}

// One-slot backup used to undo a "Reset to Defaults" — captures whatever
// tiers were in effect immediately before the reset overwrote them.
export function backupTiers(tiers: Tier[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem('sic_tiers_backup', JSON.stringify(tiers))
}

export function loadTiersBackup(): Tier[] | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = localStorage.getItem('sic_tiers_backup')
    if (!stored) return null
    const parsed = JSON.parse(stored)
    return parsed.map((tier: Tier) => ({
      ...tier,
      max: tier.max === null ? Infinity : tier.max
    }))
  } catch {
    return null
  }
}

export function clearTiersBackup() {
  if (typeof window === 'undefined') return
  localStorage.removeItem('sic_tiers_backup')
}

// Employee code -> center key (e.g. { 'AE01-227': 'C' }), editable from the
// Settings tab. Defaults to STAFF_CENTERS in lib/config.ts (mirrors the
// tier persistence functions above).
export function loadStaffCenters(): Record<string, string> {
  if (typeof window === 'undefined') return STAFF_CENTERS
  try {
    const stored = localStorage.getItem('sic_staff_centers')
    return stored ? JSON.parse(stored) : STAFF_CENTERS
  } catch {
    return STAFF_CENTERS
  }
}

export function saveStaffCenters(mapping: Record<string, string>) {
  if (typeof window === 'undefined') return
  localStorage.setItem('sic_staff_centers', JSON.stringify(mapping))
  localStorage.setItem('sic_staff_centers_saved_at', new Date().toISOString())
}

export function getStaffCentersSavedAt(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('sic_staff_centers_saved_at')
}

// One-slot backup used to undo a "Reset to Defaults" — captures whatever
// mapping was in effect immediately before the reset overwrote it.
export function backupStaffCenters(mapping: Record<string, string>) {
  if (typeof window === 'undefined') return
  localStorage.setItem('sic_staff_centers_backup', JSON.stringify(mapping))
}

export function loadStaffCentersBackup(): Record<string, string> | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = localStorage.getItem('sic_staff_centers_backup')
    return stored ? JSON.parse(stored) : null
  } catch {
    return null
  }
}

export function clearStaffCentersBackup() {
  if (typeof window === 'undefined') return
  localStorage.removeItem('sic_staff_centers_backup')
}

// Resolves a staff name (as it appears in the uploaded Excel, e.g. "Jane Doe
// AE01-227") to its center key (C/I/D), or null if no employee code is
// embedded in the name or that code isn't mapped to a center.
export function getStaffCenterTag(name: string, staffCenters: Record<string, string> = loadStaffCenters()): string | null {
  const code = extractEmployeeCode(name)
  if (!code) return null
  return staffCenters[code] ?? null
}

export function getTier(achievementPercent: number, tiers: Tier[] = loadTiers()): Tier {
  for (const tier of tiers) {
    // Lower bound is inclusive (>=), upper bound is exclusive (<)
    if (achievementPercent >= tier.min && achievementPercent < tier.max) {
      return tier
    }
  }
  // Below minimum tier
  return { id: 'none', name: 'None', min: 0, max: 75, rate: 0, color: '#ff5252' }
}

export function formatCurrency(n: number): string {
  return n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

export type IncentiveTierPreview =
  | { isMaxTier: false; nextTierName: string; nextTierRate: number;
      requiredPercentage: number; requiredSales: number; deficit: number }
  | { isMaxTier: true; currentRate: number; thresholdPercentage: number;
      thresholdSales: number; thresholdPool: number; extraIncentive: number }
  | null

export interface CalculationResult {
  teamAchievement: number
  tier: Tier
  totalPool: number
  p1Pool: number
  p2Pool: number
  myP1: number
  myP2: number
  myTotal: number
  myContribution: number
  teamTarget: number
  teamSales: number
  mySales: number
  staffCount: number
  nextTierInfo: IncentiveTierPreview
  error?: string
}

export function calculateIncentive(
  teamTarget: number,
  teamSales: number,
  mySales: number,
  staffCount: number,
  p1Percent: number,
  customTiers?: Tier[]
): CalculationResult {
  const tiers = customTiers || loadTiers()
  // Financial validation remains fail-closed: invalid calculations return
  // a typed zero-payment result rather than an untyped partial object.
  const invalid = (error: string): CalculationResult => ({
    teamAchievement: 0, tier: getTier(0, tiers),
    totalPool: 0, p1Pool: 0, p2Pool: 0,
    myP1: 0, myP2: 0, myTotal: 0, myContribution: 0,
    teamTarget: 0, teamSales: 0, mySales: 0, staffCount: 0,
    nextTierInfo: null, error,
  })


  // Reject Infinity as well as NaN: invalid inputs must never produce a payout.
  if (![teamTarget, teamSales, mySales, staffCount, p1Percent].every(Number.isFinite)) {
    return invalid('Please enter valid finite numbers for all fields')
  }

  if (teamTarget <= 0 || teamSales < 0 || mySales < 0 || staffCount <= 0) {
    return invalid('Target and staff count must be positive. Sales cannot be negative.')
  }

  if (!Number.isInteger(staffCount)) {
    return invalid('Staff count must be a whole number')
  }

  if (p1Percent < 0 || p1Percent > 100) {
    return invalid('P1 split must be between 0% and 100%')
  }

  if (mySales > teamSales) {
    return invalid('Your sales cannot exceed team sales')
  }

  const teamAchievement = (teamSales / teamTarget) * 100
  if (!Number.isFinite(teamAchievement)) {
    return invalid('Team achievement is outside the supported numeric range')
  }
  const tier = getTier(teamAchievement, tiers)
  if (!Number.isFinite(tier.rate) || tier.rate < 0 || tier.rate > 100) {
    return invalid('Incentive tier has an invalid rate')
  }

  // Calculate next tier info
  let nextTierInfo: IncentiveTierPreview = null
  const sortedTiers = [...tiers].sort((a, b) => a.min - b.min)
  const currentTierIndex = sortedTiers.findIndex(t => t.id === tier.id)

  if (sortedTiers.length === 0) {
    // No tiers configured at all — nothing to project toward.
    nextTierInfo = null
  } else if (tier.rate === 0) {
    const lowestTier = sortedTiers[0]
    const requiredSales = (lowestTier.min / 100) * teamTarget
    const deficit = requiredSales - teamSales
    nextTierInfo = {
      nextTierName: lowestTier.name,
      nextTierRate: lowestTier.rate,
      requiredPercentage: lowestTier.min,
      requiredSales: requiredSales,
      deficit: deficit,
      isMaxTier: false
    }
  } else if (currentTierIndex >= 0 && currentTierIndex < sortedTiers.length - 1) {
    const nextTier = sortedTiers[currentTierIndex + 1]
    const requiredPercentage = nextTier.min
    const requiredSales = (requiredPercentage / 100) * teamTarget
    const deficit = requiredSales - teamSales
    nextTierInfo = {
      nextTierName: nextTier.name,
      nextTierRate: nextTier.rate,
      requiredPercentage: requiredPercentage,
      requiredSales: requiredSales,
      deficit: deficit,
      isMaxTier: false
    }
  } else {
    // Current tier, or a top/unmatched tier — treat as the highest tier reached.
    const highestTier = sortedTiers[currentTierIndex] ?? sortedTiers[sortedTiers.length - 1]
    const thresholdSales = (highestTier.min / 100) * teamTarget
    const thresholdPool = (highestTier.rate / 100) * thresholdSales
    const actualPool = (highestTier.rate / 100) * teamSales
    const extraIncentive = actualPool - thresholdPool

    nextTierInfo = {
      isMaxTier: true,
      currentRate: tier.rate,
      thresholdPercentage: highestTier.min,
      thresholdSales: thresholdSales,
      thresholdPool: thresholdPool,
      extraIncentive: extraIncentive
    }
  }

  const totalPool = (tier.rate / 100) * teamSales
  if (!Number.isFinite(totalPool)) {
    return invalid('Incentive pool is outside the supported numeric range')
  }
  const p1Pool = (p1Percent / 100) * totalPool
  const p2Pool = ((100 - p1Percent) / 100) * totalPool
  const myP1 = p1Pool / staffCount
  // A valid zero-sales month has a zero pool and zero payouts, never NaN.
  const myContribution = teamSales === 0 ? 0 : (mySales / teamSales) * 100
  const myP2 = teamSales === 0 ? 0 : (mySales / teamSales) * p2Pool
  const myTotal = myP1 + myP2

  return {
    teamAchievement,
    tier,
    totalPool,
    p1Pool,
    p2Pool,
    myP1,
    myP2,
    myTotal,
    myContribution,
    teamTarget,
    teamSales,
    mySales,
    staffCount,
    nextTierInfo
  }
}
