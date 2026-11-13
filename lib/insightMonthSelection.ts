import type { ExcelData, StaffData } from './excelUtils'
import { calculateIncentive, getTier } from './utils'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** Named monthly worksheet, sorted chronologically for the Insights dropdowns. */
export interface InsightMonth {
  key: string
  label: string
  month: number
  year: number
  sheet: ExcelData
}

export function insightMonths(sheets: readonly ExcelData[]): InsightMonth[] {
  const valid: InsightMonth[] = []
  for (const sheet of sheets) {
    const match = /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s*(\d{2}|20\d{2})$/i.exec(sheet.sheetName.trim())
    if (!match) continue
    const month = MONTHS.findIndex(m => m.toLowerCase() === match[1].toLowerCase()) + 1
    const year = match[2].length === 2 ? 2000 + Number(match[2]) : Number(match[2])
    valid.push({ key: `${MONTHS[month - 1]} ${year}`, label: `${MONTHS[month - 1]} ${year}`, month, year, sheet })
  }
  return valid.sort((a, b) => a.year - b.year || a.month - b.month)
}

/** Current calendar month by default; latest uploaded month if it is absent. */
export function defaultInsightsMonth(months: readonly InsightMonth[], now: Date): string {
  const current = `${MONTHS[now.getMonth()]} ${now.getFullYear()}`
  return months.find(m => m.key === current)?.key ?? months[months.length - 1]?.key ?? ''
}

export function monthlyStaff(sheet: ExcelData, excluded: ReadonlySet<string>): StaffData[] {
  return sheet.staff.filter(p => !excluded.has(p.name))
}

/**
 * Recalculate a selected month's incentive on the same official tier engine
 * and selected split. Optional override only applies if caller supplies it
 * for the actively selected period; other months use their workbook target.
 */
export function monthlyIncentives(
  sheet: ExcelData,
  excluded: ReadonlySet<string>,
  p1Split: number,
  targetOverride?: number
): { staff: (StaffData & { totalIncentive: number })[]; sales: number; target: number; pool: number } | null {
  const staff = monthlyStaff(sheet, excluded)
  const sales = staff.reduce((total, person) => total + person.sales, 0)
  const target = targetOverride && targetOverride > 0 ? targetOverride : sheet.target
  if (!staff.length || !Number.isFinite(target) || target <= 0 || sales < 0) return null
  const pool = sales * getTier(sales / target * 100).rate / 100
  const rows = staff.map(person => {
    const calculation = sales > 0
      ? calculateIncentive(target, sales, person.sales, staff.length, p1Split)
      : null
    return { ...person, totalIncentive: calculation && !calculation.error ? calculation.myTotal : 0 }
  })
  return { staff: rows, sales, target, pool }
}
