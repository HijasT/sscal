import type { StaffData } from './excelTypes'

/**
 * Daily sales attendance rule:
 * - NA / N/A: absent, not a worked day
 * - numeric 0 or blank ON AN ALREADY-REPORTED DAY: worked with zero sales
 * - future blank columns: not yet reported, never counted in attendance
 * - a genuine Excel error: invalid, not a worked day
 */
export function isWorkedSalesCell(
  cell: { v?: unknown; t?: string } | undefined,
  dayIsReported = false
): boolean {
  if (!cell || cell.v == null || String(cell.v).trim() === '') return dayIsReported
  const value = String(cell.v).trim()
  if (/^n[/]?a$/i.test(value)) return false
  if (cell.t === 'e' || /^#(REF|DIV[/]0|VALUE|NAME|NUM|NULL|N[/]A)[!?]/i.test(value)) return false
  // A worked day requires an actual numeric sales entry, including zero.
  // Arbitrary text must not inflate attendance.
  const amount = typeof cell.v === 'number' ? cell.v : Number(value.replaceAll(',', ''))
  return Number.isFinite(amount)
}

/**
 * Resolve otherwise empty sales cells only after the sheet-wide reporting
 * cutoff is known. Future empty dates never inflate working-day counts.
 */
export function applyReportedBlankAttendance(
  employee: StaffData,
  blankDays: readonly number[],
  lastReportedDay?: number
): void {
  if (lastReportedDay == null) return
  for (const day of blankDays) {
    if (day < 1 || day > lastReportedDay) continue
    employee.workingDays++
    employee.daily?.push({ day, sales: 0, packages: 0, clients: 0 })
  }
  employee.daily?.sort((a, b) => a.day - b.day)
}

