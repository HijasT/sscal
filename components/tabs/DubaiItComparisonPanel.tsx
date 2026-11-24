'use client'
import { useEffect, useMemo, useState } from 'react'
import type { ExcelData } from '@/lib/excelTypes'
import type { BulkCalculatedData, BulkResult } from '@/lib/bulkCalculation'
import { inferJoinerEligibility } from '@/lib/joinerInference'
import { previewMrKrabs, previewScrooge } from '@/lib/mrKrabsPreview'
import type { IncentiveEngineChoice } from '@/lib/enginePreferences'
import type { MrKrabsPreviewOutcome } from '@/lib/mrKrabsPreview'
import { formatCurrency, loadTiers } from '@/lib/utils'

interface Props {
  sheet: ExcelData
  workbookSheets: readonly ExcelData[]
  results: readonly BulkResult[]
  calculation: BulkCalculatedData
  selectedEngine: IncentiveEngineChoice
  bonusAed: number
  onPreviewChange: (evidence: {engine: IncentiveEngineChoice; preview: MrKrabsPreviewOutcome | null; counts: Record<string, number | null>; discountedCounts: Record<string, number | null>; bonusAed: number}) => void
}
function cellKey(name: string, sheet: string, address: string) {
  return JSON.stringify([name, sheet, address])
}

export function DubaiItComparisonPanel({ sheet, workbookSheets, results, calculation, selectedEngine, bonusAed, onPreviewChange }: Props) {
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [verified, setVerified] = useState<Record<string, number>>({})
  const [eligibleDrafts, setEligibleDrafts] = useState<Record<string, string>>({})
  const [eligibleConfirmed, setEligibleConfirmed] = useState<Record<string, number>>({})
  const [inputError, setInputError] = useState('')
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
    const discountedCount = cells.reduce((sum, cell) =>
      sum + (cell.status === 'verified' ? (cell.discountedDetected ?? 0) : 0), 0)
    return { person, cells, count, discountedCount, pending, inference, eligibility }
  })
  const pendingCells = relevant.flatMap(({person,pending}) => pending.map(cell => ({person,cell})))
  const unconfirmedEligibility = relevant.filter(p => p.eligibility === undefined)
  const unconfirmedRoster = relevant.filter(p => !p.inference || (p.inference.status !== 'existing' && p.inference.status !== 'potential-new-joiner'))
  const isVerified = pendingCells.length === 0
  const teamEligibleDaysVerified = unconfirmedEligibility.length === 0
  const preview = isVerified && teamEligibleDaysVerified && unconfirmedRoster.length === 0 ? (selectedEngine === 'scrooge' ? previewScrooge : previewMrKrabs)({
    teamTarget: calculation.target,
    period: sheet.sheetName,
    daysInMonth: joiners[0]?.daysInMonth ?? 0,
    bonusAed: bonusAed,
    tiers: loadTiers(),
    staff: relevant.map(p => ({ name:p.person.name, sales:p.person.sales,
      fullPriceDubaiItCount:p.count, eligibleCalendarDays:p.eligibility!,
      isExistingStaff:p.inference!.status === 'existing' })),
  }) : null
  const evidence = {
    preview,
    engine: selectedEngine,
    counts: Object.fromEntries(relevant.map(p => [p.person.name, p.pending.length ? null : p.count])) as Record<string, number | null>,
    discountedCounts: Object.fromEntries(relevant.map(p => [p.person.name, p.pending.length ? null : p.discountedCount])) as Record<string, number | null>,
    bonusAed,
  }
  const previewSignature = JSON.stringify(evidence)
  useEffect(() => {
    onPreviewChange(evidence)
    // Serialization keeps parent updates stable across child rerenders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewSignature, onPreviewChange])
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
    <section className="card" aria-label="Mr. Krabs input verification" style={{marginBottom:'24px',padding:'18px'}}>
      <h3 style={{fontWeight:700,marginBottom:8}}>Dubai It · Input Verification</h3>
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
      {preview && !preview.ok && <p role="status" style={{fontSize:13,color:'var(--warning)'}}>{preview.error}</p>}
      {unconfirmedRoster.length > 0 && <p role="alert" style={{fontSize:12,color:'var(--warning)',marginTop:6}}>
        Previous-month roster classification unavailable for {unconfirmedRoster.length} staff. Mr. Krabs calculations are blocked until the previous month is supplied.
      </p>}
      {(!isVerified || !teamEligibleDaysVerified || unconfirmedRoster.length > 0) && <p style={{fontSize:12,color:'var(--warning)',marginTop:6}}>
        Selected engine ranking unavailable until uncertain sales cells, employee roster classifications and calendar eligibility are confirmed.
      </p>}
    </section>
  )
}
