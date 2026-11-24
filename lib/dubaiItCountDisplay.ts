/** Display the October 2026 Legacy Dubai It count as full-price + discounted.
 * Other engines and months keep a single full-price count.
 * Unverified data is never silently displayed as zero.
 */
export function formatDubaiItCount(
  fullCount: number | null | undefined,
  discountedCount: number | null | undefined,
  octoberLegacy: boolean,
): string {
  if (fullCount == null) return 'Review'
  if (!octoberLegacy) return String(fullCount)
  if (discountedCount == null) return 'Review'
  return `${fullCount}+${discountedCount}`
}
