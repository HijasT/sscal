// Excel processing utilities for Bulk tab

export interface StaffData {
  name: string
  packages: number
  sales: number
  workingDays: number
  clients?: number
}

export interface ExcelData {
  sheetName: string
  staff: StaffData[]
  target: number
  teamTotal: {
    packages: number
    sales: number
  }
}

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

// The canonical unique identifier for a staff member: their employee code
// when the name has one embedded, otherwise the raw name as a best-effort
// fallback (older sheets without a code). Names can change between uploads
// (typo fixes, married names); the code doesn't, so anything that persists
// per-person data across uploads (analytics history, badges) should key on
// this instead of the raw name.
export function getPersonId(staffName: string): string {
  return extractEmployeeCode(staffName) ?? staffName
}

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
        const results: ExcelData[] = []

        const monthSheets = getAvailableMonthsFromWorkbook(workbook)

        for (const { raw, sheetName } of monthSheets) {
          const worksheet = workbook.Sheets[raw]
          const extracted = extractStaffFromSheet(worksheet, sheetName, XLSX)

          results.push({
            sheetName,
            staff: extracted.staff,
            target: extracted.target,
            teamTotal: {
              packages: extracted.staff.reduce((sum, s) => sum + s.packages, 0),
              sales: extracted.staff.reduce((sum, s) => sum + s.sales, 0),
            },
          })
        }

        if (results.length === 0) {
          reject(new Error('No valid month sheets found in Excel file'))
          return
        }

        resolve(results)
      } catch (error) {
        console.error('Excel parsing error:', error)
        reject(error)
      }
    }

    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsArrayBuffer(file)
  })
}

// ── Sheet name normalisation ──────────────────────────────────────────────────
// Accept both abbreviated (Jun) and full (June) month names.
// Normalise full names to short form so downstream filtering stays consistent.

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
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
function getAvailableMonthsFromWorkbook(workbook: { SheetNames: string[] }): { raw: string; sheetName: string }[] {
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
  const monthIdx = SHORT_MONTHS.indexOf(match[1])
  const year = parseInt(match[2], 10)
  return (isNaN(year) ? 0 : year) * 12 + (monthIdx === -1 ? 0 : monthIdx)
}

function sortSheetNamesChronologically(names: string[]): string[] {
  return [...names].sort((a, b) => monthSortKey(a) - monthSortKey(b))
}

// ── Sheet extraction ──────────────────────────────────────────────────────────

function extractStaffFromSheet(
  worksheet: any,
  sheetName: string,
  XLSX: any,
): { staff: StaffData[]; target: number } {
  if (!worksheet) return { staff: [], target: 0 }

  const staff: StaffData[] = []
  let target = 0

  // Find TARGET label
  for (let row = 1; row <= 100; row++) {
    for (let col = 1; col <= 20; col++) {
      const cell = worksheet[XLSX.utils.encode_cell({ r: row - 1, c: col - 1 })]
      if (cell?.v && String(cell.v).trim().toUpperCase() === 'TARGET') {
        const targetCell = worksheet[XLSX.utils.encode_cell({ r: row - 1, c: col })]
        if (targetCell?.v) {
          target = parseFloat(targetCell.v)
          break
        }
      }
    }
    if (target > 0) break
  }

  const range = XLSX.utils.decode_range(worksheet['!ref'])

  // Find the month-total column: header row (row 3, index 2) containing
  // the sheet's month name, year, and "ttl"/"total"
  let monthTotalCol = -1
  for (let col = 0; col <= range.e.c; col++) {
    const headerCell = worksheet[XLSX.utils.encode_cell({ r: 2, c: col })]
    if (headerCell?.v) {
      const h = String(headerCell.v).toLowerCase()
      const parts = sheetName.toLowerCase().split(' ')
      if (parts[0] && parts[1] &&
          h.includes(parts[0]) && h.includes(parts[1]) &&
          (h.includes('ttl') || h.includes('total'))) {
        monthTotalCol = col
        break
      }
    }
  }

  if (monthTotalCol === -1) {
    console.warn(`Could not find total column for ${sheetName}, using column 2`)
    monthTotalCol = 2
  }

  // Build list of genuine daily columns.
  //
  // Excel stores day-of-month headers in several ways depending on how the
  // sheet was built:
  //   a) Plain integer 1–31     → hCell.v is 1, 2 … 31
  //   b) Date serial number     → hCell.v is e.g. 46574 (large number); the
  //      formatted display hCell.w shows the day: "1", "01", "1-Jun", "Jun-1"
  //   c) String "1"–"31"        → hCell.v is the string itself
  //
  // We accept a column as a "day column" when we can extract a day number
  // 1–31 from either the raw value or the formatted string.  Everything else
  // (month-total column, weekly sub-totals, text headers, large non-date
  // numbers) is excluded.
  const dayColumns: number[] = []

  for (let col = 3; col <= range.e.c; col++) {
    if (col === monthTotalCol) continue
    const hCell = worksheet[XLSX.utils.encode_cell({ r: 2, c: col })]
    if (!hCell) continue

    let dayNum: number | null = null

    // Case (a): plain integer 1–31 stored directly
    if (typeof hCell.v === 'number' && Number.isInteger(hCell.v) &&
        hCell.v >= 1 && hCell.v <= 31) {
      dayNum = hCell.v

    // Case (b): Excel date serial — hCell.t === 'd' or large number
    // Extract day from the formatted display string (hCell.w)
    } else if (typeof hCell.v === 'number' && hCell.v > 31 && hCell.w) {
      // hCell.w might be "1", "01", "1-Jun", "Jun-1", "1/6", "6/1" etc.
      // Try to pull the first numeric token that is 1–31
      const match = String(hCell.w).match(/\b(\d{1,2})\b/)
      if (match) {
        const n = parseInt(match[1], 10)
        if (n >= 1 && n <= 31) dayNum = n
      }

    // Case (c): string value like "1" or "01"
    } else if (typeof hCell.v === 'string') {
      const n = parseInt(hCell.v.trim(), 10)
      if (!isNaN(n) && n >= 1 && n <= 31) dayNum = n

    // Case (d): formatted display even when raw value is unrecognised
    } else if (hCell.w) {
      const match = String(hCell.w).match(/^\s*(\d{1,2})\s*$/)
      if (match) {
        const n = parseInt(match[1], 10)
        if (n >= 1 && n <= 31) dayNum = n
      }
    }

    if (dayNum !== null) dayColumns.push(col)
  }

  // Walk staff rows starting at row 4
  let row = 4

  while (row <= range.e.r) {
    const nameCell = worksheet[XLSX.utils.encode_cell({ r: row - 1, c: 0 })]
    const typeCell = worksheet[XLSX.utils.encode_cell({ r: row - 1, c: 1 })]

    // Grand totals row signals end of data
    if (nameCell && String(nameCell.v).trim() === 'Grand totals') break

    if (nameCell && typeCell && typeCell.v === 'Count of Packages') {
      const name = String(nameCell.v).trim()

      // Detect new format (May 26+): "Count of Clients" row between packages and sales
      const nextTypeCell = worksheet[XLSX.utils.encode_cell({ r: row, c: 1 })]
      const hasClientsRow = nextTypeCell &&
        String(nextTypeCell.v).includes('Count of Clients')

      const salesRowOffset = hasClientsRow ? 2 : 1

      if (name && !['STAFF', 'p25', '`', 'Grand totals'].includes(name)) {
        const pkgCell   = worksheet[XLSX.utils.encode_cell({ r: row - 1,                c: monthTotalCol })]
        const salesCell = worksheet[XLSX.utils.encode_cell({ r: row - 1 + salesRowOffset, c: monthTotalCol })]

        let packages    = 0
        let sales       = 0
        let clients     = 0
        let workingDays = 0

        if (pkgCell && pkgCell.v !== 'NA') {
          packages = typeof pkgCell.v === 'number'
            ? pkgCell.v
            : parseFloat(pkgCell.w ?? '0') || 0
        }

        if (hasClientsRow) {
          const clientsCell = worksheet[XLSX.utils.encode_cell({ r: row, c: monthTotalCol })]
          if (clientsCell && clientsCell.v !== 'NA') {
            clients = typeof clientsCell.v === 'number'
              ? clientsCell.v
              : parseFloat(clientsCell.w ?? '0') || 0
          }
        }

        if (salesCell && salesCell.v !== 'NA') {
          sales = typeof salesCell.v === 'number'
            ? salesCell.v
            : parseFloat(salesCell.w ?? '0') || 0
        }

        // Count working days over genuine day columns only.
        // A day is worked when the sales cell is not blank and not NA —
        // zero is a valid entry (staff present, no sale) and still counts.
        for (const col of dayColumns) {
          const dailyCell = worksheet[
            XLSX.utils.encode_cell({ r: row - 1 + salesRowOffset, c: col })
          ]

          // Skip if cell is absent (blank) or explicitly marked NA
          if (!dailyCell || dailyCell.v === 'NA' ||
              dailyCell.v === null || dailyCell.v === undefined || dailyCell.v === '') {
            continue
          }

          workingDays++
        }

        // Fallback: if the sheet has no day-header columns but has sales data,
        // at least 1 day must have been worked
        if (workingDays === 0 && sales > 0) {
          workingDays = 1
        }

        const staffEntry: StaffData = {
          name,
          packages: Math.round(packages),
          sales:    Math.round(sales * 100) / 100,
          workingDays,
        }

        if (hasClientsRow && clients > 0) {
          staffEntry.clients = Math.round(clients)
        }

        staff.push(staffEntry)
      }

      row += hasClientsRow ? 3 : 2
    } else {
      row++
    }
  }

  return { staff, target }
}

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
  const month = SHORT_MONTHS[monthIdx]
  const year = String(now.getFullYear()).slice(-2)

  if (isUsable(findSheet(month, year))) return { month, year }

  const prevIdx = monthIdx === 0 ? 11 : monthIdx - 1
  const prevYear = monthIdx === 0 ? String(now.getFullYear() - 1).slice(-2) : year
  const prevMonth = SHORT_MONTHS[prevIdx]

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
        }
      }
      aggregated[person.name].packages    += person.packages
      aggregated[person.name].sales       += person.sales
      aggregated[person.name].workingDays += person.workingDays
      if (person.clients) {
        aggregated[person.name].clients =
          (aggregated[person.name].clients || 0) + person.clients
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
