// Matches an employee code like "AE01-227" embedded in a staff name cell
// (e.g. "Jane Doe AE01-227") — used to look up STAFF_CENTERS without
// keying that config by real names.
export const EMPLOYEE_CODE_PATTERN = /AE\d{2}-\d{3}/

export function extractEmployeeCode(staffName: string): string | null {
  return staffName.match(EMPLOYEE_CODE_PATTERN)?.[0] ?? null
}

// Strips the employee code out of a raw staff name cell (e.g. "Jane Doe
// AE01-227" -> "Jane Doe") for display purposes — the code itself remains
// the unique identifier (see extractEmployeeCode), since names can change.
export function stripEmployeeCode(staffName: string): string {
  return staffName.replace(EMPLOYEE_CODE_PATTERN, '').replace(/\s+/g, ' ').trim()
}

// ── Sheet name normalisation ──────────────────────────────────────────────────
// Accept both abbreviated (Jun) and full (June) month names.
// Normalise full names to short form so downstream filtering stays consistent.

export const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const FULL_TO_SHORT: Record<string, string> = {
  January: 'Jan', February: 'Feb', March: 'Mar', April: 'Apr',
  June: 'Jun', July: 'Jul', August: 'Aug', September: 'Sep',
  October: 'Oct', November: 'Nov', December: 'Dec',
  // May is already short — no entry needed
}

function normaliseSheetName(name: string): string {
  // Trim + collapse internal whitespace first — sheet tabs sometimes carry
  // stray leading/trailing/doubled spaces (e.g. "May 26 ", " May  26") which
  // otherwise breaks exact-match and end-anchored lookups done downstream
  // (view filters, year extraction) even though the sheet parses fine.
  const cleaned = name.trim().replace(/\s+/g, ' ')
  for (const [full, abbr] of Object.entries(FULL_TO_SHORT)) {
    if (cleaned.includes(full)) return cleaned.replace(full, abbr)
  }
  return cleaned
}

// Raw workbook sheet name paired with its cleaned/normalised display name —
// the raw name is what XLSX.Sheets is actually keyed by, so lookups must use
// it verbatim even when the cleaned name differs (e.g. trailing whitespace).
export function getAvailableMonthsFromWorkbook(workbook: { SheetNames: string[] }): { raw: string; sheetName: string }[] {
  const allNames = [...SHORT_MONTHS, ...Object.keys(FULL_TO_SHORT)]
  const months: { raw: string; sheetName: string }[] = []

  workbook.SheetNames.forEach((raw) => {
    const trimmed = raw.trim()
    const hasMonth = allNames.some((m) => trimmed.includes(m))
    const hasYear  = /\d{2}/.test(trimmed)
    // 15 chars covers "September 26" (12 chars)
    if (hasMonth && hasYear && trimmed.length <= 15) {
      months.push({ raw, sheetName: normaliseSheetName(trimmed) })
    }
  })

  return months.sort((a, b) => monthSortKey(a.sheetName) - monthSortKey(b.sheetName))
}

// Sorts "Mon YY" sheet names chronologically (Jan -> Dec, then by year)
// instead of alphabetically, e.g. ["Apr 26", "Feb 26", "Jan 26"] -> Jan, Feb, Apr.
function monthSortKey(sheetName: string): number {
  const match = sheetName.match(/([A-Za-z]+)\s*(\d{2,4})/)
  if (!match) return 0
  const monthIdx = SHORT_MONTHS.indexOf(match[1] ?? '')
  const year = parseInt(match[2] ?? '', 10)
  return (isNaN(year) ? 0 : year) * 12 + (monthIdx === -1 ? 0 : monthIdx)
}

export function sortSheetNamesChronologically(names: string[]): string[] {
  return [...names].sort((a, b) => monthSortKey(a) - monthSortKey(b))
}

