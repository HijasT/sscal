'use client'
import { useState, useEffect, useRef } from 'react'
import { IndividualTab } from '@/components/tabs/IndividualTab'
import { MoonIcon, SunIcon, LockIcon } from '@/components/icons'
import { BulkTab } from '@/components/tabs/BulkTab'
import { SaleAssistantTab } from '@/components/tabs/SaleAssistantTab'
import { SettingsTab } from '@/components/tabs/SettingsTab'
import { AboutTab } from '@/components/tabs/AboutTab'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { Robot } from '@/components/Robot'
import { DataExpiryTimer } from '@/components/DataExpiryTimer'
import { MessageModal } from '@/components/MessageModal'
import { purgeExpiredData } from '@/lib/storage'
import { APP_VERSION, DEFAULT_THEME, DEFAULT_ROBOT_ENABLED } from '@/lib/config'

export default function Home() {
  const [activeTab, setActiveTab] = useState('sale-assistant')
  // Within the Calculator tab: bulk (team Excel upload) or individual (manual).
  const [calcMode, setCalcMode] = useState<'bulk' | 'individual'>('bulk')
  const [theme, setTheme] = useState<'light' | 'dark'>(DEFAULT_THEME)
  const [robotEnabled, setRobotEnabled] = useState(DEFAULT_ROBOT_ENABLED)

  useEffect(() => {
    const saved = localStorage.getItem('sic_theme') as 'light' | 'dark' | null

    // Apply saved preference, or apply the default theme on first visit
    const effective = saved ?? DEFAULT_THEME
    setTheme(effective)

    if (effective === 'light') {
      document.body.classList.add('light-mode')
    } else {
      document.body.classList.remove('light-mode')
    }

    // 'sic_kitty_enabled' is the pre-10.4 name of this setting.
    const savedRobot = localStorage.getItem('sic_robot_enabled') ?? localStorage.getItem('sic_kitty_enabled')
    if (savedRobot !== null) setRobotEnabled(savedRobot === 'true')
  }, [])

  // Delete entered/uploaded data that is already past the retention period
  // (lib/config.ts). While the page is open, DataExpiryTimer enforces it.
  useEffect(() => {
    purgeExpiredData()
  }, [])

  // Register the offline service worker (public/sw.js). Runtime caching only,
  // same-origin — lets the app reload/reopen and run exports fully offline.
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }
  }, [])

  // Publish the sticky topbar's live height as --topbar-h so sticky content below
  // it (the Sale Assistant search bar) and scroll-into-view offsets sit clear of it.
  const topbarRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = topbarRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const set = () => document.documentElement.style.setProperty('--topbar-h', `${el.offsetHeight}px`)
    set()
    const obs = new ResizeObserver(set)
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    document.body.classList.toggle('light-mode', next === 'light')
    localStorage.setItem('sic_theme', next)
  }

  const toggleRobot = (enabled: boolean) => {
    setRobotEnabled(enabled)
    localStorage.setItem('sic_robot_enabled', String(enabled))
  }

  return (
    <div className="container">
      {/* No robot on the Sale Assistant tab: it may be in front of a customer. */}
      {robotEnabled && activeTab !== 'sale-assistant' && <Robot />}
      <div className="topbar" ref={topbarRef}>
      <header className="appbar">
        <div className="appbar-brand">
          <h1>Kleon</h1>
          <span className="subtitle">v{APP_VERSION}</span>
        </div>
        <nav className="nav-tabs">
        <button
          className={`nav-tab ${activeTab === 'sale-assistant' ? 'active' : ''}`}
          onClick={() => setActiveTab('sale-assistant')}
        >
          Sale Assistant
        </button>
        <button
          className={`nav-tab ${activeTab === 'calculator' ? 'active' : ''}`}
          onClick={() => setActiveTab('calculator')}
        >
          Calculator
        </button>
        <button
          className={`nav-tab ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          Settings
        </button>
        <button
          className={`nav-tab ${activeTab === 'about' ? 'active' : ''}`}
          onClick={() => setActiveTab('about')}
        >
          About
        </button>
        </nav>
        <div className="appbar-right">
          <DataExpiryTimer />
          <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle theme">
            {theme === 'dark' ? <MoonIcon large /> : <SunIcon large />}
          </button>
        </div>
      </header>
      </div>

      {activeTab === 'calculator' && (() => {
        // Shared card top for both calculator modes, mirroring the Sale Assistant
        // tab's order: tab name, then privacy notice, then the mode pill.
        const modeSwitch = (
          <>
            <div className="card-header">
              <h2 className="card-title">Calculator</h2>
            </div>
            <div className="privacy-notice">
              <LockIcon />
              <span>Everything runs locally in your browser and works offline. No data is ever sent out.</span>
            </div>
            <div className="calc-switch" role="group" aria-label="Calculator mode">
              <button type="button" aria-pressed={calcMode === 'bulk'} onClick={() => setCalcMode('bulk')}>
                Bulk
              </button>
              <button type="button" aria-pressed={calcMode === 'individual'} onClick={() => setCalcMode('individual')}>
                Individual
              </button>
            </div>
          </>
        )
        return calcMode === 'bulk' ? (
          <ErrorBoundary label="Bulk tab">
            <BulkTab modeSwitch={modeSwitch} />
          </ErrorBoundary>
        ) : (
          <IndividualTab modeSwitch={modeSwitch} />
        )
      })()}
      {activeTab === 'sale-assistant' && (
        <ErrorBoundary label="Sale Assistant tab">
          <SaleAssistantTab />
        </ErrorBoundary>
      )}
      {activeTab === 'settings'       && (
        <SettingsTab robotEnabled={robotEnabled} onToggleRobot={toggleRobot} />
      )}
      {activeTab === 'about'          && <AboutTab />}
      <MessageModal />
    </div>
  )
}
