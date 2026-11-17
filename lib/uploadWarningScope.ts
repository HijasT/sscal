import type { ExcelData } from './excelTypes'
import { SHORT_MONTHS } from './excelSheetNames'

/** Only the current and immediately preceding calendar months trigger upload alerts.
 * Older warnings remain accessible via the review button.
 */
export function isRecentWarningMonth(sheetName: string, now: Date = new Date()): boolean {
  if (Number.isNaN(now.getTime())) return false
  const match = sheetName.trim().match(/^([A-Za-z]+)\s*(\d{2}|\d{4})$/)
  if (!match) return false
  const idx = SHORT_MONTHS.findIndex(m => m.toLowerCase() === match[1].toLowerCase())
  if (idx < 0) return false
  const year = match[2].length === 2 ? 2000 + Number(match[2]) : Number(match[2])
  const monthIndex = year * 12 + idx
  const currentIndex = now.getFullYear() * 12 + now.getMonth()
  return monthIndex === currentIndex || monthIndex === currentIndex - 1
}

export function scopeUploadWarnings(sheets: readonly ExcelData[], now: Date = new Date()): {
  recent: string[]
  older: string[]
} {
  const recent: string[] = []
  const older: string[] = []
  for (const sheet of sheets) {
    const destination = isRecentWarningMonth(sheet.sheetName, now) ? recent : older
    destination.push(...(sheet.warnings ?? []))
  }
  return { recent, older }
}
