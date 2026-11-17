import { extractEmployeeCode } from './excelSheetNames'
import type { ExcelData, StaffData } from './excelTypes'

export interface EligibilityInference {
  employee: string
  sourceSheet: string
  status: 'existing' | 'potential-new-joiner' | 'missing-previous-month' | 'needs-review'
  firstRecordedDay?: number
  inferredEligibleDays?: number
  daysInMonth: number
  reason: string
}

function monthData(name: string): { year: number; month: number } | null {
  const match = name.trim().match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s*(\d{2}|\d{4})$/i)
  if (!match) return null
  const months = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec']
  const month = months.indexOf(match[1].toLowerCase()) + 1
  const year = Number(match[2].length === 2 ? '20' + match[2] : match[2])
  return { year, month }
}

export function inferJoinerEligibility(
  selected: ExcelData,
  workbookSheets: readonly ExcelData[],
): EligibilityInference[] {
  const parsed = monthData(selected.sheetName)
  if (!parsed) return selected.staff.map(person => ({
    employee: person.name, sourceSheet: selected.sheetName,
    status: 'needs-review', daysInMonth: 0, reason: 'Unrecognized reporting month',
  }))
  const daysInMonth = new Date(Date.UTC(parsed.year, parsed.month, 0)).getUTCDate()
  const previous = new Date(Date.UTC(parsed.year, parsed.month - 2, 1))
  const prevSheet = workbookSheets.find(sheet => {
    const p = monthData(sheet.sheetName)
    return p?.year === previous.getUTCFullYear() && p.month === previous.getUTCMonth() + 1
  })
  const priorNames = new Set((prevSheet?.staff ?? []).map(person => person.name.trim().toLowerCase()))
  const priorCodes = new Set((prevSheet?.staff ?? [])
    .map(person => extractEmployeeCode(person.name)).filter((code): code is string => !!code))
  return selected.staff.map((person: StaffData) => {
    const employee = person.name
    const base = { employee, sourceSheet: selected.sheetName, daysInMonth }
    if (!prevSheet) return { ...base, status: 'missing-previous-month' as const,
      reason: 'Previous calendar month is missing; joining status cannot be inferred' }
    const code = extractEmployeeCode(employee)
    const existed = code ? priorCodes.has(code) : priorNames.has(employee.trim().toLowerCase())
    if (existed) return { ...base, status: 'existing' as const,
      inferredEligibleDays: daysInMonth, reason: 'Employee was listed in previous month' }
    // Inferred from an explicitly entered 0 or positive sales amount, never a
    // blank inferred as attendance from a reporting cutoff.
    const day = person.firstExplicitWorkedDay
    if (!day || day < 1 || day > daysInMonth) return {
      ...base, status: 'needs-review' as const,
      reason: 'New employee has no explicit first zero/sales entry; confirm joining date',
    }
    return { ...base, status: 'potential-new-joiner' as const, firstRecordedDay: day,
      inferredEligibleDays: daysInMonth - day + 1,
      reason: 'Absent from previous roster; first entered zero/sales day is an estimate, not proof of joining' }
  })
}
