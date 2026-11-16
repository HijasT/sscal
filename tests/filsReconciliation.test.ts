import { test } from 'node:test'
import assert from 'node:assert/strict'
import { accountingRemainder, remainderAED, toFils } from '../lib/filsReconciliation.ts'

test('positive remainder is held for Accounting, never assigned to an employee',()=>{
  const result=accountingRemainder(10,[3,3,3])
  assert.deepEqual(result,{poolFils:10,staffFils:9,remainderFils:1})
  assert.equal(remainderAED(result.remainderFils),.01)
})

test('negative remainder is reported when independent rounding exceeds the pool',()=>{
  const result=accountingRemainder(100,[34,34,33])
  assert.equal(result.staffFils,101)
  assert.equal(result.remainderFils,-1)
  assert.equal(remainderAED(result.remainderFils),-.01)
})

test('zero remainder means total independently rounded awards equal the pool',()=>{
  assert.equal(accountingRemainder(100,[25,25,50]).remainderFils,0)
})

test('rounds individual award normally without distributing residual fils',()=>{
  assert.equal(toFils(33.333333),3333)
  assert.equal(toFils(0),0)
  assert.throws(()=>toFils(Infinity))
  assert.throws(()=>accountingRemainder(100,[50,0.5]))
})
