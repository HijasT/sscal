/** Backwards-compatible workbook facade. Implementations live in focused domain modules. */
import type { ExcelData } from './excelTypes'
import type * as SheetJS from 'xlsx'
import { getAvailableMonthsFromWorkbook } from './excelSheetNames'
import { extractStaffFromSheet } from './excelSheetParser'
export type { ExcelData, StaffData, DailyStaffValue } from './excelTypes'
export { isWorkedSalesCell, applyReportedBlankAttendance } from './excelAttendance'
export { EMPLOYEE_CODE_PATTERN, extractEmployeeCode, stripEmployeeCode } from './excelSheetNames'
export { getAvailableMonths, pickDefaultMonth, aggregateSheets } from './excelPeriod'

export async function parseExcelFile(file: File): Promise<ExcelData[]> {
  // Bundled import — no CDN, no (window as any), no polling needed
  const XLSX = await import('xlsx')

  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = e.target?.result
        if (!data) {
          reject(new Error('No data read from file'))
          return
        }

        const uint8Data = new Uint8Array(data as ArrayBuffer)
        const workbook = XLSX.read(uint8Data, { type: 'array' })
        resolve(parseExcelWorkbook(workbook, XLSX))
      } catch (error) {
        console.error('Excel parsing error:', error)
        reject(error)
      }
    }

    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsArrayBuffer(file)
  })
}

/** Pure workbook extraction; exported for real SheetJS worksheet regression tests. */
export function parseExcelWorkbook(
  workbook: Pick<SheetJS.WorkBook, 'SheetNames' | 'Sheets'>,
  XLSX: typeof SheetJS,
): ExcelData[] {
  const results: ExcelData[] = []
  const monthSheets = getAvailableMonthsFromWorkbook(workbook)
  for (const { raw, sheetName } of monthSheets) {
    const extracted = extractStaffFromSheet(workbook.Sheets[raw], sheetName, XLSX)
    results.push({
      sheetName,
      staff: extracted.staff,
      target: extracted.target,
      teamTotal: {
        packages: extracted.staff.reduce((sum, p) => sum + p.packages, 0),
        sales: extracted.staff.reduce((sum, p) => sum + p.sales, 0),
      },
      warnings: extracted.warnings,
      lastReportedDay: extracted.lastReportedDay,
    })
  }
  if (!results.length) throw new Error('No valid month sheets found in Excel file')
  return results
}


