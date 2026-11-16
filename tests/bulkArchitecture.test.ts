import { test } from 'node:test'
import assert from 'node:assert/strict'
import * as XLSX from 'xlsx'
import { parseExcelWorkbook } from '../lib/excelUtils.ts'
import { calculateBulkReport, selectBulkSheets } from '../lib/bulkCalculation.ts'
import { buildBulkCSV } from '../lib/bulkCsv.ts'
import { DEFAULT_TIERS } from '../lib/config.ts'

const { createGoldenXlsxBuffer } = require('./fixtures/goldenWorkbook.cjs')
function fixtures(){
  return parseExcelWorkbook(XLSX.read(createGoldenXlsxBuffer(),{type:'buffer'}),XLSX)
}
const calculate=(sheet:ReturnType<typeof fixtures>[number],exclude=new Set<string>(),target='')=>
  calculateBulkReport({
    sheets:[sheet],manualTarget:target,p1Split:50,excludedStaff:exclude,
    viewMode:'monthly',tiers:DEFAULT_TIERS,
  })

test('Phase 3 pure selector preserves month, quarter, year and alltime behavior',()=>{
  const sheets=fixtures()
  assert.deepEqual(selectBulkSheets(sheets,'monthly','Nov','26').map(s=>s.sheetName),['Nov 26'])
  assert.deepEqual(selectBulkSheets(sheets,'q4','Nov','26').map(s=>s.sheetName),['Nov 26','Dec 26'])
  assert.deepEqual(selectBulkSheets(sheets,'yearly','Nov','26').map(s=>s.sheetName),['Nov 26','Dec 26'])
  assert.equal(selectBulkSheets(sheets,'q1','Nov','26').length,0)
  assert.equal(selectBulkSheets(sheets,'alltime','Nov','26').length,2)
})

test('Phase 3 bulk service preserves golden payout, metadata and signed accounting remainder',()=>{
  const result=calculate(fixtures()[0])
  assert.equal(result.ok,true)
  if(!result.ok)return
  assert.equal(result.data.totalPool,2.50)
  assert.equal(result.data.staffTotalFils,252)
  assert.equal(result.data.remainderFils,-2)
  assert.equal(result.data.staffCount,3)
  assert.equal(result.data.target,100)
  assert.equal(result.data.teamSales,100)
  assert.deepEqual(result.results.map(p=>[p.name,p.p1,p.p2,p.totalIncentive]),[
    ['Amir AE01-227',.42,.5,.92],
    ['Cora AE03-101',.42,.38,.8],
    ['Bela AE02-138',.42,.38,.8],
  ])
  assert.equal(result.results[0].avgSalesPerDay,40/3)
  const csv=buildBulkCSV(result.results,result.data)
  assert.match(csv,/"Accounting Remainder \(AED\)","-0.02"/)
  assert.match(csv,/"Total Staff Payouts \(AED\)","2.52"/)
  assert.match(csv,/"Amir AE01-227"/)
})

test('Phase 3 bulk service recomputes manual target and exclusion without React',()=>{
  const november=fixtures()[0]
  const inactive=calculate(november,new Set(['Bela AE02-138']))
  assert.equal(inactive.ok,true)
  if(inactive.ok){
    assert.equal(inactive.data.teamSales,70)
    assert.equal(inactive.data.totalPool,0)
    assert.equal(inactive.data.excludedCount,1)
    assert.equal(inactive.results.length,2)
  }
  const zero=calculate(november,new Set(),'120')
  assert.equal(zero.ok,true)
  if(zero.ok)assert.equal(zero.data.totalPool,0)
})

test('Phase 3 fail-closed inputs never yield exportable results',()=>{
  const november=fixtures()[0]
  for(const invalid of ['Infinity','abc','0','-5']){
    const result=calculate(november,new Set(),invalid)
    assert.equal(result.ok,false,invalid)
  }
  const empty=calculateBulkReport({
    sheets:[],manualTarget:'',p1Split:50,
    excludedStaff:new Set<string>(),viewMode:'monthly',tiers:DEFAULT_TIERS,
  })
  assert.equal(empty.ok,false)
  assert.equal(calculate(november,new Set(november.staff.map(p=>p.name))).ok,false)
})

test('Phase 3 CSV composition rejects tampered remainder and protects spreadsheet formula names',()=>{
  const result=calculate(fixtures()[0])
  if(!result.ok)throw Error('Golden calculation failed')
  assert.throws(()=>buildBulkCSV(result.results,{...result.data,remainderFils:0}),/Remainder/)
  assert.throws(()=>buildBulkCSV([] ,result.data),/empty/)
  const mutated=result.results.map((person,i)=>i===0 ? {...person,name:'=HYPERLINK("bad")'}:person)
  const csv=buildBulkCSV(mutated,result.data)
  assert.match(csv,/"'=HYPERLINK\(""bad""\)"/)
})
