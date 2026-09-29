'use client'
/**
 * SaleAssistantTab — browse/search the sales catalogue and build a quote.
 *
 * - Catalogue browser: searchable, category-filtered package list with a
 *   per-package "what's included" drill-down.
 * - Quote basket: add packages, adjust quantity, apply an optional discount,
 *   see a running AED total, and export the quote to PDF.
 *
 * All data comes from the bundled static snapshot (lib/catalogue.json via
 * lib/catalogueUtils) — no network calls, consistent with the app's
 * "100% local · no data shared" guarantee. The in-progress quote is kept in
 * sessionStorage (like the Individual tab's inputs) so it survives tab
 * switches within a session but clears when the tab is closed.
 */
import { useEffect, useMemo, useState } from 'react'
import {
  getServices,
  getCategories,
  getServiceById,
  searchServices,
  groupComps,
  formatAED,
  quoteTotals,
  CATALOGUE_META,
  type CatalogueService,
  type QuoteLine,
} from '@/lib/catalogueUtils'
import { exportQuoteToPDF } from '@/lib/pdfUtils'

const ALL = 'All'
const QUOTE_KEY = 'sic_sale_quote'

interface StoredQuote {
  lines: { id: number; qty: number }[]
  discountPct: number
  customer: string
}

export function SaleAssistantTab() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string>(ALL)
  const [expandedId, setExpandedId] = useState<number | null>(null)

  // Quote basket state
  const [lines, setLines] = useState<QuoteLine[]>([])
  const [discountPct, setDiscountPct] = useState(0)
  const [customer, setCustomer] = useState('')
  const [quoteOpen, setQuoteOpen] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  const totalCount = getServices().length
  const categories = useMemo(() => [ALL, ...getCategories()], [])

  const results = useMemo(
    () => searchServices(query, category === ALL ? undefined : category),
    [query, category]
  )

  const totals = useMemo(() => quoteTotals(lines, discountPct), [lines, discountPct])

  // Rehydrate the in-progress quote from sessionStorage on mount.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(QUOTE_KEY)
      if (raw) {
        const stored: StoredQuote = JSON.parse(raw)
        const restored = (stored.lines || [])
          .map((l) => {
            const service = getServiceById(l.id)
            return service ? { service, qty: l.qty } : null
          })
          .filter((l): l is QuoteLine => l !== null)
        setLines(restored)
        setDiscountPct(stored.discountPct || 0)
        setCustomer(stored.customer || '')
      }
    } catch {
      /* ignore malformed/unavailable sessionStorage */
    }
    setHydrated(true)
  }, [])

  // Persist the quote whenever it changes (after the initial hydrate).
  useEffect(() => {
    if (!hydrated) return
    try {
      const payload: StoredQuote = {
        lines: lines.map((l) => ({ id: l.service.id, qty: l.qty })),
        discountPct,
        customer,
      }
      sessionStorage.setItem(QUOTE_KEY, JSON.stringify(payload))
    } catch {
      /* ignore */
    }
  }, [lines, discountPct, customer, hydrated])

  const addToQuote = (service: CatalogueService) => {
    setLines((prev) => {
      const existing = prev.find((l) => l.service.id === service.id)
      if (existing) {
        return prev.map((l) => (l.service.id === service.id ? { ...l, qty: l.qty + 1 } : l))
      }
      return [...prev, { service, qty: 1 }]
    })
    setQuoteOpen(true)
  }

  const setQty = (id: number, qty: number) => {
    setLines((prev) =>
      qty <= 0
        ? prev.filter((l) => l.service.id !== id)
        : prev.map((l) => (l.service.id === id ? { ...l, qty } : l))
    )
  }

  const removeLine = (id: number) => setLines((prev) => prev.filter((l) => l.service.id !== id))

  const clearQuote = () => {
    setLines([])
    setDiscountPct(0)
    setCustomer('')
  }

  const qtyInQuote = (id: number) => lines.find((l) => l.service.id === id)?.qty ?? 0

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">Sale Assistant</h2>
        <p className="card-description">
          Browse the full package catalogue, see what&apos;s included, and build a quote. Prices in AED.
          Catalogue snapshot: {CATALOGUE_META.fetchedAt} · {totalCount} packages.
        </p>
      </div>

      <div className="privacy-notice">
        <span className="privacy-icon">🔒</span>
        100% local · catalogue bundled with the app · no data shared
      </div>

      {/* Quote basket */}
      <QuotePanel
        lines={lines}
        totals={totals}
        discountPct={discountPct}
        customer={customer}
        open={quoteOpen}
        onToggleOpen={() => setQuoteOpen((o) => !o)}
        onSetQty={setQty}
        onRemove={removeLine}
        onSetDiscount={setDiscountPct}
        onSetCustomer={setCustomer}
        onClear={clearQuote}
      />

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
              inQuoteQty={qtyInQuote(s.id)}
              expanded={expandedId === s.id}
              onToggle={() => setExpandedId(expandedId === s.id ? null : s.id)}
              onAdd={() => addToQuote(s)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function QuotePanel({
  lines,
  totals,
  discountPct,
  customer,
  open,
  onToggleOpen,
  onSetQty,
  onRemove,
  onSetDiscount,
  onSetCustomer,
  onClear,
}: {
  lines: QuoteLine[]
  totals: ReturnType<typeof quoteTotals>
  discountPct: number
  customer: string
  open: boolean
  onToggleOpen: () => void
  onSetQty: (id: number, qty: number) => void
  onRemove: (id: number) => void
  onSetDiscount: (pct: number) => void
  onSetCustomer: (name: string) => void
  onClear: () => void
}) {
  const [exporting, setExporting] = useState(false)
  const empty = lines.length === 0

  const handleExport = async () => {
    setExporting(true)
    try {
      await exportQuoteToPDF(lines, totals, customer)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="sa-quote">
      <button className="sa-quote-bar" onClick={onToggleOpen} aria-expanded={open}>
        <span className="sa-quote-title">
          Quote <span className="sa-quote-count">{totals.itemCount}</span>
        </span>
        <span className="sa-quote-total">{formatAED(totals.total)}</span>
        <span className="sa-quote-chevron">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="sa-quote-body">
          {empty ? (
            <p className="sa-empty" style={{ padding: '8px 0' }}>
              No packages added yet. Use “Add” on any package below to start a quote.
            </p>
          ) : (
            <>
              {lines.map((l) => (
                <div key={l.service.id} className="sa-quote-line">
                  <div className="sa-quote-line-info">
                    <span className="sa-quote-line-name">{l.service.name}</span>
                    <span className="sa-quote-line-unit">{formatAED(l.service.price)} each</span>
                  </div>
                  <div className="sa-qty">
                    <button
                      className="sa-qty-btn"
                      onClick={() => onSetQty(l.service.id, l.qty - 1)}
                      aria-label="Decrease quantity"
                    >
                      −
                    </button>
                    <span className="sa-qty-val">{l.qty}</span>
                    <button
                      className="sa-qty-btn"
                      onClick={() => onSetQty(l.service.id, l.qty + 1)}
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>
                  <span className="sa-quote-line-total">
                    {formatAED(l.service.price == null ? null : l.service.price * l.qty)}
                  </span>
                  <button
                    className="sa-quote-line-remove"
                    onClick={() => onRemove(l.service.id)}
                    aria-label="Remove from quote"
                  >
                    ✕
                  </button>
                </div>
              ))}

              <div className="sa-quote-controls">
                <div className="form-group">
                  <label htmlFor="sa-customer">Customer (optional)</label>
                  <input
                    id="sa-customer"
                    type="text"
                    placeholder="Name for the quote"
                    value={customer}
                    onChange={(e) => onSetCustomer(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="sa-discount">Discount %</label>
                  <input
                    id="sa-discount"
                    type="number"
                    min={0}
                    max={100}
                    value={discountPct === 0 ? '' : discountPct}
                    placeholder="0"
                    onChange={(e) => onSetDiscount(Number(e.target.value) || 0)}
                  />
                </div>
              </div>

              <div className="sa-quote-totals">
                <div className="sa-quote-total-row">
                  <span>Subtotal</span>
                  <span>{formatAED(totals.subtotal)}</span>
                </div>
                {totals.discountPct > 0 && (
                  <div className="sa-quote-total-row sa-quote-discount">
                    <span>Discount ({totals.discountPct}%)</span>
                    <span>− {formatAED(totals.discountAmount)}</span>
                  </div>
                )}
                <div className="sa-quote-total-row sa-quote-grand">
                  <span>Total</span>
                  <span>{formatAED(totals.total)}</span>
                </div>
              </div>

              <div className="sa-quote-actions">
                <button className="btn btn-secondary btn-sm" onClick={onClear}>
                  Clear
                </button>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleExport}
                  disabled={exporting}
                >
                  {exporting ? 'Exporting…' : 'Export PDF'}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function ServiceRow({
  service,
  inQuoteQty,
  expanded,
  onToggle,
  onAdd,
}: {
  service: CatalogueService
  inQuoteQty: number
  expanded: boolean
  onToggle: () => void
  onAdd: () => void
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
          <button className="btn btn-primary btn-sm" onClick={onAdd}>
            {inQuoteQty > 0 ? `Add (${inQuoteQty})` : 'Add'}
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
