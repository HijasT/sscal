'use client'
import { useState, useEffect, useRef } from 'react'
import { aggregateSheets, extractEmployeeCode, getPersonId, stripEmployeeCode, type ExcelData, type StaffData } from '@/lib/excelUtils'
import { calculateIncentive, formatCurrency, getTier, loadTiers, loadStaffCenters } from '@/lib/utils'
import { saveTeamData, checkAndAwardBadges, type MonthlyTeamData, type StaffResult } from '@/lib/analyticsUtils'
import { exportBulkToPDF } from '@/lib/pdfUtils'
import { DEFAULT_P1_SPLIT, CENTERS } from '@/lib/config'
import { DownloadIcon } from '@/components/icons'
import { CenterBadge } from '@/components/CenterBadge'

interface BulkResult extends StaffData {
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
  clients?: number
}

type ViewMode = 'monthly' | 'q1' | 'q2' | 'q3' | 'q4' | 'h1' | 'h2' | 'yearly' | 'alltime'
type SortCol = keyof BulkResult

interface Props {
  excelData: ExcelData[]
  viewMode: ViewMode
  selectedMonth: string
  selectedYear: string
}

const TH: React.CSSProperties = {
  padding: '10px 12px',
  textAlign: 'left',
  fontSize: '12px',
  fontWeight: '600',
  color: 'var(--text-primary)',
  cursor: 'pointer',
  userSelect: 'none',
  whiteSpace: 'nowrap',
  background: 'var(--bg-secondary)',
  borderBottom: '2px solid var(--border-color)',
  position: 'sticky',
  top: 0,
  zIndex: 2,
}

const TD: React.CSSProperties = {
  padding: '10px 12px',
  fontSize: '13px',
  color: 'var(--text-secondary)',
  fontFamily: "'JetBrains Mono', monospace",
  whiteSpace: 'nowrap',
}

// Persists computed results so switching tabs (which unmounts this
// component) doesn't lose the last calculation.
const STORAGE_KEY = 'sic_bulk_results'

interface PersistedResults {
  target: string
  autoTarget: number
  staffCount: number
  p1Split: number
  results: BulkResult[]
  calculatedData: any
  excludedStaff: string[]
}

function loadPersistedResults(): Partial<PersistedResults> {
  if (typeof window === 'undefined') return {}
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : {}
  } catch {
    return {}
  }
}

export function BulkResultsView({ excelData, viewMode, selectedMonth, selectedYear }: Props) {
  const persisted = loadPersistedResults()
  const [target, setTarget]           = useState(persisted.target ?? '')
  const [autoTarget, setAutoTarget]   = useState(persisted.autoTarget ?? 0)
  const [staffCount, setStaffCount]   = useState(persisted.staffCount ?? 0)
  const [p1Split, setP1Split]         = useState(persisted.p1Split ?? DEFAULT_P1_SPLIT)
  const [results, setResults]         = useState<BulkResult[]>(persisted.results ?? [])
  const [calculatedData, setCalcData] = useState<any>(persisted.calculatedData ?? null)
  const [sortColumn, setSortCol]      = useState<SortCol>('sales')
  const [sortDir, setSortDir]         = useState<'asc' | 'desc'>('desc')
  const [excludedStaff, setExcluded]  = useState<Set<string>>(new Set(persisted.excludedStaff ?? []))

  // Persist the last calculation so it survives a tab switch/remount.
  useEffect(() => {
    if (typeof window === 'undefined') return
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      target, autoTarget, staffCount, p1Split, results, calculatedData,
      excludedStaff: Array.from(excludedStaff),
    }))
  }, [target, autoTarget, staffCount, p1Split, results, calculatedData, excludedStaff])

  // Clear a previous calculation when a genuinely new file is uploaded while
  // this view is mounted (not on the initial mount/restore from persistence).
  const prevExcelDataRef = useRef(excelData)
  useEffect(() => {
    if (prevExcelDataRef.current !== excelData) {
      prevExcelDataRef.current = excelData
      setResults([])
      setCalcData(null)
      setExcluded(new Set())
    }
  }, [excelData])

  const getSheetsForView = (): ExcelData[] => {
    if (viewMode === 'alltime') return excelData
    if (viewMode === 'yearly')  return excelData.filter(d => d.sheetName.includes(selectedYear))
    if (viewMode === 'monthly') {
      const name = `${selectedMonth} ${selectedYear}`.trim()
      return excelData.filter(d => d.sheetName === name || d.sheetName === `${selectedMonth}${selectedYear}`)
    }
    const quarters: Record<string, string[]> = {
      q1: ['Jan','Feb','Mar'], q2: ['Apr','May','Jun'],
      q3: ['Jul','Aug','Sep'], q4: ['Oct','Nov','Dec'],
      h1: ['Jan','Feb','Mar','Apr','May','Jun'],
      h2: ['Jul','Aug','Sep','Oct','Nov','Dec'],
    }
    const months = quarters[viewMode]
    return excelData.filter(d => {
      const [m, y] = d.sheetName.split(' ')
      return months.includes(m) && y === selectedYear
    })
  }

  const toggleExclude = (name: string) => {
    setExcluded(prev => {
      const next = new Set(prev)
      next.has(name) ? next.delete(name) : next.add(name)
      return next
    })
  }

  const clearExclusions = () => setExcluded(new Set())

  // Recalculates automatically whenever the effective inputs change — a new
  // file is uploaded, the month/period selectors change, or the user tweaks
  // target/P1-split/exclusions — instead of requiring a manual button click.
  // Debounced so typing in the target field doesn't recalculate per keystroke.
  useEffect(() => {
    if (!excelData.length) return
    const handle = setTimeout(() => handleCalculate(true), 400)
    return () => clearTimeout(handle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [excelData, viewMode, selectedMonth, selectedYear, target, p1Split, excludedStaff])

  const handleCalculate = (silent = false) => {
    const sheets = getSheetsForView()
    if (!sheets.length) {
      if (!silent) alert('No sheets found for selected view')
      else { setResults([]); setCalcData(null) }
      return
    }

    const aggregated = sheets.length === 1 ? sheets[0] : aggregateSheets(sheets)
    if (!aggregated.staff.length) {
      if (!silent) alert('No staff data found')
      else { setResults([]); setCalcData(null) }
      return
    }

    setAutoTarget(aggregated.target)
    setStaffCount(aggregated.staff.length)

    const finalTarget = target ? parseFloat(target) : aggregated.target
    if (!finalTarget || finalTarget <= 0) {
      if (!silent) alert('Invalid target. Enter manually or check Excel')
      else { setResults([]); setCalcData(null) }
      return
    }

    const activeStaff = aggregated.staff.filter(p => !excludedStaff.has(p.name))
    const n = activeStaff.length || 1

    const teamSales    = activeStaff.reduce((s, p) => s + p.sales, 0)
    const teamPackages = activeStaff.reduce((s, p) => s + p.packages, 0)
    const teamClients  = activeStaff.reduce((s, p) => s + (p.clients ?? 0), 0)

    const teamAchievement = (teamSales / finalTarget) * 100
    const tier      = getTier(teamAchievement)
    const totalPool = (tier.rate / 100) * teamSales

    const bulkResults: BulkResult[] = activeStaff.map(person => {
      const calc    = calculateIncentive(finalTarget, teamSales, person.sales, n, p1Split)
      const days    = Math.max(person.workingDays, 1)
      const clients = person.clients ?? 0
      return {
        ...person,
        achievement:       teamAchievement,
        tierName:          tier.name,
        tierRate:          tier.rate,
        totalIncentive:    calc.myTotal,
        p1:                calc.myP1,
        p2:                calc.myP2,
        contribution:      calc.myContribution,
        avgPackagesPerDay: person.packages / days,
        avgSalesPerDay:    person.sales / days,
        avgClientsPerDay:  clients / days,
        maxKpiClients:     clients * 20,
      }
    })

    bulkResults.sort((a, b) => b.sales - a.sales)

    setResults(bulkResults)
    setCalcData({
      teamAchievement, tier, totalPool,
      target: finalTarget, teamSales, teamPackages, teamClients,
      avgSales:    teamSales    / n,
      avgPackages: teamPackages / n,
      avgClients:  teamClients  / n,
      staffCount:    n,
      excludedCount: excludedStaff.size,
      sheets: sheets.map(s => s.sheetName),
      viewMode,
    })
    setSortCol('sales')
    setSortDir('desc')

    if (viewMode === 'monthly') saveTeamAnalytics(bulkResults, { teamAchievement, tier, totalPool, target: finalTarget, teamSales, staffCount: aggregated.staff.length })
  }

  const saveTeamAnalytics = (rows: BulkResult[], td: any) => {
    const monthIdx = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].indexOf(selectedMonth) + 1
    const yr = selectedYear.length === 2 ? '20' + selectedYear : selectedYear
    const monthKey = `${yr}-${String(monthIdx).padStart(2,'0')}`
    const staff: StaffResult[] = rows.map((p,i) => ({ id:getPersonId(p.name),name:stripEmployeeCode(p.name)||p.name,sales:p.sales,packages:p.packages,totalEarnings:p.totalIncentive,rank:i+1,contribution:p.contribution,p1:p.p1,p2:p.p2 }))
    const record: MonthlyTeamData = { monthKey, date:new Date().toISOString(), teamAchievement:td.teamAchievement, tier:td.tier.name, tierRate:td.tier.rate, tierColor:td.tier.color, teamSales:td.teamSales, teamTarget:td.target, totalPool:td.totalPool, totalStaff:td.staffCount, staff }
    saveTeamData(record)

    staff.forEach(s => {
      checkAndAwardBadges(s.id, {
        monthKey, date: record.date, achievement: td.teamAchievement, tier: td.tier.name,
        tierRate: td.tier.rate, tierColor: td.tier.color, totalEarnings: s.totalEarnings,
        rank: s.rank, totalStaff: td.staffCount, sales: s.sales, packages: s.packages,
        contribution: s.contribution, p1: s.p1, p2: s.p2,
      })
    })
  }

  const sortedResults = [...results].sort((a,b) => {
    const av = a[sortColumn], bv = b[sortColumn]
    const m = sortDir === 'asc' ? 1 : -1
    return (av < bv ? -1 : av > bv ? 1 : 0) * m
  })

  const handleSort = (col: SortCol) => {
    if (sortColumn === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('desc') }
  }
  const si = (col: SortCol) => sortColumn === col ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''

  const nextTierInfo = (() => {
    if (!calculatedData) return null
    const tiers = [...loadTiers()].sort((a,b) => a.min - b.min)
    const idx   = tiers.findIndex(t => t.id === calculatedData.tier.id)
    if (calculatedData.tier.rate === 0) {
      const lowest = tiers[0]
      const req = ((lowest?.min ?? 0)/100) * calculatedData.target
      return { nextTierName:lowest?.name??'Tier 1', nextTierRate:lowest?.rate??0, requiredPercentage:lowest?.min??0, requiredSales:req, deficit:req-calculatedData.teamSales, isMaxTier:false }
    }
    if (idx >= 0 && idx < tiers.length - 1) {
      const next = tiers[idx+1]
      const req  = (next.min/100) * calculatedData.target
      return { nextTierName:next.name, nextTierRate:next.rate, requiredPercentage:next.min, requiredSales:req, deficit:req-calculatedData.teamSales, isMaxTier:false }
    }
    const hi = tiers[idx]
    const thS = (hi.min/100)*calculatedData.target
    const thP = (hi.rate/100)*thS
    const acP = (hi.rate/100)*calculatedData.teamSales
    return { isMaxTier:true, currentRate:calculatedData.tier.rate, thresholdPercentage:hi.min, thresholdSales:thS, thresholdPool:thP, extraIncentive:acP-thP }
  })()

  const centerStats = (() => {
    if (!calculatedData) return null
    const staffCenters = loadStaffCenters()
    const totals: Record<string, { sales: number; packages: number; clients: number }> = {}
    let unassigned = 0

    results.forEach(person => {
      const code = extractEmployeeCode(person.name)
      const center = code ? staffCenters[code] : undefined
      if (!center) { unassigned++; return }
      if (!totals[center]) totals[center] = { sales: 0, packages: 0, clients: 0 }
      totals[center].sales    += person.sales
      totals[center].packages += person.packages
      totals[center].clients  += person.clients ?? 0
    })

    const teamSales = calculatedData.teamSales || 1
    const rows = Object.entries(CENTERS).map(([key, label]) => ({
      key,
      label,
      sales:      totals[key]?.sales ?? 0,
      packages:   totals[key]?.packages ?? 0,
      clients:    totals[key]?.clients ?? 0,
      revenuePct: ((totals[key]?.sales ?? 0) / teamSales) * 100,
    }))

    return { rows, unassigned }
  })()

  const handleExportCSV = () => {
    if (!results.length) return
    let csv = 'Rank,Name,Packages,Sales (AED),Clients,Days,Pkg/Day,Sales/Day,Clients/Day,Max KPI Clients,Revenue Share %,P1 (AED),P2 (AED),Total (AED)\n'
    results.forEach((p,i) => { csv += `${i+1},"${p.name}",${p.packages},${p.sales.toFixed(2)},${p.clients??0},${p.workingDays},${p.avgPackagesPerDay.toFixed(2)},${p.avgSalesPerDay.toFixed(2)},${p.avgClientsPerDay.toFixed(2)},${p.maxKpiClients},${p.contribution.toFixed(2)},${p.p1.toFixed(2)},${p.p2.toFixed(2)},${p.totalIncentive.toFixed(2)}\n` })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv],{type:'text/csv'}))
    a.download = `incentive-report-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  const getViewTitle = () => {
    if (viewMode === 'monthly') {
      const nm: Record<string,string> = {Jan:'January',Feb:'February',Mar:'March',Apr:'April',May:'May',Jun:'June',Jul:'July',Aug:'August',Sep:'September',Oct:'October',Nov:'November',Dec:'December'}
      return `${nm[selectedMonth]??selectedMonth} 20${selectedYear}`
    }
    const t: Record<string,string> = {q1:'Q1 (Jan-Mar)',q2:'Q2 (Apr-Jun)',q3:'Q3 (Jul-Sep)',q4:'Q4 (Oct-Dec)',h1:'H1 (Jan-Jun)',h2:'H2 (Jul-Dec)',yearly:'Full Year',alltime:'All-Time'}
    return t[viewMode]??viewMode
  }

  return (
    <>
      {excelData.length > 0 && (
        <>
          <div className="form-grid" style={{marginTop:0}}>
            <div className="form-group">
              <label>Team Target (AED) <span style={{fontSize:'12px',color:'var(--text-muted)'}}>Auto or Manual</span></label>
              <input type="number" value={target} onChange={e=>setTarget(e.target.value)} placeholder={autoTarget>0?`Auto: ${autoTarget}`:'Auto-detected'} min="0" />
            </div>
            <div className="form-group">
              <label>Staff Count <span style={{fontSize:'12px',color:'var(--text-muted)'}}>Auto-detected</span></label>
              <input type="number" value={staffCount||''} disabled style={{background:'var(--bg-tertiary)'}} />
            </div>
          </div>

          <div className="slider-section">
            <div className="slider-header">
              <span className="slider-label">Pool Split Distribution</span>
              <div className="slider-values">
                <span className="slider-badge slider-badge-p1">P1: {p1Split}%</span>
                <span className="slider-badge slider-badge-p2">P2: {100-p1Split}%</span>
              </div>
            </div>
            <input type="range" min="0" max="100" value={p1Split} step="5" onChange={e=>setP1Split(Number(e.target.value))} />
            <div className="slider-ticks">
              <span>0/100</span><span>25/75</span><span>50/50</span><span>75/25</span><span>100/0</span>
            </div>
          </div>

          <button className="btn btn-primary btn-block" onClick={() => handleCalculate()}>
            <span>Calculate Team Incentives</span><span>→</span>
          </button>
        </>
      )}

      {results.length > 0 && calculatedData && (
        <div style={{marginTop:'24px'}}>

          {/* Title */}
          <div style={{display:'flex',alignItems:'center',padding:'16px',background:'var(--bg-tertiary)',borderRadius:'var(--radius-md)',marginBottom:'16px'}}>
            <span style={{fontSize:'18px',fontWeight:'600',color:'var(--text-primary)'}}>Team Incentives — {getViewTitle()}</span>
          </div>

          {/* Sheets */}
          <div style={{padding:'10px 16px',background:'var(--bg-tertiary)',border:'1px solid var(--border-color)',borderRadius:'var(--radius-sm)',marginBottom:'16px',fontSize:'13px',color:'var(--text-secondary)'}}>
            <strong style={{color:'var(--accent-primary)'}}>Sheets:</strong> {calculatedData.sheets.join(', ')}
          </div>

          {/* Exclusion banner */}
          {calculatedData.excludedCount > 0 && (
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 16px',background:'color-mix(in srgb, var(--warning) 10%, transparent)',border:'1px solid color-mix(in srgb, var(--warning) 40%, transparent)',borderRadius:'var(--radius-sm)',marginBottom:'16px',fontSize:'13px',color:'var(--warning)'}}>
              <span><strong>{calculatedData.excludedCount} staff excluded</strong> — incentives recalculated for remaining {calculatedData.staffCount}</span>
              <button onClick={clearExclusions} style={{background:'none',border:'1px solid var(--warning)',color:'var(--warning)',padding:'4px 10px',borderRadius:'var(--radius-sm)',cursor:'pointer',fontSize:'12px',fontWeight:'600'}}>Restore all</button>
            </div>
          )}

          {/* Stats */}
          <div className="summary-stats" style={{marginBottom:'24px'}}>
            <div className="stat-card"><div className="stat-label">Achievement</div><div className="stat-value">{calculatedData.teamAchievement.toFixed(2)}<span className="stat-unit">%</span></div></div>
            <div className="stat-card">
              <div className="stat-label">Current Tier</div>
              <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                <div className="stat-value" style={{fontSize:'18px'}}>{calculatedData.tier.name}</div>
                <div className="tier-badge" style={{background:`${calculatedData.tier.color}22`,color:calculatedData.tier.color,marginTop:0}}>{calculatedData.tier.rate}% rate</div>
              </div>
            </div>
            <div className="stat-card"><div className="stat-label">Total Pool</div><div className="stat-value" style={{fontSize:'18px'}}>AED {formatCurrency(calculatedData.totalPool)}</div></div>
            <div className="stat-card"><div className="stat-label">Active Staff</div><div className="stat-value">{calculatedData.staffCount}</div></div>
            <div className="stat-card"><div className="stat-label">Team Target</div><div className="stat-value" style={{fontSize:'16px'}}>AED {formatCurrency(calculatedData.target)}</div></div>
            <div className="stat-card"><div className="stat-label">Team Sales</div><div className="stat-value" style={{fontSize:'16px'}}>AED {formatCurrency(calculatedData.teamSales)}</div></div>
            <div className="stat-card"><div className="stat-label">Avg Sales / Person</div><div className="stat-value" style={{fontSize:'16px'}}>AED {formatCurrency(calculatedData.avgSales)}</div></div>
            <div className="stat-card"><div className="stat-label">Avg Packages / Person</div><div className="stat-value" style={{fontSize:'18px'}}>{calculatedData.avgPackages.toFixed(1)}</div></div>
            {calculatedData.teamClients > 0 && (
              <>
                <div className="stat-card"><div className="stat-label">Total Clients</div><div className="stat-value" style={{fontSize:'18px'}}>{calculatedData.teamClients}</div></div>
                <div className="stat-card"><div className="stat-label">Avg Clients / Person</div><div className="stat-value" style={{fontSize:'18px'}}>{calculatedData.avgClients.toFixed(1)}</div></div>
              </>
            )}
          </div>

          {/* Tier Ladder — between stats and table */}
          {nextTierInfo && (
            nextTierInfo.isMaxTier ? (
              <div style={{padding:'18px 20px',background:'color-mix(in srgb, var(--success) 8%, transparent)',border:'1px solid color-mix(in srgb, var(--success) 30%, transparent)',borderRadius:'var(--radius-md)',marginBottom:'24px'}}>
                <div style={{fontSize:'11px',fontWeight:'700',color:'var(--success)',marginBottom:'8px',textTransform:'uppercase',letterSpacing:'0.08em'}}>Tier Ladder</div>
                <div style={{fontSize:'20px',fontWeight:'700',color:'var(--success)',fontFamily:"'JetBrains Mono',monospace",marginBottom:'6px'}}>+ AED {formatCurrency(nextTierInfo.extraIncentive)}</div>
                <div style={{fontSize:'13px',color:'var(--text-secondary)',lineHeight:'1.6'}}>
                  Maximum tier reached. Team at <strong>{calculatedData.teamAchievement.toFixed(2)}%</strong> — earning <strong>AED {formatCurrency(nextTierInfo.extraIncentive)}</strong> above the {nextTierInfo.thresholdPercentage}% threshold. Every extra sale keeps growing the pool at {nextTierInfo.currentRate}%.
                </div>
              </div>
            ) : (
              <div style={{padding:'18px 20px',background:'var(--bg-tertiary)',border:'1px solid var(--border-color)',borderRadius:'var(--radius-md)',marginBottom:'24px'}}>
                <div style={{fontSize:'11px',fontWeight:'700',color:'var(--text-muted)',marginBottom:'8px',textTransform:'uppercase',letterSpacing:'0.08em'}}>Tier Ladder — Next: {nextTierInfo.nextTierName} ({nextTierInfo.nextTierRate}%)</div>
                <div style={{fontSize:'20px',fontWeight:'700',color:'var(--accent-primary)',fontFamily:"'JetBrains Mono',monospace",marginBottom:'6px'}}>AED {formatCurrency(nextTierInfo.deficit)} needed</div>
                <div style={{fontSize:'13px',color:'var(--text-secondary)',lineHeight:'1.6',marginBottom:'10px'}}>
                  Reach <strong>AED {formatCurrency(nextTierInfo.requiredSales)}</strong> ({nextTierInfo.requiredPercentage}% of target) to unlock {nextTierInfo.nextTierName} at {nextTierInfo.nextTierRate}% rate.
                </div>
                <div style={{height:'6px',background:'var(--border-color)',borderRadius:'3px',overflow:'hidden'}}>
                  <div style={{height:'100%',width:`${Math.min((calculatedData.teamSales/nextTierInfo.requiredSales)*100,100)}%`,background:'var(--accent-primary)',borderRadius:'3px',transition:'width 0.4s ease'}} />
                </div>
                <div style={{fontSize:'11px',color:'var(--text-muted)',marginTop:'4px',textAlign:'right'}}>
                  {((calculatedData.teamSales/nextTierInfo.requiredSales)*100).toFixed(1)}% of the way there
                </div>
              </div>
            )
          )}

          {/* Center-wise Stats — just below the tier ladder */}
          {centerStats && (
            <div style={{marginBottom:'24px'}}>
              <div style={{fontSize:'11px',fontWeight:'700',color:'var(--text-muted)',marginBottom:'10px',textTransform:'uppercase',letterSpacing:'0.08em'}}>Center-wise Stats</div>
              <div className="summary-stats" style={{marginBottom:centerStats.unassigned>0?'8px':0}}>
                {centerStats.rows.map(row => (
                  <div key={row.key} className="stat-card">
                    <div className="stat-label">{row.label}</div>
                    <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
                      <div style={{fontSize:'13px',color:'var(--text-secondary)'}}>Sales: <strong style={{color:'var(--text-primary)',fontFamily:"'JetBrains Mono', monospace"}}>AED {formatCurrency(row.sales)}</strong></div>
                      <div style={{fontSize:'13px',color:'var(--text-secondary)'}}>Packages: <strong style={{color:'var(--text-primary)',fontFamily:"'JetBrains Mono', monospace"}}>{row.packages}</strong></div>
                      <div style={{fontSize:'13px',color:'var(--text-secondary)'}}>Clients: <strong style={{color:'var(--text-primary)',fontFamily:"'JetBrains Mono', monospace"}}>{row.clients}</strong></div>
                      <div style={{fontSize:'13px',color:'var(--text-secondary)'}}>Revenue %: <strong style={{color:'var(--accent-primary)',fontFamily:"'JetBrains Mono', monospace"}}>{row.revenuePct.toFixed(2)}%</strong></div>
                    </div>
                  </div>
                ))}
              </div>
              {centerStats.unassigned > 0 && (
                <div style={{fontSize:'12px',color:'var(--warning)'}}>
                  {centerStats.unassigned} staff not mapped to a center — update STAFF_CENTERS in lib/config.ts
                </div>
              )}
            </div>
          )}

          {/* Table — frozen header, horizontal + vertical scroll */}
          <div style={{overflowX:'auto',marginBottom:'24px'}}>
            <div style={{maxHeight:'520px',overflowY:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',minWidth:'1260px'}}>
                <thead>
                  <tr>
                    <th style={{...TH,width:'46px'}}>Rank</th>
                    <th style={TH} onClick={()=>handleSort('name')}>Name{si('name')}</th>
                    <th style={TH} onClick={()=>handleSort('totalIncentive')}>Total{si('totalIncentive')}</th>
                    <th style={TH} onClick={()=>handleSort('packages')}>Packages{si('packages')}</th>
                    <th style={TH} onClick={()=>handleSort('clients')}>Clients{si('clients')}</th>
                    <th style={TH} onClick={()=>handleSort('sales')}>Sales{si('sales')}</th>
                    <th style={{...TH,fontSize:'11px'}} onClick={()=>handleSort('workingDays')}>Days{si('workingDays')}</th>
                    <th style={{...TH,fontSize:'11px'}} onClick={()=>handleSort('avgPackagesPerDay')}>Pkg/Day{si('avgPackagesPerDay')}</th>
                    <th style={{...TH,fontSize:'11px'}} onClick={()=>handleSort('avgSalesPerDay')}>Sales/Day{si('avgSalesPerDay')}</th>
                    <th style={{...TH,fontSize:'11px'}} onClick={()=>handleSort('avgClientsPerDay')}>Clients/Day{si('avgClientsPerDay')}</th>
                    <th style={{...TH,fontSize:'11px'}} onClick={()=>handleSort('maxKpiClients')}>Max KPI Clients{si('maxKpiClients')}</th>
                    <th style={TH} onClick={()=>handleSort('contribution')}>Revenue Share %{si('contribution')}</th>
                    <th style={TH} onClick={()=>handleSort('p1')}>P1{si('p1')}</th>
                    <th style={TH} onClick={()=>handleSort('p2')}>P2{si('p2')}</th>
                    <th style={{...TH,width:'46px',textAlign:'center',cursor:'default'}}>Excl.</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedResults.map(person => {
                    const rank   = results.findIndex(r => r.name === person.name) + 1
                    const isTop3 = rank <= 3
                    const nc     = isTop3 ? 'var(--accent-primary)' : 'var(--text-secondary)'
                    return (
                      <tr key={person.name} style={{borderBottom:'1px solid var(--border-color)',background:isTop3?'var(--accent-soft)':undefined}}>
                        <td style={{...TD,fontWeight:isTop3?'700':'normal',color:nc,fontFamily:"'JetBrains Mono', monospace"}}>#{rank}</td>
                        <td style={{...TD,fontWeight:isTop3?'700':'normal',color:nc}}>{person.name}<CenterBadge name={person.name} /></td>
                        <td style={{...TD,fontWeight:'600',color:isTop3?'var(--accent-primary)':'var(--success)'}}>AED {formatCurrency(person.totalIncentive)}</td>
                        <td style={TD}>{person.packages}</td>
                        <td style={TD}>{person.clients??'-'}</td>
                        <td style={TD}>AED {formatCurrency(person.sales)}</td>
                        <td style={{...TD,color:'var(--text-muted)'}}>{person.workingDays}</td>
                        <td style={TD}>{person.avgPackagesPerDay.toFixed(2)}</td>
                        <td style={TD}>{formatCurrency(person.avgSalesPerDay)}</td>
                        <td style={TD}>{person.clients ? person.avgClientsPerDay.toFixed(2) : '-'}</td>
                        <td style={TD}>{person.clients ? person.maxKpiClients : '-'}</td>
                        <td style={TD}>{person.contribution.toFixed(2)}%</td>
                        <td style={TD}>AED {formatCurrency(person.p1)}</td>
                        <td style={TD}>AED {formatCurrency(person.p2)}</td>
                        <td style={{...TD,textAlign:'center',padding:'10px 6px'}}>
                          <button
                            onClick={()=>toggleExclude(person.name)}
                            title={`Exclude ${person.name} and recalculate`}
                            style={{background:'none',border:'1px solid var(--border-color)',color:'var(--text-muted)',width:'24px',height:'24px',borderRadius:'50%',cursor:'pointer',fontSize:'15px',lineHeight:'1',display:'inline-flex',alignItems:'center',justifyContent:'center',transition:'var(--transition-base)'}}
                            onMouseEnter={e=>{const b=e.currentTarget;b.style.borderColor='var(--error)';b.style.color='var(--error)'}}
                            onMouseLeave={e=>{const b=e.currentTarget;b.style.borderColor='var(--border-color)';b.style.color='var(--text-muted)'}}
                          >×</button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Export */}
          <div style={{display:'flex',gap:'12px'}}>
            <button className="btn btn-secondary" onClick={handleExportCSV}><><DownloadIcon />Download CSV</></button>
            <button className="btn btn-secondary" onClick={()=>exportBulkToPDF(calculatedData,results)}><><DownloadIcon />Download PDF</></button>
          </div>
        </div>
      )}
    </>
  )
}
