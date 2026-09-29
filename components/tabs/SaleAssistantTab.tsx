'use client'
/**
 * SaleAssistantTab — browse the catalogue, build a quote, and see its bundled
 * equivalent side by side.
 *
 * - Catalogue browser: search by package name, category, or lab marker; an
 *   optional "blood tests only" filter hides consult/vitals-only packages. Each
 *   package's drill-down shows its full breakdown — the packages a bundle is
 *   built from, service-level inclusions (doctor, vitals, DNA modules, ECG…),
 *   and every resolved lab test grouped by profile.
 * - Quote A (editable): add packages, adjust quantity, and give each line its
 *   own discount (a percentage or a fixed AED amount).
 * - Quote B (auto, read-only): the fully-bundled version of Quote A. It
 *   composes every applicable comprehensive/bundle package (e.g. Ultimate Men's
 *   + Food Allergy & Intolerance Bundle) plus any packages no bundle covers,
 *   and updates live as Quote A changes. The comparison bar shows Quote A (à la
 *   carte, after discounts) against the bundled list price.
 *
 * All data comes from the bundled static snapshot (lib/catalogue.json via
 * lib/catalogueUtils) — no network calls. Quote A is kept in sessionStorage so
 * it survives tab switches within a session and clears when the tab is closed.
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
  bundleAll,
  hasLabTests,
  formatAED,
  quoteTotals,
  lineGross,
  lineNet,
  lineDiscountAmount,
  type CatalogueService,
  type QuoteLine,
  type DiscountType,
} from '@/lib/catalogueUtils'

const ALL = 'All'
const QUOTE_KEY = 'sic_sale_quote'

interface StoredLine {
  id: number
  qty: number
  discountType: DiscountType
  discountValue: number
}

export function SaleAssistantTab() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string>(ALL)
  const [bloodOnly, setBloodOnly] = useState(false)
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const [lines, setLines] = useState<QuoteLine[]>([]) // Quote A
  // Quote B mirrors A's bundling, but the salesperson can try discounts on it.
  // Discounts are kept per service id so they survive B recomposing when A changes.
  const [bDiscounts, setBDiscounts] = useState<Record<number, { type: DiscountType; value: number }>>({})
  const [quoteOpen, setQuoteOpen] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  const totalCount = getServices().length
  const categories = useMemo(() => [ALL, ...getCategories()], [])

  const results = useMemo(() => {
    let r = searchServices(query, category === ALL ? undefined : category)
    if (bloodOnly) r = r.filter(hasLabTests)
    return r
  }, [query, category, bloodOnly])

  const totalsA = useMemo(() => quoteTotals(lines), [lines])
  const bundled = useMemo(() => bundleAll(lines.map((l) => l.service)), [lines])

  // Quote B lines: the bundled composition, each carrying its own (editable)
  // discount pulled from bDiscounts. Quantity is fixed at 1 (composition-level).
  const bundleIds = useMemo(() => new Set(bundled.bundles.map((b) => b.id)), [bundled])
  const bLines: QuoteLine[] = useMemo(
    () =>
      bundled.services.map((service) => ({
        service,
        qty: 1,
        discountType: bDiscounts[service.id]?.type ?? 'pct',
        discountValue: bDiscounts[service.id]?.value ?? 0,
      })),
    [bundled, bDiscounts]
  )
  const totalsB = useMemo(() => quoteTotals(bLines), [bLines])

  // Rehydrate Quote A from sessionStorage on mount (tolerates the older
  // two-quote {A,B} shape by reading Quote A).
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(QUOTE_KEY)
      if (raw) {
        const stored = JSON.parse(raw)
        const storedLines: StoredLine[] = stored?.lines ?? stored?.A?.lines ?? []
        const restored = storedLines
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
          .filter((l): l is QuoteLine => l !== null)
        setLines(restored)
        if (stored?.bDiscounts && typeof stored.bDiscounts === 'object') setBDiscounts(stored.bDiscounts)
      }
    } catch {
      /* ignore malformed/unavailable sessionStorage */
    }
    setHydrated(true)
  }, [])

  // Persist Quote A whenever it changes (after the initial hydrate).
  useEffect(() => {
    if (!hydrated) return
    try {
      const payload = {
        lines: lines.map((l) => ({
          id: l.service.id,
          qty: l.qty,
          discountType: l.discountType,
          discountValue: l.discountValue,
        })),
        bDiscounts,
      }
      sessionStorage.setItem(QUOTE_KEY, JSON.stringify(payload))
    } catch {
      /* ignore */
    }
  }, [lines, bDiscounts, hydrated])

  const addToQuote = (service: CatalogueService) => {
    setLines((prev) => {
      const existing = prev.find((l) => l.service.id === service.id)
      return existing
        ? prev.map((l) => (l.service.id === service.id ? { ...l, qty: l.qty + 1 } : l))
        : [...prev, { service, qty: 1, discountType: 'pct' as DiscountType, discountValue: 0 }]
    })
    setQuoteOpen(true)
  }

  const setQty = (id: number, qty: number) =>
    setLines((prev) =>
      qty <= 0
        ? prev.filter((l) => l.service.id !== id)
        : prev.map((l) => (l.service.id === id ? { ...l, qty } : l))
    )

  const setLineDiscount = (id: number, patch: Partial<Pick<QuoteLine, 'discountType' | 'discountValue'>>) =>
    setLines((prev) => prev.map((l) => (l.service.id === id ? { ...l, ...patch } : l)))

  const removeLine = (id: number) => setLines((prev) => prev.filter((l) => l.service.id !== id))

  const clearQuote = () => setLines([])

  const setBLineDiscount = (id: number, patch: Partial<Pick<QuoteLine, 'discountType' | 'discountValue'>>) =>
    setBDiscounts((prev) => {
      const cur = prev[id] ?? { type: 'pct' as DiscountType, value: 0 }
      return {
        ...prev,
        [id]: {
          type: patch.discountType ?? cur.type,
          value: patch.discountValue ?? cur.value,
        },
      }
    })

  const qtyInQuote = (id: number) => lines.find((l) => l.service.id === id)?.qty ?? 0

  const empty = lines.length === 0

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">Sale Assistant</h2>
      </div>

      <div className="privacy-notice">
        <span className="privacy-icon">🔒</span>
        100% local · catalogue bundled with the app · no data shared
      </div>

      {/* Quote A (editable) vs Quote B (auto-bundled) */}
      <div className="sa-quote">
        <button className="sa-quote-bar" onClick={() => setQuoteOpen((o) => !o)} aria-expanded={quoteOpen}>
          <span className="sa-quote-title">Quote comparison</span>
          <span className="sa-quote-compare-mini">
            A <b>{formatAED(totalsA.total)}</b> · Bundled <b>{formatAED(totalsB.total)}</b>
          </span>
          <span className="sa-quote-chevron">{quoteOpen ? '▲' : '▼'}</span>
        </button>

        {quoteOpen && (
          <div className="sa-quote-body">
            <div className="sa-columns">
              {/* Quote A — editable à la carte */}
              <div className="sa-col">
                <div className="sa-col-head">
                  <span className="sa-col-badge">Quote A · à la carte</span>
                  {!empty && (
                    <button className="sa-col-clear" onClick={clearQuote}>
                      Clear
                    </button>
                  )}
                </div>

                {empty ? (
                  <p className="sa-empty" style={{ padding: '8px 0' }}>
                    No packages yet. Use “Add” on any package below.
                  </p>
                ) : (
                  <>
                    <div className="sa-col-lines">
                      {lines.map((l) => (
                        <QuoteLineRow
                          key={l.service.id}
                          line={l}
                          onSetQty={(qty) => setQty(l.service.id, qty)}
                          onSetDiscount={(patch) => setLineDiscount(l.service.id, patch)}
                          onRemove={() => removeLine(l.service.id)}
                        />
                      ))}
                    </div>
                    <QuoteTotalsRows gross={totalsA.gross} discount={totalsA.discount} total={totalsA.total} />
                  </>
                )}
              </div>

              {/* Quote B — auto-bundled mirror of A, discounts editable */}
              <BundledColumn
                lines={bLines}
                bundleIds={bundleIds}
                totals={totalsB}
                hasBundle={bundled.bundles.length > 0}
                empty={empty}
                onSetDiscount={setBLineDiscount}
              />
            </div>

            {!empty && <ComparisonSummary a={totalsA.total} b={totalsB.total} />}
          </div>
        )}
      </div>

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
          <input type="checkbox" checked={bloodOnly} onChange={(e) => setBloodOnly(e.target.checked)} />
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
              qty={qtyInQuote(s.id)}
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

function QuoteTotalsRows({ gross, discount, total }: { gross: number; discount: number; total: number }) {
  return (
    <div className="sa-quote-totals">
      <div className="sa-quote-total-row">
        <span>Subtotal</span>
        <span>{formatAED(gross)}</span>
      </div>
      {discount > 0 && (
        <div className="sa-quote-total-row sa-quote-discount">
          <span>Discounts</span>
          <span>− {formatAED(discount)}</span>
        </div>
      )}
      <div className="sa-quote-total-row sa-quote-grand">
        <span>Total</span>
        <span>{formatAED(total)}</span>
      </div>
    </div>
  )
}

function BundledColumn({
  lines,
  bundleIds,
  totals,
  hasBundle,
  empty,
  onSetDiscount,
}: {
  lines: QuoteLine[]
  bundleIds: Set<number>
  totals: ReturnType<typeof quoteTotals>
  hasBundle: boolean
  empty: boolean
  onSetDiscount: (id: number, patch: Partial<Pick<QuoteLine, 'discountType' | 'discountValue'>>) => void
}) {
  return (
    <div className="sa-col">
      <div className="sa-col-head">
        <span className="sa-col-badge">Quote B · bundled</span>
      </div>

      {empty ? (
        <p className="sa-empty" style={{ padding: '8px 0' }}>
          The bundled version of Quote A appears here automatically. You can try discounts on it.
        </p>
      ) : (
        <>
          {!hasBundle && (
            <p className="sa-note">No bundle covers this selection — the packages mirror Quote A.</p>
          )}
          <div className="sa-col-lines">
            {lines.map((l) => (
              <QuoteLineRow
                key={l.service.id}
                line={l}
                tag={bundleIds.has(l.service.id) ? 'Bundle' : undefined}
                onSetDiscount={(patch) => onSetDiscount(l.service.id, patch)}
              />
            ))}
          </div>
          <QuoteTotalsRows gross={totals.gross} discount={totals.discount} total={totals.total} />
        </>
      )}
    </div>
  )
}

function ComparisonSummary({ a, b }: { a: number; b: number }) {
  const diff = Math.abs(a - b)
  const cheaper = a < b ? 'A' : b < a ? 'Bundled' : null
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
            <b>{cheaper}</b> is lower by <b>{formatAED(diff)}</b>
          </>
        )}
      </div>
      <div className="sa-compare-cell">
        <span className="sa-compare-label">Bundled</span>
        <span className="sa-compare-val">{formatAED(b)}</span>
      </div>
    </div>
  )
}

function QuoteLineRow({
  line,
  onSetDiscount,
  onSetQty,
  onRemove,
  tag,
}: {
  line: QuoteLine
  onSetDiscount: (patch: Partial<Pick<QuoteLine, 'discountType' | 'discountValue'>>) => void
  onSetQty?: (qty: number) => void
  onRemove?: () => void
  tag?: string
}) {
  const discount = lineDiscountAmount(line)

  return (
    <div className="sa-line">
      <div className="sa-line-top">
        <span className="sa-line-name">
          {line.service.name}
          {tag && <span className="sa-bline-tag">{tag}</span>}
        </span>
        {onRemove && (
          <button className="sa-quote-line-remove" onClick={onRemove} aria-label="Remove from quote">
            ✕
          </button>
        )}
      </div>

      <div className="sa-line-controls">
        {onSetQty && (
          <div className="sa-qty">
            <button className="sa-qty-btn" onClick={() => onSetQty(line.qty - 1)} aria-label="Decrease quantity">
              −
            </button>
            <span className="sa-qty-val">{line.qty}</span>
            <button className="sa-qty-btn" onClick={() => onSetQty(line.qty + 1)} aria-label="Increase quantity">
              +
            </button>
          </div>
        )}

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

function ServiceRow({
  service,
  qty,
  expanded,
  onToggle,
  onAdd,
}: {
  service: CatalogueService
  qty: number
  expanded: boolean
  onToggle: () => void
  onAdd: () => void
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
          <button className={`sa-addbtn ${qty > 0 ? 'active' : ''}`} onClick={onAdd} aria-label="Add to quote">
            {qty > 0 ? `Added ${qty}` : 'Add'}
          </button>
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
