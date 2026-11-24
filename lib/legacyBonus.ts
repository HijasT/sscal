/** A separately audited Dubai It bonus ledger for the Legacy engine.
 * The shared P1/P2 pool and Accounting Remainder exclude bonuses.
 */
import type { BulkResult, BulkCalculatedData } from './bulkCalculation'
import { isOctober2026 } from './dubaiItDetection'
import { toFils } from './filsReconciliation'

export interface LegacyBonusAward {
  count: number
  amount: number
  /** Number of AED 9,000/9,700 Dubai It packages in October 2026 only. */
  discountedCount?: number
}
export type LegacyBonusLedger = Readonly<Record<string, LegacyBonusAward>>

export interface LegacyBonusBreakdown {
  totalBonusFils: number
  grandTotalFils: number
  byEmployee: ReadonlyMap<string, { count: number; amountFils: number; totalFils: number }>
}

export function auditLegacyBonusLedger(
  results: readonly BulkResult[],
  data: BulkCalculatedData,
  ledger: LegacyBonusLedger,
): LegacyBonusBreakdown {
  const byEmployee = new Map<string, { count: number; amountFils: number; totalFils: number }>()
  const names = new Set(results.map(person => person.name))
  if (Object.keys(ledger).length !== names.size ||
      Object.keys(ledger).some(name => !names.has(name))) {
    throw new Error('Dubai It bonus ledger must match the active employee roster')
  }
  let totalBonusFils = 0
  const october2026 = data.viewMode === 'monthly' && data.sheets.length === 1 &&
    isOctober2026(data.sheets[0])
  for (const person of results) {
    const award = ledger[person.name]
    const discountedCount = award?.discountedCount ?? 0
    if (!award || !Number.isSafeInteger(award.count) || award.count < 0 ||
        !Number.isSafeInteger(discountedCount) || discountedCount < 0 ||
        (discountedCount > 0 && !october2026) || discountedCount > award.count ||
        (award.count - discountedCount) * 10000 + discountedCount * 9000 > person.sales + 0.005 ||
        !Number.isFinite(award.amount) || award.amount < 0) {
      throw new Error(`Invalid Dubai It bonus award for ${person.name}`)
    }
    const amountFils = toFils(award.amount)
    const personalFils = toFils(person.p1) + toFils(person.p2)
    const fixedOctoberDiscountBonusFils = discountedCount * 50000
    if (toFils(person.totalIncentive) !== personalFils ||
        amountFils < fixedOctoberDiscountBonusFils ||
        (data.teamAchievement < 80 && amountFils !== fixedOctoberDiscountBonusFils)) {
      throw new Error('Legacy base payout or bonus qualification does not reconcile')
    }
    totalBonusFils += amountFils
    byEmployee.set(person.name,{count:award.count,amountFils,totalFils:personalFils+amountFils})
  }
  if (!Number.isSafeInteger(totalBonusFils) || !Number.isSafeInteger(data.staffTotalFils + totalBonusFils)) {
    throw new Error('Dubai It bonus total exceeds supported precision')
  }
  return { totalBonusFils, grandTotalFils: data.staffTotalFils + totalBonusFils, byEmployee }
}
