/** Inspect daily sales: a direct amount is one sale, and a simple additive
 * formula lists individual sale amounts. Exact AED 10,000 means one full-price
 * Dubai It package. Only in October 2026, exact AED 9,000 or AED 9,700
 * literals are also recognized as discounted Dubai It for the Legacy bonus.
 * Never infer counts from monthly totals or complex formulas.
 */
export interface DubaiItCell {
  day: number
  address: string
  sourceSheet?: string
  formula?: string
  sales: number
  detected: number
  /** Oct 2026 discounted AED 9,000/9,700 packages; Legacy bonus only. */
  discountedDetected?: number
  status: 'verified' | 'review'
  reason?: string
}
export function inspectDubaiItCell(
  cell: { f?: string; v?: unknown } | undefined,
  day: number,
  address: string,
  sheetName?: string,
): DubaiItCell | null {
  const octoberDiscounts = isOctober2026(sheetName)
  const isDiscounted = (amount: number) => octoberDiscounts && (amount === 9000 || amount === 9700)
  if (!cell || cell.v == null || String(cell.v).trim() === '' || /^n\/?a$/i.test(String(cell.v).trim())) return null
  const sales = typeof cell.v === 'number' ? cell.v : Number(String(cell.v).replaceAll(',', ''))
  if (!Number.isFinite(sales) || sales < 0) return {
    day, address, sales: 0, detected: 0, status: 'review', reason: 'Invalid or unreadable sales amount',
    formula: cell.f,
  }
  if (sales === 0 && !cell.f) return null
  const formula = cell.f?.trim()
  // A plain numeric value represents exactly one day's sale amount.
  // Only an exact AED 10,000 is a full-price Dubai It; in October 2026,
  // AED 9,000/9,700 each represent one discounted Dubai It.
  if (!formula) return {
    day, address, sales, detected: sales === 10000 ? 1 : 0,
    discountedDetected: isDiscounted(sales) ? 1 : 0, status: 'verified',
  }
  // Restrict to '+'-joined monetary literals, allowing an optional leading '='.
  // Parentheses, references, subtraction, multipliers and functions need review.
  const expression = formula.replace(/^=/, '').replace(/\s+/g, '')
  if (!/^\d+(?:\.\d+)?(?:\+\d+(?:\.\d+)?)*$/.test(expression)) return {
    day, address, sales, detected: 0, formula, status: 'review',
    reason: 'Formula is not a simple addition of package prices',
  }
  const amounts = expression.split('+').map(Number)
  const calculated = amounts.reduce((a, b) => a + b, 0)
  if (!Number.isFinite(calculated) || Math.abs(calculated - sales) > 0.011) return {
    day, address, sales, detected: 0, formula, status: 'review',
    reason: 'Excel cached value does not match the additive formula',
  }
  return {
    day, address, sales, formula, detected: amounts.filter(amount => amount === 10000).length,
    discountedDetected: amounts.filter(isDiscounted).length,
    status: 'verified',
  }
}

/** Use the same period check for detection, display and accounting. */
export function isOctober2026(sheetName?: string): boolean {
  return /^Oct(?:ober)?\s*(?:26|2026)$/i.test(sheetName?.trim() ?? '')
}

/** Reclassify previously parsed verified evidence using its original amount
 * and formula, rather than relying on a field introduced in v15.2.8.
 * Never infer packages from monthly totals or unverified formulas. */
export function countDiscountedDubaiIt(cell: DubaiItCell, sheetName: string): number {
  if (!isOctober2026(cell.sourceSheet ?? sheetName) || cell.status !== 'verified' || cell.day < 1 || cell.day > 31) return 0
  const inspected = inspectDubaiItCell({ v: cell.sales, f: cell.formula }, cell.day, cell.address, cell.sourceSheet ?? sheetName)
  return inspected?.status === 'verified' ? (inspected.discountedDetected ?? 0) : 0
}
