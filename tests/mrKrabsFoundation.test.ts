import { test } from 'node:test'
import assert from 'node:assert/strict'
import * as XLSX from 'xlsx'
import { inspectDubaiItCell } from '../lib/dubaiItDetection'
import { parseExcelWorkbook } from '../lib/excelUtils'
import { inferJoinerEligibility } from '../lib/joinerInference'
import { previewMrKrabs } from '../lib/mrKrabsPreview'

test('package-price additive parser counts only standalone 10000 sales', () => {
  const detected = inspectDubaiItCell({ f:'1000+10000+1695+10000', v:22695 }, 20, 'AJ21')
  assert.equal(detected?.detected, 2)
  assert.equal(detected?.status,'verified')
  assert.equal(inspectDubaiItCell({f:'100000+1000',v:101000},1,'D1')?.detected,0)
  assert.equal(inspectDubaiItCell({f:'10000*2',v:20000},1,'D2')?.status,'review')
  assert.equal(inspectDubaiItCell({v:10000},1,'D3')?.status,'review')
  assert.equal(inspectDubaiItCell({f:'10000+1695',v:10000},1,'D4')?.status,'review')
  assert.equal(inspectDubaiItCell({v:0},1,'D5'),null)
  assert.equal(inspectDubaiItCell({v:'NA'},1,'D6'),null)
})

function month(name: string, staff: Array<[string, number[], (number | 'NA' | null)[]]>) {
  const rows: unknown[][] = [['TARGET',100000], [], [null,null,null,1,2,3,4,5,6]]
  for (const [label, packages, sales] of staff) {
    rows.push([label,'Count of Packages',null,...packages])
    rows.push([null,'Sum of Sales',null,...sales])
  }
  rows.push(['Grand totals'])
  const book = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(book,XLSX.utils.aoa_to_sheet(rows),name)
  return book.Sheets[name]
}

test('real XLSX formula parsing retains address and detects two Dubai It items', () => {
  const sheet = month('Nov 26', [['New AE02-138',[0,1,0,0,0,0],['NA',22695,null,null,null,null]]])
  sheet['E5'] = { t:'n', f:'1000+10000+1695+10000',v:22695 }
  const [parsed] = parseExcelWorkbook({SheetNames:['Nov 26'],Sheets:{'Nov 26':sheet}},XLSX)
  assert.equal(parsed.staff[0].dubaiItCells?.[0].address,'E5')
  assert.equal(parsed.staff[0].dubaiItCells?.[0].detected,2)
  assert.equal(parsed.staff[0].firstExplicitWorkedDay,2)
})

test('new joiner detection requires previous month and explicit first zero or sale', () => {
  const oct = month('Oct 26', [['Existing AE01-101',[1,1,1,1,1,1],[0,0,0,0,0,0]]])
  const nov = month('Nov 26', [
    ['Existing AE01-101',[1,1,1,1,1,1],[0,0,0,0,0,0]],
    ['New AE02-138',[0,0,0,1,1,1],['NA','NA','NA',0,1500,null]],
  ])
  const sheets = parseExcelWorkbook({ SheetNames:['Oct 26','Nov 26'],
    Sheets:{'Oct 26':oct,'Nov 26':nov} },XLSX)
  const result=inferJoinerEligibility(sheets[1],sheets)
  assert.equal(result[0].status,'existing')
  assert.equal(result[0].inferredEligibleDays,30)
  assert.equal(result[1].status,'potential-new-joiner')
  assert.equal(result[1].firstRecordedDay,4)
  assert.equal(result[1].inferredEligibleDays,27)
  assert.equal(inferJoinerEligibility(sheets[1],[sheets[1]])[1].status,'missing-previous-month')
})

test('Mr Krabs preview uses total sales for tier and P2, excludes full-price package revenue', () => {
  const outcome = previewMrKrabs({period:'Nov 26',daysInMonth:30,teamTarget:100000,
    bonusAed:500,staff:[
      {name:'A',sales:70000,fullPriceDubaiItCount:2,eligibleCalendarDays:30,isExistingStaff:true},
      {name:'B',sales:40000,fullPriceDubaiItCount:0,eligibleCalendarDays:15,isExistingStaff:false},
    ]})
  assert.equal(outcome.ok,true)
  if (!outcome.ok) return
  assert.equal(outcome.rate,3.5)
  assert.equal(outcome.eligibleRevenue,90000)
  assert.equal(outcome.pool,3150)
  assert.equal(outcome.p1Pool,1575)
  assert.equal(outcome.p2Pool,1575)
  assert.equal(outcome.staff[0].dubaiItBonus,1000)
  assert.ok(Math.abs(outcome.staff[0].p2BeforeProrata-1575 * 70000 / 110000) < 0.000001)
  assert.equal(outcome.staff[1].p1AfterProrata,1575 / 2 / 2)
  assert.equal(outcome.status,'comparison-only')
  assert.ok(outcome.staff[0].redistributedP1 > 0)
  assert.equal(outcome.staff[1].redistributedP1, 0)
  assert.equal(outcome.staff[1].redistributedP2, 0)
  assert.ok(outcome.staff[0].redistributedP2 > 0)
  assert.equal(outcome.accountingRemainderFils,Math.round(outcome.pool*100)-outcome.staff.reduce((sum,p)=>sum+Math.round(p.p1*100)+Math.round(p.p2*100),0))
  assert.equal(previewMrKrabs({period:'Oct 26',daysInMonth:31,teamTarget:100000,
    bonusAed:500,staff:[{name:'A',sales:10000,fullPriceDubaiItCount:1,eligibleCalendarDays:31,isExistingStaff:true}]}).ok,false)
})

test('pro-rata redistribution is single pass and conserves 50/50 pool within rounding remainder', () => {
 const o=previewMrKrabs({period:'Nov 26',daysInMonth:30,teamTarget:100000,bonusAed:500,
 staff:[
 {name:'Full',sales:60000,fullPriceDubaiItCount:2,eligibleCalendarDays:30,isExistingStaff:true},
 {name:'Joiner',sales:30000,fullPriceDubaiItCount:1,eligibleCalendarDays:15,isExistingStaff:false},
 {name:'Zero eligible',sales:10000,fullPriceDubaiItCount:0,eligibleCalendarDays:0,isExistingStaff:true}
 ]})
 assert.equal(o.ok,true)
 if(!o.ok)return
 assert.equal(o.rate,3)
 assert.equal(o.eligibleRevenue,70000)
 assert.equal(o.pool,2100)
 assert.equal(o.staff[2].p1,0)
 assert.equal(o.staff[2].p2,0)
 assert.equal(o.staff[2].dubaiItBonus,0)
 assert.ok(o.staff[0].redistributedP1>0)
 assert.equal(o.staff[1].redistributedP1,0)
 assert.ok(o.staff[0].redistributedP2>0)
 assert.equal(o.staff[1].redistributedP2,0)
 assert.equal(o.accountingRemainderFils,210000-o.staff.reduce((sum,p)=>sum+Math.round(p.p1*100)+Math.round(p.p2*100),0))
 assert.equal(o.staff.reduce((sum,p)=>Math.round(sum+p.dubaiItBonus),0),1500)
})
test('below 80 percent achievement yields no team or Dubai It bonus',()=>{
 const o=previewMrKrabs({period:'Dec 26',daysInMonth:31,teamTarget:100000,bonusAed:500,staff:[
 {name:'A',sales:70000,fullPriceDubaiItCount:1,eligibleCalendarDays:31,isExistingStaff:true}
 ]})
 assert.equal(o.ok,true)
 if(!o.ok)return
 assert.equal(o.pool,0)
 assert.equal(o.staff[0].totalIncentive,0)
})

test('redistribution never pays new joiners even when they have eligible days and sales', () => {
 const out=previewMrKrabs({period:'Nov 26', daysInMonth:30, teamTarget:100000, bonusAed:500,staff:[
 {name:'Old A',sales:55000,fullPriceDubaiItCount:0,eligibleCalendarDays:30,isExistingStaff:true},
 {name:'Old B',sales:35000,fullPriceDubaiItCount:0,eligibleCalendarDays:30,isExistingStaff:true},
 {name:'New',sales:10000,fullPriceDubaiItCount:0,eligibleCalendarDays:15,isExistingStaff:false},
 ]})
 assert.equal(out.ok,true)
 if (!out.ok) return
 const [a,b,n]=out.staff
 assert.equal(n.redistributedP1,0)
 assert.equal(n.redistributedP2,0)
 assert.equal(a.redistributedP1,b.redistributedP1)
 assert.ok(a.redistributedP2>b.redistributedP2)
 assert.equal(n.p1,Math.round(n.p1AfterProrata*100)/100)
 assert.equal(n.p2,Math.round(n.p2AfterProrata*100)/100)
 assert.equal(out.accountingRemainderFils,Math.round(out.pool*100)-out.staff.reduce((sum,p)=>sum+Math.round(p.p1*100)+Math.round(p.p2*100),0))
})
test('with no old staff, deducted amounts remain with Accounting rather than returning to joiners',()=>{
 const out=previewMrKrabs({period:'Nov 26', daysInMonth:30,teamTarget:100000,bonusAed:500,staff:[
 {name:'New A',sales:55000,fullPriceDubaiItCount:0,eligibleCalendarDays:15,isExistingStaff:false},
 {name:'New B',sales:45000,fullPriceDubaiItCount:0,eligibleCalendarDays:15,isExistingStaff:false}
 ]})
 assert.equal(out.ok,true)
 if(!out.ok)return
 assert.ok(out.undistributedProrata>0)
 assert.equal(out.staff[0].redistributedP1,0)
 assert.equal(out.staff[1].redistributedP2,0)
 assert.ok(out.accountingRemainderFils>0)
})
