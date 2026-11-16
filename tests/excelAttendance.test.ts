import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isWorkedSalesCell } from '../lib/excelUtils.ts'

test('NA means absent, and does not count as a worked day', () => {
  for (const value of ['NA', 'na', ' Na ', 'N/A', ' n/a ']) {
    assert.equal(isWorkedSalesCell({ v: value }), false, value)
  }
})

test('numeric zero and a zero-value string mean present with zero sales', () => {
  for (const value of [0, '0', ' 0 ', 0.00]) {
    assert.equal(isWorkedSalesCell({ v: value }), true, String(value))
  }
})

test('blank cells do not count as a worked day', () => {
  for (const value of ['', ' ', null, undefined]) {
    assert.equal(isWorkedSalesCell({ v: value }), false)
  }
  assert.equal(isWorkedSalesCell(undefined), false)
})

test('invalid formulas never inflate staff attendance', () => {
  assert.equal(isWorkedSalesCell({ v: '#REF!', t: 'e' }), false)
  assert.equal(isWorkedSalesCell({ v: '#DIV/0!' }), false)
  assert.equal(isWorkedSalesCell({ v: '#VALUE!' }), false)
  assert.equal(isWorkedSalesCell({ v: '#N/A', t: 'e' }), false)
})

test('other numeric sales values are present', () => {
  assert.equal(isWorkedSalesCell({ v: 350.25 }), true)
  assert.equal(isWorkedSalesCell({ v: '100.00' }), true)
})

test('non-numeric text and non-finite sales values are not worked days', () => {
  assert.equal(isWorkedSalesCell({ v: 'oops' }), false)
  assert.equal(isWorkedSalesCell({ v: Infinity }), false)
  assert.equal(isWorkedSalesCell({ v: '-Infinity' }), false)
})
