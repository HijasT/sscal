import { test } from 'node:test'
import assert from 'node:assert/strict'
import { comparePersonalSplit, contributionGroups, dailyTotals, monthComparison, productivityRanking } from '../lib/bulkInsights.ts'
import type { ExcelData, StaffData } from '../lib/excelUtils.ts'

const staff: StaffData[] = [
  { name:'A',sales:300,packages:3,clients:2,workingDays:3,daily:[
    {day:1,sales:100,packages:1,clients:1},{day:2,sales:200,packages:2,clients:1},{day:3,sales:0,packages:0,clients:0},
  ] },
  { name:'B',sales:100,packages:2,clients:1,workingDays:2,daily:[
    {day:1,sales:50,packages:1,clients:0},{day:2,sales:50,packages:1,clients:1},
  ] },
]
const sheet = (name: string, rows: StaffData[], cutoff: number): ExcelData => ({
  sheetName:name,staff:rows,lastReportedDay:cutoff,target:500,
  teamTotal:{sales:rows.reduce((a,b)=>a+b.sales,0),packages:rows.reduce((a,b)=>a+b.packages,0)},
})

test('daily records aggregate by calendar day with actual worked staff-days', () => {
  const d=dailyTotals(staff,3)
  assert.ok(d)
  assert.deepEqual(d?.map(row=>[row.sales,row.packages,row.clients,row.staffDays]),[
    [150,2,1,2],[250,3,2,2],[0,0,0,1],
  ])
  assert.equal(dailyTotals([{name:'old',sales:10,packages:1,workingDays:1}],3),null)
})

test('productivity ranks by sales per actual worked shift, not gross revenue', () => {
  const r=productivityRanking([
    {name:'Many shifts',sales:500,packages:1,workingDays:10},
    {name:'Fewer shifts',sales:300,packages:1,workingDays:2},
    {name:'No shifts',sales:10,packages:1,workingDays:0},
  ])
  assert.deepEqual(r.map(p=>p.name),['Fewer shifts','Many shifts','No shifts'])
})

test('contribution groups add to team total and handle small teams', () => {
  const grouped=contributionGroups(staff)
  assert.equal(grouped.reduce((n,g)=>n+g.count,0),2)
  assert.equal(grouped.reduce((n,g)=>n+g.sales,0),400)
  assert.ok(Math.abs(grouped.reduce((n,g)=>n+g.share,0)-100)<1e-8)
  assert.equal(contributionGroups([]).reduce((n,g)=>n+g.share,0),0)
})

test('current-month comparison aligns elapsed calendar days and exclusions', () => {
  const previous=[{...staff[0],sales:250,daily:[
    {day:1,sales:60,packages:1,clients:1},
    {day:2,sales:70,packages:1,clients:0},
    {day:3,sales:120,packages:1,clients:0},
  ]}]
  const matched=monthComparison({
    current:sheet('Nov 26',staff,3),
    previous:sheet('Oct 26',previous,31),
    excludedNames:new Set(['B']),year:2026,month:11,
    now:new Date(2026,10,5),
  })
  assert.ok(matched)
  assert.equal(matched?.metrics[0].current,300)
  assert.equal(matched?.metrics[0].previous,250)
  assert.equal(matched?.metrics[0].changePercent,20)
})

test('disallows misleading incomplete previous-month comparisons', () => {
  const matched=monthComparison({
    current:sheet('Nov 26',staff,3),previous:sheet('Oct 26',staff,1),
    excludedNames:new Set(),year:2026,month:11,now:new Date(2026,10,5),
  })
  assert.equal(matched,null)
})

test('100% personal split retains the same pool and compares against actual incentives', () => {
  const payouts = comparePersonalSplit([
    { name: 'A', sales: 300, packages: 0, workingDays: 1, totalIncentive: 32.5 },
    { name: 'B', sales: 100, packages: 0, workingDays: 1, totalIncentive: 17.5 },
  ], 400, 50)
  assert.equal(payouts[0].personalOnly, 37.5)
  assert.equal(payouts[1].personalOnly, 12.5)
  assert.equal(payouts[0].delta, 5)
  assert.equal(payouts[1].delta, -5)
  assert.equal(payouts.reduce((sum, p) => sum + p.personalOnly, 0), 50)
  assert.equal(payouts.reduce((sum, p) => sum + p.delta, 0), 0)
})

test('zero sales and zero pool do not divide by zero', () => {
  const rows = comparePersonalSplit([
    { name: 'A', sales: 0, packages: 0, workingDays: 0, totalIncentive: 0 },
  ], 0, 0)
  assert.deepEqual(rows.map(r => [r.personalOnly, r.delta]), [[0,0]])
})
