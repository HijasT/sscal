import { test } from 'node:test'
import assert from 'node:assert/strict'
import { visibleCenterRankings, nextCenterVisibility } from '../lib/centerRankingVisibility.ts'

const staff = [
  { name: 'A', center: 'C', sales: 300 },
  { name: 'B', center: 'I', sales: 200 },
  { name: 'C', center: 'D', sales: 100 },
  { name: 'Unknown', center: null, sales: 50 },
]
const centerOf = (p: (typeof staff)[number]) => p.center
const all = { C: true, I: true, D: true }

test('default all ON displays every staff member and leaves ranks untouched', () => {
  const visible = visibleCenterRankings(staff, all, centerOf, 2)
  assert.deepEqual(visible.rows.map(x => x.rank), [1,2,3,4])
  assert.equal(visible.dividerIndex, 2)
})

test('hiding center I filters only its rows without renumbering ranks', () => {
  const original = staff.map(x => ({...x}))
  const visible = visibleCenterRankings(staff, { C:true, I:false, D:true }, centerOf, 2)
  assert.deepEqual(visible.rows.map(x=>[x.person.name,x.rank]), [
    ['A',1],['C',3],['Unknown',4],
  ])
  assert.equal(visible.dividerIndex,1)
  assert.deepEqual(staff,original)
})

test('average divider preserves the original team threshold after filtered boundary rows', () => {
  // Index 2 is the ORIGINAL team average break; center I row is concealed.
  const visible = visibleCenterRankings(staff, { C:true, I:false, D:false }, centerOf, 2)
  assert.deepEqual(visible.rows.map(x=>x.rank),[1,4])
  assert.equal(visible.dividerIndex,1)
  const onlyBelow = visibleCenterRankings(staff,{C:false,I:false,D:true},centerOf,2)
  assert.equal(onlyBelow.dividerIndex,0)
  const noMean = visibleCenterRankings(staff,all,centerOf,null)
  assert.equal(noMean.dividerIndex,null)
})

test('at least one center must remain ON; toggles never mutate the input', () => {
  const initial={C:true,I:true,D:true}
  const afterC=nextCenterVisibility(initial,'C')
  assert.deepEqual(afterC,{C:false,I:true,D:true})
  assert.deepEqual(initial,{C:true,I:true,D:true})
  const afterI=nextCenterVisibility(afterC!,'I')
  assert.deepEqual(afterI,{C:false,I:false,D:true})
  assert.equal(nextCenterVisibility(afterI!,'D'),null)
  assert.deepEqual(nextCenterVisibility(afterI!,'C'),{C:true,I:false,D:true})
  assert.equal(nextCenterVisibility(initial,'unknown'),null)
})
