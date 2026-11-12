/**
 * Divider position for a ranking sorted by the current numeric column.
 * Include values equal to the mean in the at-or-above group.
 */
export function averageDivider<T>(
  rows: readonly T[],
  valueOf: (row: T) => number,
  direction: 'asc' | 'desc'
): { average: number; index: number } | null {
  if (!rows.length) return null
  const values = rows.map(valueOf)
  if (values.some((value) => !Number.isFinite(value))) return null
  const average = values.reduce((total, value) => total + value, 0) / values.length
  // Desc: divider follows all values >= average. Asc: divider precedes them.
  const index = direction === 'desc'
    ? values.findIndex((value) => value < average)
    : values.findIndex((value) => value >= average)
  return { average, index: index < 0 ? rows.length : index }
}
