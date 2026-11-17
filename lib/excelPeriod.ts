import type { StaffData, ExcelData } from './excelTypes'
import { SHORT_MONTHS, sortSheetNamesChronologically } from './excelSheetNames'

export function getAvailableMonths(data: ExcelData[]): string[] {
  return sortSheetNamesChronologically(data.map((d) => d.sheetName))
}

// Picks which month/year to auto-select right after an upload: the current
// calendar month if its sheet has usable data, otherwise the previous month.
export function pickDefaultMonth(data: ExcelData[], now: Date = new Date()): { month: string; year: string } {
  const findSheet = (month: string, year: string) =>
    data.find((d) => d.sheetName === `${month} ${year}` || d.sheetName === `${month}${year}`)

  const isUsable = (sheet: ExcelData | undefined) =>
    !!sheet && sheet.staff.length > 0 && sheet.target > 0

  const monthIdx = now.getMonth()
  const month = SHORT_MONTHS[monthIdx] ?? 'Jan'
  const year = String(now.getFullYear()).slice(-2)

  if (isUsable(findSheet(month, year))) return { month, year }

  const prevIdx = monthIdx === 0 ? 11 : monthIdx - 1
  const prevYear = monthIdx === 0 ? String(now.getFullYear() - 1).slice(-2) : year
  const prevMonth = SHORT_MONTHS[prevIdx] ?? 'Dec'

  if (isUsable(findSheet(prevMonth, prevYear))) return { month: prevMonth, year: prevYear }

  return { month, year }
}

export function aggregateSheets(sheets: ExcelData[]): ExcelData {
  const aggregated: Record<string, StaffData> = {}
  let totalPackages = 0
  let totalSales    = 0
  let totalTarget   = 0

  sheets.forEach((sheet) => {
    sheet.staff.forEach((person) => {
      if (!aggregated[person.name]) {
        aggregated[person.name] = {
          name: person.name, packages: 0, sales: 0, workingDays: 0, clients: 0,
          dubaiItCells: [],
        }
      }
      aggregated[person.name]!.packages    += person.packages
      aggregated[person.name]!.sales       += person.sales
      aggregated[person.name]!.workingDays += person.workingDays
      if (person.dubaiItCells?.length) {
        aggregated[person.name]!.dubaiItCells!.push(...person.dubaiItCells.map(cell => ({ ...cell, sourceSheet: sheet.sheetName })))
      }
      if (person.clients) {
        aggregated[person.name]!.clients =
          (aggregated[person.name]!.clients || 0) + person.clients
      }
    })
    totalPackages += sheet.teamTotal.packages
    totalSales    += sheet.teamTotal.sales
    totalTarget   += sheet.target
  })

  return {
    sheetName: 'Aggregated',
    staff: Object.values(aggregated),
    target: totalTarget,
    teamTotal: { packages: totalPackages, sales: totalSales },
  }
}
