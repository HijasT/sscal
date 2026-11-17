/** Conservative Dubai It detection from the original daily sales formula.
 * Only additive numeric literals can be auto-approved. Never infer from totals.
 */
export interface DubaiItCell {
  day: number
  address: string
  sourceSheet?: string
  formula?: string
  sales: number
  detected: number
  status: 'verified' | 'review'
  reason?: string
}
export function inspectDubaiItCell(
  cell: { f?: string; v?: unknown } | undefined,
  day: number,
  address: string,
): DubaiItCell | null {
  if (!cell || cell.v == null || String(cell.v).trim() === '' || /^n\/?a$/i.test(String(cell.v).trim())) return null
  const sales = typeof cell.v === 'number' ? cell.v : Number(String(cell.v).replaceAll(',', ''))
  if (!Number.isFinite(sales) || sales < 0) return {
    day, address, sales: 0, detected: 0, status: 'review', reason: 'Invalid or unreadable sales amount',
    formula: cell.f,
  }
  if (sales === 0 && !cell.f) return null
  const formula = cell.f?.trim()
  if (!formula) return {
    day, address, sales, detected: 0, status: 'review',
    reason: 'Positive sales value has no package-level formula',
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
    status: 'verified',
  }
}
