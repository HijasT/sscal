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
 *   discount, revealed on demand).
 * - Suggestion: the cheapest package that includes everything selected (via the
 *   business composition), e.g. Blood Group + BRCA → Executive, with "What it
 *   adds" (whole packages get an Add button, partial ones list their markers).
 *   "Replace selection" swaps the whole selection for that one package (undoable).
 *
 * All data is bundled with the app (no network calls). The selection and gender
 * are kept in sessionStorage for the session.
 */
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  getServices,
  getCategories,
  getServiceById,
  searchServices,
  groupComps,
  groupServiceTests,
  serviceGender,
  suggestPackage,
  suggestPartialPackage,
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
  type ExtraItem,
  type QuoteLine,
  type DiscountType,
} from '@/lib/catalogueUtils'
import { getFresh, setFresh, clearFresh } from '@/lib/storage'

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
  // What "Replace selection" overwrote, so it can be undone. Cleared by
  // any other edit to the selection, so Undo only ever restores that exact state.
  const [undo, setUndo] = useState<{ lines: QuoteLine[]; name: string } | null>(null)
  const [ladderOpen, setLadderOpen] = useState(false)
  const [compareOpen, setCompareOpen] = useState(false)
  const [suggDiscOpen, setSuggDiscOpen] = useState(false)
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
  // Partial combined-package suggestion: covers most (not all) of the selection,
  // leaving the rest as individual lines. Hidden when it's the same package as the
  // full-cover suggestion (then it's not actually partial).
  const partial = useMemo(() => {
    const p = suggestPartialPackage(selServices, gender)
    return p && p.service.id !== suggestion?.id ? p : null
  }, [selServices, gender, suggestion])
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
    if (lines.length === 0) return clearFresh('session', QUOTE_KEY)
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

  // Swap ONLY the covered packages for the combined one, keeping the rest as
  // individual lines (becomes combined + individual). Undoable like a full replace.
  const applyPartialSuggestion = () => {
    if (!partial) return
    const covered = new Set(partial.coveredIds)
    setUndo({ lines, name: partial.service.name })
    setLines((prev) => [
      { service: partial.service, qty: 1, discountType: 'pct', discountValue: 0 },
      ...prev.filter((l) => !covered.has(l.service.id)),
    ])
  }

  const undoReplace = () => {
    if (!undo) return
    setLines(undo.lines)
    setUndo(null)
  }

  const empty = lines.length === 0

  const selectedCountText = (n: number) =>
    n === 1 ? 'the selected package' : n === 2 ? 'both selected packages' : `all ${n} selected packages`
  const difference = suggestedNet - totalsSel.total

  // Partial suggestion: split the selection into what the combined package
  // replaces and what stays, and the resulting total (combined + leftovers).
  const partialCovered = partial ? lines.filter((l) => partial.coveredIds.includes(l.service.id)) : []
  const partialLeftover = partial ? lines.filter((l) => !partial.coveredIds.includes(l.service.id)) : []
  const partialResultTotal = partial
    ? (partial.service.price ?? 0) + partialLeftover.reduce((a, l) => a + lineNet(l), 0)
    : 0

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">Sale Assistant</h2>
      </div>

      <div className="sa">
        <p className="sa-notice">
          <Icon name="lock" />
          <span>100% local · catalogue bundled with the app · no data shared</span>
        </p>

        <div className="sa-seg" role="group" aria-label="Show packages for">
          <button type="button" aria-pressed={gender === 'M'} onClick={() => setGender('M')}>
            Men
          </button>
          <button type="button" aria-pressed={gender === 'W'} onClick={() => setGender('W')}>
            Women
          </button>
        </div>

        {/* Package Ladder */}
        <details
          className="sa-ladder"
          open={ladderOpen}
          onToggle={(e) => setLadderOpen((e.currentTarget as HTMLDetailsElement).open)}
        >
          <summary className="sa-disclosure">
            <span className="sa-ladder-sum">
              <strong>Package Ladder</strong>
              <span>
                Selected <span className="sa-fig sa-strong">{formatAED(totalsSel.total)}</span>
              </span>
              {suggestion && (
                <span>
                  Suggested <span className="sa-fig sa-strong">{formatAED(suggestedNet)}</span>
                </span>
              )}
            </span>
            <Icon name="chevron" className="sa-chev" />
          </summary>

          {undo && (
            <div className="sa-undo" role="status">
              <span>
                Replaced {undo.lines.length} selected package{undo.lines.length === 1 ? '' : 's'} with{' '}
                <strong>{undo.name}</strong>.
              </span>
              <button type="button" className="sa-btn sa-btn-secondary" onClick={undoReplace}>
                <Icon name="undo" small />
                Undo
              </button>
            </div>
          )}

          <div className="sa-ladder-body">
            {/* Selected Packages */}
            <section className="sa-col" aria-labelledby="sa-h-sel">
              <div className="sa-row-between">
                <h3 id="sa-h-sel">
                  Selected Packages <span className="sa-muted">({lines.length})</span>
                </h3>
                {!empty && (
                  <button type="button" className="sa-btn sa-btn-quiet" onClick={clearSelected}>
                    Clear
                  </button>
                )}
              </div>

              {empty ? (
                <p className="sa-muted">No packages yet. Use “Add” on any package below.</p>
              ) : (
                <>
                  {lines.map((l) => (
                    <QuoteLineRow
                      key={l.service.id}
                      line={l}
                      onSetDiscount={(patch) => setLineDiscount(l.service.id, patch)}
                      onRemove={() => removeLine(l.service.id)}
                    />
                  ))}
                  <QuoteTotalsRows
                    gross={totalsSel.gross}
                    discount={totalsSel.discount}
                    total={totalsSel.total}
                  />
                </>
              )}
            </section>

            {/* Suggestion */}
            <section className="sa-col sa-col-suggest" aria-labelledby="sa-h-sug">
              <h3 id="sa-h-sug">Suggestion</h3>
              {suggestion ? (
                <>
                  <div className="sa-suggest">
                    <div className="sa-suggest-top">
                      <span className="sa-suggest-name">{suggestion.name}</span>
                      <span className="sa-fig sa-suggest-price">
                        {suggestedDiscount > 0 && <s>{formatAED(suggestion.price)}</s>}
                        {formatAED(suggestedNet)}
                      </span>
                    </div>
                    <p className="sa-suggest-delta">
                      {difference === 0 ? (
                        <>Same price as your selection.</>
                      ) : (
                        <>
                          <strong className="sa-fig">{formatAED(Math.abs(difference))}</strong>{' '}
                          {difference > 0 ? 'more' : 'less'} than your selection.
                        </>
                      )}{' '}
                      It includes {selectedCountText(lines.length)}.
                    </p>
                  </div>

                  {suggDiscOpen || suggDiscount.value > 0 ? (
                    <DiscountControls
                      id="sa-dv-suggestion"
                      label={suggestion.name}
                      type={suggDiscount.type}
                      value={suggDiscount.value}
                      applied={suggestedDiscount}
                      onChange={(patch) =>
                        setSuggDiscount((d) => ({
                          type: patch.discountType ?? d.type,
                          value: patch.discountValue ?? d.value,
                        }))
                      }
                    />
                  ) : (
                    <button
                      type="button"
                      className="sa-btn sa-btn-quiet sa-btn-flush"
                      onClick={() => setSuggDiscOpen(true)}
                    >
                      <Icon name="tag" small />
                      Try a discount on the suggestion
                    </button>
                  )}

                  {extras && extras.length > 0 && (
                    <div>
                      <h4 className="sa-subhead">What it adds</h4>
                      <ul className="sa-adds">
                        {extras.map((it, i) => {
                          if (it.complete) {
                            const svc = it.serviceId != null ? getServiceById(it.serviceId) : undefined
                            const detail = [extraDetail(it), svc ? formatAED(svc.price) : null]
                              .filter(Boolean)
                              .join(' · ')
                            return (
                              <li key={i} className="sa-add-row">
                                <span className="sa-what">
                                  {it.label}
                                  <small>{detail}</small>
                                </span>
                                {it.serviceId != null && (
                                  <button
                                    type="button"
                                    className="sa-btn sa-btn-secondary sa-btn-add"
                                    aria-label={`Add ${it.label} to selection`}
                                    onClick={() => addServiceById(it.serviceId)}
                                  >
                                    <Icon name="plus" />
                                    Add
                                  </button>
                                )}
                              </li>
                            )
                          }
                          const open = openExtra === i
                          return (
                            <li key={i} className="sa-add-item">
                              <button
                                type="button"
                                className="sa-add-row sa-add-toggle"
                                aria-expanded={open}
                                aria-controls={`sa-m-${i}`}
                                onClick={() => setOpenExtra(open ? null : i)}
                              >
                                <span className="sa-what">
                                  {it.label}
                                  <small>Included in the suggestion</small>
                                </span>
                                <span className="sa-btn-look">
                                  {open ? 'Hide' : 'Show'}
                                  <Icon name="chevron" small className="sa-chev" />
                                </span>
                              </button>
                              {open && (
                                <div id={`sa-m-${i}`} className="sa-markers">
                                  {it.markers.map((m, j) => (
                                    <span key={j} className="sa-marker">
                                      {m}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  )}

                  {excluded.length > 0 && (
                    <div className="sa-warn" role="note">
                      <div className="sa-warn-title">
                        <Icon name="alert" small />
                        Not in this package ({excluded.length} marker{excluded.length === 1 ? '' : 's'})
                      </div>
                      <div className="sa-markers">
                        {excluded.map((m, i) => (
                          <span key={i} className="sa-marker">
                            {m}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {excludedDna.length > 0 && (
                    <div className="sa-warn" role="note">
                      <div className="sa-warn-title">
                        <Icon name="alert" small />
                        DNA modules not in this package ({excludedDna.length})
                      </div>
                      <div className="sa-markers">
                        {excludedDna.map((m, i) => (
                          <span key={i} className="sa-marker">
                            {m}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    className="sa-btn sa-btn-primary sa-btn-block"
                    onClick={moveSuggestionToSelected}
                  >
                    Replace selection with {suggestion.name}
                  </button>
                  <p className="sa-hint">
                    Replaces {selectedCountText(lines.length)}. You can undo this straight afterwards.
                  </p>
                </>
              ) : (
                !partial && (
                  <p className="sa-muted">
                    Add two or more packages and the cheapest package that includes them appears here.
                  </p>
                )
              )}

              {partial && (
                <div className="sa-partial">
                  <h4 className="sa-subhead">Or combine most of them</h4>
                  <div className="sa-suggest">
                    <div className="sa-suggest-top">
                      <span className="sa-suggest-name">{partial.service.name}</span>
                      <span className="sa-fig sa-suggest-price">{formatAED(partial.service.price)}</span>
                    </div>
                    <p className="sa-suggest-delta">
                      Covers {partialCovered.length} of your selected packages, leaving{' '}
                      {partialLeftover.length} as {partialLeftover.length === 1 ? 'an individual line' : 'individual lines'}.
                    </p>
                  </div>

                  <div>
                    <h4 className="sa-subhead">Replaces</h4>
                    <div className="sa-markers">
                      {partialCovered.map((l) => (
                        <span key={l.service.id} className="sa-marker">
                          {l.service.name}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="sa-subhead">Keeps as individual</h4>
                    <div className="sa-markers">
                      {partialLeftover.map((l) => (
                        <span key={l.service.id} className="sa-marker">
                          {l.service.name}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="sa-compare" style={{ padding: 0, border: 0, background: 'none' }}>
                    <span>
                      New total <span className="sa-fig sa-strong">{formatAED(partialResultTotal)}</span>
                    </span>
                  </div>

                  <button
                    type="button"
                    className="sa-btn sa-btn-primary sa-btn-block"
                    onClick={applyPartialSuggestion}
                  >
                    Replace {partialCovered.length} with {partial.service.name}
                  </button>
                  <p className="sa-hint">
                    Keeps the other {partialLeftover.length} package{partialLeftover.length === 1 ? '' : 's'}. You can undo
                    this straight afterwards.
                  </p>
                </div>
              )}
            </section>
          </div>

          {suggestion && !empty && (
            <div className="sa-compare">
              <span>
                Selected <span className="sa-fig sa-strong">{formatAED(totalsSel.total)}</span>
              </span>
              <span>
                Suggested <span className="sa-fig sa-strong">{formatAED(suggestedNet)}</span>
              </span>
              <span>
                Difference{' '}
                <span className="sa-fig sa-strong">
                  {difference < 0 ? '−' : '+'}
                  {formatAED(Math.abs(difference))}
                </span>
              </span>
            </div>
          )}
        </details>

        {/* Compare two packages */}
        <details
          className="sa-ladder sa-compare-tool"
          open={compareOpen}
          onToggle={(e) => setCompareOpen((e.currentTarget as HTMLDetailsElement).open)}
        >
          <summary className="sa-disclosure">
            <strong>Compare packages</strong>
            <Icon name="chevron" className="sa-chev" />
          </summary>
          <ComparePanel />
        </details>

        {/* Find packages */}
        <section className="sa-find" aria-label="Find packages">
          <div className="sa-field">
            <label htmlFor="sa-search">Search packages</label>
            <div className="sa-input-wrap">
              <input
                id="sa-search"
                className="sa-input"
                type="text"
                placeholder="Name, category or marker, for example vitamin d"
                autoComplete="off"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {query && (
                <button
                  type="button"
                  className="sa-icon-btn"
                  onClick={() => setQuery('')}
                  aria-label="Clear search"
                >
                  <Icon name="x" />
                </button>
              )}
            </div>
          </div>

          <div className="sa-chips" role="group" aria-label="Category">
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                className="sa-chip"
                aria-pressed={category === c}
                onClick={() => setCategory(c)}
              >
                {c}
              </button>
            ))}
          </div>

          <div className="sa-filters">
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
            <p className="sa-muted" aria-live="polite">
              Showing {grouped.list.length} of {totalCount} packages
            </p>
          </div>
        </section>

        {/* Results grouped by category */}
        {grouped.list.length === 0 ? (
          <p className="sa-muted">No packages match your search.</p>
        ) : (
          <div className="sa-cats">
            {grouped.groups.map(([cat, items], idx) => (
              <section key={cat} className="sa-cat" aria-labelledby={`sa-c-${idx}`}>
                <h3 id={`sa-c-${idx}`}>
                  {cat}
                  <span>{items.length}</span>
                </h3>
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
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const ICON_SHAPES: Record<string, ReactNode> = {
  lock: (
    <>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </>
  ),
  x: <path d="M6 6l12 12M18 6 6 18" />,
  plus: <path d="M12 5v14M5 12h14" />,
  chevron: <path d="m6 9 6 6 6-6" />,
  undo: (
    <>
      <path d="M4 4v6h6" />
      <path d="M5.5 15a7 7 0 1 0 1.2-7.3L4 10" />
    </>
  ),
  tag: (
    <>
      <path d="M3 12V4h8l9 9-8 8z" />
      <circle cx="7.5" cy="8.5" r="1.2" />
    </>
  ),
  alert: (
    <>
      <path d="M12 3 2 20h20z" />
      <path d="M12 10v4M12 17h.01" />
    </>
  ),
}

function Icon({ name, small, className }: { name: string; small?: boolean; className?: string }) {
  return (
    <svg
      className={`sa-icon${small ? ' sa-icon-sm' : ''}${className ? ` ${className}` : ''}`}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      {ICON_SHAPES[name]}
    </svg>
  )
}

/** Secondary line for a "what it adds" row: how much the package brings. */
function extraDetail(it: ExtraItem): string {
  if (it.markers.length === 0) return 'Included in the suggestion'
  const n = it.markers.length
  return /^DNA -/.test(it.label) ? `${n} DNA module${n === 1 ? '' : 's'}` : `${n} marker${n === 1 ? '' : 's'}`
}

/**
 * Compare any two packages and see which markers/DNA modules each one has that
 * the other is missing — reusing the same coverage helpers as the suggestion.
 */
function ComparePanel() {
  const services = useMemo(() => getServices(), [])
  const byCategory = useMemo(() => {
    const map = new Map<string, CatalogueService[]>()
    for (const c of getCategories()) map.set(c, [])
    for (const s of services) map.get(s.category)?.push(s)
    return [...map.entries()].filter(([, items]) => items.length > 0)
  }, [services])

  const [aId, setAId] = useState<number | null>(null)
  const [bId, setBId] = useState<number | null>(null)
  const a = aId != null ? getServiceById(aId) : undefined
  const b = bId != null ? getServiceById(bId) : undefined

  // Items in the first package that the second is missing (markers + DNA modules).
  const missingFrom = (from?: CatalogueService, within?: CatalogueService) =>
    from && within ? [...excludedMarkers([from], [within]), ...excludedDnaModules([from], [within])] : []
  const aOnly = missingFrom(a, b)
  const bOnly = missingFrom(b, a)
  const same = Boolean(a && b && a.id === b.id)

  const picker = (
    label: string,
    value: number | null,
    onChange: (id: number | null) => void,
    id: string
  ) => (
    <div className="sa-field">
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        className="sa-select"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
      >
        <option value="">Choose a package…</option>
        {byCategory.map(([cat, items]) => (
          <optgroup key={cat} label={cat}>
            {items.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  )

  const diffColumn = (self?: CatalogueService, other?: CatalogueService, only?: string[]) => (
    <div>
      <h4 className="sa-subhead">
        Only in {self!.name} <span className="sa-muted sa-fig">{only!.length}</span>
      </h4>
      {only!.length === 0 ? (
        <p className="sa-muted">{other!.name} already covers everything in {self!.name}.</p>
      ) : (
        <div className="sa-markers">
          {only!.map((m, i) => (
            <span key={i} className="sa-marker">
              {m}
            </span>
          ))}
        </div>
      )}
    </div>
  )

  return (
    <div className="sa-compare-body">
      <div className="sa-compare-pick">
        {picker('Package A', aId, setAId, 'sa-cmp-a')}
        {picker('Package B', bId, setBId, 'sa-cmp-b')}
      </div>

      {!a || !b ? (
        <p className="sa-muted">Choose two packages to see which markers each one is missing.</p>
      ) : same ? (
        <p className="sa-muted">Those are the same package — pick two different ones to compare.</p>
      ) : (
        <div className="sa-compare-diff">
          {diffColumn(a, b, aOnly)}
          {diffColumn(b, a, bOnly)}
        </div>
      )}
    </div>
  )
}

function QuoteTotalsRows({ gross, discount, total }: { gross: number; discount: number; total: number }) {
  return (
    <div className="sa-totals">
      <div>
        <span>Subtotal</span>
        <span>{formatAED(gross)}</span>
      </div>
      {discount > 0 && (
        <div className="sa-totals-discount">
          <span>Discounts</span>
          <span>− {formatAED(discount)}</span>
        </div>
      )}
      <div className="sa-totals-grand">
        <span>Total</span>
        <span>{formatAED(total)}</span>
      </div>
    </div>
  )
}

/** Discount value + % / AED switch, shared by selected lines and the suggestion. */
function DiscountControls({
  id,
  label,
  type,
  value,
  applied,
  onChange,
}: {
  id: string
  label: string
  type: DiscountType
  value: number
  applied: number
  onChange: (patch: Partial<Pick<QuoteLine, 'discountType' | 'discountValue'>>) => void
}) {
  return (
    <div className="sa-disc">
      <label className="sa-sr" htmlFor={id}>
        Discount value for {label}
      </label>
      <input
        id={id}
        className="sa-input sa-num"
        type="number"
        min={0}
        max={type === 'pct' ? 100 : undefined}
        placeholder="0"
        value={value === 0 ? '' : value}
        onChange={(e) => onChange({ discountValue: Number(e.target.value) || 0 })}
      />
      <div className="sa-unit" role="group" aria-label="Discount type">
        <button type="button" aria-pressed={type === 'pct'} onClick={() => onChange({ discountType: 'pct' })}>
          %
        </button>
        <button type="button" aria-pressed={type === 'amt'} onClick={() => onChange({ discountType: 'amt' })}>
          AED
        </button>
      </div>
      {applied > 0 && <span className="sa-muted sa-fig sa-small">− {formatAED(applied)}</span>}
    </div>
  )
}

function QuoteLineRow({
  line,
  onSetDiscount,
  onRemove,
}: {
  line: QuoteLine
  onSetDiscount: (patch: Partial<Pick<QuoteLine, 'discountType' | 'discountValue'>>) => void
  onRemove: () => void
}) {
  const [discountOpen, setDiscountOpen] = useState(false)
  const discount = lineDiscountAmount(line)
  const showDiscount = discountOpen || line.discountValue > 0

  return (
    <div className="sa-line">
      <div className="sa-line-top">
        <span className="sa-line-name">{line.service.name}</span>
        <span className="sa-line-side">
          <span className="sa-fig sa-line-price">
            {discount > 0 && <s>{formatAED(lineGross(line))}</s>}
            {formatAED(lineNet(line))}
          </span>
          <button
            type="button"
            className="sa-icon-btn sa-danger"
            onClick={onRemove}
            aria-label={`Remove ${line.service.name} from selection`}
          >
            <Icon name="x" />
          </button>
        </span>
      </div>
      {showDiscount ? (
        <DiscountControls
          id={`sa-dv-${line.service.id}`}
          label={line.service.name}
          type={line.discountType}
          value={line.discountValue}
          applied={discount}
          onChange={onSetDiscount}
        />
      ) : (
        <div>
          <button type="button" className="sa-btn sa-btn-quiet sa-btn-flush" onClick={() => setDiscountOpen(true)}>
            <Icon name="tag" small />
            Add discount
          </button>
        </div>
      )}
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
  // Markers grouped by their profile/panel name (Liver Profile, Thyroid Profile, …).
  const panelBreakdown = useMemo(
    () => (expanded ? groupServiceTests(service) : []),
    [service, expanded]
  )
  const detailId = `sa-d-${service.id}`

  return (
    <article className={`sa-pkg${expanded ? ' open' : ''}`}>
      <div className="sa-pkg-head">
        <div>
          <div className="sa-pkg-name">{service.name}</div>
          <div className="sa-pkg-meta">
            {service.sub ? `${service.sub} · ` : ''}
            {service.biomarkers} biomarkers
            {service.doctor ? ` · ${service.doctor} doctor` : ''}
          </div>
        </div>
        <div className="sa-pkg-side">
          <span className="sa-fig sa-pkg-price">{formatAED(service.price)}</span>
          <button
            type="button"
            className="sa-btn sa-btn-quiet"
            aria-expanded={expanded}
            aria-controls={detailId}
            onClick={onToggle}
          >
            {expanded ? 'Hide details' : 'Details'}
          </button>
          <button
            type="button"
            className={`sa-btn sa-btn-secondary sa-btn-add${inQuote ? ' is-on' : ''}`}
            aria-label={`${inQuote ? 'Remove' : 'Add'} ${service.name} ${inQuote ? 'from' : 'to'} selection`}
            onClick={onToggleQuote}
          >
            <Icon name={inQuote ? 'x' : 'plus'} />
            {inQuote ? 'Remove' : 'Add'}
          </button>
        </div>
      </div>

      {expanded && (
        <div id={detailId} className="sa-pkg-detail">
          {groups.length === 0 && panelBreakdown.length === 0 ? (
            <p className="sa-muted">No breakdown available for this package.</p>
          ) : (
            <>
              {groups.map((g) => (
                <div key={g.group}>
                  <h4>{compGroupLabel(g.group)}</h4>
                  <div className="sa-kv">
                    {g.rows.map((r, i) => (
                      <div key={i}>
                        <span>{r.name}</span>
                        {/* The catalogue marks "included" with a bare "X"; show only real values (e.g. "30 min"). */}
                        {r.value.trim().toUpperCase() !== 'X' && <span className="sa-fig">{r.value}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {panelBreakdown.length > 0 && (
                <div>
                  <h4 className="sa-subhead">Blood panels ({panelBreakdown.length})</h4>
                  <div className="sa-stack">
                    {panelBreakdown.map((p) => (
                      <div key={p.group}>
                        <h4>
                          {p.group} <span className="sa-muted sa-fig">{p.tests.length}</span>
                        </h4>
                        <div className="sa-markers">
                          {p.tests.map((t, i) => (
                            <span key={i} className="sa-marker">
                              {t.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </article>
  )
}
