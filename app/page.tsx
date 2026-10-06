'use client'
import { useState, useEffect } from 'react'
import { IndividualTab } from '@/components/tabs/IndividualTab'
import { MoonIcon, SunIcon } from '@/components/icons'
import { BulkTab } from '@/components/tabs/BulkTab'
import { SaleAssistantTab } from '@/components/tabs/SaleAssistantTab'
import { SettingsTab } from '@/components/tabs/SettingsTab'
import { AboutTab } from '@/components/tabs/AboutTab'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { Robot } from '@/components/Robot'
import { DataExpiryTimer } from '@/components/DataExpiryTimer'
import { purgeExpiredData } from '@/lib/storage'
import { APP_VERSION, DEFAULT_THEME, DEFAULT_ROBOT_ENABLED } from '@/lib/config'

export default function Home() {
  const [activeTab, setActiveTab] = useState('bulk')
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
      <header className="header">
        <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle theme">
          {theme === 'dark' ? <MoonIcon large className="moon-glow" /> : <SunIcon large />}
        </button>
        <h1>K’Nomics</h1>
        <p className="subtitle">v{APP_VERSION}</p>
        <DataExpiryTimer />
      </header>

      <nav className="nav-tabs">
        <button
          className={`nav-tab ${activeTab === 'bulk' ? 'active' : ''}`}
          onClick={() => setActiveTab('bulk')}
        >
          Bulk
        </button>
        <button
          className={`nav-tab ${activeTab === 'individual' ? 'active' : ''}`}
          onClick={() => setActiveTab('individual')}
        >
          Individual
        </button>
        <button
          className={`nav-tab ${activeTab === 'sale-assistant' ? 'active' : ''}`}
          onClick={() => setActiveTab('sale-assistant')}
        >
          Sale Assistant
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

      {activeTab === 'individual'     && <IndividualTab />}
      {activeTab === 'sale-assistant' && (
        <ErrorBoundary label="Sale Assistant tab">
          <SaleAssistantTab />
        </ErrorBoundary>
      )}
      {activeTab === 'bulk' && (
        <ErrorBoundary label="Bulk tab">
          <BulkTab />
        </ErrorBoundary>
      )}
      {activeTab === 'settings'       && (
        <SettingsTab robotEnabled={robotEnabled} onToggleRobot={toggleRobot} />
      )}
      {activeTab === 'about'          && <AboutTab />}
    </div>
  )
}
