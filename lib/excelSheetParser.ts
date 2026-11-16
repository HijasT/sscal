import type { StaffData, DailyStaffValue } from './excelTypes'
import { isWorkedSalesCell, applyReportedBlankAttendance } from './excelAttendance'
import { stripEmployeeCode, extractEmployeeCode } from './excelSheetNames'
import type * as SheetJS from 'xlsx'

// ── Sheet extraction ──────────────────────────────────────────────────────────

export function extractStaffFromSheet(
  worksheet: SheetJS.WorkSheet | undefined,
  sheetName: string,
  XLSX: typeof SheetJS,
  reportedThroughDay?: number,
): { staff: StaffData[]; target: number; warnings: string[]; lastReportedDay?: number } {
  if (!worksheet) return { staff: [], target: 0, warnings: [] }

  const staff: StaffData[] = []
  const warnings: string[] = []
  let target = 0
  let lastReportedDay: number | undefined
  // Blank cells are resolved only after the last reported day is established.
  const pendingBlankDays: { staff: StaffData; days: number[] }[] = []

  // An Excel error cell (#REF!, #DIV/0!, #VALUE!, …), whether stored as a true
  // error (t === 'e') or saved as literal text. Blank and NA/N/A are NOT errors
  // (see SOP: blank = 0 sales, NA/N/A = absent) — only genuinely broken cells.
  const isErrorCell = (cell: SheetJS.CellObject | undefined): boolean =>
    !!cell && (cell.t === 'e' || /^#(REF|DIV\/0|VALUE|NAME|NUM|NULL|N\/A)[!?]/i.test(String(cell.v ?? '').trim()))

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

  const range = XLSX.utils.decode_range(worksheet['!ref'] ?? 'A1')

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

  // When found, monthTotalCol is the pre-computed "<Month> <YY> Ttl" column.
  // The current (in-progress) month often has no such column yet — the sheet
  // owner adds it at month end — so falling back to a fixed column read an
  // unrelated month's total (e.g. "Jan Total" in col 2). Instead, leave it
  // unset and derive each figure by summing that staff's daily columns below,
  // which equals the Ttl for finished months and is the correct month-to-date
  // value for the current one.
  const haveTtlCol = monthTotalCol !== -1
  if (!haveTtlCol) {
    console.warn(`No total column for ${sheetName}; summing daily columns instead`)
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
  const dayColumns: { col: number; day: number }[] = []

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

    if (dayNum !== null) dayColumns.push({ col, day: dayNum })
  }

  // Sum a staff row's numeric daily cells across genuine day columns — used
  // as the month total when the sheet has no pre-computed Ttl column.
  const sumDaily = (r: number, ctx: string): number => {
    let total = 0
    for (const { col } of dayColumns) {
      const cell = worksheet[XLSX.utils.encode_cell({ r, c: col })]
      if (!cell || cell.v == null || cell.v === '' || /^n[/]?a$/i.test(String(cell.v).trim())) continue
      if (isErrorCell(cell)) {
        warnings.push(`${sheetName}: ${ctx} has a broken daily cell ("${cell.w ?? cell.v}") — skipped`)
        continue
      }
      const n = typeof cell.v === 'number' ? cell.v : parseFloat(cell.w ?? cell.v)
      if (!isNaN(n)) total += n
    }
    return total
  }

  // Reads a month figure for a staff row: the Ttl column when present,
  // otherwise the sum of that row's daily columns. Per SOP: a blank cell is 0
  // sales and NA/N/A is absence (both -> 0, silent); a genuine error cell like
  // "#REF!" is flagged as a warning and counted as 0 rather than silently fudged.
  const readTotal = (r: number, ctx: string): number => {
    if (haveTtlCol) {
      const cell = worksheet[XLSX.utils.encode_cell({ r, c: monthTotalCol })]
      if (!cell || cell.v == null || cell.v === '') return 0 // blank = 0 sales
      if (isErrorCell(cell)) {
        warnings.push(`${sheetName}: ${ctx} total is "${cell.w ?? cell.v}" — unreadable, counted as 0. Please fix the sheet.`)
        return 0
      }
      if (typeof cell.v === 'number') return cell.v
      const s = String(cell.v).trim()
      if (/^n\/?a$/i.test(s)) return 0 // NA / N/A = absent
      const n = parseFloat(cell.w ?? s)
      if (!isNaN(n)) return n
      // Non-numeric, non-NA text in a totals cell is unexpected — flag it.
      warnings.push(`${sheetName}: ${ctx} total is "${s}" — not a number, counted as 0.`)
      return 0
    }
    return sumDaily(r, ctx)
  }

  // Read an individual daily count/amount safely for Beta Insights.
  const dailyNumber = (r: number, col: number): number => {
    const cell = worksheet[XLSX.utils.encode_cell({ r, c: col })]
    if (!cell || cell.v == null || cell.v === '' || isErrorCell(cell) || /^n\/?a$/i.test(String(cell.v))) return 0
    const number = typeof cell.v === 'number' ? cell.v : Number(cell.v)
    return Number.isFinite(number) ? number : 0
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
        let workingDays = 0
        const daily: DailyStaffValue[] = []
        const blankDays: number[] = []

        const who = stripEmployeeCode(name) || name
        const packages = readTotal(row - 1, `${who} (packages)`)
        const sales    = readTotal(row - 1 + salesRowOffset, `${who} (sales)`)
        const clients  = hasClientsRow ? readTotal(row, `${who} (clients)`) : 0

        // Count working days over genuine day columns only.
        // Numeric zero is a valid day worked; blank attendance is resolved
        // after the sheet-wide last-reported-day cutoff is known.
        for (const { col, day } of dayColumns) {
          const dailyCell = worksheet[
            XLSX.utils.encode_cell({ r: row - 1 + salesRowOffset, c: col })
          ]

          // Blank on a reported date is zero sales, but the reporting cutoff
          // is only known after reading all staff. Hold blanks until then.
          if (!dailyCell || dailyCell.v == null || String(dailyCell.v).trim() === '') {
            blankDays.push(day)
            continue
          }
          // NA is absent; numeric 0 is present. Broken formulas are errors.
          if (!isWorkedSalesCell(dailyCell)) continue

          workingDays++
          lastReportedDay = Math.max(lastReportedDay ?? 0, day)
          daily.push({
            day,
            sales: dailyNumber(row - 1 + salesRowOffset, col),
            packages: dailyNumber(row - 1, col),
            clients: hasClientsRow ? dailyNumber(row, col) : 0,
          })
        }

        // Fallback only when the workbook has NO daily columns at all.
        // Dated NA entries mean absence and must not invent a worked day.
        if (dayColumns.length === 0 && workingDays === 0 && sales > 0) {
          workingDays = 1
        }

        const staffEntry: StaffData = {
          name,
          packages: Math.round(packages),
          sales:    Math.round(sales * 100) / 100,
          workingDays,
          daily,
        }

        if (hasClientsRow && clients > 0) {
          staffEntry.clients = Math.round(clients)
        }

        staff.push(staffEntry)
        pendingBlankDays.push({ staff: staffEntry, days: blankDays })
      }

      row += hasClientsRow ? 3 : 2
    } else {
      row++
    }
  }

  // Flag duplicates explicitly: payout calculations will reject the roster.
  const seenNames = new Set<string>()
  const seenCodes = new Set<string>()
  for (const person of staff) {
    const nameKey = person.name.trim().toLowerCase()
    if (seenNames.has(nameKey)) warnings.push(`${sheetName}: duplicate employee row for ${person.name}; calculations are blocked until resolved.`)
    seenNames.add(nameKey)
    const code = extractEmployeeCode(person.name)
    if (code && seenCodes.has(code)) warnings.push(`${sheetName}: duplicate employee code ${code}; calculations are blocked until resolved.`)
    if (code) seenCodes.add(code)
  }

  // The entered reporting cutoff may extend an entirely zero-sales day.
  // Never allow it to silently discard an actual entered sales day.
  const detectedLastDay = lastReportedDay
  const validOverride = reportedThroughDay !== undefined &&
    Number.isInteger(reportedThroughDay) && reportedThroughDay >= 1 && reportedThroughDay <= 31
  if (reportedThroughDay !== undefined && !validOverride) {
    warnings.push(`${sheetName}: reporting cutoff must be a day from 1 to 31; automatic cutoff used.`)
  }
  if (validOverride) {
    lastReportedDay = Math.max(detectedLastDay ?? 0, reportedThroughDay!)
    if (detectedLastDay !== undefined && reportedThroughDay! < detectedLastDay) {
      warnings.push(`${sheetName}: requested cutoff day ${reportedThroughDay} is before entered sales on day ${detectedLastDay}; retaining the entered sales day.`)
    }
  } else if (dayColumns.some(({ day }) => day > (detectedLastDay ?? 0))) {
    warnings.push(`${sheetName}: blank dates after day ${detectedLastDay ?? 'unknown'} are excluded from attendance. If those dates were completed zero-sales days, set a reporting cutoff and re-upload.`)
  }

  // Count blank cells as zero-sale worked days ONLY through the reporting cutoff.
  for (const { staff: employee, days } of pendingBlankDays) {
    applyReportedBlankAttendance(employee, days, lastReportedDay)
  }

  // A sheet with staff rows but no TARGET can't produce a team achievement %.
  if (staff.length > 0 && !(target > 0)) {
    warnings.push(`${sheetName}: no TARGET value found on the sheet — team achievement can't be calculated for this month.`)
  }

  return { staff, target, warnings, lastReportedDay }
}

