/**
 * Official roster-aware team incentives, allocated in whole fils.
 * Shared by the Bulk Calculator and the monthly Beta actuals.
 */
import { calculateIncentive, type CalculationResult, loadTiers } from './utils'
import type { Tier } from './config'
import { allocateFilsShares, employeePayoutKey, toFils } from './filsReconciliation'

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
  if (!roster.length) return { ok: false, error: 'No active staff available for allocation' }
  const teamSales = roster.reduce((sum, p) => sum + p.sales, 0)
  const raw: CalculationResult[] = []
  for (const person of roster) {
    const result = calculateIncentive(target, teamSales, person.sales, roster.length, p1Percent, tiers)
    if (result.error) return { ok: false, error: result.error }
    raw.push(result)
  }

  try {
    const keys = roster.map(p => employeePayoutKey(p.name))
    if (new Set(keys).size !== keys.length) {
      return { ok: false, error: 'Duplicate employee identifiers found. Correct the workbook before allocating incentives.' }
    }
    const poolFils = toFils(raw[0].totalPool)
    const p1Fils = toFils(raw[0].p1Pool)
    const p2Fils = poolFils - p1Fils
    if (p2Fils < 0) throw new Error('Invalid P1/P2 pool allocation')
    const p1 = allocateFilsShares(p1Fils, keys.map((id, i) => ({ id, amount: raw[i].myP1 })))
    const p2 = allocateFilsShares(p2Fils, keys.map((id, i) => ({ id, amount: raw[i].myP2 })))
    const staff = roster.map((person, i) => {
      const personalP1 = p1[i].fils / 100
      const personalP2 = p2[i].fils / 100
      return {
        name: person.name, sales: person.sales,
        p1: personalP1, p2: personalP2,
        totalIncentive: (p1[i].fils + p2[i].fils) / 100,
        contribution: raw[i].myContribution,
      }
    })
    return { ok: true, value: {
      pool: poolFils / 100, p1Pool: p1Fils / 100, p2Pool: p2Fils / 100,
      poolFils, staff,
    } }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Invalid fils allocation' }
  }
}
