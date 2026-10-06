'use client'
import { useState, useEffect, type ReactNode } from 'react'
import { parseExcelFile, pickDefaultMonth, type ExcelData } from '@/lib/excelUtils'
import { BulkResultsView } from './BulkResultsView'
import { BarChartIcon, UploadIcon } from '@/components/icons'
import { getFresh, setFresh, clearFresh } from '@/lib/storage'

type ViewMode = 'monthly' | 'q1' | 'q2' | 'q3' | 'q4' | 'h1' | 'h2' | 'yearly' | 'alltime'

const SHORT_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const getCurrentMonthShort = () => SHORT_MONTHS[new Date().getMonth()]
const getCurrentYearShort  = () => String(new Date().getFullYear()).slice(-2)

// Persists the shared upload + view selection so switching tabs (which
// unmounts this component) doesn't lose the uploaded workbook.
const STORAGE_KEY = 'sic_bulk_upload'

interface PersistedUpload {
  excelData: ExcelData[]
  viewMode: ViewMode
  selectedMonth: string
  selectedYear: string
}

function loadPersistedUpload(): Partial<PersistedUpload> {
  if (typeof window === 'undefined') return {}
  try {
    const stored = getFresh('local', STORAGE_KEY)
    return stored ? JSON.parse(stored) : {}
  } catch {
    return {}
  }
}

export function BulkTab({ modeSwitch }: { modeSwitch?: ReactNode }) {
  // SSR-safe defaults — localStorage isn't available during the server
  // render, so starting from it here would make the client's first render
  // diverge from the server's and trigger a hydration mismatch. The actual
  // persisted values are applied after mount instead (see below), which
  // matters now that this is the default/first-rendered tab.
  const [viewMode, setViewMode] = useState<ViewMode>('monthly')
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthShort())
  const [selectedYear, setSelectedYear] = useState(getCurrentYearShort())
  const [excelData, setExcelData] = useState<ExcelData[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [availableYears, setAvailableYears] = useState<string[]>([])
  const [hasHydrated, setHasHydrated] = useState(false)

  // Apply whatever was persisted from a previous session, once, after mount.
  useEffect(() => {
    const persisted = loadPersistedUpload()
    if (persisted.excelData !== undefined) setExcelData(persisted.excelData)
    if (persisted.viewMode !== undefined) setViewMode(persisted.viewMode)
    if (persisted.selectedMonth !== undefined) setSelectedMonth(persisted.selectedMonth)
    if (persisted.selectedYear !== undefined) setSelectedYear(persisted.selectedYear)
    setHasHydrated(true)
  }, [])

  // Persist shared upload state so it survives a tab switch/remount. Skipped
  // until the hydrate effect above has run, so it doesn't overwrite saved
  // data with the SSR-safe defaults before they've been applied.
  useEffect(() => {
    if (!hasHydrated || typeof window === 'undefined') return
    if (excelData.length === 0) return clearFresh('local', STORAGE_KEY)
    setFresh('local', STORAGE_KEY, JSON.stringify({ excelData, viewMode, selectedMonth, selectedYear }))
  }, [hasHydrated, excelData, viewMode, selectedMonth, selectedYear])

  // Extract available years from excelData
  useEffect(() => {
    if (excelData.length > 0) {
      const years = new Set<string>()
      excelData.forEach(sheet => {
        const match = sheet.sheetName.match(/\d{2}$/)
        if (match) years.add(match[0])
      })
      // Keep the currently selected year selectable even if no sheet matches it yet
      // (e.g. auto-selected current year on upload before that sheet exists).
      if (selectedYear) years.add(selectedYear)
      const yearList = Array.from(years).sort()
      setAvailableYears(yearList)
      if (yearList.length > 0 && !selectedYear) {
        setSelectedYear(yearList[yearList.length - 1])
      }
    }
  }, [excelData])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0]
    if (!uploadedFile) return

    setIsProcessing(true)

    try {
      const data = await parseExcelFile(uploadedFile)
      setExcelData(data)
      // Auto-select the current month/year on every fresh upload, falling
      // back to the previous month if the current one has no usable data.
      // Results then calculate automatically (see BulkResultsView).
      setViewMode('monthly')
      const { month, year } = pickDefaultMonth(data)
      setSelectedMonth(month)
      setSelectedYear(year)
    } catch (error) {
      console.error('Error parsing Excel:', error)
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      alert(`Error parsing Excel file: ${errorMsg}`)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <section className="card">
      {modeSwitch}

      <div className="card-header">
        <h2 className="card-title"><BarChartIcon className="icon-lg" />Bulk Calculations</h2>
        <div className="card-description">Upload your Excel file to calculate bulk incentives for the whole team</div>
      </div>

      {/* Shared Upload Section */}
      <div style={{
        marginBottom: '24px',
        padding: '20px',
        background: 'var(--bg-tertiary)',
        border: '1px dashed var(--border-color)',
        borderRadius: 'var(--radius-md)',
        textAlign: 'center'
      }}>
        <h3 style={{fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: 'var(--accent-primary)'}}>
          <UploadIcon />Upload Excel File (Shared)
        </h3>
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileUpload}
          disabled={isProcessing}
          style={{
            padding: '10px 20px',
            background: 'var(--surface)',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            color: 'var(--text-primary)',
            cursor: isProcessing ? 'not-allowed' : 'pointer'
          }}
        />
        <p style={{fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px'}}>
          {isProcessing ? 'Processing...' : 'Upload the monthly Excel workbook to calculate team incentives'}
        </p>
      </div>

      {/* View Controls - Modern Dropdowns */}
      {excelData.length > 0 && (
        <>
          {/* View Selectors - Above Tabs */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: viewMode === 'monthly' ? '1fr 1fr 1fr' : viewMode === 'alltime' ? '1fr' : '1fr 1fr',
            gap: '12px',
            marginBottom: '16px',
            padding: '16px',
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)'
          }}>
            {/* VIEW MODE */}
            <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
              <label style={{
                fontSize: '11px',
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                color: 'var(--text-muted)'
              }}>
                VIEW MODE
              </label>
              <select
                value={viewMode}
                onChange={(e) => setViewMode(e.target.value as ViewMode)}
                style={{
                  padding: '12px 16px',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: 'var(--text-primary)',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  transition: 'var(--transition-base)',
                  outline: 'none'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--accent-primary)'
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-color)'
                }}
              >
                <option value="monthly">Monthly</option>
                <option value="q1">Q1 (Jan-Mar)</option>
                <option value="q2">Q2 (Apr-Jun)</option>
                <option value="q3">Q3 (Jul-Sep)</option>
                <option value="q4">Q4 (Oct-Dec)</option>
                <option value="h1">H1 (Jan-Jun)</option>
                <option value="h2">H2 (Jul-Dec)</option>
                <option value="yearly">Yearly</option>
                <option value="alltime">All-Time</option>
              </select>
            </div>

            {/* MONTH (only for monthly view) */}
            {viewMode === 'monthly' && (
              <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                <label style={{
                  fontSize: '11px',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  color: 'var(--text-muted)'
                }}>
                  MONTH
                </label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  style={{
                    padding: '12px 16px',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: 'var(--text-primary)',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    transition: 'var(--transition-base)',
                    outline: 'none'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'var(--accent-primary)'
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-color)'
                  }}
                >
                  <option value="Jan">January</option>
                  <option value="Feb">February</option>
                  <option value="Mar">March</option>
                  <option value="Apr">April</option>
                  <option value="May">May</option>
                  <option value="Jun">June</option>
                  <option value="Jul">July</option>
                  <option value="Aug">August</option>
                  <option value="Sep">September</option>
                  <option value="Oct">October</option>
                  <option value="Nov">November</option>
                  <option value="Dec">December</option>
                </select>
              </div>
            )}

            {/* YEAR (all modes except alltime) */}
            {viewMode !== 'alltime' && (
              <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                <label style={{
                  fontSize: '11px',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  color: 'var(--text-muted)'
                }}>
                  YEAR
                </label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  style={{
                    padding: '12px 16px',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: 'var(--text-primary)',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    transition: 'var(--transition-base)',
                    outline: 'none'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'var(--accent-primary)'
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-color)'
                  }}
                >
                  {availableYears.map(year => (
                    <option key={year} value={year}>20{year}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <BulkResultsView
            excelData={excelData}
            viewMode={viewMode}
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
          />
        </>
      )}

      {/* Empty State */}
      {excelData.length === 0 && !isProcessing && (
        <div style={{
          padding: '64px',
          textAlign: 'center',
          background: 'var(--bg-tertiary)',
          borderRadius: 'var(--radius-md)',
          border: '2px dashed var(--border-color)'
        }}>
          <div style={{display:'flex',justifyContent:'center',marginBottom:'20px',color:'var(--text-muted)'}}>
            <BarChartIcon className="icon-lg" style={{width:'56px',height:'56px'}} />
          </div>
          <h3 style={{fontSize: '20px', fontWeight: '700', marginBottom: '12px'}}>
            Upload Excel to Get Started
          </h3>
          <p style={{color: 'var(--text-muted)', fontSize: '15px'}}>
            Upload the monthly workbook to calculate team incentives
          </p>
        </div>
      )}
    </section>
  )
}
