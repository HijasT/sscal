/**
 * Rounding helpers for accounting-held residual fils.
 *
 * Employee awards are independently rounded to the nearest fils: no employee
 * receives or loses a residual fils on behalf of another employee.
 * Accounting handles the signed difference between pool and staff awards.
 */
export function toFils(amount: number): number {
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error('Amount must be finite and non-negative')
  }
  const fils = Math.round((amount + Number.EPSILON) * 100)
  if (!Number.isSafeInteger(fils)) throw new Error('Monetary amount exceeds safe integer fils')
  return fils
}

export interface AccountingRemainder {
  poolFils: number
  staffFils: number
  remainderFils: number
}

/**
 * Positive: money remains in the pool for accounting to allocate.
 * Negative: separately rounded staff awards exceed the pool; accounting
 * must resolve that difference. Zero: no difference.
 */
export function accountingRemainder(poolFils: number, staffFils: readonly number[]): AccountingRemainder {
  if (!Number.isSafeInteger(poolFils) || poolFils < 0 ||
      staffFils.some(f => !Number.isSafeInteger(f) || f < 0)) {
    throw new Error('Pool and staff awards must be non-negative whole fils')
  }
  const sum = staffFils.reduce((a, b) => a + b, 0)
  if (!Number.isSafeInteger(sum)) throw new Error('Staff awards exceed safe integer fils')
  return { poolFils, staffFils: sum, remainderFils: poolFils - sum }
}

/** Signed amount suitable for showing the accounting adjustment in AED. */
export function remainderAED(remainderFils: number): number {
  if (!Number.isSafeInteger(remainderFils)) throw new Error('Invalid remainder')
  return remainderFils / 100
}
