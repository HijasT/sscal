import { test } from 'node:test'
import assert from 'node:assert/strict'
import { previewFilsReconciliation } from '../lib/filsReconciliation.ts'

test('proposal: largest remainder distributes residual fils without losing pool',()=>{
  const r = previewFilsReconciliation(0.10, [
    {id:'A',incentive:0.10/3},{id:'B',incentive:0.10/3},{id:'C',incentive:0.10/3}
  ])
  assert.equal(r.poolFils, 10)
  assert.equal(r.separatelyRoundedFils, 9)
  assert.equal(r.roundingDifferenceFils, 1)
  assert.deepEqual(r.allocations.map(x=>[x.id,x.fils]),[['A',4],['B',3],['C',3]])
  assert.equal(r.allocations.reduce((s,x)=>s+x.fils,0),r.poolFils)
})

test('proposal: tie resolution is independent of workbook staff row order',()=>{
  const input = [{id:'C',incentive:1/3},{id:'A',incentive:1/3},{id:'B',incentive:1/3}]
  const x=previewFilsReconciliation(1,input)
  const y=previewFilsReconciliation(1,[...input].reverse())
  assert.deepEqual(Object.fromEntries(x.allocations.map(p=>[p.id,p.fils])),
    Object.fromEntries(y.allocations.map(p=>[p.id,p.fils])))
})

test('proposal: exact-cent amounts are unchanged',()=>{
  const r=previewFilsReconciliation(3.40,[{id:'A',incentive:1.15},{id:'B',incentive:2.25}])
  assert.equal(r.roundingDifferenceFils,0)
  assert.ok(r.allocations.every(x=>x.adjustmentFils===0))
})

test('proposal rejects non-reconciling raw payout and duplicate identifiers',()=>{
  assert.throws(()=>previewFilsReconciliation(4,[{id:'A',incentive:2},{id:'B',incentive:1}]),/reconcile/)
  assert.throws(()=>previewFilsReconciliation(1,[{id:'A',incentive:.5},{id:'A',incentive:.5}]),/uniquely/)
})
