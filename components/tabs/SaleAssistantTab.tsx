'use client'
/**
 * SaleAssistantTab — browse the catalogue and climb the "package ladder".
 *
 * - Men/Women toggle (default Men) filters the catalogue and suggestions to that
 *   gender plus common (non-gendered) packages.
 * - Catalogue browser: search by name, category or lab marker; an optional
 *   "blood tests only" filter; results grouped under the 5 category headings.
 *   Each package's drill-down shows its "what's included" groups and blood
 *   panels (marker-level), mirroring the source catalogue.
 * - Selected Packages: the individual packages picked (each with its own
 *   discount). When a suggestion exists, the packages it would still add are
 *   shown greyed with an "Add" button so the set can be built up.
 * - Suggestions: the cheapest package that includes everything selected (via the
 *   business composition), e.g. Blood Group + BRCA → Executive. "Move to
 *   Selected" swaps the whole selection for that one package.
 *
 * All data is bundled with the app (no network calls). The selection and gender
 * are kept in sessionStorage for the session.
 */
import { useEffect, useMemo, useState } from 'react'
import {
  getServices,
  getCategories,
  getServiceById,
  searchServices,
  groupComps,
  getPanelTests,
  serviceGender,
  suggestPackage,
  getSuggestionExtras,
  excludedMarkers,
  excludedDnaModules,
  isBloodTestOnly,
  isNonInvasive,
  formatAED,
  quoteTotals,
  lineGross,
  lineNet,
  lineDiscountAmount,
  type CatalogueService,
  type QuoteLine,
  type DiscountType,
} from '@/lib/catalogueUtils'
import { getFresh, setFresh } from '@/lib/storage'

const ALL = 'All'
const QUOTE_KEY = 'sic_sale_quote'
type Gender = 'M' | 'W'

/** Display label for a comp group, matching the source catalogue's wording. */
function compGroupLabel(group: string): string {
  return group === 'Doctor & Vital Signs' ? 'Consultation' : group
}

export function SaleAssistantTab() {
  const [gender, setGender] = useState<Gender>('M')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string>(ALL)
  // Filter is intentionally not persisted (clears on refresh); blood-only and
  // non-invasive are mutually exclusive.
  const [filter, setFilter] = useState<'none' | 'blood' | 'noninvasive'>('none')
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const [lines, setLines] = useState<QuoteLine[]>([]) // Selected Packages
  const [suggDiscount, setSuggDiscount] = useState<{ type: DiscountType; value: number }>({
    type: 'pct',
    value: 0,
  })
  // What "Move to Selected (replace)" overwrote, so it can be undone. Cleared by
  // any other edit to the selection, so Undo only ever restores that exact state.
  const [undo, setUndo] = useState<{ lines: QuoteLine[]; name: string } | null>(null)
  const [ladderOpen, setLadderOpen] = useState(false)
  const [openExtra, setOpenExtra] = useState<number | null>(null)
  const [hydrated, setHydrated] = useState(false)

  const totalCount = getServices().length
  const categories = useMemo(() => [ALL, ...getCategories()], [])

  // Catalogue results: search + gender + blood filter, grouped by category.
  const grouped = useMemo(() => {
    let r = searchServices(query, category === ALL ? undefined : category)
    r = r.filter((s) => {
      const g = serviceGender(s)
      return g === null || g === gender
    })
    if (filter === 'blood') r = r.filter(isBloodTestOnly)
    else if (filter === 'noninvasive') r = r.filter(isNonInvasive)
    const map = new Map<string, CatalogueService[]>()
    for (const s of r) {
      if (!map.has(s.category)) map.set(s.category, [])
      map.get(s.category)!.push(s)
    }
    return { list: r, groups: [...map.entries()] }
  }, [query, category, gender, filter])

  const selServices = useMemo(() => lines.map((l) => l.service), [lines])
  const totalsSel = useMemo(() => quoteTotals(lines), [lines])
  const suggestion = useMemo(() => suggestPackage(selServices, gender), [selServices, gender])
  const suggestionLine: QuoteLine | null = suggestion
    ? { service: suggestion, qty: 1, discountType: suggDiscount.type, discountValue: suggDiscount.value }
    : null
  const suggestedNet = suggestionLine ? lineNet(suggestionLine) : 0
  const suggestedDiscount = suggestionLine ? lineDiscountAmount(suggestionLine) : 0
  const extras = useMemo(
    () => (suggestion ? getSuggestionExtras(selServices, suggestion) : null),
    [suggestion, selServices]
  )
  useEffect(() => setOpenExtra(null), [suggestion, selServices])
  const excluded = useMemo(
    () => (suggestion ? excludedMarkers(selServices, [suggestion]) : []),
    [suggestion, selServices]
  )
  const excludedDna = useMemo(
    () => (suggestion ? excludedDnaModules(selServices, [suggestion]) : []),
    [suggestion, selServices]
  )

  // Rehydrate the selection + gender from sessionStorage on mount.
  useEffect(() => {
    try {
      const raw = getFresh('session', QUOTE_KEY)
      if (raw) {
        const stored = JSON.parse(raw)
        if (stored?.gender === 'W' || stored?.gender === 'M') setGender(stored.gender)
        const storedLines = stored?.lines ?? stored?.A?.lines ?? []
        const restored = storedLines
          .map((l: any) => {
            const service = getServiceById(l.id)
            return service
              ? {
                  service,
                  qty: l.qty ?? 1,
                  discountType: (l.discountType as DiscountType) || 'pct',
                  discountValue: l.discountValue || 0,
                }
              : null
          })
          .filter((l: QuoteLine | null): l is QuoteLine => l !== null)
        setLines(restored)
      }
    } catch {
      /* ignore */
    }
    setHydrated(true)
  }, [])

  // Persist selection + gender.
  useEffect(() => {
    if (!hydrated) return
    try {
      const payload = {
        gender,
        lines: lines.map((l) => ({
          id: l.service.id,
          qty: l.qty,
          discountType: l.discountType,
          discountValue: l.discountValue,
        })),
      }
      setFresh('session', QUOTE_KEY, JSON.stringify(payload))
    } catch {
      /* ignore */
    }
  }, [lines, gender, hydrated])

  // Every ordinary edit goes through here so it also invalidates a pending undo.
  const edit = (fn: (prev: QuoteLine[]) => QuoteLine[]) => {
    setUndo(null)
    setLines(fn)
  }

  const addServiceById = (id?: number) => {
    if (id == null) return
    const service = getServiceById(id)
    if (!service) return
    edit((prev) =>
      prev.some((l) => l.service.id === id)
        ? prev
        : [...prev, { service, qty: 1, discountType: 'pct' as DiscountType, discountValue: 0 }]
    )
    setLadderOpen(true)
  }

  const toggleInQuote = (service: CatalogueService) => {
    edit((prev) =>
      prev.some((l) => l.service.id === service.id)
        ? prev.filter((l) => l.service.id !== service.id)
        : [...prev, { service, qty: 1, discountType: 'pct' as DiscountType, discountValue: 0 }]
    )
    setLadderOpen(true)
  }

  const setLineDiscount = (id: number, patch: Partial<Pick<QuoteLine, 'discountType' | 'discountValue'>>) =>
    edit((prev) => prev.map((l) => (l.service.id === id ? { ...l, ...patch } : l)))

  const removeLine = (id: number) => edit((prev) => prev.filter((l) => l.service.id !== id))
  const clearSelected = () => edit(() => [])
  const inQuote = (id: number) => lines.some((l) => l.service.id === id)

  // Replace the whole selection with the single suggested package (undoable).
  const moveSuggestionToSelected = () => {
    if (!suggestion) return
    setUndo({ lines, name: suggestion.name })
    setLines([{ service: suggestion, qty: 1, discountType: 'pct', discountValue: 0 }])
  }

  const undoReplace = () => {
    if (!undo) return
    setLines(undo.lines)
    setUndo(null)
  }

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

      {/* Gender toggle */}
      <div className="sa-gender">
        <button
          className={`sa-gender-btn ${gender === 'M' ? 'active' : ''}`}
          onClick={() => setGender('M')}
        >
          Men
        </button>
        <button
          className={`sa-gender-btn ${gender === 'W' ? 'active' : ''}`}
          onClick={() => setGender('W')}
        >
          Women
        </button>
      </div>

      {/* Package Ladder */}
      <div className="sa-quote">
        <button className="sa-quote-bar" onClick={() => setLadderOpen((o) => !o)} aria-expanded={ladderOpen}>
          <span className="sa-quote-title">Package Ladder</span>
          <span className="sa-quote-compare-mini">
            Selected <b>{formatAED(totalsSel.total)}</b>
            {suggestion && (
              <>
                {' '}
                · Suggested <b>{formatAED(suggestedNet)}</b>
              </>
            )}
          </span>
          <span className="sa-quote-chevron">{ladderOpen ? '▲' : '▼'}</span>
        </button>

        {ladderOpen && (
          <div className="sa-quote-body">
            {undo && (
              <div className="sa-undo" role="status">
                <span>
                  Replaced {undo.lines.length} selected package{undo.lines.length === 1 ? '' : 's'} with{' '}
                  <strong>{undo.name}</strong>.
                </span>
                <button className="btn btn-secondary btn-sm" onClick={undoReplace}>
                  Undo
                </button>
              </div>
            )}
            <div className="sa-columns">
              {/* Selected Packages */}
              <div className="sa-col">
                <div className="sa-col-head">
                  <span className="sa-col-badge">Selected Packages</span>
                  {!empty && (
                    <button className="sa-col-clear" onClick={clearSelected}>
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
                          onSetDiscount={(patch) => setLineDiscount(l.service.id, patch)}
                          onRemove={() => removeLine(l.service.id)}
                        />
                      ))}
                    </div>
                    <QuoteTotalsRows
                      gross={totalsSel.gross}
                      discount={totalsSel.discount}
                      total={totalsSel.total}
                    />
                    {/* What the suggested package adds on top — complete packages by
                        name, the rest summarised by profile; click a chip for markers. */}
                    {extras && extras.length > 0 && (
                      <div className="sa-extras">
                        <div className="sa-extras-title">Suggested package adds</div>
                        <div className="sa-test-list">
                          {extras.map((it, i) =>
                            it.complete ? (
                              // A complete package — offer to add it, no bubble.
                              <span key={i} className="sa-extra-complete">
                                <span className="sa-extra-chip complete">{it.label}</span>
                                {it.serviceId != null && (
                                  <button
                                    className="sa-addbtn"
                                    onClick={() => addServiceById(it.serviceId)}
                                  >
                                    Add
                                  </button>
                                )}
                              </span>
                            ) : (
                              // A partial addition — click to reveal the extra markers.
                              <span key={i} className="sa-extra-wrap">
                                <button
                                  className="sa-extra-chip clickable"
                                  onClick={() => setOpenExtra(openExtra === i ? null : i)}
                                >
                                  {it.label}
                                </button>
                                {openExtra === i && it.markers.length > 0 && (
                                  <div className="sa-extra-bubble">
                                    {it.markers.map((m, j) => (
                                      <span key={j} className="sa-test-chip">
                                        {m}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </span>
                            )
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Suggestions */}
              <div className="sa-col">
                <div className="sa-col-head">
                  <span className="sa-col-badge">Suggestions</span>
                </div>
                {suggestion ? (
                  <>
                    <div className="sa-suggestion">
                      <div className="sa-suggestion-info">
                        <span className="sa-suggestion-name">
                          {suggestion.name}
                          <span className="sa-bline-tag">Bundle</span>
                        </span>
                        <span className="sa-suggestion-meta">
                          Includes your {lines.length} selected package{lines.length === 1 ? '' : 's'}
                        </span>
                      </div>
                      <span className="sa-suggestion-price">
                        {suggestedDiscount > 0 && (
                          <span className="sa-line-gross">{formatAED(suggestion.price)}</span>
                        )}{' '}
                        {formatAED(suggestedNet)}
                      </span>
                    </div>

                    {/* Try a discount on the suggested package */}
                    <div className="sa-sugg-disc">
                      <span className="sa-sugg-disc-label">Discount</span>
                      <div className="sa-disc-type">
                        <button
                          className={`sa-disc-btn ${suggDiscount.type === 'pct' ? 'active' : ''}`}
                          onClick={() => setSuggDiscount((d) => ({ ...d, type: 'pct' }))}
                          aria-label="Discount as percent"
                        >
                          %
                        </button>
                        <button
                          className={`sa-disc-btn ${suggDiscount.type === 'amt' ? 'active' : ''}`}
                          onClick={() => setSuggDiscount((d) => ({ ...d, type: 'amt' }))}
                          aria-label="Discount as AED amount"
                        >
                          AED
                        </button>
                      </div>
                      <input
                        className="sa-disc-val"
                        type="number"
                        min={0}
                        max={suggDiscount.type === 'pct' ? 100 : undefined}
                        placeholder="0"
                        value={suggDiscount.value === 0 ? '' : suggDiscount.value}
                        onChange={(e) =>
                          setSuggDiscount((d) => ({ ...d, value: Number(e.target.value) || 0 }))
                        }
                        aria-label="Suggestion discount value"
                      />
                    </div>
                    {excluded.length > 0 && (
                      <div className="sa-excluded">
                        <div className="sa-excluded-title">
                          ⚠️ Not in this package ({excluded.length} marker{excluded.length === 1 ? '' : 's'})
                        </div>
                        <div className="sa-test-list">
                          {excluded.map((m, i) => (
                            <span key={i} className="sa-test-chip sa-test-chip-warn">
                              {m}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {excludedDna.length > 0 && (
                      <div className="sa-excluded">
                        <div className="sa-excluded-title">
                          ⚠️ DNA modules not in this package ({excludedDna.length})
                        </div>
                        <div className="sa-test-list">
                          {excludedDna.map((m, i) => (
                            <span key={i} className="sa-test-chip sa-test-chip-warn">
                              {m}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    <button className="btn btn-primary btn-sm btn-block" onClick={moveSuggestionToSelected}>
                      Move to Selected (replace)
                    </button>
                  </>
                ) : (
                  <p className="sa-empty" style={{ padding: '8px 0' }}>
                    Add two or more packages and the cheapest package that includes them appears here.
                  </p>
                )}
              </div>
            </div>

            {suggestion && !empty && (
              <ComparisonSummary selected={totalsSel.total} suggested={suggestedNet} />
            )}
          </div>
        )}
      </div>

      {/* Search */}
      <div className="form-group" style={{ marginBottom: 16 }}>
        <label htmlFor="sa-search">Search packages</label>
        <div className="sa-search-wrap">
          <input
            id="sa-search"
            type="text"
            placeholder="Search by name, category, or marker…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button className="sa-search-clear" onClick={() => setQuery('')} aria-label="Clear search">
              ✕
            </button>
          )}
        </div>
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
        <div className="sa-checks">
          <label className="sa-check">
            <input
              type="checkbox"
              checked={filter === 'blood'}
              onChange={(e) => setFilter(e.target.checked ? 'blood' : 'none')}
            />
            Blood tests only
          </label>
          <label className="sa-check">
            <input
              type="checkbox"
              checked={filter === 'noninvasive'}
              onChange={(e) => setFilter(e.target.checked ? 'noninvasive' : 'none')}
            />
            Non-invasive
          </label>
        </div>
        <span className="sa-count">
          Showing {grouped.list.length} of {totalCount} packages
        </span>
      </div>

      {/* Results grouped by category */}
      {grouped.list.length === 0 ? (
        <p className="sa-empty">No packages match your search.</p>
      ) : (
        grouped.groups.map(([cat, items]) => (
          <div key={cat} className="sa-cat">
            <div className="sa-cat-head">{cat}</div>
            <div className="sa-list">
              {items.map((s) => (
                <ServiceRow
                  key={s.id}
                  service={s}
                  inQuote={inQuote(s.id)}
                  expanded={expandedId === s.id}
                  onToggle={() => setExpandedId(expandedId === s.id ? null : s.id)}
                  onToggleQuote={() => toggleInQuote(s)}
                />
              ))}
            </div>
          </div>
        ))
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

function ComparisonSummary({ selected, suggested }: { selected: number; suggested: number }) {
  const diff = Math.abs(selected - suggested)
  const cheaper = selected < suggested ? 'Selected' : suggested < selected ? 'Suggested' : null
  return (
    <div className="sa-compare">
      <div className="sa-compare-cell">
        <span className="sa-compare-label">Selected</span>
        <span className="sa-compare-val">{formatAED(selected)}</span>
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
        <span className="sa-compare-label">Suggested</span>
        <span className="sa-compare-val">{formatAED(suggested)}</span>
      </div>
    </div>
  )
}

function QuoteLineRow({
  line,
  onSetDiscount,
  onRemove,
  tag,
}: {
  line: QuoteLine
  onSetDiscount: (patch: Partial<Pick<QuoteLine, 'discountType' | 'discountValue'>>) => void
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
  inQuote,
  expanded,
  onToggle,
  onToggleQuote,
}: {
  service: CatalogueService
  inQuote: boolean
  expanded: boolean
  onToggle: () => void
  onToggleQuote: () => void
}) {
  const groups = useMemo(() => groupComps(service), [service])
  const panelBreakdown = useMemo(
    () => (expanded ? service.panels.map((pn) => ({ name: pn, tests: getPanelTests(pn) })) : []),
    [service, expanded]
  )

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
          <button
            className={`sa-addbtn ${inQuote ? 'active' : ''}`}
            onClick={onToggleQuote}
            aria-label={inQuote ? 'Remove from quote' : 'Add to quote'}
          >
            {inQuote ? 'Remove' : 'Add'}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="sa-details">
          {groups.length === 0 && panelBreakdown.length === 0 ? (
            <p className="sa-empty">No breakdown available for this package.</p>
          ) : (
            <>
              {groups.map((g) => (
                <div key={g.group} className="sa-detail-group">
                  <div className="sa-detail-group-title">{compGroupLabel(g.group)}</div>
                  {g.rows.map((r, i) => (
                    <div key={i} className="sa-detail-row">
                      <span className="sa-detail-name">{r.name}</span>
                      {/* The catalogue marks "included" with a bare "X"; show only real values (e.g. "30 min"). */}
                      {r.value.trim().toUpperCase() !== 'X' && (
                        <span className="sa-detail-value">{r.value}</span>
                      )}
                    </div>
                  ))}
                </div>
              ))}

              {panelBreakdown.length > 0 && (
                <>
                  <div className="sa-detail-section-head">Blood panels ({panelBreakdown.length})</div>
                  {panelBreakdown.map((p) => (
                    <div key={p.name} className="sa-detail-group">
                      <div className="sa-detail-group-title">
                        {p.name} <span className="sa-detail-group-count">{p.tests.length}</span>
                      </div>
                      <div className="sa-test-list">
                        {p.tests.map((t, i) => (
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
