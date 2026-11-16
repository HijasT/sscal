import { test } from 'node:test'
import assert from 'node:assert/strict'
import { calculateTeamIncentives } from '../lib/teamIncentives.ts'
import { auditRoundedIncentives } from '../lib/incentiveAudit.ts'
import { DEFAULT_TIERS } from '../lib/config.ts'
import { employeePayoutKey, allocateFilsShares } from '../lib/filsReconciliation.ts'
import { formattedPayout } from '../lib/reportPayout.ts'

const people = [
  { name:'Cora AE03-101', sales:30 },
  { name:'Amir AE01-227', sales:40 },
  { name:'Bela AE02-138', sales:30 },
]
const payout = (roster=people, split=50) => {
  const outcome = calculateTeamIncentives(100,roster,split,DEFAULT_TIERS)
  assert.equal(outcome.ok,true,outcome.ok?'':outcome.error)
  if(!outcome.ok) throw new Error(outcome.error)
  return outcome.value
}

test('official payout allocates P1 and P2 separately in whole fils and reconciles exactly', () => {
  const result=payout()
  assert.equal(result.pool,2.50)
  assert.equal(result.p1Pool,1.25)
  assert.equal(result.p2Pool,1.25)
  assert.deepEqual(result.staff.map(p=>[p.name,p.p1,p.p2,p.totalIncentive]), [
    ['Cora AE03-101',.41,.37,.78],
    ['Amir AE01-227',.42,.50,.92],
    ['Bela AE02-138',.42,.38,.80],
  ])
  assert.equal(auditRoundedIncentives(100,result.pool,result.p1Pool,result.p2Pool,result.staff),null)
})

test('stable employee-code ties are independent of input, ranking, or workbook order',()=>{
  const first=payout(people)
  const reverse=payout([...people].reverse())
  const byName=(rows:typeof first.staff)=>Object.fromEntries(rows.map(r=>[employeePayoutKey(r.name),[r.p1,r.p2,r.totalIncentive]]))
  assert.deepEqual(byName(first.staff),byName(reverse.staff))
  assert.equal(employeePayoutKey('a person AE01-227'),employeePayoutKey('another name AE01-227'))
})

test('every approved split and exclusions produces exact whole-fils reconciliation',()=>{
  for(const p1 of [0,25,50,75,100]){
    for(const roster of [people,people.slice(0,2),people.slice(0,1)]){
      const value=payout(roster,p1)
      const teamSales=roster.reduce((s,p)=>s+p.sales,0)
      assert.equal(auditRoundedIncentives(teamSales,value.pool,value.p1Pool,value.p2Pool,value.staff),null)
      assert.equal(Math.round(value.staff.reduce((s,p)=>s+p.totalIncentive,0)*100),value.poolFils)
      assert.ok(value.staff.every(p=>Math.abs(p.totalIncentive*100-Math.round(p.totalIncentive*100))<1e-6))
    }
  }
})

test('zero-sales roster yields exact zero-fils payout',()=>{
  const outcome=calculateTeamIncentives(100,[{name:'A AE01-227',sales:0},{name:'B AE02-138',sales:0}],50,DEFAULT_TIERS)
  assert.equal(outcome.ok,true)
  if(!outcome.ok) return
  assert.equal(outcome.value.poolFils,0)
  assert.deepEqual(outcome.value.staff.map(p=>p.totalIncentive),[0,0])
})

test('official calculator blocks duplicate employee codes even with changed names',()=>{
  const bad=calculateTeamIncentives(100,[{name:'Jane AE01-227',sales:50},{name:'Janet AE01-227',sales:50}],50,DEFAULT_TIERS)
  assert.equal(bad.ok,false)
  if(!bad.ok)assert.match(bad.error,/Duplicate employee identifiers/)
})

test('invalid splits and oversized pools cannot allocate payouts',()=>{
  assert.equal(calculateTeamIncentives(100,people,101,DEFAULT_TIERS).ok,false)
  assert.throws(()=>allocateFilsShares(-1,[{id:'CODE:AE01-227',amount:1}]))
})

test('display and export formatter values agree with exact official P1, P2, total',()=>{
  const result=payout()
  for(const person of result.staff){
    const formatted=formattedPayout(person)
    assert.equal(Math.round(Number(formatted.total)*100),Math.round(Number(formatted.p1)*100)+Math.round(Number(formatted.p2)*100))
  }
  const lines=result.staff.map(formattedPayout)
  assert.equal(Math.round(lines.reduce((sum,p)=>sum+Number(p.total),0)*100),result.poolFils)
})
