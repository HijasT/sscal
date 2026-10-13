/**
 * Catalogue tests: the blood-collection journey (single draw, max tubes) and the
 * "Blood tests only" / "Non-invasive" filters (components-based).
 *
 * Run with:  npm test   (Node's built-in runner via tsx)
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  getServiceById,
  getVisibleServices,
  buildJourney,
  bloodTubes,
  isBloodTestOnly,
  isNonInvasive,
  healthmaxxingComponents,
  suggestPackage,
} from '../lib/catalogueUtils.ts'

const svc = (id: number) => {
  const s = getServiceById(id)
  if (!s) throw new Error(`fixture service ${id} missing`)
  return s
}
const byName = new Map(getVisibleServices().map((s) => [s.name, s]))
const named = (n: string) => {
  const s = byName.get(n)
  if (!s) throw new Error(`fixture service "${n}" missing`)
  return s
}
const STANDARD = svc(1) // Blood Collection + Vital Signs, 3 tubes
const DUBAI_M = svc(49) // everything incl. Blood Collection, 13 tubes
const GUT = svc(24) // BCA + Gut Kit + Vital Signs, no blood draw
const DNA_ESS = svc(36) // Swab + Questionnaire + Vital Signs, no blood draw
const COELIAC = svc(14) // Blood Collection only, 1 tube

// ---------- Blood Collection in the journey is one draw with the MAX tube count ----------
test('journey: blood collection is a single step carrying the max tube count', () => {
  const j = buildJourney([STANDARD, DUBAI_M]) // 3 tubes and 13 tubes
  const blood = j.steps.find((s) => s.label === 'Blood Collection')
  assert.ok(blood, 'Blood Collection step present')
  assert.equal(blood!.count, 1, 'single draw, not a repeat count')
  assert.equal(blood!.tubes, 13, 'max of 3 and 13, not the sum')
})

test('journey: vital signs happens once (no repeat count)', () => {
  const vit = buildJourney([STANDARD, DUBAI_M]).steps.find((s) => s.label === 'Vital Signs')
  assert.ok(vit)
  assert.equal(vit!.count, 1)
})

test('bloodTubes: known counts, and undefined for non-blood packages', () => {
  assert.equal(bloodTubes(COELIAC), 1)
  assert.equal(bloodTubes(DUBAI_M), 13)
  assert.equal(bloodTubes(GUT), undefined)
})

// ---------- Filters ----------
test('isBloodTestOnly: blood draw with nothing but vitals/consult', () => {
  assert.equal(isBloodTestOnly(STANDARD), true)
  assert.equal(isBloodTestOnly(COELIAC), true)
  assert.equal(isBloodTestOnly(DUBAI_M), false) // has swab, BCA, ECG, …
  assert.equal(isBloodTestOnly(GUT), false) // no blood draw at all
})

test('isNonInvasive: no blood collection component', () => {
  assert.equal(isNonInvasive(GUT), true)
  assert.equal(isNonInvasive(DNA_ESS), true) // swab-only DNA
  assert.equal(isNonInvasive(STANDARD), false)
})

// ---------- HEALTHMAXXING is gender-specific ----------
test('healthmaxxingComponents: men get the Men\'s Dubai It, women the Women\'s', () => {
  const men = healthmaxxingComponents('M').map((s) => s.name)
  const women = healthmaxxingComponents('W').map((s) => s.name)
  assert.ok(men.includes("Dubai It Men's Package"))
  assert.ok(!men.includes("Dubai It Women's Package"))
  assert.ok(women.includes("Dubai It Women's Package"))
  assert.ok(!women.includes("Dubai It Men's Package"))
})

test('suggestPackage: HEALTHMAXXING is offered to a women\'s selection it covers', () => {
  // A women's selection (>AED 10k) that only HEALTHMAXXING covers end-to-end.
  const selection = [
    named("Dubai It Women's Package"),
    named('DNA - Acne Package'),
    named('Gut Microbiome Test'),
  ]
  const s = suggestPackage(selection, 'W')
  assert.equal(s?.name, 'HEALTHMAXXING')
})
