/** Validate workbook and restored-cache staff data before payroll calculation.
 * Fail closed on duplicate people and impossible totals; no silent deduplication.
 */
import type { StaffData } from './excelTypes'
import { extractEmployeeCode } from './excelSheetNames'

export function validateStaffRoster(staff: readonly StaffData[]): string | null {
  const names = new Set<string>()
  const codes = new Set<string>()
  for (const person of staff) {
    const name = person.name.trim()
    if (!name) return 'An employee has no name; correct the Sales Tracker before calculating.'
    const normalized = name.toLocaleLowerCase('en')
    if (names.has(normalized)) return `Duplicate employee "${name}" in the selected report. Correct the workbook before calculating.`
    names.add(normalized)
    const code = extractEmployeeCode(name)
    if (code) {
      if (codes.has(code)) return `Duplicate employee code ${code} in the selected report. Correct the workbook before calculating.`
      codes.add(code)
    }
    if (![person.sales, person.packages, person.workingDays].every(Number.isFinite) ||
      !Number.isInteger(person.packages) || !Number.isInteger(person.workingDays) ||
      person.sales < 0 || person.packages < 0 || person.workingDays < 0 ||
      (person.clients !== undefined && (!Number.isSafeInteger(person.clients) || person.clients < 0))) {
      return `Invalid sales, packages, clients or attendance for "${name}". Correct the workbook before calculating.`
    }
  }
  return null
}
