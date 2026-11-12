import type { ExcelData, StaffData } from './excelUtils'

export interface DailyTotal {
  day: number
  sales: number
  packages: number
  clients: number
  staffDays: number
}

/** Aggregate actual, populated daily staff cells; excluded staff are omitted by caller. */
export function dailyTotals(staff: readonly StaffData[], through: number): DailyTotal[] | null {
  if (!staff.length || staff.some((person) => !Array.isArray(person.daily))) return null
  const byDay: DailyTotal[] = Array.from({ length: through }, (_, i) => ({
    day: i + 1, sales: 0, packages: 0, clients: 0, staffDays: 0,
  }))
  for (const person of staff) {
    for (const entry of person.daily ?? []) {
      if (entry.day < 1 || entry.day > through) continue
      const item = byDay[entry.day - 1]
      item.sales += entry.sales
      item.packages += entry.packages
      item.clients += entry.clients
      item.staffDays++
    }
  }
  return byDay
}

export interface ComparisonMetric {
  label: string
  current: number
  previous: number
  changePercent: number | null
}

export function monthComparison(args: {
  current: ExcelData
  previous: ExcelData
  excludedNames: ReadonlySet<string>
  year: number
  month: number
  now: Date
}): { label: string; metrics: ComparisonMetric[] } | null {
  const { current, previous, excludedNames, year, month, now } = args
  const active = (sheet: ExcelData) => sheet.staff.filter((p) => !excludedNames.has(p.name))
  const a = active(current), b = active(previous)
  if (!a.length || !b.length) return null
  const currentMonth = year === now.getFullYear() && month === now.getMonth() + 1
  let totalsA: DailyTotal
  let totalsB: DailyTotal
  let label = 'Full month versus previous month'
  const sum = (rows: readonly DailyTotal[]): DailyTotal => rows.reduce((acc, r) => ({
    day: r.day,
    sales: acc.sales + r.sales, packages: acc.packages + r.packages,
    clients: acc.clients + r.clients, staffDays: acc.staffDays + r.staffDays,
  }), { day: 0, sales: 0, packages: 0, clients: 0, staffDays: 0 })
  if (currentMonth) {
    const currentCutoff = current.lastReportedDay
    const prevMonthLastDay = new Date(year, month - 1, 0).getDate()
    if (!currentCutoff || currentCutoff > now.getDate() || currentCutoff < 1) return null
    const comparedDays = Math.min(currentCutoff, prevMonthLastDay)
    if (!previous.lastReportedDay || previous.lastReportedDay < comparedDays) return null
    const seriesA = dailyTotals(a, comparedDays)
    const seriesB = dailyTotals(b, comparedDays)
    if (!seriesA || !seriesB) return null
    totalsA = sum(seriesA)
    totalsB = sum(seriesB)
    label = `Days 1–${comparedDays} of each month (like-for-like)`
  } else {
    // Completed historical months can use persisted total values without
    // depending on the optional per-day fields in older uploads.
    totalsA = { day: 0, sales: a.reduce((n,p)=>n+p.sales,0),
      packages: a.reduce((n,p)=>n+p.packages,0), clients: a.reduce((n,p)=>n+(p.clients??0),0),
      staffDays: a.reduce((n,p)=>n+p.workingDays,0) }
    totalsB = { day: 0, sales: b.reduce((n,p)=>n+p.sales,0),
      packages: b.reduce((n,p)=>n+p.packages,0), clients: b.reduce((n,p)=>n+(p.clients??0),0),
      staffDays: b.reduce((n,p)=>n+p.workingDays,0) }
  }
  const metric = (title: string, currentVal: number, previousVal: number): ComparisonMetric => ({
    label: title, current: currentVal, previous: previousVal,
    changePercent: previousVal === 0 ? null : (currentVal - previousVal) / previousVal * 100,
  })
  return { label, metrics: [
    metric('Sales (AED)', totalsA.sales, totalsB.sales),
    metric('Packages', totalsA.packages, totalsB.packages),
    metric('Clients', totalsA.clients, totalsB.clients),
    metric('Sales / staff-day (AED)',
      totalsA.staffDays ? totalsA.sales / totalsA.staffDays : 0,
      totalsB.staffDays ? totalsB.sales / totalsB.staffDays : 0),
  ] }
}

export interface ContributionGroup {
  label: string
  count: number
  sales: number
  share: number
}

export function contributionGroups(staff: readonly StaffData[]): ContributionGroup[] {
  const sorted = [...staff].sort((a,b) => b.sales-a.sales || a.name.localeCompare(b.name))
  const topEnd = Math.ceil(sorted.length * .2)
  const middleEnd = Math.ceil(sorted.length * .5)
  const teamSales = sorted.reduce((sum,p)=>sum+p.sales,0)
  return [
    {label:'Top 20%', members:sorted.slice(0,topEnd)},
    {label:'Middle 30%', members:sorted.slice(topEnd,middleEnd)},
    {label:'Remaining 50%', members:sorted.slice(middleEnd)},
  ].map(({ label, members }) => {
    const sales = members.reduce((n,p)=>n+p.sales,0)
    return { label, count:members.length, sales, share:teamSales>0 ? 100*sales/teamSales:0 }
  })
}

/** Staff productivity, separate from overall volume rankings. */
export function productivityRanking(staff: readonly StaffData[]) {
  return [...staff].map(person => ({
    ...person, perDay:person.workingDays > 0 ? person.sales/person.workingDays : null,
  })).sort((a,b) => (b.perDay ?? -1) - (a.perDay ?? -1) || b.sales-a.sales)
}

/**
 * Compare current official payouts to a hypothetical 0% equal / 100%
 * performance-weighted split, holding team sales and the total pool fixed.
 * Actual payouts come from the Calculator, not from a re-estimation.
 */
export interface PersonalSplitComparison {
  name: string
  sales: number
  actual: number
  personalOnly: number
  delta: number
}

export function comparePersonalSplit(
  staff: readonly (StaffData & { totalIncentive: number })[],
  teamSales: number,
  incentivePool: number
): PersonalSplitComparison[] {
  return staff.map(person => {
    const personalOnly = teamSales > 0 ? person.sales / teamSales * incentivePool : 0
    return {
      name: person.name,
      sales: person.sales,
      actual: person.totalIncentive,
      personalOnly,
      delta: personalOnly - person.totalIncentive,
    }
  }).sort((a,b) => b.sales - a.sales || a.name.localeCompare(b.name))
}
