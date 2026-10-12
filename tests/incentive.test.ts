/**
 * Calculation-integrity tests for the incentive engine (lib/utils.ts).
 * Pure functions — tiers are passed explicitly, so no browser/localStorage.
 *
 * Run with:  npm test   (Node's built-in runner via tsx)
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { getTier, calculateIncentive, formatCurrency } from '../lib/utils.ts'
import { DEFAULT_TIERS, type Tier } from '../lib/config.ts'

const TIERS: Tier[] = DEFAULT_TIERS
// DEFAULT_TIERS: T1 [85,101)=2.5%, T2 [101,111)=3.0%, T3 [111,∞)=3.5%

// ---------- getTier: bracket boundaries (lower inclusive, upper exclusive) ----------

test('getTier: below the lowest tier earns nothing', () => {
  const t = getTier(50, TIERS)
  assert.equal(t.rate, 0)
  assert.equal(t.name, 'None')
})

test('getTier: lower bound is inclusive', () => {
  assert.equal(getTier(85, TIERS).name, 'Tier 1')
  assert.equal(getTier(101, TIERS).name, 'Tier 2')
  assert.equal(getTier(111, TIERS).name, 'Tier 3')
})

test('getTier: upper bound is exclusive', () => {
  assert.equal(getTier(100.999, TIERS).name, 'Tier 1')
  assert.equal(getTier(110.999, TIERS).name, 'Tier 2')
})

test('getTier: top tier is unbounded above', () => {
  assert.equal(getTier(1000, TIERS).name, 'Tier 3')
  assert.equal(getTier(111, TIERS).rate, 3.5)
})

// ---------- calculateIncentive: a fully hand-computed scenario ----------

test('calculateIncentive: known outputs for a Tier 3 month', () => {
  // target 100k, sales 120k -> 120% -> Tier 3 @3.5%. Pool = 4200.
  // p1=50 -> p1Pool=2100, p2Pool=2100. 10 staff -> myP1=210.
  // mySales 12k = 10% of team -> myP2 = 10% of 2100 = 210. Total 420.
  const r = calculateIncentive(100000, 120000, 12000, 10, 50, TIERS)
  assert.equal(r.error, undefined)
  assert.equal(r.teamAchievement, 120)
  assert.equal(r.tier.name, 'Tier 3')
  assert.equal(r.totalPool, 4200)
  assert.equal(r.p1Pool, 2100)
  assert.equal(r.p2Pool, 2100)
  assert.equal(r.myP1, 210)
  assert.equal(r.myP2, 210)
  assert.equal(r.myTotal, 420)
  assert.equal(r.myContribution, 10)
})

// ---------- tier boundary drives the rate ----------

test('calculateIncentive: achievement exactly 101% lands in Tier 2', () => {
  const r = calculateIncentive(100000, 101000, 10100, 10, 50, TIERS)
  assert.equal(r.tier.name, 'Tier 2')
  assert.equal(r.totalPool, (3.0 / 100) * 101000)
})

test('calculateIncentive: achievement just under 101% stays in Tier 1', () => {
  const r = calculateIncentive(100000, 100999, 10000, 10, 50, TIERS)
  assert.equal(r.tier.name, 'Tier 1')
})

// ---------- single-staff month ----------

test('calculateIncentive: single staff takes the whole P1 pool', () => {
  const r = calculateIncentive(100000, 120000, 120000, 1, 50, TIERS)
  assert.equal(r.myP1, r.p1Pool) // only person splits P1
  assert.equal(r.myContribution, 100) // they are the whole team
  assert.equal(r.myP2, r.p2Pool) // 100% of P2 too
  assert.equal(r.myTotal, r.totalPool)
})

// ---------- zero / boundary values ----------

test('calculateIncentive: zero personal sales still earns the equal P1 share', () => {
  const r = calculateIncentive(100000, 120000, 0, 10, 50, TIERS)
  assert.equal(r.error, undefined)
  assert.equal(r.myContribution, 0)
  assert.equal(r.myP2, 0)
  assert.equal(r.myP1, 210) // equal share regardless of personal sales
})

test('calculateIncentive: p1=0 means everything is performance-based (P2)', () => {
  const r = calculateIncentive(100000, 120000, 12000, 10, 0, TIERS)
  assert.equal(r.p1Pool, 0)
  assert.equal(r.myP1, 0)
  assert.equal(r.myP2, 420) // whole pool is P2; 10% share of 4200
})

// ---------- next-tier projection ----------

test('calculateIncentive: projects the sales needed for the next tier', () => {
  const r = calculateIncentive(100000, 90000, 9000, 10, 50, TIERS) // 90% -> Tier 1
  assert.equal(r.tier.name, 'Tier 1')
  assert.equal(r.nextTierInfo.isMaxTier, false)
  assert.equal(r.nextTierInfo.nextTierName, 'Tier 2')
  assert.equal(r.nextTierInfo.requiredSales, 101000) // 101% of target
  assert.equal(r.nextTierInfo.deficit, 11000)
})

test('calculateIncentive: below the lowest tier projects toward Tier 1', () => {
  const r = calculateIncentive(100000, 50000, 5000, 10, 50, TIERS) // 50% -> None
  assert.equal(r.tier.rate, 0)
  assert.equal(r.nextTierInfo.nextTierName, 'Tier 1')
  assert.equal(r.nextTierInfo.requiredSales, 85000)
  assert.equal(r.nextTierInfo.deficit, 35000)
})

test('calculateIncentive: top tier reports extra earned over the threshold', () => {
  const r = calculateIncentive(100000, 120000, 12000, 10, 50, TIERS) // Tier 3
  assert.equal(r.nextTierInfo.isMaxTier, true)
  // 3.5% of 120k minus 3.5% of (111% of 100k) = 4200 - 3885 = 315 (float-safe)
  assert.ok(Math.abs(r.nextTierInfo.extraIncentive - 315) < 1e-6)
})

// ---------- validation (bad input must not produce silent wrong totals) ----------

test('calculateIncentive: rejects non-positive target', () => {
  assert.ok(calculateIncentive(0, 120000, 12000, 10, 50, TIERS).error)
})

test('calculateIncentive: rejects zero team sales', () => {
  assert.ok(calculateIncentive(100000, 0, 0, 10, 50, TIERS).error)
})

test('calculateIncentive: rejects personal sales exceeding team sales', () => {
  assert.ok(calculateIncentive(100000, 120000, 130000, 10, 50, TIERS).error)
})

test('calculateIncentive: rejects negative personal sales', () => {
  assert.ok(calculateIncentive(100000, 120000, -1, 10, 50, TIERS).error)
})

test('calculateIncentive: rejects NaN input', () => {
  assert.ok(calculateIncentive(NaN, 120000, 12000, 10, 50, TIERS).error)
})

test('calculateIncentive: rejects zero staff count', () => {
  assert.ok(calculateIncentive(100000, 120000, 12000, 0, 50, TIERS).error)
})

// ---------- P1 + P2 pools always reconcile to the total pool ----------

test('calculateIncentive: P1 + P2 pools equal the total pool', () => {
  for (const p1 of [0, 25, 50, 75, 100]) {
    const r = calculateIncentive(100000, 118500, 20000, 7, p1, TIERS)
    assert.ok(Math.abs(r.p1Pool + r.p2Pool - r.totalPool) < 1e-9, `split ${p1} should reconcile`)
  }
})

// ---------- formatCurrency ----------

test('formatCurrency: thousands separators and 2 decimals', () => {
  assert.equal(formatCurrency(1234567.5), '1,234,567.50')
  assert.equal(formatCurrency(0), '0.00')
})
