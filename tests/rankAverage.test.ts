import { test } from 'node:test'
import assert from 'node:assert/strict'
import { averageDivider } from '../lib/rankAverage.ts'

test('descending sales: equal-to-average stays above divider', () => {
  const rows = [{ sales: 200 }, { sales: 100 }, { sales: 0 }]
  assert.deepEqual(averageDivider(rows, (row) => row.sales, 'desc'), {
    average: 100, index: 2,
  })
})

test('ascending sorting places the same average-equal staff with above-average group', () => {
  const rows = [{ sales: 0 }, { sales: 100 }, { sales: 200 }]
  assert.deepEqual(averageDivider(rows, (row) => row.sales, 'asc'), {
    average: 100, index: 1,
  })
})

test('all values equal: descending divider below everyone; ascending above everyone', () => {
  const rows = [{ sales: 50 }, { sales: 50 }]
  assert.deepEqual(averageDivider(rows, (row) => row.sales, 'desc'), { average: 50, index: 2 })
  assert.deepEqual(averageDivider(rows, (row) => row.sales, 'asc'), { average: 50, index: 0 })
})

test('uses the current metric, with zero values and fractional means', () => {
  const rows = [{ clients: 0, packages: 1 }, { clients: 0, packages: 2 }, { clients: 1, packages: 4 }]
  assert.deepEqual(averageDivider(rows, (row) => row.clients, 'asc'), { average: 1 / 3, index: 2 })
  assert.equal(averageDivider(rows, (row) => row.packages, 'asc')?.average, 7 / 3)
})

test('handles empty and invalid rankings', () => {
  assert.equal(averageDivider([], (row: { sales: number }) => row.sales, 'desc'), null)
  assert.equal(averageDivider([{ sales: NaN }], (row) => row.sales, 'desc'), null)
})
