'use client'
import { useState, useEffect, type ReactNode } from 'react'
import { LockIcon } from '@/components/icons'
import { DEFAULT_P1_SPLIT, DEFAULT_STAFF_COUNT } from '@/lib/config'
import { getFresh, setFresh, clearFresh } from '@/lib/storage'
import { calculateIncentive, formatCurrency, type CalculationResult } from '@/lib/utils'

// Persists in-progress form inputs so switching tabs and coming back doesn't
// blank the form. Session-scoped (not localStorage) — cleared when the tab closes.
const STORAGE_KEY = 'sic_individual_inputs'

interface PersistedInputs {
  teamTarget: string
  teamSales: string
  mySales: string
  staffCount: string
  p1Split: number
}

function loadPersistedInputs(): Partial<PersistedInputs> {
  if (typeof window === 'undefined') return {}
  try {
    const stored = getFresh('session', STORAGE_KEY)
    return stored ? JSON.parse(stored) : {}
  } catch {
    return {}
  }
}

export function IndividualTab({ modeSwitch }: { modeSwitch?: ReactNode }) {
  const persisted = loadPersistedInputs()
  const [teamTarget, setTeamTarget] = useState(persisted.teamTarget ?? '')
  const [teamSales, setTeamSales] = useState(persisted.teamSales ?? '')
  const [mySales, setMySales] = useState(persisted.mySales ?? '')
  const [staffCount, setStaffCount] = useState(persisted.staffCount ?? String(DEFAULT_STAFF_COUNT))
  const [p1Split, setP1Split] = useState(persisted.p1Split ?? DEFAULT_P1_SPLIT)
  const [results, setResults] = useState<CalculationResult | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!teamTarget && !teamSales && !mySales) return clearFresh('session', STORAGE_KEY)
    setFresh('session', STORAGE_KEY, JSON.stringify({ teamTarget, teamSales, mySales, staffCount, p1Split }))
  }, [teamTarget, teamSales, mySales, staffCount, p1Split])

  const calculate = () => {
    const target = parseFloat(teamTarget)
    const sales = parseFloat(teamSales)
    const my = parseFloat(mySales) || 0
    const staff = parseInt(staffCount)

    const result = calculateIncentive(target, sales, my, staff, p1Split)
    setResults(result)
  }

  // Live feedback: recalculate automatically as the user types, debounced so
  // we don't recompute on every keystroke.
  useEffect(() => {
    if (!teamTarget || !teamSales || !staffCount) {
      setResults(null)
      return
    }
    const handle = setTimeout(calculate, 400)
    return () => clearTimeout(handle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamTarget, teamSales, mySales, staffCount, p1Split])

  return (
    <section className="card">
      {modeSwitch}
      <div className="privacy-notice">
        <LockIcon />
        <span>100% local calculation · No data shared · Browser-only processing · Your data stays private</span>
      </div>

      <div className="card-header">
        <h2 className="card-title">Calculate Your Incentive</h2>
      </div>

      <div className="form-grid">
        <div className="form-group">
          <label>Team Target (AED)</label>
          <input 
            type="number" 
            value={teamTarget}
            onChange={(e) => setTeamTarget(e.target.value)}
            placeholder="700000" 
            min="0" 
          />
        </div>
        <div className="form-group">
          <label>Team Sales (AED)</label>
          <input 
            type="number"
            value={teamSales}
            onChange={(e) => setTeamSales(e.target.value)}
            placeholder="735000" 
            min="0" 
          />
        </div>
        <div className="form-group">
          <label>My Sales (AED)</label>
          <input 
            type="number"
            value={mySales}
            onChange={(e) => setMySales(e.target.value)}
            placeholder="73500" 
            min="0" 
          />
        </div>
        <div className="form-group">
          <label>Staff Count</label>
          <input 
            type="number"
            value={staffCount}
            onChange={(e) => setStaffCount(e.target.value)}
            placeholder={String(DEFAULT_STAFF_COUNT)}
            min="1"
          />
        </div>
      </div>

      <div className="slider-section">
        <div className="slider-header">
          <span className="slider-label">Pool Split Distribution</span>
          <div className="slider-values">
            <span className="slider-badge slider-badge-p1">P1: {p1Split}%</span>
            <span className="slider-badge slider-badge-p2">P2: {100 - p1Split}%</span>
          </div>
        </div>
        <input 
          type="range" 
          min="0" 
          max="100" 
          value={p1Split}
          step="5" 
          onChange={(e) => setP1Split(Number(e.target.value))}
        />
        <div className="slider-ticks">
          <span>0/100</span>
          <span>25/75</span>
          <span>50/50</span>
          <span>75/25</span>
          <span>100/0</span>
        </div>
      </div>

      <button className="btn btn-primary btn-block" onClick={calculate}>
        <span>Calculate Incentive</span>
        <span>→</span>
      </button>

      {results && !results.error && (
        <div className="results-panel">
          <div className="results-header">
            <span>Your Incentive Breakdown</span>
          </div>
          
          <div className="results-grid">
            <div className="result-card">
              <div className="result-label">Team Achievement</div>
              <div className="result-value">{results.teamAchievement.toFixed(2)}<span className="result-unit">%</span></div>
            </div>
            
            <div className="result-card">
              <div className="result-label">Tier</div>
              <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                <div className="result-value" style={{fontSize: '20px'}}>{results.tier.name}</div>
                <div className="tier-badge" style={{
                  background: `${results.tier.color}18`,
                  color: results.tier.color
                }}>{results.tier.rate}% rate</div>
              </div>
            </div>
            
            <div className="result-card">
              <div className="result-label">Total Pool</div>
              <div className="result-value" style={{fontSize: '20px'}}>AED {formatCurrency(results.totalPool)}</div>
            </div>
            
            <div className="result-card">
              <div className="result-label">My Contribution</div>
              <div className="result-value">{results.myContribution.toFixed(2)}<span className="result-unit">%</span></div>
            </div>
          </div>
          
          {results.tier.rate > 0 && (
            <>
              <div className="breakdown-section">
                <div className="breakdown-row">
                  <span className="breakdown-label" style={{color: '#42a5f5'}}>P1 (Equal Share)</span>
                  <span className="breakdown-value">AED {formatCurrency(results.myP1)}</span>
                </div>
                
                <div className="breakdown-row">
                  <span className="breakdown-label" style={{color: '#ffa726'}}>P2 (Personal Share)</span>
                  <span className="breakdown-value">AED {formatCurrency(results.myP2)}</span>
                </div>
                
                <div className="breakdown-row total-row">
                  <span className="breakdown-label">TOTAL INCENTIVE</span>
                  <span className="breakdown-value">AED {formatCurrency(results.myTotal)}</span>
                </div>
              </div>
              
              <div style={{marginTop: '16px', padding: '12px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', fontFamily: "'JetBrains Mono', monospace"}}>
                P1 Pool: {formatCurrency(results.p1Pool)} ÷ {staffCount} staff | P2 Pool: {formatCurrency(results.p2Pool)} × {results.myContribution.toFixed(2)}%
              </div>
            </>
          )}

          {results.nextTierInfo && (
            <div className="reverse-calc" style={results.nextTierInfo.isMaxTier ? {
              borderColor: 'rgba(0, 230, 118, 0.3)',
              background: 'rgba(0, 230, 118, 0.08)'
            } : {}}>
              <div className="reverse-calc-title" style={results.nextTierInfo.isMaxTier ? {color: 'var(--success)'} : {}}>
                <span>Tier Ladder</span>
              </div>
              {results.nextTierInfo.isMaxTier ? (
                <>
                  <div className="reverse-calc-value" style={{color: 'var(--success)'}}>
                    + AED {formatCurrency(results.nextTierInfo.extraIncentive)}
                  </div>
                  <div className="reverse-calc-details">
                    Maximum tier achieved! Your team is at <strong>{results.teamAchievement.toFixed(2)}%</strong> achievement, earning an additional <strong>AED {formatCurrency(results.nextTierInfo.extraIncentive)}</strong> compared to the {results.nextTierInfo.thresholdPercentage}% threshold.
                  </div>
                </>
              ) : (
                <>
                  <div className="reverse-calc-value">AED {formatCurrency(results.nextTierInfo.deficit)}</div>
                  <div className="reverse-calc-details">
                    Team needs an additional <strong>AED {formatCurrency(results.nextTierInfo.deficit)}</strong> in sales to reach <strong>AED {formatCurrency(results.nextTierInfo.requiredSales)}</strong> ({results.nextTierInfo.requiredPercentage}% of target) and qualify for {results.nextTierInfo.nextTierName} incentive ({results.nextTierInfo.nextTierRate}% rate).
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {results && results.error && (
        <div className="alert alert-error" style={{marginTop: '24px'}}>{results.error}</div>
      )}
    </section>
  )
}
