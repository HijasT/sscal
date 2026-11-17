'use client'
import { useEffect, useMemo, useState } from 'react'
import type { ExcelData } from '@/lib/excelTypes'
import type { BulkCalculatedData, BulkResult } from '@/lib/bulkCalculation'
import { inferJoinerEligibility } from '@/lib/joinerInference'
import { previewMrKrabs } from '@/lib/mrKrabsPreview'
import { readEnginePreferences, type EnginePreferences } from '@/lib/enginePreferences'
import { formatCurrency } from '@/lib/utils'

interface Props {
  sheet: ExcelData
  workbookSheets: readonly ExcelData[]
  results: readonly BulkResult[]
  calculation: BulkCalculatedData
}
function cellKey(name: string, sheet: string, address: string) {
  return JSON.stringify([name, sheet, address])
}

export function DubaiItComparisonPanel({ sheet, workbookSheets, results, calculation }: Props) {
  const [preferences, setPreferences] = useState<EnginePreferences>({ engine: 'legacy', bonusAed: 500 })
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [verified, setVerified] = useState<Record<string, number>>({})
  const [eligibleDrafts, setEligibleDrafts] = useState<Record<string, string>>({})
  const [eligibleConfirmed, setEligibleConfirmed] = useState<Record<string, number>>({})
  const [inputError, setInputError] = useState('')
  useEffect(() => { setPreferences(readEnginePreferences()) }, [])
  useEffect(() => {
    // All manual confirmations are scoped to this parsed upload and month.
    setDrafts({})
    setVerified({})
    setEligibleDrafts({})
    setEligibleConfirmed({})
    setInputError('')
  }, [sheet])

  const joiners = useMemo(() => inferJoinerEligibility(sheet, workbookSheets), [sheet, workbookSheets])
  const joinersByName = new Map(joiners.map(p => [p.employee, p]))
  const relevant = results.map(person => {
    const source = sheet.staff.find(p => p.name === person.name)
    const cells = source?.dubaiItCells ?? []
    const pending = cells.filter(cell => cell.status === 'review' &&
      !Object.prototype.hasOwnProperty.call(verified, cellKey(person.name, cell.sourceSheet ?? sheet.sheetName, cell.address)))
    const count = cells.reduce((sum, cell) => sum + (cell.status === 'verified' ?
      cell.detected : (verified[cellKey(person.name, cell.sourceSheet ?? sheet.sheetName, cell.address)] ?? 0)), 0)
    const inference = joinersByName.get(person.name)
    const eligibility = inference?.status === 'existing' ? inference.daysInMonth : eligibleConfirmed[person.name]
    return { person, cells, count, pending, inference, eligibility }
  })
  const pendingCells = relevant.flatMap(({person,pending}) => pending.map(cell => ({person,cell})))
  const unconfirmedEligibility = relevant.filter(p => p.eligibility === undefined)
  const isVerified = pendingCells.length === 0
  const teamEligibleDaysVerified = unconfirmedEligibility.length === 0
  const achievement = calculation.teamAchievement
  const legacyBonusAllowed = achievement >= 80
  const bonus = (count: number) => legacyBonusAllowed ? count * preferences.bonusAed : 0
  const preview = isVerified && teamEligibleDaysVerified ? previewMrKrabs({
    teamTarget: calculation.target,
    period: sheet.sheetName,
    daysInMonth: joiners[0]?.daysInMonth ?? 0,
    bonusAed: preferences.bonusAed,
    staff: relevant.map(p => ({ name:p.person.name, sales:p.person.sales,
      fullPriceDubaiItCount:p.count, eligibleCalendarDays:p.eligibility! })),
  }) : null
  const legacyTotal = relevant.reduce((sum,p)=>sum+p.person.totalIncentive,0)
  const potentialBonus = relevant.reduce((sum,p)=>sum+bonus(p.count),0)
  const approveCell = (name: string, cell: (typeof pendingCells)[number]['cell']) => {
    const key = cellKey(name, cell.sourceSheet ?? sheet.sheetName, cell.address)
    const raw = drafts[key]
    const number = Number(raw)
    if (raw === undefined || raw.trim() === '' || !Number.isSafeInteger(number) ||
        number < 0 || number > Math.floor((cell.sales + 0.005) / 10000)) {
      setInputError(`Enter a valid Dubai It count for ${name} / ${cell.address}; cannot exceed recorded sales.`)
      return
    }
    setVerified(prev=>({...prev,[key]:number}))
    setInputError('')
  }
  const approveEligibility = (name: string, maxDays: number) => {
    const raw = eligibleDrafts[name]
    const days = Number(raw)
    if (raw === undefined || raw.trim() === '' || !Number.isInteger(days) || days < 0 || days > maxDays) {
      setInputError(`Enter 0–${maxDays} eligible calendar days for ${name}.`)
      return
    }
    setEligibleConfirmed(p=>({...p,[name]:days}))
    setInputError('')
  }
  return (
    <section className="card" aria-label="Dubai It detection and engine comparison" style={{marginBottom:'24px',padding:'18px'}}>
      <h3 style={{fontWeight:700,marginBottom:8}}>Dubai It · Engine Comparison</h3>
      <p style={{fontSize:13,color:'var(--text-secondary)',marginBottom:12}}>
        Active preference: <strong>{preferences.engine === 'mr-krabs' ? 'Mr. Krabs Engine' : 'Legacy Engine'}</strong>.
        The official ranking below remains the existing Legacy calculation. Bonus comparisons are simulations.
        Mr. Krabs amounts are comparison simulations, not management-approved payroll. No Mr. Krabs payouts are included in the existing official Legacy CSV/PDF exports.
      </p>
      {preferences.bonusAed !== 500 && <p role="status" style={{color:'var(--warning)'}}>
        Configured AED {formatCurrency(preferences.bonusAed)} bonus differs from the published AED 500; simulation only.
      </p>}
      <p style={{fontSize:13,marginBottom:10}}>
        Dubai It verification: <strong>{pendingCells.length} unreviewed sales cells</strong>. Joining eligibility:
        <strong> {unconfirmedEligibility.length} unconfirmed staff</strong>.
      </p>
      {inputError && <p role="alert" style={{color:'var(--error)',marginBottom:10}}>{inputError}</p>}
      {pendingCells.length > 0 && (
        <details style={{marginBottom:14}} open>
          <summary>Verify uncertain Dubai It sales ({pendingCells.length})</summary>
          <div style={{maxHeight:260,overflowY:'auto'}}>
            {pendingCells.map(({person,cell})=>{
              const key = cellKey(person.name, cell.sourceSheet ?? sheet.sheetName, cell.address)
              return <div key={key} style={{display:'flex',flexWrap:'wrap',alignItems:'center',gap:8,padding:'7px 0',borderBottom:'1px solid var(--border-color)'}}>
                <span style={{fontSize:12,flex:'1 1 280px'}}>{person.name} · Day {cell.day} · {cell.address}
                  · AED {formatCurrency(cell.sales)} · {cell.formula ? '=' + cell.formula : 'No formula'}
                  <span style={{display:'block',color:'var(--text-muted)'}}>{cell.reason}</span>
                </span>
                <input type="number" min="0" max={Math.floor((cell.sales+0.005)/10000)} step="1"
                  style={{width:75}} aria-label={`Dubai It packages for ${person.name} ${cell.address}`}
                  placeholder="Count" value={drafts[key] ?? ''} onChange={e=>setDrafts(prev=>({...prev,[key]:e.target.value}))}/>
                <button type="button" className="btn btn-secondary" onClick={()=>approveCell(person.name,cell)}>Confirm</button>
              </div>
            })}
          </div>
        </details>
      )}
      {unconfirmedEligibility.length > 0 && <details style={{marginBottom:14}} open>
        <summary>Verify calendar eligibility ({unconfirmedEligibility.length})</summary>
        <p style={{fontSize:12,color:'var(--text-secondary)'}}>Missing from previous month is only a new-joiner signal. First 0/sale is a suggested start, not a confirmed joining date.</p>
        <div style={{maxHeight:220,overflowY:'auto'}}>
          {unconfirmedEligibility.map(({person,inference})=><div key={person.name}
            style={{display:'flex',flexWrap:'wrap',alignItems:'center',gap:8,padding:'7px 0',borderBottom:'1px solid var(--border-color)'}}>
            <span style={{fontSize:12,flex:'1 1 280px'}}>{person.name} · {inference?.reason ?? 'Eligibility unknown'}
              {inference?.inferredEligibleDays !== undefined ? ` · Suggested ${inference.inferredEligibleDays} days` : ''}
            </span>
            <input type="number" min="0" max={inference?.daysInMonth ?? 31} step="1"
              style={{width:75}} aria-label={`Eligible days for ${person.name}`}
              placeholder={String(inference?.inferredEligibleDays ?? inference?.daysInMonth ?? '')}
              value={eligibleDrafts[person.name] ?? ''}
              onChange={e=>setEligibleDrafts(p=>({...p,[person.name]:e.target.value}))}/>
            <button type="button" className="btn btn-secondary"
              onClick={()=>approveEligibility(person.name,inference?.daysInMonth ?? 31)}>Confirm</button>
          </div>)}
        </div>
      </details>}
      <div style={{overflowX:'auto',marginBottom:12}}>
        <table style={{minWidth:720,width:'100%',fontSize:12}}>
          <thead><tr><th>Employee</th><th>Dubai It</th><th>Bonus (AED)</th>
            <th>Legacy Original (AED)</th><th>Legacy + Bonus (AED)</th><th>Eligible days</th></tr></thead>
          <tbody>{relevant.map(p=><tr key={p.person.name}>
            <td>{p.person.name}</td>
            <td>{p.pending.length ? 'Review' : p.count}</td>
            <td>{p.pending.length ? 'Pending' : formatCurrency(bonus(p.count))}</td>
            <td>{formatCurrency(p.person.totalIncentive)}</td>
            <td>{p.pending.length ? 'Pending' : formatCurrency(p.person.totalIncentive+bonus(p.count))}</td>
            <td>{p.eligibility === undefined ? 'Confirm' : p.eligibility}</td>
          </tr>)}</tbody>
        </table>
      </div>
      <p style={{fontSize:13}}>
        Legacy Original: AED {formatCurrency(legacyTotal)} · Legacy + Bonus:
        <strong> {isVerified ? 'AED ' + formatCurrency(legacyTotal+potentialBonus) : 'Pending verification'}</strong>
      </p>
      {preview?.ok && <p style={{fontSize:13,marginTop:8}}>
        Mr. Krabs preview ({preview.rate}% tier): Pool AED {formatCurrency(preview.pool)};
        Dubai It bonuses AED {formatCurrency(preview.totalDubaiItBonus)};
        pro-rata deductions AED {formatCurrency(preview.totalProrataReduction)}.
        Redistribution applied once (P1 equally, P2 by revenue). Accounting rounding/unallocated remainder: AED {(preview.accountingRemainderFils / 100).toFixed(2)}. <strong>Comparison only — not an approved payout.</strong>
      </p>}
      {preview?.ok && <div style={{overflowX:'auto',marginTop:12}}>
        <h4 style={{fontSize:13,fontWeight:700,marginBottom:6}}>Mr. Krabs employee comparison (AED) — provisional</h4>
        <table style={{minWidth:750,width:'100%',fontSize:12}}>
          <thead><tr><th>Employee</th><th>P1</th><th>P2</th><th>Reallocated P1</th><th>Reallocated P2</th><th>Dubai It Bonus</th><th>Total</th><th>Difference vs Legacy + Bonus</th></tr></thead>
          <tbody>{preview.staff.map(p => {
            const original = relevant.find(row=>row.person.name===p.name)
            const legacyPlusBonus = original ? original.person.totalIncentive+bonus(original.count) : 0
            return <tr key={p.name}>
              <td>{p.name}</td><td>{formatCurrency(p.p1)}</td><td>{formatCurrency(p.p2)}</td>
              <td>{formatCurrency(p.redistributedP1)}</td><td>{formatCurrency(p.redistributedP2)}</td>
              <td>{formatCurrency(p.dubaiItBonus)}</td><td>{formatCurrency(p.totalIncentive)}</td>
              <td>{formatCurrency(p.totalIncentive-legacyPlusBonus)}</td>
            </tr>
          })}</tbody>
        </table>
      </div>}
      {preview && !preview.ok && <p role="status" style={{fontSize:13,color:'var(--warning)'}}>{preview.error}</p>}
      {(!isVerified || !teamEligibleDaysVerified) && <p style={{fontSize:12,color:'var(--warning)',marginTop:6}}>
        Mr. Krabs preview unavailable until all uncertain sales cells and calendar eligibility entries are confirmed.
      </p>}
    </section>
  )
}
