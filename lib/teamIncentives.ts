/**
 * Official team incentive calculations with independently rounded staff awards.
 * Residual fils are reported to Accounting, never assigned to an employee.
 */
import { calculateIncentive, type CalculationResult, loadTiers } from './utils'
import type { Tier } from './config'
import { accountingRemainder, toFils } from './filsReconciliation'

export interface IncentiveStaffInput { name: string; sales: number }
export interface OfficialStaffPayout {
  name: string
  sales: number
  p1: number
  p2: number
  totalIncentive: number
  contribution: number
}
export interface OfficialTeamPayouts {
  pool: number
  p1Pool: number
  p2Pool: number
  poolFils: number
  staffP1Fils: number
  staffP2Fils: number
  staffTotalFils: number
  p1RemainderFils: number
  p2RemainderFils: number
  remainderFils: number
  staff: OfficialStaffPayout[]
}
export type OfficialTeamOutcome =
  | { ok: true; value: OfficialTeamPayouts }
  | { ok: false; error: string }

export function calculateTeamIncentives(
  target: number,
  roster: readonly IncentiveStaffInput[],
  p1Percent: number,
  tiers: Tier[] = loadTiers()
): OfficialTeamOutcome {
  if (!roster.length) return { ok: false, error: 'No active staff available for calculation' }
  const teamSales = roster.reduce((sum, p) => sum + p.sales, 0)
  const raw: CalculationResult[] = []
  for (const person of roster) {
    const result = calculateIncentive(target, teamSales, person.sales, roster.length, p1Percent, tiers)
    if (result.error) return { ok: false, error: result.error }
    raw.push(result)
  }

  try {
    const poolFils = toFils(raw[0].totalPool)
    const p1PoolFils = toFils(raw[0].p1Pool)
    const p2PoolFils = poolFils - p1PoolFils
    if (p2PoolFils < 0) throw new Error('Invalid P1/P2 pool calculation')
    const staffP1 = raw.map(person => toFils(person.myP1))
    const staffP2 = raw.map(person => toFils(person.myP2))
    const staff = roster.map((person, i) => ({
      name: person.name,
      sales: person.sales,
      p1: staffP1[i] / 100,
      p2: staffP2[i] / 100,
      totalIncentive: (staffP1[i] + staffP2[i]) / 100,
      contribution: raw[i].myContribution,
    }))
    const p1 = accountingRemainder(p1PoolFils, staffP1)
    const p2 = accountingRemainder(p2PoolFils, staffP2)
    const total = accountingRemainder(poolFils, staffP1.map((value, i) => value + staffP2[i]))
    return { ok: true, value: {
      pool: poolFils / 100,
      p1Pool: p1PoolFils / 100,
      p2Pool: p2PoolFils / 100,
      poolFils,
      staffP1Fils: p1.staffFils,
      staffP2Fils: p2.staffFils,
      staffTotalFils: total.staffFils,
      p1RemainderFils: p1.remainderFils,
      p2RemainderFils: p2.remainderFils,
      remainderFils: total.remainderFils,
      staff,
    } }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Invalid rounded incentive' }
  }
}
