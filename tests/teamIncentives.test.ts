import { test } from 'node:test'
import assert from 'node:assert/strict'
import { calculateTeamIncentives } from '../lib/teamIncentives.ts'
import { auditRoundedIncentives } from '../lib/incentiveAudit.ts'
import { HISTORICAL_LEGACY_TIERS } from './fixtures/historicalTiers.ts'
import { formattedPayout } from '../lib/reportPayout.ts'

const people = [
  { name:'Cora AE03-101', sales:30 },
  { name:'Amir AE01-227', sales:40 },
  { name:'Bela AE02-138', sales:30 },
]
const payout = (roster=people, split=50) => {
  const outcome = calculateTeamIncentives(100,roster,split,HISTORICAL_LEGACY_TIERS)
  assert.equal(outcome.ok,true,'error' in outcome ? String(outcome.error) : '')
  if('error' in outcome) throw new Error(String(outcome.error))
  return outcome.value
}

test('independently rounded P1/P2 awards remain unchanged and accounting receives the difference',()=>{
  const result=payout()
  assert.equal(result.pool,2.50)
  assert.equal(result.p1Pool,1.25)
  assert.equal(result.p2Pool,1.25)
  assert.deepEqual(result.staff.map(p=>[p.name,p.p1,p.p2,p.totalIncentive]), [
    ['Cora AE03-101',.42,.38,.80],
    ['Amir AE01-227',.42,.50,.92],
    ['Bela AE02-138',.42,.38,.80],
  ])
  assert.equal(result.staffTotalFils,252)
  assert.equal(result.p1RemainderFils,-1)
  assert.equal(result.p2RemainderFils,-1)
  assert.equal(result.remainderFils,-2)
  assert.equal(auditRoundedIncentives(100,result.pool,result.p1Pool,result.p2Pool,result.staff,result.remainderFils),null)
  assert.match(auditRoundedIncentives(100,result.pool,result.p1Pool,result.p2Pool,result.staff,0) ?? '',/Remainder/)
})

test('workbook reorder and employee codes do not change independently rounded staff awards',()=>{
  const first=payout(people)
  const reversed=payout([...people].reverse())
  const byName=(rows:typeof first.staff)=>Object.fromEntries(rows.map(p=>[p.name,[p.p1,p.p2,p.totalIncentive]]))
  assert.deepEqual(byName(first.staff),byName(reversed.staff))
  assert.equal(first.remainderFils,reversed.remainderFils)
})

test('all splits and excluded rosters reconcile pool through Accounting Remainder',()=>{
  for(const split of [0,25,50,75,100]){
    for(const roster of [people,people.slice(0,2),people.slice(0,1)]){
      const result=payout(roster,split)
      const sales=roster.reduce((sum,p)=>sum+p.sales,0)
      assert.equal(auditRoundedIncentives(sales,result.pool,result.p1Pool,result.p2Pool,result.staff,result.remainderFils),null)
      assert.equal(result.staffTotalFils+result.remainderFils,result.poolFils)
      assert.equal(result.p1RemainderFils+result.p2RemainderFils,result.remainderFils)
      assert.ok(result.staff.every(p=>Math.abs(p.totalIncentive*100-Math.round(p.totalIncentive*100))<1e-6))
    }
  }
})

test('zero-sales roster has zero staff award and no Accounting Remainder',()=>{
  const outcome=calculateTeamIncentives(100,[{name:'A',sales:0},{name:'B',sales:0}],50,HISTORICAL_LEGACY_TIERS)
  assert.equal(outcome.ok,true)
  if(outcome.ok){
    assert.equal(outcome.value.poolFils,0)
    assert.equal(outcome.value.remainderFils,0)
    assert.deepEqual(outcome.value.staff.map(p=>p.totalIncentive),[0,0])
  }
})

test('duplicate employee codes do not affect rounding; no remainder is assigned to a person',()=>{
  const roster=[{name:'Jane AE01-227',sales:60},{name:'Janet AE01-227',sales:40}]
  const result=payout(roster)
  assert.equal(result.staff.length,2)
  assert.equal(result.staffTotalFils+result.remainderFils,result.poolFils)
})

test('invalid splits and overflowing pools are rejected',()=>{
  assert.equal(calculateTeamIncentives(100,people,101,HISTORICAL_LEGACY_TIERS).ok,false)
  assert.equal(calculateTeamIncentives(1,[{name:'A',sales:Number.MAX_VALUE}],50,HISTORICAL_LEGACY_TIERS).ok,false)
})

test('CSV/PDF shared formatter preserves each independently rounded P1, P2, total',()=>{
  const result=payout()
  const formatted=result.staff.map(formattedPayout)
  for(const f of formatted){
    assert.equal(Math.round(Number(f.total)*100),Math.round(Number(f.p1)*100)+Math.round(Number(f.p2)*100))
  }
  const sumFils=formatted.reduce((sum,p)=>sum+Math.round(Number(p.total)*100),0)
  assert.equal(sumFils,result.staffTotalFils)
  assert.equal(sumFils+result.remainderFils,result.poolFils)
})
