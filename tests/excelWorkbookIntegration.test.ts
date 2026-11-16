import { test } from 'node:test'
import assert from 'node:assert/strict'
import * as XLSX from 'xlsx'
import { parseExcelWorkbook } from '../lib/excelUtils.ts'
import { calculateIncentive } from '../lib/utils.ts'
import { DEFAULT_TIERS } from '../lib/config.ts'
import { auditIncentivePayouts } from '../lib/incentiveAudit.ts'

function buildWorkbook(rows: unknown[][], month = 'Nov 26') {
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), month)
  return workbook
}

test('real SheetJS workbook: blank is attended zero, NA absent, zero present; future blanks excluded', () => {
  const workbook = buildWorkbook([
    ['TARGET', 200],
    [],
    [null, null, null, 1, 2, 3, 4, 5],
    ['Example A AE01-227', 'Count of Packages', null, 0, 'NA', null, 1, null],
    [null, 'Sum of Sales', null, 0, 'NA', null, 120, null],
    ['Example B AE02-138', 'Count of Packages', null, 1, 1, 0, null, null],
    [null, 'Sum of Sales', null, 35, 100, 0, null, null],
    ['Grand totals'],
  ])
  // Exercise actual xlsx writing + reading, not only hand-built sheet objects.
  const bytes = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
  const read = XLSX.read(bytes, { type: 'buffer' })
  const [month] = parseExcelWorkbook(read, XLSX)
  assert.equal(month.sheetName, 'Nov 26')
  assert.equal(month.target, 200)
  assert.equal(month.lastReportedDay, 4)
  assert.equal(month.teamTotal.sales, 255)
  const [a, b] = month.staff
  assert.equal(a.sales, 120)
  assert.equal(a.workingDays, 3)
  assert.deepEqual(a.daily?.map(d => [d.day, d.sales]), [[1,0],[3,0],[4,120]])
  assert.equal(b.sales, 135)
  assert.equal(b.workingDays, 4)
  assert.deepEqual(b.daily?.map(d => [d.day, d.sales]), [[1,35],[2,100],[3,0],[4,0]])
  const sales = month.staff.reduce((sum, p) => sum + p.sales, 0)
  const incentiveRows = month.staff.map(person => {
    const result = calculateIncentive(month.target, sales, person.sales, month.staff.length, 50, DEFAULT_TIERS)
    assert.equal(result.error, undefined)
    return { sales: person.sales, p1: result.myP1, p2: result.myP2, totalIncentive: result.myTotal }
  })
  const pool = sales * 0.035
  assert.equal(auditIncentivePayouts(sales, pool, incentiveRows), null)
})

test('SheetJS new-format client count row preserves client totals and sale attendance', () => {
  const workbook = buildWorkbook([
    ['TARGET', 100],
    [],
    [null, null, null, 1, 2, 3],
    ['Example A AE01-227', 'Count of Packages', null, 2, 0, null],
    [null, 'Count of Clients', null, 3, 0, null],
    [null, 'Sum of Sales', null, 80, 0, null],
    ['Example B AE02-138', 'Count of Packages', null, 0, 0, 'NA'],
    [null, 'Count of Clients', null, 0, 0, 'NA'],
    [null, 'Sum of Sales', null, 0, 0, 'NA'],
    ['Grand totals'],
  ])
  const [month] = parseExcelWorkbook(workbook, XLSX)
  assert.equal(month.lastReportedDay, 2)
  assert.deepEqual(month.staff.map(p => p.workingDays), [2,2])
  assert.deepEqual(month.staff.map(p => p.clients), [3,undefined])
  assert.equal(month.staff[0].sales, 80)
  assert.deepEqual(month.staff[0].daily?.map(d => [d.day,d.sales]), [[1,80],[2,0]])
})

test('SheetJS error formulas cannot count as attendance and surface data warnings', () => {
  const workbook = buildWorkbook([
    ['TARGET', 100],
    [],
    [null, null, null, 1, 2],
    ['Example AE01-227', 'Count of Packages', null, 0, 0],
    [null, 'Sum of Sales', null, '#REF!', 30],
    ['Grand totals'],
  ])
  const [month] = parseExcelWorkbook(workbook, XLSX)
  assert.equal(month.staff[0].workingDays, 1)
  assert.equal(month.staff[0].sales, 30)
  assert.ok((month.warnings ?? []).some(w => w.includes('broken daily cell')))
})

test('all-NA/blank workbook has no inferred cutoff and does not invent worked days', () => {
  const workbook = buildWorkbook([
    ['TARGET', 100],
    [],
    [null, null, null, 1, 2, 3],
    ['Example AE01-227', 'Count of Packages', null, 0, 0, 0],
    [null, 'Sum of Sales', null, 'NA', null, null],
    ['Grand totals'],
  ])
  const [month] = parseExcelWorkbook(workbook, XLSX)
  assert.equal(month.lastReportedDay, undefined)
  assert.equal(month.staff[0].workingDays, 0)
})
