'use client'
/**
 * SaleAssistantTab — browse/search the sales catalogue.
 *
 * Phase 1: searchable, category-filtered catalogue browser with a per-package
 * "what's included" drill-down. Data comes from the bundled static snapshot
 * (lib/catalogue.json via lib/catalogueUtils) — no network calls, consistent
 * with the app's "100% local" guarantee. A quote basket + PDF export follow in
 * a later phase.
 */
import { useMemo, useState } from 'react'
import {
  getServices,
  getCategories,
  searchServices,
  groupComps,
  formatAED,
  CATALOGUE_META,
  type CatalogueService,
} from '@/lib/catalogueUtils'

const ALL = 'All'

export function SaleAssistantTab() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string>(ALL)
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const totalCount = getServices().length
  const categories = useMemo(() => [ALL, ...getCategories()], [])

  const results = useMemo(
    () => searchServices(query, category === ALL ? undefined : category),
    [query, category]
  )

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">Sale Assistant</h2>
        <p className="card-description">
          Browse the full package catalogue with prices and what&apos;s included. Prices in AED.
          Catalogue snapshot: {CATALOGUE_META.fetchedAt} · {totalCount} packages.
        </p>
      </div>

      <div className="privacy-notice">
        <span className="privacy-icon">🔒</span>
        100% local · catalogue bundled with the app · no data shared
      </div>

      {/* Search */}
      <div className="form-group" style={{ marginBottom: 16 }}>
        <label htmlFor="sa-search">Search packages</label>
        <input
          id="sa-search"
          type="text"
          placeholder="Search by name, category…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {/* Category filter chips */}
      <div className="sa-chips">
        {categories.map((c) => (
          <button
            key={c}
            className={`sa-chip ${category === c ? 'active' : ''}`}
            onClick={() => setCategory(c)}
          >
            {c}
          </button>
        ))}
      </div>

      <p className="sa-count">
        Showing {results.length} of {totalCount} packages
      </p>

      {/* Results */}
      {results.length === 0 ? (
        <p className="sa-empty">No packages match your search.</p>
      ) : (
        <div className="sa-list">
          {results.map((s) => (
            <ServiceRow
              key={s.id}
              service={s}
              expanded={expandedId === s.id}
              onToggle={() => setExpandedId(expandedId === s.id ? null : s.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function ServiceRow({
  service,
  expanded,
  onToggle,
}: {
  service: CatalogueService
  expanded: boolean
  onToggle: () => void
}) {
  const groups = useMemo(() => groupComps(service), [service])

  return (
    <div className={`sa-item ${expanded ? 'expanded' : ''}`}>
      <div className="sa-item-main">
        <div className="sa-item-info">
          <span className="sa-item-cat">{service.category}</span>
          <span className="sa-item-name">{service.name}</span>
          <span className="sa-item-meta">
            {service.sub ? `${service.sub} · ` : ''}
            {service.biomarkers} biomarkers
            {service.doctor ? ` · ${service.doctor} doctor` : ''}
          </span>
        </div>
        <div className="sa-item-actions">
          <span className="sa-price">{formatAED(service.price)}</span>
          <button className="btn btn-secondary btn-sm" onClick={onToggle}>
            {expanded ? 'Hide' : 'Details'}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="sa-details">
          {groups.length === 0 ? (
            <p className="sa-empty">No breakdown available for this package.</p>
          ) : (
            groups.map((g) => (
              <div key={g.group} className="sa-detail-group">
                <div className="sa-detail-group-title">{g.group}</div>
                {g.rows.map((r, i) => (
                  <div key={i} className="sa-detail-row">
                    <span className="sa-detail-name">{r.name}</span>
                    <span className="sa-detail-value">{r.value}</span>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
