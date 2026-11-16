/** Shared payout formatting for on-screen, CSV and PDF reports. */
import { formatCurrency } from './utils'
export interface ReportPayout { p1: number; p2: number; totalIncentive: number }
export function formattedPayout(row: ReportPayout): { p1: string; p2: string; total: string } {
  return {
    p1: formatCurrency(row.p1),
    p2: formatCurrency(row.p2),
    total: formatCurrency(row.totalIncentive),
  }
}
