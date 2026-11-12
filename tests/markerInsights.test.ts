import { test } from 'node:test'
import assert from 'node:assert/strict'
import catalogue from '../lib/catalogue.json'
import { CLINICAL_MARKER_INSIGHTS, clinicalMarkerInsight } from '../lib/markerInsights.ts'

test('every clinical marker has exactly one short, local explanation', () => {
  const clinical = Object.entries(catalogue.tests).filter(([id]) => Number(id) < 1000)
  assert.equal(clinical.length, 130)
  assert.equal(Object.keys(CLINICAL_MARKER_INSIGHTS).length, clinical.length)
  for (const [, marker] of clinical) {
    const insight = clinicalMarkerInsight(marker.name)
    assert.ok(insight, `Missing explanation: ${marker.name}`)
    assert.ok(insight!.description.trim().length > 15)
    assert.ok(insight!.description.trim().split(/\s+/).length <= 30,
      `Explanation is too long: ${marker.name}`)
  }
})

test('all allergy and intolerance markers remain non-interactive', () => {
  for (const [id, marker] of Object.entries(catalogue.tests)) {
    if (Number(id) >= 1000) assert.equal(clinicalMarkerInsight(marker.name), undefined, marker.name)
  }
})

test('abbreviations are expanded where relevant', () => {
  assert.equal(clinicalMarkerInsight('CA 19-9')?.expansion, 'Carbohydrate antigen 19-9')
  assert.match(clinicalMarkerInsight('BRCA1')?.expansion ?? '', /Breast cancer susceptibility gene 1/i)
  assert.equal(clinicalMarkerInsight('Cortisol')?.expansion, '')
})
