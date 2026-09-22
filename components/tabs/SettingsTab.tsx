'use client'
import { useState, useEffect } from 'react'
import {
  loadTiers, saveTiers, getTiersSavedAt,
  backupTiers, loadTiersBackup, clearTiersBackup,
  loadStaffCenters, saveStaffCenters, getStaffCentersSavedAt,
  backupStaffCenters, loadStaffCentersBackup, clearStaffCentersBackup,
} from '@/lib/utils'
import { CENTERS, STAFF_CENTERS, DEFAULT_TIERS, type Tier } from '@/lib/config'
import { extractEmployeeCode, stripEmployeeCode, type ExcelData } from '@/lib/excelUtils'
import { SlidersIcon, SaveIcon, BarChartIcon } from '@/components/icons'

interface StaffCenterEntry {
  code: string
  center: string
}

// Mirrors BulkAnalyticsTab's persistence key — read-only here, just to
// resolve employee codes to the human names last seen in an uploaded sheet.
const BULK_UPLOAD_KEY = 'sic_bulk_upload'

// Employee code -> display name, built from whatever workbook was last
// uploaded in Bulk & Analytics. The code itself stays the stored identifier
// (names can change between uploads); this is purely a display convenience,
// and is empty (falls back to showing the code) until something is uploaded.
function loadCodeToName(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  try {
    const stored = localStorage.getItem(BULK_UPLOAD_KEY)
    if (!stored) return {}
    const excelData: ExcelData[] = JSON.parse(stored).excelData ?? []
    const map: Record<string, string> = {}
    excelData.forEach(sheet => {
      sheet.staff.forEach(person => {
        const code = extractEmployeeCode(person.name)
        if (code) map[code] = stripEmployeeCode(person.name)
      })
    })
    return map
  } catch {
    return {}
  }
}

function toEntries(mapping: Record<string, string>): StaffCenterEntry[] {
  return Object.entries(mapping).map(([code, center]) => ({ code, center }))
}

function toMapping(entries: StaffCenterEntry[]): Record<string, string> {
  const mapping: Record<string, string> = {}
  entries.forEach(({ code, center }) => {
    if (code.trim()) mapping[code.trim()] = center
  })
  return mapping
}

interface SettingsTabProps {
  kittyEnabled: boolean
  onToggleKitty: (enabled: boolean) => void
}

export function SettingsTab({ kittyEnabled, onToggleKitty }: SettingsTabProps) {
  const [tiers, setTiers] = useState<Tier[]>(DEFAULT_TIERS)
  const [showDefaults, setShowDefaults] = useState(true)
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)
  const [backup, setBackup] = useState<Tier[] | null>(null)

  const [scEntries, setScEntries] = useState<StaffCenterEntry[]>(toEntries(STAFF_CENTERS))
  const [scLastSavedAt, setScLastSavedAt] = useState<string | null>(null)
  const [scBackup, setScBackup] = useState<Record<string, string> | null>(null)
  const [codeToName, setCodeToName] = useState<Record<string, string>>({})

  useEffect(() => {
    setTiers(loadTiers())
    setLastSavedAt(getTiersSavedAt())
    setBackup(loadTiersBackup())

    setScEntries(toEntries(loadStaffCenters()))
    setScLastSavedAt(getStaffCentersSavedAt())
    setScBackup(loadStaffCentersBackup())
    setCodeToName(loadCodeToName())
  }, [])

  const handleTierChange = (index: number, field: keyof Tier, value: any) => {
    const newTiers = [...tiers]
    newTiers[index] = { ...newTiers[index], [field]: value }
    setTiers(newTiers)
  }

  const handleAddTier = () => {
    const newTier: Tier = {
      id: `tier${Date.now()}`,
      name: `Tier ${tiers.length + 1}`,
      min: 70,
      max: 80,
      rate: 1.0,
      color: '#808080'
    }
    setTiers([...tiers, newTier])
  }

  const handleRemoveTier = (index: number) => {
    if (tiers.length <= 1) {
      alert('Must have at least one tier')
      return
    }
    if (confirm(`Remove ${tiers[index].name}?`)) {
      const newTiers = tiers.filter((_, i) => i !== index)
      setTiers(newTiers)
    }
  }

  const handleSave = () => {
    // Sort tiers by min value
    const sortedTiers = [...tiers].sort((a, b) => a.min - b.min)
    
    // Update max values based on next tier's min
    for (let i = 0; i < sortedTiers.length; i++) {
      if (i < sortedTiers.length - 1) {
        sortedTiers[i].max = sortedTiers[i + 1].min
      } else {
        sortedTiers[i].max = Infinity
      }
    }
    
    saveTiers(sortedTiers)
    setTiers(sortedTiers)
    setLastSavedAt(getTiersSavedAt())
    alert('Tier settings saved.')
  }

  const handleReset = () => {
    if (confirm('Reset to default tier settings?')) {
      // Keep an undo snapshot of what's about to be discarded.
      backupTiers(tiers)
      setBackup(tiers)
      setTiers(DEFAULT_TIERS)
      saveTiers(DEFAULT_TIERS)
      setLastSavedAt(getTiersSavedAt())
      alert('Tier settings reset to defaults. You can restore your previous tiers below if this was a mistake.')
    }
  }

  const handleRestoreBackup = () => {
    if (!backup) return
    setTiers(backup)
    saveTiers(backup)
    setLastSavedAt(getTiersSavedAt())
    clearTiersBackup()
    setBackup(null)
    alert('Previous tier settings restored.')
  }

  const handleScChange = (index: number, field: keyof StaffCenterEntry, value: string) => {
    const next = [...scEntries]
    next[index] = { ...next[index], [field]: value }
    setScEntries(next)
  }

  const handleAddSc = () => {
    setScEntries([...scEntries, { code: '', center: Object.keys(CENTERS)[0] ?? '' }])
  }

  const handleRemoveSc = (index: number) => {
    setScEntries(scEntries.filter((_, i) => i !== index))
  }

  const handleSaveSc = () => {
    const mapping = toMapping(scEntries)
    saveStaffCenters(mapping)
    setScEntries(toEntries(mapping))
    setScLastSavedAt(getStaffCentersSavedAt())
    alert('Staff center allocation saved.')
  }

  const handleResetSc = () => {
    if (confirm('Reset to default staff center allocation?')) {
      backupStaffCenters(toMapping(scEntries))
      setScBackup(toMapping(scEntries))
      setScEntries(toEntries(STAFF_CENTERS))
      saveStaffCenters(STAFF_CENTERS)
      setScLastSavedAt(getStaffCentersSavedAt())
      alert('Staff center allocation reset to defaults. You can restore your previous allocation below if this was a mistake.')
    }
  }

  const handleRestoreScBackup = () => {
    if (!scBackup) return
    setScEntries(toEntries(scBackup))
    saveStaffCenters(scBackup)
    setScLastSavedAt(getStaffCentersSavedAt())
    clearStaffCentersBackup()
    setScBackup(null)
    alert('Previous staff center allocation restored.')
  }

  return (
    <>
    <section className="card">
      <div className="card-header">
        <h2 className="card-title"><SlidersIcon className="icon-lg" />Tier Configuration</h2>
        <div className="card-description">
          Customize achievement tiers, rates, and colors
        </div>
      </div>

      {/* Default Tiers Bar */}
      <div style={{marginBottom: '24px', padding: '16px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)'}}>
        <button 
          onClick={() => setShowDefaults(!showDefaults)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px',
            fontSize: '14px',
            fontWeight: '600',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-primary)',
            width: '100%',
            justifyContent: 'space-between'
          }}
        >
          <span><BarChartIcon />Current Tier System</span>
          <span style={{fontSize: '12px', opacity: 0.7}}>{showDefaults ? '▼ Hide' : '▶ Show'}</span>
        </button>

        {showDefaults && (
          <div style={{marginTop: '16px'}}>
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '16px'}}>
              {tiers.map(tier => (
                <div key={tier.id} style={{
                  padding: '16px',
                  background: `${tier.color}18`,
                  border: `2px solid ${tier.color}`,
                  borderRadius: 'var(--radius-md)',
                  textAlign: 'center'
                }}>
                  <div style={{fontSize: '16px', fontWeight: '700', color: tier.color, marginBottom: '8px'}}>
                    {tier.name}
                  </div>
                  <div style={{fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px'}}>
                    {tier.max === Infinity ? `above ${tier.min}%` : `${tier.min}% - ${tier.max}%`}
                  </div>
                  <div style={{fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)'}}>
                    Rate: {tier.rate}%
                  </div>
                </div>
              ))}
            </div>
            <div style={{padding: '12px', background: 'var(--accent-soft)', borderRadius: 'var(--radius-sm)', fontSize: '12px', color: 'var(--text-secondary)'}}>
              Your current tier configuration. Click "Reset to Defaults" to restore original colors (Orange · Blue · Purple · Green).
            </div>
          </div>
        )}
      </div>

      {/* Current Tiers */}
      <div style={{marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <h3 style={{fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)'}}>
          Custom Tiers ({tiers.length})
        </h3>
        <button className="btn btn-primary" onClick={handleAddTier} style={{padding: '8px 16px', fontSize: '14px'}}>
          <span>+ Add Tier</span>
        </button>
      </div>

      <div style={{marginTop: '16px'}}>
        {tiers.map((tier, index) => (
          <div key={tier.id} style={{
            marginBottom: '16px',
            padding: '20px',
            background: 'var(--bg-tertiary)',
            borderRadius: 'var(--radius-md)',
            border: '2px solid var(--border-color)',
            position: 'relative'
          }}>
            {/* Remove Button */}
            <button
              onClick={() => handleRemoveTier(index)}
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: '600',
                background: 'var(--error)',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                transition: 'opacity 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
            >
              × Remove
            </button>

            <div className="form-grid" style={{marginBottom: '16px'}}>
              <div className="form-group">
                <label>Tier Name</label>
                <input
                  type="text"
                  value={tier.name}
                  onChange={(e) => handleTierChange(index, 'name', e.target.value)}
                  placeholder="e.g., Tier 1"
                />
              </div>
              
              <div className="form-group">
                <label>Min Achievement (%)</label>
                <input
                  type="number"
                  value={tier.min}
                  onChange={(e) => handleTierChange(index, 'min', parseFloat(e.target.value))}
                  step="0.1"
                  placeholder="75"
                />
              </div>
              
              <div className="form-group">
                <label>Incentive Rate (%)</label>
                <input
                  type="number"
                  value={tier.rate}
                  onChange={(e) => handleTierChange(index, 'rate', parseFloat(e.target.value))}
                  step="0.1"
                  min="0"
                  max="20"
                  placeholder="1.5"
                />
              </div>
            </div>

            {/* Color Picker */}
            <div style={{marginTop: '12px'}}>
              <label style={{display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)'}}>
                Tier Color
              </label>
              <div style={{display: 'flex', gap: '12px', alignItems: 'center'}}>
                <input
                  type="color"
                  value={tier.color}
                  onChange={(e) => handleTierChange(index, 'color', e.target.value)}
                  style={{width: '60px', height: '40px', cursor: 'pointer', border: '2px solid var(--border-color)', borderRadius: 'var(--radius-sm)'}}
                />
                <input
                  type="text"
                  value={tier.color}
                  onChange={(e) => handleTierChange(index, 'color', e.target.value)}
                  placeholder="#ff9800"
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    fontSize: '14px',
                    fontFamily: 'monospace',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)'
                  }}
                />
                <div style={{
                  width: '100px',
                  height: '40px',
                  background: tier.color,
                  borderRadius: 'var(--radius-sm)',
                  border: '2px solid var(--border-color)'
                }} />
              </div>
            </div>

            {/* Preview Card */}
            <div style={{
              marginTop: '16px',
              padding: '12px 16px',
              background: `${tier.color}18`,
              border: `2px solid ${tier.color}`,
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <span style={{fontSize: '14px', fontWeight: '700', color: tier.color}}>{tier.name}</span>
                <span style={{fontSize: '13px', color: 'var(--text-secondary)', marginLeft: '12px'}}>
                  {tier.min}%+ → {tier.rate}% rate
                </span>
              </div>
              <div style={{fontSize: '12px', color: 'var(--text-muted)'}}>Preview</div>
            </div>
          </div>
        ))}
      </div>

      {/* Last Saved / Undo */}
      <div style={{
        marginTop: '20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '8px',
        fontSize: '12px',
        color: 'var(--text-muted)'
      }}>
        <span>Last saved: {lastSavedAt ? new Date(lastSavedAt).toLocaleString() : 'Never'}</span>
        {backup && (
          <button
            className="btn btn-secondary"
            onClick={handleRestoreBackup}
            style={{padding: '6px 12px', fontSize: '12px'}}
          >
            Restore previous tiers
          </button>
        )}
      </div>

      {/* Action Buttons */}
      <div style={{display: 'flex', gap: '12px', marginTop: '12px'}}>
        <button className="btn btn-secondary" onClick={handleReset} style={{flex: '1'}}>
          <span>↺ Reset to Defaults</span>
        </button>
        <button className="btn btn-primary" onClick={handleSave} style={{flex: '1'}}>
<><SaveIcon />Save Settings</>
        </button>
      </div>

      {/* Info Box */}
      <div style={{
        marginTop: '24px',
        padding: '16px',
        background: 'var(--accent-soft)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-md)',
        fontSize: '13px',
        color: 'var(--text-secondary)',
        lineHeight: '1.6'
      }}>
        <strong style={{color: 'var(--text-primary)'}}>How it works:</strong>
        <ul style={{marginTop: '8px', marginLeft: '20px'}}>
          <li>Tiers are automatically sorted by minimum achievement %</li>
          <li>Max values are calculated from the next tier's min (highest tier = ∞)</li>
          <li>Changes apply immediately to all new calculations</li>
          <li>Historical analytics data remains unchanged</li>
          <li>At least one tier is required</li>
        </ul>
      </div>
    </section>

    <section className="card" style={{marginTop: '24px'}}>
      <div className="card-header">
        <h2 className="card-title"><BarChartIcon className="icon-lg" />Staff Center Allocation</h2>
        <div className="card-description">
          Map each employee code to a center (used by Bulk Results' Center-wise Stats)
        </div>
      </div>

      <div style={{marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <h3 style={{fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)'}}>
          Allocations ({scEntries.length})
        </h3>
        <button className="btn btn-primary" onClick={handleAddSc} style={{padding: '8px 16px', fontSize: '14px'}}>
          <span>+ Add Staff</span>
        </button>
      </div>

      <div style={{maxHeight: '420px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)'}}>
        {scEntries.map((entry, index) => (
          <div key={index} style={{
            display: 'flex',
            gap: '12px',
            alignItems: 'center',
            padding: '10px 16px',
            borderBottom: index < scEntries.length - 1 ? '1px solid var(--border-color)' : 'none',
            background: index % 2 === 0 ? 'var(--surface)' : 'var(--bg-tertiary)',
          }}>
            <div style={{flex: 1, display: 'flex', flexDirection: 'column', gap: '4px'}}>
              <div style={{fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)'}}>
                {codeToName[entry.code.trim()] || entry.code || '(no code yet)'}
              </div>
              <input
                type="text"
                value={entry.code}
                onChange={(e) => handleScChange(index, 'code', e.target.value)}
                placeholder="e.g. AE01-227"
                title="Employee code — the actual stored identifier for this mapping"
                style={{
                  padding: '6px 10px',
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-muted)',
                }}
              />
            </div>
            <select
              value={entry.center}
              onChange={(e) => handleScChange(index, 'center', e.target.value)}
              style={{
                padding: '8px 12px',
                fontSize: '13px',
                fontWeight: '600',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
              }}
            >
              {Object.entries(CENTERS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
            <button
              onClick={() => handleRemoveSc(index)}
              title={`Remove ${entry.code || 'this entry'}`}
              style={{background: 'none', border: '1px solid var(--border-color)', color: 'var(--text-muted)', width: '28px', height: '28px', borderRadius: '50%', cursor: 'pointer', fontSize: '15px', lineHeight: '1', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0}}
              onMouseEnter={(e) => { const b = e.currentTarget; b.style.borderColor = 'var(--error)'; b.style.color = 'var(--error)' }}
              onMouseLeave={(e) => { const b = e.currentTarget; b.style.borderColor = 'var(--border-color)'; b.style.color = 'var(--text-muted)' }}
            >×</button>
          </div>
        ))}
        {scEntries.length === 0 && (
          <div style={{padding: '20px', textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)'}}>
            No allocations yet — click "+ Add Staff" to map an employee code to a center.
          </div>
        )}
      </div>

      {/* Last Saved / Undo */}
      <div style={{
        marginTop: '20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '8px',
        fontSize: '12px',
        color: 'var(--text-muted)'
      }}>
        <span>Last saved: {scLastSavedAt ? new Date(scLastSavedAt).toLocaleString() : 'Never'}</span>
        {scBackup && (
          <button
            className="btn btn-secondary"
            onClick={handleRestoreScBackup}
            style={{padding: '6px 12px', fontSize: '12px'}}
          >
            Restore previous allocation
          </button>
        )}
      </div>

      {/* Action Buttons */}
      <div style={{display: 'flex', gap: '12px', marginTop: '12px'}}>
        <button className="btn btn-secondary" onClick={handleResetSc} style={{flex: '1'}}>
          <span>↺ Reset to Defaults</span>
        </button>
        <button className="btn btn-primary" onClick={handleSaveSc} style={{flex: '1'}}>
          <><SaveIcon />Save Allocation</>
        </button>
      </div>

      {/* Info Box */}
      <div style={{
        marginTop: '24px',
        padding: '16px',
        background: 'var(--accent-soft)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-md)',
        fontSize: '13px',
        color: 'var(--text-secondary)',
        lineHeight: '1.6'
      }}>
        <strong style={{color: 'var(--text-primary)'}}>How it works:</strong>
        <ul style={{marginTop: '8px', marginLeft: '20px'}}>
          <li>Matched against the employee code (e.g. "AE01-227") embedded in each staff name in the uploaded Excel — the code is the stored identifier, since staff names can change between uploads</li>
          <li>Shows the staff member's name above the code once a workbook has been uploaded in Bulk & Analytics; shows the raw code until then</li>
          <li>Staff with no code, or a code not listed here, show as "Unassigned" in Center-wise Stats</li>
          <li>Changes apply immediately to Bulk Results' Center-wise Stats section</li>
        </ul>
      </div>
    </section>

    <section className="card" style={{marginTop: '24px'}}>
      <div className="card-header">
        <h2 className="card-title">🐈 Preferences</h2>
        <div className="card-description">
          Small extras that don't affect any calculation
        </div>
      </div>

      <div className="settings-toggle-row">
        <div>
          <div className="settings-toggle-label">Sales Kitty</div>
          <div className="settings-toggle-desc">The cat that wanders the app and comments on your numbers</div>
        </div>
        <button
          type="button"
          className={`switch ${kittyEnabled ? 'on' : ''}`}
          role="switch"
          aria-checked={kittyEnabled}
          aria-label="Toggle Sales Kitty"
          onClick={() => onToggleKitty(!kittyEnabled)}
        >
          <span className="switch-thumb" />
        </button>
      </div>
    </section>
    </>
  )
}
