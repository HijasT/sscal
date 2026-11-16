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

test('explicit cutoff can include completed all-zero days without counting NA', () => {
  const workbook = buildWorkbook([
    ['TARGET', 100], [],
    [null, null, null, 1, 2, 3, 4],
    ['A AE01-227', 'Count of Packages', null, 1, 0, 0, 0],
    [null, 'Sum of Sales', null, 40, null, null, null],
    ['B AE02-138', 'Count of Packages', null, 1, 0, 0, 0],
    [null, 'Sum of Sales', null, 20, 'NA', null, null],
    ['Grand totals'],
  ])
  const [automatic] = parseExcelWorkbook(workbook, XLSX)
  assert.equal(automatic.lastReportedDay, 1)
  assert.deepEqual(automatic.staff.map(s => s.workingDays), [1, 1])
  assert.ok(automatic.warnings?.some(w => w.includes('blank dates after day 1')))

  const [confirmed] = parseExcelWorkbook(workbook, XLSX, 3)
  assert.equal(confirmed.lastReportedDay, 3)
  assert.deepEqual(confirmed.staff.map(s => s.workingDays), [3, 2])
  assert.equal(confirmed.teamTotal.sales, automatic.teamTotal.sales)
  assert.deepEqual(confirmed.staff[0].daily?.map(d => d.day), [1, 2, 3])
  assert.deepEqual(confirmed.staff[1].daily?.map(d => d.day), [1, 3])
})

test('manual cutoff cannot discard later explicitly entered sales', () => {
  const workbook = buildWorkbook([
    ['TARGET', 100], [],
    [null, null, null, 1, 2, 3],
    ['A AE01-227', 'Count of Packages', null, 1, 0, 1],
    [null, 'Sum of Sales', null, 40, null, 50],
    ['Grand totals'],
  ])
  const [month] = parseExcelWorkbook(workbook, XLSX, 1)
  assert.equal(month.lastReportedDay, 3)
  assert.equal(month.staff[0].workingDays, 3)
  assert.ok(month.warnings?.some(w => w.includes('before entered sales')))
})

test('manual cutoff only affects the newest sheet in a multi-month workbook', () => {
  const first = [
    ['TARGET', 100], [],
    [null, null, null, 1, 2, 3],
    ['A AE01-227', 'Count of Packages', null, 1, 0, 0],
    [null, 'Sum of Sales', null, 20, null, null],
    ['Grand totals'],
  ]
  const workbook = buildWorkbook(first, 'Sep 26')
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(first), 'Oct 26')
  const [sep, oct] = parseExcelWorkbook(workbook, XLSX, 3)
  assert.equal(sep.lastReportedDay, 1)
  assert.equal(sep.staff[0].workingDays, 1)
  assert.equal(oct.lastReportedDay, 3)
  assert.equal(oct.staff[0].workingDays, 3)
})
