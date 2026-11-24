import { test } from 'node:test'
import assert from 'node:assert/strict'
import { calculateBulkReport } from '../lib/bulkCalculation'
import { auditLegacyBonusLedger } from '../lib/legacyBonus'
import { buildBulkCSV } from '../lib/bulkCsv'
import { buildBulkAuditCSV } from '../lib/bulkAudit'

const result=()=>calculateBulkReport({
  sheets:[{sheetName:'Nov 26',target:40000,
   staff:[{name:'A',sales:30000,packages:3,workingDays:10},
          {name:'B',sales:20000,packages:2,workingDays:10}],
   teamTotal:{sales:50000,packages:5}}],
  manualTarget:'',p1Split:50,excludedStaff:new Set<string>(),viewMode:'monthly',
})
test('Legacy retains unchanged P1/P2 pool while the employee total includes separate Dubai It bonus',()=>{
 const outcome=result();assert.equal(outcome.ok,true)
 if(!outcome.ok)return
 const ledger={'A':{count:1,amount:500},'B':{count:0,amount:0}}
 const summary=auditLegacyBonusLedger(outcome.results,outcome.data,ledger)
 const person=outcome.results.find(r=>r.name==='A')!
 assert.equal(summary.totalBonusFils,50000)
 assert.equal(summary.grandTotalFils,outcome.data.staffTotalFils+50000)
 assert.equal(summary.byEmployee.get('A')!.totalFils,Math.round(person.totalIncentive*100)+50000)
 assert.equal(person.totalIncentive,person.p1+person.p2)
 const csv=buildBulkCSV(outcome.results,outcome.data,ledger)
 assert.match(csv,/Dubai It Bonus \(AED\)/)
 assert.match(csv,/"Dubai It Bonus Total \(AED\)","500.00"/)
 assert.match(csv,/Grand Total Incl\. Bonus/)
 const aRow=csv.split('\n').find(x=>x.includes('"A"'))!
 assert.equal(aRow.split(',').at(-2),'500.00')
 assert.equal(aRow.split(',').at(-1),((summary.byEmployee.get('A')!.totalFils)/100).toFixed(2))
 const audit=buildBulkAuditCSV(outcome.results,outcome.data,[],'2026-11-18T00:00:00.000Z',ledger)
 assert.match(audit,/"Dubai It Bonuses \(fils\)","50000"/)
 assert.match(audit,/"Total Staff Payouts Incl\. Bonus \(fils\)"/)
 assert.equal(buildBulkCSV(outcome.results,outcome.data).includes('Dubai It Bonus (AED)'),false)
})
test('Legacy bonus export fails closed for unverified roster, bad counts or bonus below threshold',()=>{
 const outcome=result();assert.equal(outcome.ok,true)
 if(!outcome.ok)return
 assert.throws(()=>buildBulkCSV(outcome.results,outcome.data,{'A':{count:1,amount:500}}),/roster/)
 assert.throws(()=>buildBulkCSV(outcome.results,outcome.data,{'A':{count:4,amount:500},'B':{count:0,amount:0}}),/Invalid Dubai It/)
 const subthreshold=calculateBulkReport({
 sheets:[{sheetName:'Nov 26',target:100000,staff:[{name:'A',sales:10000,packages:1,workingDays:2}],
 teamTotal:{sales:10000,packages:1}}],manualTarget:'',p1Split:50,excludedStaff:new Set(),viewMode:'monthly',
 })
 assert.equal(subthreshold.ok,true)
 if(subthreshold.ok)assert.throws(()=>buildBulkCSV(subthreshold.results,subthreshold.data,{'A':{count:1,amount:500}}),/qualification/)
})

test('October 2026 Legacy gives AED 500 per discounted Dubai It even below 80% achievement',()=>{
 const outcome=calculateBulkReport({
   sheets:[{sheetName:'Oct 26',target:100000,staff:[
     {name:'A',sales:18700,packages:2,workingDays:2}
   ],teamTotal:{sales:18700,packages:2}}],
   manualTarget:'',p1Split:50,excludedStaff:new Set<string>(),viewMode:'monthly',
 })
 assert.equal(outcome.ok,true)
 if(!outcome.ok)return
 assert.ok(outcome.data.teamAchievement<80)
 const ledger={'A':{count:2,discountedCount:2,amount:1000}}
 const audited=auditLegacyBonusLedger(outcome.results,outcome.data,ledger)
 assert.equal(audited.byEmployee.get('A')?.amountFils,100000)
 assert.equal(audited.grandTotalFils,outcome.data.staffTotalFils+100000)
 const csv=buildBulkCSV(outcome.results,outcome.data,ledger)
 assert.match(csv,/"Dubai It Bonus Total \(AED\)","1000.00"/)
 assert.throws(()=>auditLegacyBonusLedger(outcome.results,outcome.data,{
  A:{count:2,discountedCount:2,amount:500},
 }),/qualification/)
 assert.throws(()=>auditLegacyBonusLedger(outcome.results,outcome.data,{
  A:{count:3,discountedCount:3,amount:1500},
 }),/Invalid Dubai It/)
})
test('October discounts are not permitted in other months or non-monthly reports',()=>{
 const outcome=result()
 assert.equal(outcome.ok,true)
 if(!outcome.ok)return
 assert.throws(()=>auditLegacyBonusLedger(outcome.results,outcome.data,{
  A:{count:1,discountedCount:1,amount:500},B:{count:0,amount:0},
 }),/Invalid Dubai It/)
})
