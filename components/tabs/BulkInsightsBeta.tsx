'use client'

import { useState } from 'react'
import type { ExcelData } from '@/lib/excelUtils'
import { calculateIncentive, formatCurrency, getTier } from '@/lib/utils'
import { projectMonthlySales } from '@/lib/salesProjection'
import { comparePersonalSplit, contributionGroups, dailyTotals, monthComparison, productivityRanking } from '@/lib/bulkInsights'
import { defaultInsightsMonth, insightMonths, monthlyStaff, monthlyIncentives } from '@/lib/insightMonthSelection'

type ViewMode = 'monthly' | 'q1' | 'q2' | 'q3' | 'q4' | 'h1' | 'h2' | 'yearly' | 'alltime'
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const money = (v: number) => 'AED ' + formatCurrency(v)

interface Props {
  excelData: ExcelData[]
  viewMode: ViewMode
  selectedMonth: string
  selectedYear: string
  excludedNames: ReadonlySet<string>
  teamTarget: number
  p1Split: number
}

/** Experimental analytics. Uses uploaded data only; no network or staff profiling. */
export function BulkInsightsBeta({
  excelData, viewMode, selectedMonth, selectedYear, excludedNames,
  teamTarget, p1Split,
}: Props) {
  const [goal, setGoal] = useState<'85' | '100' | '110' | 'custom'>('100')
  const [extraSales, setExtraSales] = useState('0')
  const [selectedPerson, setSelectedPerson] = useState('')
  const [insightMonth, setInsightMonth] = useState('')
  const month = MONTHS.indexOf(selectedMonth) + 1
  const year = selectedYear.length === 2 ? 2000 + Number(selectedYear) : Number(selectedYear)
  // One period for ALL seven insights, independent of the Calculator selector.
  // Prefer the real current month if present; otherwise the latest uploaded month.
  const months = insightMonths(excelData)
  const now = new Date()
  const defaultMonth = defaultInsightsMonth(months, now)
  const selectedKey = months.some(m => m.key === insightMonth) ? insightMonth : defaultMonth
  const chosenMonth = months.find(m => m.key === selectedKey)
  const previousMonth = chosenMonth && months.find(m => {
    const previous = new Date(chosenMonth.year, chosenMonth.month - 2, 1)
    return m.month === previous.getMonth() + 1 && m.year === previous.getFullYear()
  })
  const compare = chosenMonth && previousMonth
    ? monthComparison({
        current: chosenMonth.sheet, previous: previousMonth.sheet,
        excludedNames, year: chosenMonth.year, month: chosenMonth.month, now,
      })
    : null
  const selectedStaff = chosenMonth ? monthlyStaff(chosenMonth.sheet, excludedNames) : []
  const currentCalculatorPeriod = viewMode === 'monthly' &&
    chosenMonth?.month === month && chosenMonth.year === year
  // Respect manual target overrides only for the same month shown by Calculator.
  const chosenSnapshot = chosenMonth
    ? monthlyIncentives(
        chosenMonth.sheet, excludedNames, p1Split,
        currentCalculatorPeriod ? teamTarget : undefined
      )
    : null
  const insightSales = chosenSnapshot?.sales ?? 0
  const insightTarget = chosenSnapshot?.target ?? 0
  const insightPool = chosenSnapshot?.pool ?? 0
  const groups = contributionGroups(selectedStaff)
  const productivity = productivityRanking(selectedStaff)
  const personalSplitRows = chosenSnapshot
    ? comparePersonalSplit(chosenSnapshot.staff, insightSales, insightPool) : []

  const simulatedSales = goal === 'custom'
    ? insightSales + Math.max(0, Number(extraSales) || 0)
    : Math.max(insightSales, insightTarget * Number(goal) / 100)
  const simulatedPct = insightTarget > 0 ? simulatedSales / insightTarget * 100 : 0
  const tier = getTier(simulatedPct)
  const simPool = simulatedSales * tier.rate / 100
  const originalPool = insightPool
  const currentStaff = selectedStaff.length
  const simAvg = currentStaff ? simPool / currentStaff : 0
  const originalAvg = currentStaff ? originalPool / currentStaff : 0
  const example = selectedStaff.find(p => p.name === selectedPerson) ?? selectedStaff[0] ?? null
  const projectedPersonSales = example
    ? insightSales > 0 ? example.sales * simulatedSales / insightSales
      : simulatedSales / currentStaff : 0
  const exampleCalc = example && simulatedSales > 0 && insightTarget > 0
    ? calculateIncentive(insightTarget, simulatedSales, projectedPersonSales, currentStaff, p1Split)
    : null

  const selectedProjection = chosenMonth && chosenSnapshot
    ? projectMonthlySales({
        sales: insightSales, target: insightTarget, year: chosenMonth.year,
        month: chosenMonth.month, lastReportedDay: chosenMonth.sheet.lastReportedDay,
        now,
      }) : null
  const paceGap = selectedProjection ? Math.max(0, insightTarget - insightSales) : 0
  const daysRemaining = selectedProjection
    ? selectedProjection.daysInMonth - selectedProjection.cutoff : 0
  const requiredPace = daysRemaining > 0 ? paceGap / daysRemaining : 0
  const currentPace = selectedProjection?.dailySales ?? 0
  const paceChange = currentPace > 0 ? (requiredPace / currentPace - 1) * 100 : null

  const paceYear = chosenMonth?.year ?? year
  const paceMonthNum = chosenMonth?.month ?? month
  const daysInMonth = chosenMonth ? new Date(paceYear, paceMonthNum, 0).getDate() : 0
  const recordedCutoff = chosenMonth?.sheet.lastReportedDay ?? 0
  const cutoff = recordedCutoff >= 1 && recordedCutoff <= daysInMonth
    ? Math.min(recordedCutoff, paceYear === now.getFullYear() &&
      paceMonthNum === now.getMonth() + 1 ? now.getDate() : daysInMonth) : 0
  const series = chosenMonth && cutoff ? dailyTotals(selectedStaff, cutoff) : null
  const cumulative = series?.map((r, i) => ({
    day: r.day, sales: series.slice(0, i + 1).reduce((n, x) => n + x.sales, 0),
  })) ?? []
  const paceTarget = insightTarget
  const chartMax = Math.max(paceTarget, ...cumulative.map(p => p.sales), 1) * 1.1
  const x = (day: number) => 44 + (day / (daysInMonth || 1)) * 600
  const y = (sales: number) => 194 - sales / chartMax * 164
  const actualPath = cumulative.length
    ? ['0,' + y(0), ...cumulative.map(p => `${p.day},${y(p.sales)}`)]
      .map((pt, i) => {
        const [day, yy] = pt.split(',').map(Number)
        return `${i ? 'L' : 'M'} ${x(day)} ${yy}`
      }).join(' ') : ''
  const targetPath = `M ${x(0)} ${y(0)} L ${x(daysInMonth)} ${y(paceTarget)}`

  return (
    <div className="beta-insights">
      <div className="beta-head">
        <div>
          <h3>Performance Insights <span className="beta-label">BETA</span></h3>
          <p>Exploratory sales analytics based on the selected month of your uploaded workbook.</p>
        </div>
        <label className="beta-month-picker" htmlFor="beta-insights-month">
          Month
          <select id="beta-insights-month" value={selectedKey}
            onChange={e => setInsightMonth(e.target.value)} disabled={!months.length}>
            {months.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
          </select>
        </label>
      </div>

      <section className="beta-panel" aria-labelledby="beta-daily-title">
        <h4 id="beta-daily-title">1. Daily sales needed to reach 100%</h4>
        {selectedProjection ? (
          <>
            <div className="beta-kpis">
              <div><span>Current daily pace</span><strong>{money(currentPace)}</strong></div>
              <div><span>Required remaining pace</span><strong>{paceGap === 0 ? 'Target achieved' : daysRemaining > 0 ? money(requiredPace) : 'Month complete'}</strong></div>
              <div><span>Days remaining</span><strong>{daysRemaining}</strong></div>
            </div>
            <p className="beta-note">
              {paceGap === 0 ? 'The team has already reached 100% of its target.'
                : daysRemaining <= 0 ? 'No calendar days remain to close the target gap.'
                  : paceChange === null ? 'No current daily sales pace to compare against yet.'
                    : paceChange > 0 ? `Daily sales need to increase ${paceChange.toFixed(1)}% from the current pace.`
                      : `Current pace is ${Math.abs(paceChange).toFixed(1)}% above the pace needed to reach 100%.`}
            </p>
            <p className="beta-note">Based on recorded sales through {selectedProjection.cutoff} {chosenMonth?.label}; remaining calendar days are used.</p>
          </>
        ) : <p className="beta-empty">Available for the current month when the workbook contains dated daily sales records.</p>}
      </section>

      <section className="beta-panel" aria-labelledby="beta-sim-title">
        <h4 id="beta-sim-title">2. Incentive scenario simulator</h4>
        <p className="beta-note">Hypothetical team sales with your current P1/P2 split and tier settings. This does not change actual incentives.</p>
        <div className="beta-scenario-actions" role="group" aria-label="Select sales scenario">
          {(['85','100','110','custom'] as const).map(value => (
            <button type="button" key={value} className={goal === value ? 'is-active' : ''}
              aria-pressed={goal === value} onClick={() => setGoal(value)}>
              {value === 'custom' ? 'Add sales' : `${value}% target`}
            </button>
          ))}
        </div>
        {goal === 'custom' && (
          <label className="beta-custom-input">Additional team sales (AED)
            <input type="number" min="0" step="100" value={extraSales} onChange={e => setExtraSales(e.target.value)} />
          </label>
        )}
        {chosenSnapshot ? <div className="beta-kpis">
          <div><span>Projected team sales</span><strong>{money(simulatedSales)}</strong></div>
          <div><span>Achievement · tier</span><strong>{simulatedPct.toFixed(1)}% · {tier.rate}%</strong></div>
          <div><span>Projected incentive pool</span><strong>{money(simPool)}</strong></div>
          <div><span>Change in incentive pool</span><strong>{money(simPool - originalPool)}</strong></div>
          <div><span>Average incentive / staff</span><strong>{money(simAvg)}</strong></div>
          <div><span>Increase in average incentive</span><strong>{money(simAvg - originalAvg)}</strong></div>
        </div> : <p className="beta-empty">The selected month needs a valid team target and active staff to simulate incentives.</p>}
        {example && (
          <label className="beta-custom-input">Illustrative staff incentive
            <select value={example.name} onChange={e => setSelectedPerson(e.target.value)}>
              {selectedStaff.map(p => <option value={p.name} key={p.name}>{p.name}</option>)}
            </select>
          </label>
        )}
        {example && exampleCalc && !exampleCalc.error && (
          <p className="beta-note">If additional sales follow existing sales shares, {example.name} would receive approximately <strong>{money(exampleCalc.myTotal)}</strong> (P1: {money(exampleCalc.myP1)}, P2: {money(exampleCalc.myP2)}). This is a hypothetical distribution, not a guaranteed payout.</p>
        )}
      </section>

      <section className="beta-panel" aria-labelledby="beta-rank-title">
        <h4 id="beta-rank-title">3. Productivity ranking · sales per working day</h4>
        <p className="beta-note">Adjusts for different shift counts. Staff with no recorded working days are listed last.</p>
        <div className="beta-scroll">
          <table className="beta-table"><thead><tr><th>Rank</th><th>Staff</th><th>Sales / day</th><th>Working days</th><th>Total sales</th></tr></thead>
            <tbody>{productivity.map((p, i) => <tr key={p.name}>
              <td>#{i + 1}</td><td>{p.name}</td>
              <td>{p.perDay == null ? 'N/A' : money(p.perDay)}</td>
              <td>{p.workingDays}</td><td>{money(p.sales)}</td>
            </tr>)}</tbody>
          </table>
        </div>
      </section>

      <section className="beta-panel" aria-labelledby="beta-compare-title">
        <h4 id="beta-compare-title">4. Previous-month comparison</h4>
        {compare ? (
          <>
            <p className="beta-note">{chosenMonth?.label} compared with {previousMonth?.label}. {compare.label}. Results use the same staff exclusions.</p>
            <div className="beta-scroll"><table className="beta-table">
              <thead><tr><th>Metric</th><th>Selected month</th><th>Previous month</th><th>Change</th></tr></thead>
              <tbody>{compare.metrics.map(m => <tr key={m.label}><td>{m.label}</td>
                <td>{m.label.includes('AED') ? money(m.current) : formatCurrency(m.current)}</td>
                <td>{m.label.includes('AED') ? money(m.previous) : formatCurrency(m.previous)}</td>
                <td>{m.changePercent == null ? 'N/A' : `${m.changePercent >= 0 ? '+' : ''}${m.changePercent.toFixed(1)}%`}</td>
              </tr>)}</tbody>
            </table></div>
          </>
        ) : <p className="beta-empty">Monthly comparison requires the selected month and the preceding month in the workbook. For the current month, both months need dated daily records to compare equivalent elapsed days.</p>}
      </section>

      <section className="beta-panel" aria-labelledby="beta-distribution-title">
        <h4 id="beta-distribution-title">5. Sales contribution distribution</h4>
        <p className="beta-note">Employees are ranked by total sales and grouped by headcount. Group boundaries are rounded up to whole employees.</p>
        <div className="beta-distribution" role="img" aria-label={groups.map(g => `${g.label}: ${g.share.toFixed(1)}% of sales`).join('; ')}>
          {groups.map((g, i) => <div key={g.label} className={`beta-segment beta-segment-${i}`}
            style={{width:`${g.share}%`}} title={`${g.label}: ${g.share.toFixed(1)}%`} />)}
        </div>
        <div className="beta-scroll"><table className="beta-table">
          <thead><tr><th>Group</th><th>Staff</th><th>Sales</th><th>Revenue share</th></tr></thead>
          <tbody>{groups.map((g, i) => <tr key={g.label}><td><span className={`beta-dot beta-segment-${i}`} />{g.label}</td>
            <td>{g.count}</td><td>{money(g.sales)}</td><td>{g.share.toFixed(1)}%</td></tr>)}</tbody>
        </table></div>
      </section>

      <section className="beta-panel" aria-labelledby="beta-chart-title">
        <h4 id="beta-chart-title">6. Cumulative sales pace</h4>
        {chosenMonth && paceTarget > 0 && series && series.some(d => d.staffDays > 0) ? (
          <>
            <p className="beta-note">Actual recorded sales versus a straight-line pace to the monthly target. Actual line ends at the last reported day.</p>
            <svg viewBox="0 0 680 240" className="beta-line-chart" role="img"
              aria-label={`Cumulative sales up to day ${cutoff}, compared with the target pace to day ${daysInMonth}`}>
              {[0,.5,1].map(f => <g key={f}>
                <line x1="44" x2="644" y1={y(chartMax*f)} y2={y(chartMax*f)} stroke="currentColor" opacity=".12" />
                <text x="38" y={y(chartMax*f) + 4} textAnchor="end" fontSize="10" fill="currentColor">{Math.round(chartMax*f/1000)}k</text>
              </g>)}
              <path d={targetPath} fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeDasharray="6 5" />
              <path d={actualPath} fill="none" stroke="var(--accent-primary)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              {cumulative.length > 0 && <circle cx={x(cutoff)} cy={y(cumulative[cumulative.length - 1].sales)} r="4" fill="var(--accent-primary)" />}
              <text x="44" y="219" fontSize="11" fill="currentColor">Day 1</text>
              <text x="644" y="219" textAnchor="end" fontSize="11" fill="currentColor">Day {daysInMonth}</text>
            </svg>
            <div className="beta-chart-legend">
              <span><i className="beta-actual-key" /> Actual through day {cutoff}</span>
              <span><i className="beta-target-key" /> Required target pace</span>
            </div>
          </>
        ) : <p className="beta-empty">The chosen month needs dated staff sales entries and a valid team target. Re-upload the workbook if it was cached before Beta Insights.</p>}
      </section>
      <section className="beta-panel" aria-labelledby="beta-personal-split-title">
        <h4 id="beta-personal-split-title">7. Incentive comparison · 100% personal split</h4>
        <p className="beta-note">
          {chosenMonth?.label}: Compare each person's actual incentive (current P1 {p1Split}% / P2 {100-p1Split}%)
          against a hypothetical P1 0% / P2 100% distribution. Both use the
          same team sales, tier and total pool of {money(insightPool)}.
          Green positive delta means the person would earn more without the equal split;
          red negative delta means they would earn less.
        </p>
        {chosenSnapshot ? <div className="beta-scroll">
          <table className="beta-table">
            <thead>
              <tr>
                <th>Staff</th>
                <th>Sales</th>
                <th>Actual incentive</th>
                <th>100% personal split</th>
                <th>Delta</th>
              </tr>
            </thead>
            <tbody>
              {personalSplitRows.map(person => (
                <tr key={person.name}>
                  <td>{person.name}</td>
                  <td>{money(person.sales)}</td>
                  <td>{money(person.actual)}</td>
                  <td>{money(person.personalOnly)}</td>
                  <td className={person.delta > 0.005 ? 'beta-delta-positive' : person.delta < -0.005 ? 'beta-delta-negative' : undefined}>
                    {person.delta > 0.005 ? '+' : person.delta < -0.005 ? '−' : ''}
                    {money(Math.abs(person.delta))}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr>
              <th>Team total</th>
              <td>{money(insightSales)}</td>
              <td>{money(personalSplitRows.reduce((sum,person) => sum+person.actual,0))}</td>
              <td>{money(personalSplitRows.reduce((sum,person) => sum+person.personalOnly,0))}</td>
              <td>—</td>
            </tr></tfoot>
          </table>
        </div> : <p className="beta-empty">Select a month with a valid target and staff sales data.</p>}
        <p className="beta-note">This is a redistribution scenario, not an increase in the incentive pool or a change to official payouts. Minor rounding differences may appear.</p>
      </section>
      <p className="beta-footnote">Beta calculations are estimates and exploratory comparisons. They run locally using your uploaded data; they do not modify your official ranking, incentives or exports.</p>
    </div>
  )
}
