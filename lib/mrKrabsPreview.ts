/** Mr. Krabs policy scenario: November/December 2026 only.
 * Confirmed user model: 50/50 P1/P2, P2 uses gross team sales; apply calendar
 * eligibility then redistribute each withheld pool ONCE to existing staff only.
 * P1 redistribution weights are equal; P2 weights are gross sales shares.
 * Accounting retains signed rounding/undistributable residuals in fils.
 * Not a representation of management-approved payroll without separate signoff.
 */
import { toFils } from './filsReconciliation'
import { DEFAULT_TIERS, type Tier } from './config'

export interface MrKrabsStaffInput {
  name: string
  sales: number
  fullPriceDubaiItCount: number
  eligibleCalendarDays: number
  /** True only when found in the immediately previous month's roster. */
  isExistingStaff: boolean
}
export interface MrKrabsStaffPreview {
  name: string
  p1BeforeProrata: number
  p2BeforeProrata: number
  p1AfterProrata: number
  p2AfterProrata: number
  prorataReduction: number
  redistributedP1: number
  redistributedP2: number
  p1: number
  p2: number
  dubaiItBonus: number
  totalIncentive: number
}
export type MrKrabsPreviewOutcome =
  | { ok: false; error: string }
  | { ok: true; achievement: number; rate: number; eligibleRevenue: number;
      pool: number; p1Pool: number; p2Pool: number; totalDubaiItBonus: number;
      totalProrataReduction: number; undistributedProrata: number;
      accountingRemainderFils: number; status: 'comparison-only';
      staff: MrKrabsStaffPreview[] }

export interface SharedPoolPreviewInput {
  teamTarget: number
  staff: readonly MrKrabsStaffInput[]
  daysInMonth: number
  bonusAed: number
  period: string
  tiers?: readonly Tier[]
}

/** Krabs: gross P2 weights. Scrooge: exclude full-price Dubai It from P2 weights. */
export function previewMrKrabs(input: SharedPoolPreviewInput): MrKrabsPreviewOutcome {
  return calculatePoolPreview(input, 'gross')
}

export function previewScrooge(input: SharedPoolPreviewInput): MrKrabsPreviewOutcome {
  return calculatePoolPreview(input, 'net-of-dubai-it')
}

function calculatePoolPreview(input: SharedPoolPreviewInput, p2Basis: 'gross' | 'net-of-dubai-it'): MrKrabsPreviewOutcome {
  const { teamTarget, staff, daysInMonth, bonusAed, period } = input
  const month = period.trim().replace(/\s+/g, ' ')
  if (!/^(Nov|Dec) 26$/.test(month)) return {
    ok: false, error: 'Mr. Krabs and Scrooge comparisons currently support November and December 2026 only.'
  }
  if (!staff.length || !Number.isFinite(teamTarget) || teamTarget <= 0 ||
      !Number.isInteger(daysInMonth) || daysInMonth !== (month === 'Nov 26' ? 30 : 31) ||
      !Number.isFinite(bonusAed) || bonusAed < 0 || bonusAed > 100000 ||
      Math.abs(bonusAed * 100 - Math.round(bonusAed * 100)) > 0.000001) return {
    ok: false, error: 'Invalid target, eligible roster, calendar period or bonus rate.'
  }
  const identities = new Set<string>()
  for (const person of staff) {
    const key = person.name.trim().toLowerCase()
    if (!key || identities.has(key) ||
      !Number.isFinite(person.sales) || person.sales < 0 ||
      !Number.isSafeInteger(person.fullPriceDubaiItCount) || person.fullPriceDubaiItCount < 0 ||
      person.fullPriceDubaiItCount * 10000 > person.sales + 0.005 ||
      typeof person.isExistingStaff !== 'boolean' ||
      !Number.isInteger(person.eligibleCalendarDays) ||
      person.eligibleCalendarDays < 0 || person.eligibleCalendarDays > daysInMonth) return {
      ok: false, error: `Invalid employee, revenue, Dubai It count or eligible days for ${person.name}.`
    }
    identities.add(key)
  }
  const teamSales = staff.reduce((sum, p) => sum + p.sales, 0)
  const achievement = teamSales / teamTarget * 100
  // The exact same ladder is used by Legacy and Mr. Krabs.
  const tiers = input.tiers ?? DEFAULT_TIERS
  const selectedTier = tiers.find(tier => achievement >= tier.min && achievement < tier.max)
  const rate = selectedTier?.rate ?? 0
  if (!Number.isFinite(rate) || rate < 0 || rate > 100) return {
    ok: false, error: 'Invalid shared incentive tier configuration.'
  }
  const eligibleRevenue = teamSales -
    staff.reduce((sum, p) => sum + p.fullPriceDubaiItCount * 10000, 0)
  if (!Number.isFinite(achievement) || !Number.isFinite(eligibleRevenue) || eligibleRevenue < 0) return {
    ok: false, error: 'Invalid team achievement or eligible revenue.'
  }
  const poolFils = toFils(eligibleRevenue * rate / 100)
  const pool = poolFils / 100
  const p1Pool = (poolFils / 2) / 100
  const p2Pool = (poolFils / 2) / 100
  // P2 uses gross revenue in Krabs and non-Dubai-It revenue in Scrooge.
  // Both retain gross sales for achievement; the pool excludes full-price Dubai It.
  const p2Sales = (person: MrKrabsStaffInput) => p2Basis === 'gross'
    ? person.sales : person.sales - person.fullPriceDubaiItCount * 10000
  const p2Denominator = p2Basis === 'gross' ? teamSales : eligibleRevenue
  // One redistribution pass: calculate withheld P1 and P2 from original
  // allocations, then distribute that fixed amount with original weight
  // types only to eligible (>0 days) employees. No recursion.
  const preliminary = staff.map(person => {
    const p1BeforeProrata = p1Pool / staff.length
    const p2BeforeProrata = p2Denominator ? p2Pool * p2Sales(person) / p2Denominator : 0
    const factor = person.eligibleCalendarDays / daysInMonth
    const p1AfterProrata = p1BeforeProrata * factor
    const p2AfterProrata = p2BeforeProrata * factor
    return { ...person, p1BeforeProrata, p2BeforeProrata, p1AfterProrata, p2AfterProrata }
  })
  const withheldP1 = preliminary.reduce((sum, p) => sum + p.p1BeforeProrata - p.p1AfterProrata, 0)
  const withheldP2 = preliminary.reduce((sum, p) => sum + p.p2BeforeProrata - p.p2AfterProrata, 0)
  // Old staff must appear in the previous calendar-month roster. New joiners
  // retain only their pro-rated shares; they NEVER receive redistribution.
  const recipients = preliminary.filter(p => p.isExistingStaff && p.eligibleCalendarDays > 0)
  const recipientSales = recipients.reduce((sum, p) => sum + p2Sales(p), 0)
  const staffResult = preliminary.map(p => {
    const eligible = p.isExistingStaff && p.eligibleCalendarDays > 0
    const redistributedP1 = eligible && recipients.length > 0 ? withheldP1 / recipients.length : 0
    const redistributedP2 = eligible && recipientSales > 0 ? withheldP2 * p2Sales(p) / recipientSales : 0
    const p1 = toFils(p.p1AfterProrata + redistributedP1) / 100
    const p2 = toFils(p.p2AfterProrata + redistributedP2) / 100
    const dubaiItBonus = rate > 0 ? toFils(p.fullPriceDubaiItCount * bonusAed) / 100 : 0
    return {
      name: p.name, p1BeforeProrata: p.p1BeforeProrata, p2BeforeProrata: p.p2BeforeProrata,
      p1AfterProrata: p.p1AfterProrata, p2AfterProrata: p.p2AfterProrata,
      prorataReduction: (p.p1BeforeProrata - p.p1AfterProrata) + (p.p2BeforeProrata - p.p2AfterProrata),
      redistributedP1, redistributedP2, p1, p2, dubaiItBonus,
      totalIncentive: (toFils(p1) + toFils(p2) + toFils(dubaiItBonus)) / 100,
    }
  })
  const roundedTeamFils = staffResult.reduce((sum, p) => sum + toFils(p.p1) + toFils(p.p2), 0)
  const undistributedProrata = (recipients.length ? 0 : withheldP1) + (recipientSales > 0 ? 0 : withheldP2)
  return {
    ok: true, achievement, rate, eligibleRevenue, pool, p1Pool, p2Pool,
    totalDubaiItBonus: staffResult.reduce((sum, p) => sum + p.dubaiItBonus, 0),
    totalProrataReduction: withheldP1 + withheldP2, undistributedProrata,
    accountingRemainderFils: poolFils - roundedTeamFils,
    status: 'comparison-only',
    staff: staffResult,
  }
}
