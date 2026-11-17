/** Mr. Krabs policy preview, Nov/Dec 2026.
 * The final payable result intentionally remains unavailable: management has
 * not specified a complete, non-circular pro-rata redistribution algorithm.
 * This module never replaces the verified legacy official calculation.
 */
import { toFils } from './filsReconciliation'

export interface MrKrabsStaffInput {
  name: string
  sales: number
  fullPriceDubaiItCount: number
  eligibleCalendarDays: number
}
export interface MrKrabsStaffPreview {
  name: string
  p1BeforeProrata: number
  p2BeforeProrata: number
  p1AfterProrata: number
  p2AfterProrata: number
  prorataReduction: number
  dubaiItBonus: number
}
export type MrKrabsPreviewOutcome =
  | { ok: false; error: string }
  | { ok: true; achievement: number; rate: number; eligibleRevenue: number;
      pool: number; p1Pool: number; p2Pool: number; totalDubaiItBonus: number;
      totalProrataReduction: number; status: 'provisional-redistribution-unresolved';
      staff: MrKrabsStaffPreview[] }

export function previewMrKrabs(input: {
  teamTarget: number
  staff: readonly MrKrabsStaffInput[]
  daysInMonth: number
  bonusAed: number
  period: string
}): MrKrabsPreviewOutcome {
  const { teamTarget, staff, daysInMonth, bonusAed, period } = input
  if (!/^((Nov|Dec) 26)$/.test(period)) return {
    ok: false, error: 'Mr. Krabs policy covers November and December 2026 only; other periods are not authorized.'
  }
  if (!staff.length || !Number.isFinite(teamTarget) || teamTarget <= 0 ||
      !Number.isInteger(daysInMonth) || daysInMonth < 28 || daysInMonth > 31 ||
      !Number.isFinite(bonusAed) || bonusAed < 0) return {
    ok: false, error: 'Invalid target, eligible roster, calendar period or bonus rate.'
  }
  for (const person of staff) {
    if (!Number.isFinite(person.sales) || person.sales < 0 ||
      !Number.isSafeInteger(person.fullPriceDubaiItCount) || person.fullPriceDubaiItCount < 0 ||
      person.fullPriceDubaiItCount * 10000 > person.sales + 0.005 ||
      !Number.isInteger(person.eligibleCalendarDays) ||
      person.eligibleCalendarDays < 0 || person.eligibleCalendarDays > daysInMonth) return {
      ok: false, error: `Invalid revenue, Dubai It count or eligible calendar days for ${person.name}.`
    }
  }
  const teamSales = staff.reduce((sum, p) => sum + p.sales, 0)
  const achievement = teamSales / teamTarget * 100
  const rate = achievement < 80 ? 0 : achievement < 90 ? 2 :
    achievement < 100 ? 2.5 : achievement < 110 ? 3 : 3.5
  const eligibleRevenue = teamSales -
    staff.reduce((sum,p) => sum + p.fullPriceDubaiItCount * 10000, 0)
  if (!Number.isFinite(achievement) || !Number.isFinite(eligibleRevenue) || eligibleRevenue < 0) return {
    ok:false, error:'Invalid resulting team achievement or eligible revenue.'
  }
  const pool = toFils(eligibleRevenue * rate / 100) / 100
  const p1Pool = toFils(pool / 2) / 100
  const p2Pool = (toFils(pool) - toFils(p1Pool)) / 100
  const staffPreview = staff.map(person => {
    // P2 percentage uses all employee sales / all team sales, per selected design.
    const p1 = p1Pool / staff.length
    const p2 = teamSales === 0 ? 0 : p2Pool * (person.sales / teamSales)
    const factor = person.eligibleCalendarDays / daysInMonth
    const p1AfterProrata = p1 * factor
    const p2AfterProrata = p2 * factor
    return {
      name: person.name,
      p1BeforeProrata: p1, p2BeforeProrata: p2,
      p1AfterProrata, p2AfterProrata,
      prorataReduction: (p1 - p1AfterProrata) + (p2 - p2AfterProrata),
      dubaiItBonus: rate > 0 ? person.fullPriceDubaiItCount * bonusAed : 0,
    }
  })
  return {
    ok: true, achievement, rate, eligibleRevenue, pool, p1Pool, p2Pool,
    totalDubaiItBonus: staffPreview.reduce((sum,p) => sum + p.dubaiItBonus, 0),
    totalProrataReduction: staffPreview.reduce((sum,p) => sum + p.prorataReduction, 0),
    status: 'provisional-redistribution-unresolved',
    staff: staffPreview,
  }
}
