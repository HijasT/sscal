/** Simple calendar-day run-rate forecast for a current, in-progress month. */
export interface MonthlySalesProjection {
  cutoff: number
  daysInMonth: number
  currentPercent: number
  projectedPercent: number
  projectedSales: number
  dailySales: number
  scaleMax: number
  targetDay: number | null
  targetReached: boolean
}

export function projectMonthlySales(args: {
  sales: number
  target: number
  year: number
  month: number // 1–12
  lastReportedDay?: number
  now: Date
}): MonthlySalesProjection | null {
  const { sales, target, year, month, lastReportedDay, now } = args
  if (!Number.isFinite(sales) || !Number.isFinite(target) || target <= 0 || sales < 0) return null
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) return null
  if (now.getFullYear() !== year || now.getMonth() + 1 !== month) return null
  const daysInMonth = new Date(year, month, 0).getDate()
  if (!Number.isInteger(lastReportedDay) || !lastReportedDay ||
      lastReportedDay < 1 || lastReportedDay > daysInMonth ||
      lastReportedDay > now.getDate()) return null
  const cutoff = lastReportedDay
  const dailySales = sales / cutoff
  const projectedSales = dailySales * daysInMonth
  const currentPercent = sales / target * 100
  const projectedPercent = projectedSales / target * 100
  const targetReached = sales >= target
  const dayToTarget = dailySales > 0 ? Math.ceil(target / dailySales - 1e-10) : Infinity
  const targetDay = !targetReached && dayToTarget > cutoff && dayToTarget <= daysInMonth
    ? dayToTarget : null
  const scaleMax = Math.max(100, Math.ceil(Math.max(currentPercent, projectedPercent) / 25) * 25)
  return {
    cutoff, daysInMonth, currentPercent, projectedPercent,
    projectedSales, dailySales, scaleMax, targetDay, targetReached,
  }
}
