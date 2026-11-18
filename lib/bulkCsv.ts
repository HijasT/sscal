/** Pure CSV report composition; browser downloads are handled by the UI. */
import type { BulkResult, BulkCalculatedData } from './bulkCalculation'
import { formattedPayout } from './reportPayout'
import { accountingSummaryCSV } from './accountingExport'
import { auditRoundedIncentives } from './incentiveAudit'
import { auditLegacyBonusLedger, type LegacyBonusLedger } from './legacyBonus'

function csvText(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value
  return `"${safe.replace(/"/g, '""')}"`
}

export function buildBulkCSV(results: readonly BulkResult[], data: BulkCalculatedData, bonuses?: LegacyBonusLedger): string {
  if (!results.length) throw new Error('Cannot export an empty staff report')
  const issue = auditRoundedIncentives(
    data.teamSales,data.totalPool,data.p1Pool,data.p2Pool,results,data.remainderFils,
  )
  if(issue) throw new Error(issue)
  const bonusSummary = bonuses ? auditLegacyBonusLedger(results,data,bonuses) : null
  const lines=[
    'Rank,Name,Packages,Sales (AED),Clients,Days,Pkg/Day,Sales/Day,Clients/Day,Max KPI Clients,Revenue Share %,P1 (AED),P2 (AED)' + (bonuses ? ',Dubai It Packages,Dubai It Bonus (AED)' : '') + ',Total (AED)',
  ]
  results.forEach((person,index)=>{
    const payout=formattedPayout(person)
    lines.push([
      index+1,csvText(person.name),person.packages,person.sales.toFixed(2),
      person.clients??0,person.workingDays,person.avgPackagesPerDay.toFixed(2),
      person.avgSalesPerDay.toFixed(2),person.avgClientsPerDay.toFixed(2),
      person.maxKpiClients,person.contribution.toFixed(2),
      payout.p1,payout.p2,
      ...(bonusSummary ? [bonusSummary.byEmployee.get(person.name)?.count ?? 0,
        ((bonusSummary.byEmployee.get(person.name)?.amountFils ?? 0) / 100).toFixed(2)] : []),
      bonusSummary ? ((bonusSummary.byEmployee.get(person.name)?.totalFils ?? 0) / 100).toFixed(2) : payout.total,
    ].join(','))
  })
  return lines.join('\n')+'\n\n'+accountingSummaryCSV(data) +
    (bonusSummary ? '"Dubai It Bonus Total (AED)","'+(bonusSummary.totalBonusFils/100).toFixed(2)+'"\n'+
      '"Grand Total Incl. Bonus (AED)","'+(bonusSummary.grandTotalFils/100).toFixed(2)+'"\n' : '')
}
