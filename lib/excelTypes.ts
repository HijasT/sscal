/** Shared workbook domain contracts. */
export interface DailyStaffValue {
  day: number
  sales: number
  packages: number
  clients: number
}

export interface StaffData {
  name: string
  packages: number
  sales: number
  workingDays: number
  clients?: number
  /** Daily figures from uploaded workbook; absent on older cached data. */
  daily?: DailyStaffValue[]
}

export interface ExcelData {
  sheetName: string
  staff: StaffData[]
  target: number
  teamTotal: {
    packages: number
    sales: number
  }
  /** Data-quality warnings (e.g. a broken "#REF!" total cell). Blank = 0 sales
   * and NA/N/A = absent are per the SOP and never warned about. */
  warnings?: string[]
  /** Latest day of month containing an entered staff sales figure (including zero). */
  lastReportedDay?: number
}

