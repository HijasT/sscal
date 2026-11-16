import { test } from 'node:test'
import assert from 'node:assert/strict'
import { auditIncentivePayouts } from '../lib/incentiveAudit.ts'
import { calculateIncentive } from '../lib/utils.ts'
import { DEFAULT_TIERS } from '../lib/config.ts'

function payouts(sales: number[], target: number, split: number) {
  const teamSales = sales.reduce((sum,n)=>sum+n,0)
  const rows = sales.map(personSales => {
    const result = calculateIncentive(target, teamSales, personSales, sales.length, split, DEFAULT_TIERS)
    assert.equal(result.error, undefined)
    return { sales: personSales, p1: result.myP1, p2: result.myP2, totalIncentive: result.myTotal }
  })
  const pool = calculateIncentive(target, teamSales, sales[0], sales.length, split, DEFAULT_TIERS).totalPool
  return { teamSales, rows, pool }
}

test('actual tier payout reconciles across unequal staff sales and all split settings', () => {
  for (const split of [0,25,50,75,100]) {
    const {teamSales,rows,pool}=payouts([45223.37,26500.19,12788.13,36488.31],100000,split)
    assert.equal(auditIncentivePayouts(teamSales,pool,rows),null)
  }
})

test('zero-sales period with active staff reconciles to zero incentive', () => {
  const {teamSales,rows,pool}=payouts([0,0,0],100000,50)
  assert.equal(auditIncentivePayouts(teamSales,pool,rows),null)
  assert.equal(pool,0)
})

test('auditor prevents silent payout, individual split and sales discrepancies', () => {
  const {teamSales,rows,pool}=payouts([60000,60000],100000,50)
  assert.match(auditIncentivePayouts(teamSales,pool,rows.map((r,i)=>i===0 ? {...r,totalIncentive:r.totalIncentive+1}:r)) ?? '', /P1 and P2/)
  assert.match(auditIncentivePayouts(teamSales,pool+1,rows) ?? '', /incentive pool/)
  assert.match(auditIncentivePayouts(teamSales+10,pool,rows) ?? '', /team sales/)
  assert.match(auditIncentivePayouts(teamSales,pool,rows.map((r,i)=>i===0 ? {...r, p1:Infinity}:r)) ?? '', /finite/)
  assert.match(auditIncentivePayouts(teamSales,pool,rows.map((r,i)=>i===0 ? {...r, p2:-1}:r)) ?? '', /negative/)
})

test('auditor rejects missing staff and invalid total pool', () => {
  assert.ok(auditIncentivePayouts(0,0,[]))
  assert.ok(auditIncentivePayouts(100,Infinity,[{sales:100,p1:0,p2:0,totalIncentive:0}]))
})
