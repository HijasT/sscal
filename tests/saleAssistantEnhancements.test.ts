import { test } from 'node:test'
import assert from 'node:assert/strict'
import { comparePackageMarkers, findTopPackagesForMarkers, getServiceById, getVisibleServices } from '../lib/catalogueUtils.ts'
import { packageSummary } from '../lib/packageSummaries.ts'

const svc = (id: number) => {
  const s = getServiceById(id)
  assert.ok(s, `Missing fixture ${id}`)
  return s
}

test('every visible package has a concise client-facing summary', () => {
  for (const service of getVisibleServices()) {
    const summary = packageSummary(service)
    assert.ok(summary.trim().length >= 20, service.name)
    assert.ok(!/Sales notes/i.test(summary), service.name)
  }
  assert.match(packageSummary(svc(32)), /BRCA1 and BRCA2/)
})

test('package comparison keeps shared and unique lab markers separate', () => {
  const standard = svc(1)
  const premium = svc(2)
  const result = comparePackageMarkers(standard, premium)
  assert.ok(result.common.length > 0)
  assert.ok(result.onlyB.length > 0)
  assert.deepEqual(comparePackageMarkers(premium, standard).onlyA, result.onlyB)
  assert.deepEqual(comparePackageMarkers(standard, standard).onlyA, [])
  assert.deepEqual(comparePackageMarkers(standard, standard).onlyB, [])
})

test('marker finder offers two best full-coverage packages when possible', () => {
  const results = findTopPackagesForMarkers(new Set([124, 125]), 'M')
  assert.equal(results.length, 2)
  assert.ok(results.every((r) => r.complete))
  assert.deepEqual(results.map((r) => r.covered), [2, 2])
  assert.ok((results[0].service.price ?? 0) <= (results[1].service.price ?? 0))
  assert.notEqual(results[0].service.id, results[1].service.id)
})

test('marker finder clearly identifies partial matches', () => {
  const results = findTopPackagesForMarkers(new Set([124, 125, 29]), 'M')
  assert.ok(results.length > 0 && results.length <= 2)
  for (const result of results) {
    assert.equal(result.complete, result.missing.length === 0)
    assert.equal(result.covered + result.missing.length, result.total)
  }
  assert.deepEqual(findTopPackagesForMarkers(new Set(), 'M'), [])
})
