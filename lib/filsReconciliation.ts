/**
 * Proposal-only fils reconciliation preview.
 *
 * Nothing in the live calculator calls this module. The rounding/allocation
 * rule requires business approval before it can modify displayed payouts.
 */
export interface FilsPreviewInput { id: string; incentive: number }
export interface FilsPreviewResult {
  poolFils: number
  separatelyRoundedFils: number
  roundingDifferenceFils: number
  allocations: { id: string; fils: number; adjustmentFils: number }[]
}
export function previewFilsReconciliation(
  pool: number,
  rows: readonly FilsPreviewInput[]
): FilsPreviewResult {
  if (!Number.isFinite(pool) || pool < 0 || !rows.length ||
      rows.some(p => !p.id || !Number.isFinite(p.incentive) || p.incentive < 0) ||
      new Set(rows.map(p => p.id)).size !== rows.length) {
    throw new Error('A finite non-negative pool and uniquely identified payouts are required')
  }
  const poolFils = Math.round((pool + Number.EPSILON) * 100)
  if (!Number.isSafeInteger(poolFils)) throw new Error('Pool exceeds safe integer fils')
  const separatelyRoundedFils = rows.reduce((sum,p)=>sum+Math.round((p.incentive + Number.EPSILON)*100),0)
  const base = rows.map(p => {
    const rawFils = p.incentive * 100
    const floor = Math.floor(rawFils + 1e-10)
    return { id:p.id, floor, remainder:rawFils-floor, rounded:Math.round((p.incentive + Number.EPSILON)*100) }
  })
  const remaining = poolFils - base.reduce((sum,p)=>sum+p.floor,0)
  if (remaining < 0 || remaining > rows.length) {
    throw new Error('Raw staff allocations do not reconcile with the pool')
  }
  const order = [...base].sort((a,b)=>b.remainder-a.remainder || a.id.localeCompare(b.id))
  const awarded = new Set(order.slice(0,remaining).map(p=>p.id))
  const allocations = base.map(p => {
    const fils = p.floor + (awarded.has(p.id) ? 1 : 0)
    return { id:p.id, fils, adjustmentFils:fils-p.rounded }
  })
  return { poolFils, separatelyRoundedFils,
    roundingDifferenceFils:poolFils-separatelyRoundedFils, allocations }
}
