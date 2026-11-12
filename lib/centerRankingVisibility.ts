/** Presentation-only filter for a ranked team. Never recalculates ranks or averages. */
export interface CenterRankRow<T> {
  person: T
  rank: number
}

/**
 * The average divider uses its original insertion index in the complete ranking.
 * Visible rows on either side retain their original rank even if entire centers
 * are hidden. Unassigned staff remain visible because they have no center toggle.
 */
export function visibleCenterRankings<T>(
  sorted: readonly T[],
  visibleCenters: Readonly<Record<string, boolean>>,
  centerOf: (person: T) => string | null | undefined,
  averageIndex: number | null
): { rows: CenterRankRow<T>[]; dividerIndex: number | null } {
  const included = sorted
    .map((person, index) => ({ person, rank: index + 1, originalIndex: index }))
    .filter(({ person }) => {
      const center = centerOf(person)
      return !center || visibleCenters[center] !== false
    })
  const dividerIndex = averageIndex === null ? null :
    included.findIndex((row) => row.originalIndex >= averageIndex)
  return {
    rows: included.map(({ person, rank }) => ({ person, rank })),
    dividerIndex: dividerIndex === -1 ? included.length : dividerIndex,
  }
}

/** The final enabled center cannot be hidden. */
export function nextCenterVisibility(
  current: Readonly<Record<string, boolean>>,
  center: string,
): Record<string, boolean> | null {
  if (!(center in current)) return null
  if (current[center] && Object.values(current).filter(Boolean).length <= 1) return null
  return { ...current, [center]: !current[center] }
}
