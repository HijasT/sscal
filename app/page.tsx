'use client'
import { useState, useEffect } from 'react'
import { IndividualTab } from '@/components/tabs/IndividualTab'
import { MoonIcon, SunIcon } from '@/components/icons'
import { BulkAnalyticsTab } from '@/components/tabs/BulkAnalyticsTab'
import { SettingsTab } from '@/components/tabs/SettingsTab'
import { AboutTab } from '@/components/tabs/AboutTab'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { Kitty } from '@/components/Kitty'
import { APP_VERSION, DEFAULT_THEME, DEFAULT_KITTY_ENABLED } from '@/lib/config'

export default function Home() {
  const [activeTab, setActiveTab] = useState('bulk-analytics')
  const [theme, setTheme] = useState<'light' | 'dark'>(DEFAULT_THEME)
  const [kittyEnabled, setKittyEnabled] = useState(DEFAULT_KITTY_ENABLED)

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

    const savedKitty = localStorage.getItem('sic_kitty_enabled')
    if (savedKitty !== null) setKittyEnabled(savedKitty === 'true')
  }, [])

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    document.body.classList.toggle('light-mode', next === 'light')
    localStorage.setItem('sic_theme', next)
  }

  const toggleKitty = (enabled: boolean) => {
    setKittyEnabled(enabled)
    localStorage.setItem('sic_kitty_enabled', String(enabled))
  }

  return (
    <div className="container">
      {kittyEnabled && <Kitty />}
      <header className="header">
        <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle theme">
          {theme === 'dark' ? <MoonIcon large /> : <SunIcon large />}
        </button>
        <h1>Smart Incentive Calculator</h1>
        <p className="subtitle">v{APP_VERSION}</p>
      </header>

      <nav className="nav-tabs">
        <button
          className={`nav-tab ${activeTab === 'bulk-analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('bulk-analytics')}
        >
          Bulk & Analytics
        </button>
        <button
          className={`nav-tab ${activeTab === 'individual' ? 'active' : ''}`}
          onClick={() => setActiveTab('individual')}
        >
          Individual
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
      {activeTab === 'bulk-analytics' && (
        <ErrorBoundary label="Bulk & Analytics tab">
          <BulkAnalyticsTab />
        </ErrorBoundary>
      )}
      {activeTab === 'settings'       && (
        <SettingsTab kittyEnabled={kittyEnabled} onToggleKitty={toggleKitty} />
      )}
      {activeTab === 'about'          && <AboutTab />}
    </div>
  )
}
