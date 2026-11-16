/**
 * Phase 3: pure bulk calculation boundary. No DOM, storage, React, or exports.
 * This module owns staff selection, rounding, payout auditing, and report data.
 */
import type { ExcelData, StaffData } from './excelUtils'
import { aggregateSheets } from './excelUtils'
import { getTier, loadTiers } from './utils'
import { calculateTeamIncentives } from './teamIncentives'
import { auditRoundedIncentives } from './incentiveAudit'
import type { Tier } from './config'
import { validateStaffRoster } from './rosterValidation'

export type BulkViewMode = 'monthly'|'q1'|'q2'|'q3'|'q4'|'h1'|'h2'|'yearly'|'alltime'

export interface BulkResult extends StaffData {
  achievement: number
  tierName: string
  tierRate: number
  totalIncentive: number
  p1: number
  p2: number
  contribution: number
  avgPackagesPerDay: number
  avgSalesPerDay: number
  avgClientsPerDay: number
  maxKpiClients: number
}

export interface BulkCalculatedData {
  teamAchievement: number
  tier: Tier
  totalPool: number
  p1Pool: number
  p2Pool: number
  payoutPolicy: 'accounting-remainder-v1'
  remainderFils: number
  staffTotalFils: number
  target: number
  teamSales: number
  teamPackages: number
  teamClients: number
  avgSales: number
  avgPackages: number
  avgClients: number
  staffCount: number
  excludedCount: number
  sheets: string[]
  viewMode: BulkViewMode
  p1Split: number
}
export type BulkCalculationOutcome =
  | { ok: true; results: BulkResult[]; data: BulkCalculatedData; autoTarget: number; sourceStaffCount: number }
  | { ok: false; error: string; autoTarget?: number; sourceStaffCount?: number }

export function selectBulkSheets(
  excelData: readonly ExcelData[], mode: BulkViewMode, month: string, year: string,
): ExcelData[] {
  if (mode === 'alltime') return [...excelData]
  if (mode === 'yearly') return excelData.filter(d => d.sheetName.includes(year))
  if (mode === 'monthly') {
    const name = `${month} ${year}`.trim()
    return excelData.filter(d => d.sheetName === name || d.sheetName === `${month}${year}`)
  }
  const periods: Record<Exclude<BulkViewMode,'alltime'|'yearly'|'monthly'>, string[]> = {
    q1:['Jan','Feb','Mar'], q2:['Apr','May','Jun'],
    q3:['Jul','Aug','Sep'], q4:['Oct','Nov','Dec'],
    h1:['Jan','Feb','Mar','Apr','May','Jun'],
    h2:['Jul','Aug','Sep','Oct','Nov','Dec'],
  }
  return excelData.filter(d => {
    const [m,y] = d.sheetName.split(' ')
    return periods[mode].includes(m) && y === year
  })
}

export function calculateBulkReport(input: {
  sheets: readonly ExcelData[]
  manualTarget: string
  p1Split: number
  excludedStaff: ReadonlySet<string>
  viewMode: BulkViewMode
  tiers?: Tier[]
}): BulkCalculationOutcome {
  const { sheets, manualTarget, p1Split, excludedStaff, viewMode } = input
  if (!sheets.length) return { ok:false,error:'No sheets found for the selected view.' }
  const aggregated = sheets.length === 1 ? sheets[0] : aggregateSheets([...sheets])
  if (!aggregated.staff.length) return { ok:false,error:'No staff data was found for the selected view.' }
  const rosterError = validateStaffRoster(aggregated.staff)
  if (rosterError) return { ok:false,error:rosterError }
  const autoTarget = aggregated.target
  const sourceStaffCount = aggregated.staff.length
  const finalTarget = manualTarget.trim() ? Number(manualTarget) : autoTarget
  if (!Number.isFinite(finalTarget) || finalTarget <= 0) {
    return { ok:false,error:'Enter a valid Team Target or correct the Excel sheet.',autoTarget,sourceStaffCount }
  }
  const staff = aggregated.staff.filter(p => !excludedStaff.has(p.name))
  if (!staff.length) return { ok:false,error:'Keep at least one staff member included.',autoTarget,sourceStaffCount }
  const n = staff.length
  const teamSales=staff.reduce((sum,p)=>sum+p.sales,0)
  const teamPackages=staff.reduce((sum,p)=>sum+p.packages,0)
  const teamClients=staff.reduce((sum,p)=>sum+(p.clients??0),0)
  const tiers=input.tiers ?? loadTiers()
  const payout=calculateTeamIncentives(finalTarget,staff,p1Split,tiers)
  if ('error' in payout) return { ok:false,error:payout.error,autoTarget,sourceStaffCount }
  const {pool:totalPool,p1Pool,p2Pool,remainderFils,staffTotalFils}=payout.value
  const achievement=teamSales/finalTarget*100
  const tier=getTier(achievement,tiers)
  const results:BulkResult[]=staff.map((person,index)=>{
    const award=payout.value.staff[index]
    const days=Math.max(person.workingDays,1)
    const clients=person.clients??0
    return {
      ...person,
      achievement,
      tierName:tier.name,
      tierRate:tier.rate,
      totalIncentive:award.totalIncentive,
      p1:award.p1,
      p2:award.p2,
      contribution:award.contribution,
      avgPackagesPerDay:person.packages/days,
      avgSalesPerDay:person.sales/days,
      avgClientsPerDay:clients/days,
      maxKpiClients:clients*20,
    }
  })
  const issue=auditRoundedIncentives(teamSales,totalPool,p1Pool,p2Pool,results,remainderFils)
  if(issue) return {ok:false,error:issue,autoTarget,sourceStaffCount}
  results.sort((a,b)=>b.sales-a.sales)
  return {ok:true,results,autoTarget,sourceStaffCount,data:{
    teamAchievement:achievement,tier,totalPool,p1Pool,p2Pool,
    payoutPolicy:'accounting-remainder-v1',remainderFils,staffTotalFils,
    target:finalTarget,teamSales,teamPackages,teamClients,
    avgSales:teamSales/n,avgPackages:teamPackages/n,avgClients:teamClients/n,
    staffCount:n,excludedCount:excludedStaff.size,sheets:sheets.map(s=>s.sheetName),
    viewMode,p1Split,
  }}
}
