import { test } from 'node:test'
import assert from 'node:assert/strict'
import * as XLSX from 'xlsx'
import { parseExcelWorkbook, aggregateSheets } from '../lib/excelUtils.ts'
import { calculateTeamIncentives } from '../lib/teamIncentives.ts'
import { auditRoundedIncentives } from '../lib/incentiveAudit.ts'
import { HISTORICAL_LEGACY_TIERS } from './fixtures/historicalTiers.ts'
import { accountingExportRows, accountingSummaryCSV } from '../lib/accountingExport.ts'
import { formattedPayout } from '../lib/reportPayout.ts'

interface GoldenStaff {
  name: string
  sales: number
  workingDays: number
  p1: number
  p2: number
  total: number
}
interface GoldenMonth {
  sheetName: string
  target: number
  expected: {
    lastReportedDay: number
    teamSales: number
    teamPackages: number
    staff: GoldenStaff[]
    poolFils: number
    staffTotalFils: number
    remainderFils: number
  }
}
const { manifest, createGoldenXlsxBuffer } = require('./fixtures/goldenWorkbook.cjs') as {
  manifest: { months: GoldenMonth[] }
  createGoldenXlsxBuffer: () => Buffer
}

/**
 * Independent expected values live in the checked-in JSON.
 * The test never regenerates expected payouts using the app's formulas.
 */
test('golden XLSX fixture: independently specified attendance, sales, P1/P2 and signed accounting remainder', () => {
  const bytes = createGoldenXlsxBuffer()
  const workbook = XLSX.read(bytes, { type: 'buffer' })
  const months = parseExcelWorkbook(workbook, XLSX)
  assert.equal(months.length, manifest.months.length)
  for (const expectedMonth of manifest.months) {
    const month = months.find(m => m.sheetName === expectedMonth.sheetName)
    assert.ok(month, expectedMonth.sheetName)
    assert.equal(month.target, expectedMonth.target)
    assert.equal(month.lastReportedDay, expectedMonth.expected.lastReportedDay)
    assert.equal(month.teamTotal.sales, expectedMonth.expected.teamSales)
    assert.equal(month.teamTotal.packages, expectedMonth.expected.teamPackages)
    assert.deepEqual(month.staff.map(p => ({
      name:p.name, sales:p.sales, workingDays:p.workingDays,
    })),expectedMonth.expected.staff.map(p=>({
      name:p.name,sales:p.sales,workingDays:p.workingDays,
    })))
    const payout = calculateTeamIncentives(month.target, month.staff, 50, HISTORICAL_LEGACY_TIERS)
    assert.equal(payout.ok,true)
    if (!payout.ok) continue
    assert.equal(payout.value.poolFils, expectedMonth.expected.poolFils)
    assert.equal(payout.value.staffTotalFils, expectedMonth.expected.staffTotalFils)
    assert.equal(payout.value.remainderFils, expectedMonth.expected.remainderFils)
    assert.deepEqual(payout.value.staff.map(p=>({
      name:p.name,sales:p.sales,p1:p.p1,p2:p.p2,total:p.totalIncentive,
    })),expectedMonth.expected.staff.map(p=>({
      name:p.name,sales:p.sales,p1:p.p1,p2:p.p2,total:p.total,
    })))
    assert.equal(auditRoundedIncentives(
      month.teamTotal.sales,payout.value.pool,payout.value.p1Pool,payout.value.p2Pool,
      payout.value.staff,payout.value.remainderFils,
    ),null)
    const summary = accountingExportRows({
      totalPool:payout.value.pool, staffTotalFils:payout.value.staffTotalFils,
      remainderFils:payout.value.remainderFils,
    })
    assert.equal(summary[2][1], (payout.value.remainderFils/100).toFixed(2))
    assert.ok(accountingSummaryCSV({
      totalPool:payout.value.pool,
      staffTotalFils:payout.value.staffTotalFils,
      remainderFils:payout.value.remainderFils,
    }).includes('Accounting Remainder (AED)'))
    assert.deepEqual(payout.value.staff.map(formattedPayout).map(x=>Number(x.total)),
      expectedMonth.expected.staff.map(x=>x.total))
  }
})

test('golden workbook: chronological multi-month aggregation does not alter source sheets',()=>{
  const months = parseExcelWorkbook(XLSX.read(createGoldenXlsxBuffer(),{type:'buffer'}),XLSX)
  assert.deepEqual(months.map(m=>m.sheetName), ['Nov 26','Dec 26'])
  const aggregate=aggregateSheets(months)
  assert.equal(aggregate.target,200)
  assert.equal(aggregate.teamTotal.sales,220)
  assert.equal(aggregate.staff.length,5)
  assert.equal(months[0].teamTotal.sales,100)
})

test('golden workbook: exclusions and manual targets cannot silently retain previous payouts',()=>{
  const months=parseExcelWorkbook(XLSX.read(createGoldenXlsxBuffer(),{type:'buffer'}),XLSX)
  const november=months[0]
  const withoutBela=calculateTeamIncentives(100,november.staff.filter(p=>!p.name.startsWith('Bela')),50,HISTORICAL_LEGACY_TIERS)
  assert.equal(withoutBela.ok,true)
  if(withoutBela.ok){
    assert.equal(withoutBela.value.poolFils,0)
    assert.equal(withoutBela.value.remainderFils,0)
  }
  const overridden=calculateTeamIncentives(120,november.staff,50,HISTORICAL_LEGACY_TIERS)
  assert.equal(overridden.ok,true)
  if(overridden.ok)assert.equal(overridden.value.poolFils,0)
})
