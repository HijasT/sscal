/**
 * Pure pre-export audit of team incentive math (not a rounding allocator).
 *
 * Financial policy: keep the established unrounded P1/P2 calculation and
 * format each displayed value to two decimals. A formal fils allocation
 * policy is pending owner approval; do not quietly alter employee payouts.
 */
export interface PayoutAuditRow {
  sales: number
  p1: number
  p2: number
  totalIncentive: number
}

export function auditIncentivePayouts(
  teamSales: number,
  pool: number,
  staff: readonly PayoutAuditRow[]
): string | null {
  if (!Number.isFinite(teamSales) || teamSales < 0 ||
      !Number.isFinite(pool) || pool < 0 || !staff.length) {
    return 'Invalid team sales, incentive pool or active staff count'
  }
  for (const person of staff) {
    if (![person.sales, person.p1, person.p2, person.totalIncentive].every(Number.isFinite)) {
      return 'A staff incentive or sales amount is not a finite number'
    }
    if (person.sales < 0 || person.p1 < 0 || person.p2 < 0 || person.totalIncentive < 0) {
      return 'A staff sales or incentive amount is negative'
    }
    if (Math.abs(person.p1 + person.p2 - person.totalIncentive) > 1e-7) {
      return 'A staff payout does not reconcile to its P1 and P2 portions'
    }
  }
  const recordedSales = staff.reduce((sum, person) => sum + person.sales, 0)
  const payouts = staff.reduce((sum, person) => sum + person.totalIncentive, 0)
  // Float tolerance is for binary arithmetic only, not a whole-fils mismatch.
  const salesTolerance = Math.max(1e-7, Math.abs(teamSales) * 1e-12)
  const poolTolerance = Math.max(1e-7, Math.abs(pool) * 1e-12)
  if (Math.abs(recordedSales - teamSales) > salesTolerance) {
    return 'Staff sales do not reconcile to team sales'
  }
  if (Math.abs(payouts - pool) > poolTolerance) {
    return 'Staff payouts do not reconcile to the incentive pool'
  }
  return null
}
