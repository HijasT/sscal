import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  getServiceById, getServiceTests, getVisibleServices, searchServices,
  type CatalogueService,
} from '../lib/catalogueUtils.ts'

const visible = getVisibleServices()
const ids = (services: CatalogueService[]) => new Set(services.map((s) => s.id))

test('BCA search includes every catalogue package containing Body Composition Analysis', () => {
  const expected = visible.filter(s =>
    s.components?.includes('BCA') || s.comps.some(c => c.name === 'BCA')
  )
  assert.ok(expected.length > 8, 'Need multiple composite packages for a meaningful regression')
  const found = ids(searchServices('BCA'))
  for (const service of expected) assert.ok(found.has(service.id), service.name)
  for (const service of visible.filter(s => !expected.some(e => e.id === s.id))) {
    assert.equal(found.has(service.id), false, `False BCA coverage: ${service.name}`)
  }
  assert.deepEqual(ids(searchServices('body composition')), ids(searchServices('BCA')))
  assert.ok(found.has(25), 'Standalone Body Composition Analysis')
  assert.ok(found.has(49), 'Dubai It Men includes BCA')
  assert.ok(found.has(50), 'Dubai It Women includes BCA')
})

test('ECG, microbiome and DNA module searches match actual package components', () => {
  const ecg = ids(searchServices('ecg'))
  for (const s of visible.filter(p => p.comps.some(c => c.name === 'ECG'))) {
    assert.ok(ecg.has(s.id), s.name)
  }
  assert.ok(!ecg.has(25), 'BCA only is not ECG')
  assert.ok(!ids(searchServices('bca')).has(26), 'ECG-only has BCA / ECG group but no BCA')
  assert.deepEqual(ids(searchServices('electrocardiogram')), ecg)
  assert.ok(ids(searchServices('gut kit')).has(24))
  assert.ok(ids(searchServices('nutrition wellbeing')).has(49))
})

test('all visible packages containing a clinical marker can be located by its name', () => {
  const markerNames = ['HbA1c - Glycated Haemoglobin', 'Vitamin D Total', 'Alanine aminotransferase']
  for (const marker of markerNames) {
    const expected = visible.filter(s => getServiceTests(s).some(t => t.name === marker))
    assert.ok(expected.length > 0, `Expected marker to exist in snapshot: ${marker}`)
    const found = ids(searchServices(marker))
    for (const s of expected) assert.ok(found.has(s.id), `${marker}: missing ${s.name}`)
  }
})

test('clinical group labels and common synonyms find underlying packages', () => {
  const cbc = ids(searchServices('CBC'))
  assert.ok(cbc.size > 0)
  assert.deepEqual(cbc, ids(searchServices('complete blood count')))
  assert.deepEqual(cbc, ids(searchServices('FBC')))
  const hba1c = ids(searchServices('hba1c'))
  assert.ok(hba1c.size > 0)
  for (const id of hba1c) assert.ok(ids(searchServices('a1c')).has(id))
  assert.ok(ids(searchServices('thyroid profile')).size > 0)
})

test('multi-word queries and categories continue to constrain results', () => {
  const dubaiWithBca = searchServices('Dubai BCA')
  assert.ok(dubaiWithBca.some(s => s.id === 49))
  assert.ok(dubaiWithBca.every(s => ids(searchServices('BCA')).has(s.id)))
  const sub = searchServices('BCA', 'Specialised Screening')
  assert.ok(sub.every(s => s.category === 'Specialised Screening'))
  assert.ok(sub.some(s => s.id === 25))
  assert.equal(searchServices('BCA', 'DNA Insights').length, 0)
  assert.ok(getServiceById(49))
})
