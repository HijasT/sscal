/**
 * Audit raw incentive inputs and finalized whole-fils allocations.
 * Rounding allocations follow the approved largest-remainder policy.
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

/** Exact whole-fils audit for official, post-allocation payouts. */
export function auditRoundedIncentives(
  teamSales: number,
  pool: number,
  p1Pool: number,
  p2Pool: number,
  staff: readonly PayoutAuditRow[]
): string | null {
  if (!staff.length || !Number.isFinite(teamSales) || teamSales < 0) {
    return 'Invalid team sales or staff count'
  }
  const values = [pool, p1Pool, p2Pool, ...staff.flatMap(p=>[p.sales,p.p1,p.p2,p.totalIncentive])]
  if (values.some(v=>!Number.isFinite(v) || v < 0)) return 'Invalid or negative monetary values'
  const inFils = (amount:number) => {
    const value = Math.round(amount*100)
    if (!Number.isSafeInteger(value) || Math.abs(amount * 100 - value) > 1e-6) {
      throw new Error('A payout has fractional fils')
    }
    return value
  }
  try {
    const poolFils=inFils(pool)
    const p1Fils=inFils(p1Pool)
    const p2Fils=inFils(p2Pool)
    if (p1Fils+p2Fils!==poolFils) return 'P1 and P2 pools do not match the team pool'
    let sumP1=0, sumP2=0, sumTotal=0
    for (const person of staff) {
      const a=inFils(person.p1), b=inFils(person.p2), t=inFils(person.totalIncentive)
      if (a+b!==t) return 'Staff payout does not match P1 plus P2'
      sumP1+=a
      sumP2+=b
      sumTotal+=t
    }
    if (sumP1!==p1Fils || sumP2!==p2Fils || sumTotal!==poolFils) {
      return 'Individual payouts do not reconcile exactly to the incentive pool in fils'
    }
    const salesSum=staff.reduce((sum,p)=>sum+p.sales,0)
    if (Math.abs(salesSum-teamSales)>Math.max(1e-7,Math.abs(teamSales)*1e-12)) {
      return 'Staff sales do not reconcile to team sales'
    }
  } catch (error) {
    return error instanceof Error ? error.message : 'Invalid rounded payouts'
  }
  return null
}
