import { test } from 'node:test'
import assert from 'node:assert/strict'
import { performance } from 'node:perf_hooks'
import * as XLSX from 'xlsx'
import { DEFAULT_TIERS, APP_VERSION } from '../lib/config'
import { calculateBulkReport } from '../lib/bulkCalculation'
import { buildBulkAuditCSV } from '../lib/bulkAudit'
import { validateStaffRoster } from '../lib/rosterValidation'
import { parseExcelWorkbook } from '../lib/excelUtils'

const { createGoldenXlsxBuffer } = require('./fixtures/goldenWorkbook.cjs')

test('Phase 4 audit CSV reconciles full payout and retains signed remainder', () => {
  const sheets = parseExcelWorkbook(XLSX.read(createGoldenXlsxBuffer(), { type: 'buffer' }), XLSX)
  const outcome = calculateBulkReport({ sheets: [sheets[0]], manualTarget: '',
    p1Split: 50, excludedStaff: new Set(), viewMode: 'monthly', tiers: DEFAULT_TIERS })
  assert.equal(outcome.ok, true)
  if (!outcome.ok) return
  const text = buildBulkAuditCSV(outcome.results, outcome.data, [], '2026-11-17T00:00:00.000Z')
  assert.ok(text.includes(`"Application Version","${APP_VERSION}"`))
  assert.match(text, /"Reporting Mode","monthly"/)
  assert.match(text, /"Accounting Remainder \(fils\)","-2"/)
  assert.match(text, /"Accounting Remainder \(AED\)","-0.02"/)
  assert.match(text, /"Payout Policy","accounting-remainder-v1"/)
  assert.throws(() => buildBulkAuditCSV(outcome.results, { ...outcome.data, remainderFils: 0 }, [], '2026-11-17T00:00:00.000Z'), /Remainder/)
})

test('Phase 4 roster guard rejects duplicate names, duplicate codes and corrupt fields', () => {
  const valid = { name: 'Sample AE01-111', sales: 120, packages: 2, workingDays: 3 }
  assert.equal(validateStaffRoster([valid]), null)
  assert.match(validateStaffRoster([valid, { ...valid, name: 'Sample AE01-111' }]) ?? '', /Duplicate employee/)
  assert.match(validateStaffRoster([valid, { ...valid, name: 'Different AE01-111' }]) ?? '', /Duplicate employee code/)
  assert.match(validateStaffRoster([{ ...valid, sales: NaN }]) ?? '', /Invalid/)
  assert.match(validateStaffRoster([{ ...valid, workingDays: -1 }]) ?? '', /Invalid/)
  assert.match(validateStaffRoster([{ ...valid, clients: 1.5 }]) ?? '', /Invalid/)
})

test('Phase 4 rejects duplicate roster from actual SheetJS worksheet', () => {
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ['TARGET', 200], [], [null, null, null, 1],
    ['One AE01-111', 'Count of Packages', null, 1],
    [null, 'Sum of Sales', null, 100],
    ['Two AE01-111', 'Count of Packages', null, 1],
    [null, 'Sum of Sales', null, 100],
    ['Grand totals'],
  ]), 'Nov 26')
  const [sheet] = parseExcelWorkbook(wb, XLSX)
  assert.ok(sheet.warnings?.some(w => w.includes('duplicate employee code')))
  const outcome = calculateBulkReport({ sheets: [sheet], manualTarget: '',
    p1Split: 50, excludedStaff: new Set(), viewMode: 'monthly', tiers: DEFAULT_TIERS })
  assert.equal(outcome.ok, false)
  if (!outcome.ok) assert.match(outcome.error, /Duplicate employee code/)
})

test('Phase 4 bounded synthetic calculation smoke with 750 staff', () => {
  const staff = Array.from({ length: 750 }, (_, i) => ({
    name: `Test Employee ${i + 1} AE${String(Math.floor(i / 1000)).padStart(2, '0')}-${String(i).padStart(3, '0')}`,
    sales: i % 3 === 0 ? 0 : 150, packages: i % 5, workingDays: 20, clients: i % 6,
  }))
  const sheet = { sheetName: 'Nov 26', staff, target: 100000,
    teamTotal: { sales: staff.reduce((sum, p) => sum + p.sales, 0),
      packages: staff.reduce((sum, p) => sum + p.packages, 0) } }
  const start = performance.now()
  const outcome = calculateBulkReport({ sheets: [sheet], manualTarget: '',
    p1Split: 50, excludedStaff: new Set(), viewMode: 'monthly', tiers: DEFAULT_TIERS })
  const duration = performance.now() - start
  assert.equal(outcome.ok, true)
  if (outcome.ok) assert.equal(outcome.results.length, 750)
  // Deliberately generous regression limit for noisy hosted CI, not a product SLA.
  assert.ok(duration < 10000, `Synthetic 750-staff calculation took ${duration.toFixed(1)}ms`)
})
