import { test } from 'node:test'
import assert from 'node:assert/strict'
import * as XLSX from 'xlsx'
import { parseExcelWorkbook, getAvailableMonths, pickDefaultMonth, aggregateSheets,
  isWorkedSalesCell, extractEmployeeCode } from '../lib/excelUtils.ts'
import { nextBulkTierInfo, bulkCenterStats } from '../lib/bulkPresentation.ts'
import { calculateBulkReport } from '../lib/bulkCalculation.ts'
import { DEFAULT_TIERS, CENTERS } from '../lib/config.ts'

const { createGoldenXlsxBuffer } = require('./fixtures/goldenWorkbook.cjs')
const months=()=>parseExcelWorkbook(XLSX.read(createGoldenXlsxBuffer(),{type:'buffer'}),XLSX)

test('Phase 3 split workbook modules preserve public facade API and golden parsing',()=>{
  const data=months()
  assert.deepEqual(getAvailableMonths(data),['Nov 26','Dec 26'])
  assert.deepEqual(pickDefaultMonth(data,new Date('2026-11-16T12:00:00Z')),{month:'Nov',year:'26'})
  assert.equal(aggregateSheets(data).teamTotal.sales,220)
  assert.equal(extractEmployeeCode('Amir AE01-227'),'AE01-227')
  assert.equal(isWorkedSalesCell(undefined,true),true)
  assert.equal(isWorkedSalesCell({v:'NA'},true),false)
  assert.equal(data[0].staff[0].workingDays,2)
})

test('Phase 3 pure tier and center presentation models retain expected amounts',()=>{
  const outcome=calculateBulkReport({
    sheets:[months()[0]],manualTarget:'',p1Split:50,
    excludedStaff:new Set<string>(),viewMode:'monthly',tiers:DEFAULT_TIERS,
  })
  if(!outcome.ok)throw Error('Golden bulk calculation failed')
  const tier=nextBulkTierInfo(outcome.data,DEFAULT_TIERS)
  assert.ok(tier)
  assert.equal(tier.isMaxTier,false)
  if(!tier.isMaxTier){
    assert.equal(tier.nextTierName, 'Tier 2')
    assert.equal(tier.requiredPercentage,101)
  }
  const mappings={'AE01-227':'C','AE02-138':'I','AE03-101':'D'}
  const centers=bulkCenterStats(outcome.results,outcome.data,mappings,CENTERS,extractEmployeeCode)
  assert.ok(centers)
  assert.equal(centers.unassigned,0)
  assert.equal(centers.rows.reduce((sum,p)=>sum+p.sales,0),100)
  assert.equal(Math.round(centers.rows.reduce((sum,p)=>sum+p.revenuePct,0)),100)
  assert.equal(bulkCenterStats([],null,mappings,CENTERS,extractEmployeeCode),null)
})
