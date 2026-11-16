import { test } from 'node:test'
import assert from 'node:assert/strict'
import { applyReportedBlankAttendance, isWorkedSalesCell, type StaffData } from '../lib/excelUtils.ts'

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

test('blank cells count as zero-sale attendance only on already reported days', () => {
  for (const value of ['', ' ', null, undefined]) {
    assert.equal(isWorkedSalesCell({ v: value }, true), true)
    assert.equal(isWorkedSalesCell({ v: value }, false), false)
  }
  assert.equal(isWorkedSalesCell(undefined, true), true)
  assert.equal(isWorkedSalesCell(undefined, false), false)
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

test('NA is absent even when the day has already been reported', () => {
  for (const value of ['NA','N/A',' na ',' n/a ']) {
    assert.equal(isWorkedSalesCell({v:value}, true), false)
  }
})

test('blank worked days are added only through the sheet reporting cutoff', () => {
  const staff: StaffData = {
    name: 'Example', sales: 400, packages: 1, workingDays: 1,
    daily: [{ day: 3, sales: 400, packages: 1, clients: 1 }],
  }
  applyReportedBlankAttendance(staff, [1, 2, 4, 5, 31], 3)
  assert.equal(staff.workingDays, 3)
  assert.deepEqual(staff.daily?.map(d => [d.day, d.sales]), [
    [1, 0], [2, 0], [3, 400],
  ])
})

test('unknown reporting cutoff does not fabricate blank-day attendance', () => {
  const staff: StaffData = {
    name: 'Example', sales: 0, packages: 0, workingDays: 0, daily: [],
  }
  applyReportedBlankAttendance(staff, [1, 2, 3], undefined)
  assert.equal(staff.workingDays, 0)
  assert.deepEqual(staff.daily, [])
})
