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
      {name:'A',sales:70000,fullPriceDubaiItCount:2,eligibleCalendarDays:30},
      {name:'B',sales:40000,fullPriceDubaiItCount:0,eligibleCalendarDays:15},
    ]})
  assert.equal(outcome.ok,true)
  if (!outcome.ok) return
  assert.equal(outcome.rate,3.5)
  assert.equal(outcome.eligibleRevenue,90000)
  assert.equal(outcome.pool,3150)
  assert.equal(outcome.p1Pool,1575)
  assert.equal(outcome.p2Pool,1575)
  assert.equal(outcome.staff[0].dubaiItBonus,1000)
  assert.equal(outcome.staff[0].p2BeforeProrata,1575 * 70000 / 110000)
  assert.equal(outcome.staff[1].p1AfterProrata,1575 / 2 / 2)
  assert.equal(outcome.status,'provisional-redistribution-unresolved')
  assert.equal(previewMrKrabs({period:'Oct 26',daysInMonth:31,teamTarget:100000,
    bonusAed:500,staff:[{name:'A',sales:10000,fullPriceDubaiItCount:1,eligibleCalendarDays:31}]}).ok,false)
})
