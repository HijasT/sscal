'use client'
/**
 * SaleAssistantTab — browse the catalogue and build/compare quotes.
 *
 * - Catalogue browser: search by package name, category, or lab marker; an
 *   optional "blood tests only" filter hides consult/vitals-only packages. Each
 *   package's drill-down shows its full breakdown — service-level inclusions
 *   (doctor, vitals, DNA modules, ECG, etc.) plus every resolved lab test,
 *   grouped by profile.
 * - Side-by-side quotes (A and B): add packages to either side and compare the
 *   totals.
 * - Per-line discounts: every line in a quote can carry its own discount,
 *   entered as a percentage or a fixed AED amount.
 * - Bundle suggestions for Quote B are derived from Quote A's packages: the
 *   cheapest "bundle a subset + keep the rest" combinations covering Quote A,
 *   which one click fills into Quote B — so A (à la carte) can be compared with
 *   the bundled version in B.
 *
 * All data comes from the bundled static snapshot (lib/catalogue.json via
 * lib/catalogueUtils) — no network calls. Both in-progress quotes are kept in
 * sessionStorage so they survive tab switches within a session and clear when
 * the tab is closed.
 */
import { useEffect, useMemo, useState } from 'react'
import {
  getServices,
  getCategories,
  getServiceById,
  searchServices,
  groupComps,
  groupServiceTests,
  getComponentPackages,
  findBundleSuggestions,
  hasLabTests,
  formatAED,
  quoteTotals,
  lineGross,
  lineNet,
  lineDiscountAmount,
  type CatalogueService,
  type QuoteLine,
  type QuoteTotals,
  type DiscountType,
  type BundleSuggestion,
} from '@/lib/catalogueUtils'

const ALL = 'All'
const QUOTE_KEY = 'sic_sale_quote'

type Side = 'A' | 'B'
const SIDES: Side[] = ['A', 'B']

interface QuoteState {
  lines: QuoteLine[]
}

const emptyQuote = (): QuoteState => ({ lines: [] })

interface StoredLine {
  id: number
  qty: number
  discountType: DiscountType
  discountValue: number
}
interface StoredQuotes {
  A: { lines: StoredLine[] }
  B: { lines: StoredLine[] }
}

export function SaleAssistantTab() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string>(ALL)
  const [bloodOnly, setBloodOnly] = useState(false)
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const [quotes, setQuotes] = useState<Record<Side, QuoteState>>({ A: emptyQuote(), B: emptyQuote() })
  const [quoteOpen, setQuoteOpen] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  const totalCount = getServices().length
  const categories = useMemo(() => [ALL, ...getCategories()], [])

  const results = useMemo(() => {
    let r = searchServices(query, category === ALL ? undefined : category)
    if (bloodOnly) r = r.filter(hasLabTests)
    return r
  }, [query, category, bloodOnly])

  // Rehydrate both quotes from sessionStorage on mount.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(QUOTE_KEY)
      if (raw) {
        const stored: StoredQuotes = JSON.parse(raw)
        const restore = (q: StoredQuotes['A']): QuoteState => ({
          lines: (q?.lines || [])
            .map((l) => {
              const service = getServiceById(l.id)
              return service
                ? {
                    service,
                    qty: l.qty,
                    discountType: (l.discountType as DiscountType) || 'pct',
                    discountValue: l.discountValue || 0,
                  }
                : null
            })
            .filter((l): l is QuoteLine => l !== null),
        })
        setQuotes({ A: restore(stored.A), B: restore(stored.B) })
      }
    } catch {
      /* ignore malformed/unavailable sessionStorage */
    }
    setHydrated(true)
  }, [])

  // Persist both quotes whenever they change (after the initial hydrate).
  useEffect(() => {
    if (!hydrated) return
    try {
      const dump = (q: QuoteState) => ({
        lines: q.lines.map((l) => ({
          id: l.service.id,
          qty: l.qty,
          discountType: l.discountType,
          discountValue: l.discountValue,
        })),
      })
      const payload: StoredQuotes = { A: dump(quotes.A), B: dump(quotes.B) }
      sessionStorage.setItem(QUOTE_KEY, JSON.stringify(payload))
    } catch {
      /* ignore */
    }
  }, [quotes, hydrated])

  const updateSide = (side: Side, updater: (q: QuoteState) => QuoteState) =>
    setQuotes((prev) => ({ ...prev, [side]: updater(prev[side]) }))

  const addToQuote = (side: Side, service: CatalogueService) => {
    updateSide(side, (q) => {
      const existing = q.lines.find((l) => l.service.id === service.id)
      const lines = existing
        ? q.lines.map((l) => (l.service.id === service.id ? { ...l, qty: l.qty + 1 } : l))
        : [...q.lines, { service, qty: 1, discountType: 'pct' as DiscountType, discountValue: 0 }]
      return { ...q, lines }
    })
    setQuoteOpen(true)
  }

  const setQty = (side: Side, id: number, qty: number) =>
    updateSide(side, (q) => ({
      ...q,
      lines:
        qty <= 0
          ? q.lines.filter((l) => l.service.id !== id)
          : q.lines.map((l) => (l.service.id === id ? { ...l, qty } : l)),
    }))

  const setLineDiscount = (side: Side, id: number, patch: Partial<Pick<QuoteLine, 'discountType' | 'discountValue'>>) =>
    updateSide(side, (q) => ({
      ...q,
      lines: q.lines.map((l) => (l.service.id === id ? { ...l, ...patch } : l)),
    }))

  const removeLine = (side: Side, id: number) =>
    updateSide(side, (q) => ({ ...q, lines: q.lines.filter((l) => l.service.id !== id) }))

  const clearQuote = (side: Side) => updateSide(side, () => emptyQuote())

  // Build a quote side from a suggestion: the bundle plus the packages it does
  // not cover ("leftovers"), replacing whatever was on that side. Used to fill
  // Quote B with the bundled alternative to Quote A.
  const useSuggestion = (side: Side, suggestion: BundleSuggestion) =>
    updateSide(side, () => ({
      lines: [suggestion.bundle, ...suggestion.leftovers].map((service) => ({
        service,
        qty: 1,
        discountType: 'pct' as DiscountType,
        discountValue: 0,
      })),
    }))

  const qtyInQuote = (side: Side, id: number) =>
    quotes[side].lines.find((l) => l.service.id === id)?.qty ?? 0

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">Sale Assistant</h2>
      </div>

      <div className="privacy-notice">
        <span className="privacy-icon">🔒</span>
        100% local · catalogue bundled with the app · no data shared
      </div>

      {/* Two-sided quote comparison */}
      <QuoteComparison
        quotes={quotes}
        open={quoteOpen}
        onToggleOpen={() => setQuoteOpen((o) => !o)}
        onSetQty={setQty}
        onSetLineDiscount={setLineDiscount}
        onRemove={removeLine}
        onClear={clearQuote}
        onUseSuggestion={useSuggestion}
      />

      {/* Search */}
      <div className="form-group" style={{ marginBottom: 16 }}>
        <label htmlFor="sa-search">Search packages</label>
        <input
          id="sa-search"
          type="text"
          placeholder="Search by name, category, or marker…"
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

      <div className="sa-filter-row">
        <label className="sa-check">
          <input
            type="checkbox"
            checked={bloodOnly}
            onChange={(e) => setBloodOnly(e.target.checked)}
          />
          Blood tests only
        </label>
        <span className="sa-count">
          Showing {results.length} of {totalCount} packages
        </span>
      </div>

      {/* Results */}
      {results.length === 0 ? (
        <p className="sa-empty">No packages match your search.</p>
      ) : (
        <div className="sa-list">
          {results.map((s) => (
            <ServiceRow
              key={s.id}
              service={s}
              qtyA={qtyInQuote('A', s.id)}
              qtyB={qtyInQuote('B', s.id)}
              expanded={expandedId === s.id}
              onToggle={() => setExpandedId(expandedId === s.id ? null : s.id)}
              onAdd={(side) => addToQuote(side, s)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function QuoteComparison({
  quotes,
  open,
  onToggleOpen,
  onSetQty,
  onSetLineDiscount,
  onRemove,
  onClear,
  onUseSuggestion,
}: {
  quotes: Record<Side, QuoteState>
  open: boolean
  onToggleOpen: () => void
  onSetQty: (side: Side, id: number, qty: number) => void
  onSetLineDiscount: (side: Side, id: number, patch: Partial<Pick<QuoteLine, 'discountType' | 'discountValue'>>) => void
  onRemove: (side: Side, id: number) => void
  onClear: (side: Side) => void
  onUseSuggestion: (side: Side, suggestion: BundleSuggestion) => void
}) {
  const totals = { A: quoteTotals(quotes.A.lines), B: quoteTotals(quotes.B.lines) } as Record<Side, QuoteTotals>
  const bothHaveItems = quotes.A.lines.length > 0 && quotes.B.lines.length > 0

  // Bundle suggestions for Quote B are derived from what's in Quote A, so the
  // salesperson can compare Quote A (à la carte) with the bundled version in B.
  const suggestionsForB = useMemo(
    () => findBundleSuggestions(quotes.A.lines.map((l) => l.service)).slice(0, 3),
    [quotes.A.lines]
  )

  return (
    <div className="sa-quote">
      <button className="sa-quote-bar" onClick={onToggleOpen} aria-expanded={open}>
        <span className="sa-quote-title">Quote comparison</span>
        <span className="sa-quote-compare-mini">
          A <b>{formatAED(totals.A.total)}</b> · B <b>{formatAED(totals.B.total)}</b>
        </span>
        <span className="sa-quote-chevron">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="sa-quote-body">
          <div className="sa-columns">
            {SIDES.map((side) => (
              <QuoteColumn
                key={side}
                side={side}
                quote={quotes[side]}
                totals={totals[side]}
                suggestions={side === 'B' ? suggestionsForB : []}
                onSetQty={(id, qty) => onSetQty(side, id, qty)}
                onSetLineDiscount={(id, patch) => onSetLineDiscount(side, id, patch)}
                onRemove={(id) => onRemove(side, id)}
                onClear={() => onClear(side)}
                onUseSuggestion={(suggestion) => onUseSuggestion(side, suggestion)}
              />
            ))}
          </div>

          {bothHaveItems && <ComparisonSummary a={totals.A.total} b={totals.B.total} />}
        </div>
      )}
    </div>
  )
}

function ComparisonSummary({ a, b }: { a: number; b: number }) {
  const diff = Math.abs(a - b)
  const cheaper: Side | null = a < b ? 'A' : b < a ? 'B' : null
  return (
    <div className="sa-compare">
      <div className="sa-compare-cell">
        <span className="sa-compare-label">Quote A</span>
        <span className="sa-compare-val">{formatAED(a)}</span>
      </div>
      <div className="sa-compare-verdict">
        {cheaper === null ? (
          <>Both totals are equal</>
        ) : (
          <>
            Quote <b>{cheaper}</b> is lower by <b>{formatAED(diff)}</b>
          </>
        )}
      </div>
      <div className="sa-compare-cell">
        <span className="sa-compare-label">Quote B</span>
        <span className="sa-compare-val">{formatAED(b)}</span>
      </div>
    </div>
  )
}

function QuoteColumn({
  side,
  quote,
  totals,
  suggestions,
  onSetQty,
  onSetLineDiscount,
  onRemove,
  onClear,
  onUseSuggestion,
}: {
  side: Side
  quote: QuoteState
  totals: QuoteTotals
  suggestions: BundleSuggestion[]
  onSetQty: (id: number, qty: number) => void
  onSetLineDiscount: (id: number, patch: Partial<Pick<QuoteLine, 'discountType' | 'discountValue'>>) => void
  onRemove: (id: number) => void
  onClear: () => void
  onUseSuggestion: (suggestion: BundleSuggestion) => void
}) {
  const empty = quote.lines.length === 0

  return (
    <div className="sa-col">
      <div className="sa-col-head">
        <span className="sa-col-badge">Quote {side}</span>
        {!empty && (
          <button className="sa-col-clear" onClick={onClear}>
            Clear
          </button>
        )}
      </div>

      {suggestions.length > 0 && (
        <div className="sa-bundles">
          <div className="sa-bundles-title">💡 Suggested bundles for Quote A</div>
          {suggestions.map((s) => (
            <BundleSuggestionRow key={s.bundle.id} s={s} onApply={() => onUseSuggestion(s)} />
          ))}
        </div>
      )}

      {empty ? (
        <p className="sa-empty" style={{ padding: '8px 0' }}>
          {suggestions.length > 0
            ? 'Apply a suggested bundle above, or use “+B” on any package below.'
            : `No packages yet. Use “+${side}” on any package below to add it here.`}
        </p>
      ) : (
        <>
          <div className="sa-col-lines">
            {quote.lines.map((l) => (
              <QuoteLineRow
                key={l.service.id}
                line={l}
                onSetQty={(qty) => onSetQty(l.service.id, qty)}
                onSetDiscount={(patch) => onSetLineDiscount(l.service.id, patch)}
                onRemove={() => onRemove(l.service.id)}
              />
            ))}
          </div>

          <div className="sa-quote-totals">
            <div className="sa-quote-total-row">
              <span>Subtotal</span>
              <span>{formatAED(totals.gross)}</span>
            </div>
            {totals.discount > 0 && (
              <div className="sa-quote-total-row sa-quote-discount">
                <span>Discounts</span>
                <span>− {formatAED(totals.discount)}</span>
              </div>
            )}
            <div className="sa-quote-total-row sa-quote-grand">
              <span>Total</span>
              <span>{formatAED(totals.total)}</span>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function QuoteLineRow({
  line,
  onSetQty,
  onSetDiscount,
  onRemove,
}: {
  line: QuoteLine
  onSetQty: (qty: number) => void
  onSetDiscount: (patch: Partial<Pick<QuoteLine, 'discountType' | 'discountValue'>>) => void
  onRemove: () => void
}) {
  const discount = lineDiscountAmount(line)

  return (
    <div className="sa-line">
      <div className="sa-line-top">
        <span className="sa-line-name">{line.service.name}</span>
        <button className="sa-quote-line-remove" onClick={onRemove} aria-label="Remove from quote">
          ✕
        </button>
      </div>

      <div className="sa-line-controls">
        <div className="sa-qty">
          <button className="sa-qty-btn" onClick={() => onSetQty(line.qty - 1)} aria-label="Decrease quantity">
            −
          </button>
          <span className="sa-qty-val">{line.qty}</span>
          <button className="sa-qty-btn" onClick={() => onSetQty(line.qty + 1)} aria-label="Increase quantity">
            +
          </button>
        </div>

        <div className="sa-disc">
          <div className="sa-disc-type">
            <button
              className={`sa-disc-btn ${line.discountType === 'pct' ? 'active' : ''}`}
              onClick={() => onSetDiscount({ discountType: 'pct' })}
              aria-label="Discount as percent"
            >
              %
            </button>
            <button
              className={`sa-disc-btn ${line.discountType === 'amt' ? 'active' : ''}`}
              onClick={() => onSetDiscount({ discountType: 'amt' })}
              aria-label="Discount as AED amount"
            >
              AED
            </button>
          </div>
          <input
            className="sa-disc-val"
            type="number"
            min={0}
            max={line.discountType === 'pct' ? 100 : undefined}
            placeholder="0"
            value={line.discountValue === 0 ? '' : line.discountValue}
            onChange={(e) => onSetDiscount({ discountValue: Number(e.target.value) || 0 })}
            aria-label="Discount value"
          />
        </div>

        <div className="sa-line-amounts">
          {discount > 0 && <span className="sa-line-gross">{formatAED(lineGross(line))}</span>}
          <span className="sa-line-net">{formatAED(lineNet(line))}</span>
        </div>
      </div>
    </div>
  )
}

function BundleSuggestionRow({ s, onApply }: { s: BundleSuggestion; onApply: () => void }) {
  const saves = s.delta < 0
  const extras: string[] = []
  if (s.extraTests > 0) extras.push(`${s.extraTests} more test${s.extraTests === 1 ? '' : 's'}`)
  if (s.extraComponents.length > 0)
    extras.push(`${s.extraComponents.length} add-on${s.extraComponents.length === 1 ? '' : 's'}`)

  return (
    <div className="sa-bundle">
      <div className="sa-bundle-info">
        <span className="sa-bundle-name">{s.bundle.name}</span>
        <span className="sa-bundle-meta">
          Replaces {s.covers.map((c) => c.name).join(' + ')}
          {s.leftovers.length > 0 && <> · keeps {s.leftovers.map((c) => c.name).join(', ')}</>}
        </span>
        <span className="sa-bundle-meta">
          Combined {formatAED(s.proposedTotal)} vs {formatAED(s.individualTotal)} individually
          {extras.length > 0 && <> · adds {extras.join(' + ')}</>}
        </span>
        {s.extraComponents.length > 0 && (
          <span className="sa-bundle-extras" title={s.extraComponents.join(', ')}>
            + {s.extraComponents.slice(0, 4).join(', ')}
            {s.extraComponents.length > 4 ? `, +${s.extraComponents.length - 4} more` : ''}
          </span>
        )}
      </div>
      <div className="sa-bundle-actions">
        <span className={`sa-bundle-delta ${saves ? 'save' : 'more'}`}>
          {saves ? `Save ${formatAED(-s.delta)}` : `+${formatAED(s.delta)}`}
        </span>
        <button className="btn btn-secondary btn-sm" onClick={onApply}>
          Apply
        </button>
      </div>
    </div>
  )
}

function ServiceRow({
  service,
  qtyA,
  qtyB,
  expanded,
  onToggle,
  onAdd,
}: {
  service: CatalogueService
  qtyA: number
  qtyB: number
  expanded: boolean
  onToggle: () => void
  onAdd: (side: Side) => void
}) {
  const groups = useMemo(() => groupComps(service), [service])
  const components = useMemo(() => (expanded ? getComponentPackages(service) : []), [service, expanded])
  const testGroups = useMemo(() => (expanded ? groupServiceTests(service) : []), [service, expanded])
  const testCount = useMemo(() => testGroups.reduce((n, g) => n + g.tests.length, 0), [testGroups])

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
          <div className="sa-add-group">
            <button
              className={`sa-addbtn ${qtyA > 0 ? 'active' : ''}`}
              onClick={() => onAdd('A')}
              aria-label="Add to Quote A"
            >
              +A{qtyA > 0 ? ` ${qtyA}` : ''}
            </button>
            <button
              className={`sa-addbtn ${qtyB > 0 ? 'active' : ''}`}
              onClick={() => onAdd('B')}
              aria-label="Add to Quote B"
            >
              +B{qtyB > 0 ? ` ${qtyB}` : ''}
            </button>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="sa-details">
          {groups.length === 0 && testGroups.length === 0 && components.length === 0 ? (
            <p className="sa-empty">No breakdown available for this package.</p>
          ) : (
            <>
              {/* Component packages this bundle is built from. */}
              {components.length > 0 && (
                <div className="sa-detail-group">
                  <div className="sa-detail-group-title">
                    Bundled packages <span className="sa-detail-group-count">{components.length}</span>
                  </div>
                  {components.map((c) => (
                    <div key={c.id} className="sa-detail-row">
                      <span className="sa-detail-name">{c.name}</span>
                      <span className="sa-detail-value">{formatAED(c.price)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Service-level inclusions: doctor, vitals, DNA modules, ECG, etc. */}
              {groups.map((g) => (
                <div key={g.group} className="sa-detail-group">
                  <div className="sa-detail-group-title">{g.group}</div>
                  {g.rows.map((r, i) => (
                    <div key={i} className="sa-detail-row">
                      <span className="sa-detail-name">{r.name}</span>
                      <span className="sa-detail-value">{r.value}</span>
                    </div>
                  ))}
                </div>
              ))}

              {/* Full lab-test / biomarker breakdown, grouped by profile. */}
              {testGroups.length > 0 && (
                <>
                  <div className="sa-detail-section-head">Lab tests ({testCount})</div>
                  {testGroups.map((g) => (
                    <div key={g.group} className="sa-detail-group">
                      <div className="sa-detail-group-title">
                        {g.group} <span className="sa-detail-group-count">{g.tests.length}</span>
                      </div>
                      <div className="sa-test-list">
                        {g.tests.map((t, i) => (
                          <span key={i} className="sa-test-chip">
                            {t.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
