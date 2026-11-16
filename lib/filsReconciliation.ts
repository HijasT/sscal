/**
 * Official monetary allocation. All awards are whole fils.
 * Largest-remainder ties use stable employee codes, never spreadsheet row order.
 */
import { extractEmployeeCode } from './excelUtils'

export interface FilsPreviewInput { id: string; incentive: number }
export interface FilsPreviewResult {
  poolFils: number
  separatelyRoundedFils: number
  roundingDifferenceFils: number
  allocations: { id: string; fils: number; adjustmentFils: number }[]
}
export interface FilsAwardInput { id: string; amount: number }
export interface FilsAward { id: string; fils: number }

export function employeePayoutKey(name: string): string {
  const code = extractEmployeeCode(name.toUpperCase())
  if (code) return `CODE:${code}`
  const fallback = name.trim().replace(/\s+/g, ' ').toUpperCase()
  if (!fallback) throw new Error('Staff must have a name or employee code for payout allocation')
  return `NAME:${fallback}`
}

export function toFils(amount: number): number {
  if (!Number.isFinite(amount) || amount < 0) throw new Error('Amount must be finite and non-negative')
  const fils = Math.round((amount + Number.EPSILON) * 100)
  if (!Number.isSafeInteger(fils)) throw new Error('Monetary amount exceeds safe integer fils')
  return fils
}

export function allocateFilsShares(poolFils: number, rows: readonly FilsAwardInput[]): FilsAward[] {
  if (!Number.isSafeInteger(poolFils) || poolFils < 0 || !rows.length ||
      rows.some(row => !row.id || !Number.isFinite(row.amount) || row.amount < 0) ||
      new Set(rows.map(row => row.id)).size !== rows.length) {
    throw new Error('Valid pool, unique stable employee identifiers and non-negative awards required')
  }
  const base = rows.map(({ id, amount }) => {
    const rawFils = amount * 100
    if (!Number.isSafeInteger(Math.floor(rawFils))) throw new Error('Payout exceeds safe integer fils')
    const floor = Math.floor(rawFils)
    return { id, floor, remainder: rawFils - floor }
  })
  const baseFils = base.reduce((sum, row) => sum + row.floor, 0)
  const remaining = poolFils - baseFils
  if (!Number.isSafeInteger(baseFils) || remaining < 0 || remaining > rows.length) {
    throw new Error('Raw payout shares do not reconcile to the incentive pool')
  }
  // Explicit lexicographic code order is independent of array or sorting order
  // and independent of the user's locale.
  const winners = [...base].sort((a, b) =>
    b.remainder - a.remainder || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
  const awarded = new Set(winners.slice(0, remaining).map(row => row.id))
  return base.map(row => ({ id: row.id, fils: row.floor + (awarded.has(row.id) ? 1 : 0) }))
}

export function previewFilsReconciliation(
  pool: number,
  rows: readonly FilsPreviewInput[]
): FilsPreviewResult {
  const poolFils = toFils(pool)
  const allocated = allocateFilsShares(poolFils, rows.map(p => ({ id: p.id, amount: p.incentive })))
  const separatelyRoundedFils = rows.reduce((sum, p) => sum + toFils(p.incentive), 0)
  return {
    poolFils, separatelyRoundedFils,
    roundingDifferenceFils: poolFils - separatelyRoundedFils,
    allocations: allocated.map(row => ({
      ...row,
      adjustmentFils: row.fils - toFils(rows.find(p => p.id === row.id)!.incentive),
    })),
  }
}
