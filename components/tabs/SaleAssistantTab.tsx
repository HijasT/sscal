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
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  getVisibleServices,
  getCategories,
  orderSpecialisedServices,
  getServiceById,
  searchServices,
  isHiddenFromCatalogue,
  groupComps,
  packageComponents,
  bloodTubes,
  markerSections,
  serviceGender,
  suggestPackage,
  suggestPartialPackage,
  isCoveredBySelection,
  dnaPackageLabels,
  dnaPackagePanelNames,
  markerCatalogue,
  findTopPackagesForMarkers,
  comparePackageMarkers,
  getSuggestionExtras,
  excludedMarkers,
  excludedDnaModules,
  isBloodTestOnly,
  isNonInvasive,
  isHealthmaxxing,
  formatAED,
  formatUSD,
  buildJourney,
  formatDuration,
  quoteTotals,
  lineGross,
  lineNet,
  lineDiscountAmount,
  maxDiscountPct,
  expandForQuote,
  type CatalogueService,
} from '@/lib/catalogueUtils'
import { packageSummary } from '@/lib/packageSummaries'
import { clinicalMarkerInsight } from '@/lib/markerInsights'
import { ClinicalMarkerPopover, type ActiveClinicalMarker } from '@/components/ClinicalMarkerPopover'
import {
  type ExtraItem,
  type QuoteLine,
  type DiscountType,
} from '@/lib/catalogueUtils'
import { getFresh, setFresh, clearFresh, isUsdShown, getUsdRate, isHideCoveredEnabled } from '@/lib/storage'
import { DEFAULT_USD_RATE } from '@/lib/config'

const ALL = 'All'
const QUOTE_KEY = 'sic_sale_quote'
type Gender = 'M' | 'W'

// One muted wayfinding tone per catalogue category (keys into --sa-tone-* in CSS).
// Unknown categories fall back to a stable tone by order so colours never repeat.
const CATEGORY_TONE: Record<string, string> = {
  'Core Health Screening': 'a',
  'Specialised Screening': 'b',
  'DNA Insights': 'c',
  'Follow-ups': 'd',
  'Comprehensive Packages / Bundles': 'e',
}
const TONE_CYCLE = ['a', 'b', 'c', 'd', 'e']
const categoryTone = (cat: string, idx: number) => CATEGORY_TONE[cat] ?? TONE_CYCLE[idx % TONE_CYCLE.length]

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
  // Floating "jump to ladder" button: shown only once the ladder scrolls out of view.
  const ladderRef = useRef<HTMLDetailsElement>(null)
  // The search bar is sticky; its live height feeds --sa-find-h so the category
  // headings stick just below it (both clear of the app topbar).
  const findRef = useRef<HTMLElement>(null)
  // The Men/Women control lives in its own filter row; once that row scrolls up
  // behind the frozen search bar, a compact copy slides onto the search line.
  const filtersRef = useRef<HTMLDivElement>(null)
  const [compactGender, setCompactGender] = useState(false)
  const [showLadderFab, setShowLadderFab] = useState(false)
  const [compareOpen, setCompareOpen] = useState(false)
  const [suggDiscOpen, setSuggDiscOpen] = useState(false)
  const [openExtra, setOpenExtra] = useState<number | null>(null)
  const [hydrated, setHydrated] = useState(false)
  // USD display preference (set in Settings). Read on mount; this tab remounts
  // on tab switch, so a change in Settings is picked up when returning here.
  const [showUsd, setShowUsd] = useState(false)
  const [usdRate, setUsdRate] = useState(DEFAULT_USD_RATE)
  // Whether to hide packages already covered by the selection (Settings toggle,
  // default on). Read on mount; this tab remounts on tab switch.
  const [hideCovered, setHideCovered] = useState(true)

  // "Find package" marker picker: select markers (grouped by clinical profile)
  // and the finder shows the cheapest package covering all of them.
  const [finderOpen, setFinderOpen] = useState(false)
  const [finderQuery, setFinderQuery] = useState('')
  const [pickedIds, setPickedIds] = useState<Set<number>>(new Set())
  const markerGroups = useMemo(() => markerCatalogue(gender), [gender])
  const finderResults = useMemo(() => findTopPackagesForMarkers(pickedIds, gender), [pickedIds, gender])
  const finderGroups = useMemo(() => {
    const q = finderQuery.trim().toLowerCase()
    if (!q) return markerGroups
    return markerGroups
      .map((g) => ({
        group: g.group,
        markers: g.group.toLowerCase().includes(q)
          ? g.markers
          : g.markers.filter((m) => m.name.toLowerCase().includes(q)),
      }))
      .filter((g) => g.markers.length > 0)
  }, [markerGroups, finderQuery])
  const toggleMarker = (id: number) =>
    setPickedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  // Switching gender can hide markers; drop any selected ones that are no longer shown.
  useEffect(() => {
    setPickedIds((prev) => {
      const visible = new Set<number>()
      for (const g of markerGroups) for (const m of g.markers) visible.add(m.id)
      const next = new Set([...prev].filter((id) => visible.has(id)))
      return next.size === prev.size ? prev : next
    })
  }, [markerGroups])

  const totalCount = getVisibleServices().length
  const categories = useMemo(() => [ALL, ...getCategories()], [])

  // Catalogue results: search + gender + blood filter, grouped by category.
  const grouped = useMemo(() => {
    let r = searchServices(query, category === ALL ? undefined : category)
    r = r.filter((s) => !isHiddenFromCatalogue(s))
    r = r.filter((s) => {
      const g = serviceGender(s)
      return g === null || g === gender
    })
    if (filter === 'blood') r = r.filter(isBloodTestOnly)
    else if (filter === 'noninvasive') r = r.filter(isNonInvasive)
    // Hide packages whose full content (markers + BCA/ECG/DNA/gut) is already
    // covered by a selected package — redundant to offer. Skipped while searching
    // so a by-name search still finds everything.
    let covered = 0
    if (hideCovered && !query.trim()) {
      const sel = lines.map((l) => l.service)
      if (sel.length) {
        const before = r.length
        r = r.filter((s) => !isCoveredBySelection(s, sel))
        covered = before - r.length
      }
    }
    const map = new Map<string, CatalogueService[]>()
    for (const s of r) {
      if (!map.has(s.category)) map.set(s.category, [])
      map.get(s.category)!.push(s)
    }
    const order = getCategories()
    const groups = [...map.entries()].sort(([a], [b]) => order.indexOf(a) - order.indexOf(b))
    return {
      list: r,
      groups: groups.map(([cat, services]) => [cat, cat === 'Specialised Screening' ? orderSpecialisedServices(services) : services] as [string, CatalogueService[]]),
      covered,
    }
  }, [query, category, gender, filter, lines, hideCovered])

  const selServices = useMemo(() => lines.map((l) => l.service), [lines])
  const totalsSel = useMemo(() => quoteTotals(lines), [lines])
  const journey = useMemo(() => buildJourney(selServices), [selServices])
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
    setShowUsd(isUsdShown())
    setUsdRate(getUsdRate())
    setHideCovered(isHideCoveredEnabled())
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

  // Show the floating "jump to ladder" button only while the ladder is off-screen.
  useEffect(() => {
    const el = ladderRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const obs = new IntersectionObserver(([e]) => setShowLadderFab(!e.isIntersecting), { threshold: 0 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  // Publish the sticky search bar's live height so category headings can stack
  // right below it (it wraps differently across widths, so it can't be a constant).
  useEffect(() => {
    const el = findRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const root = document.documentElement
    const set = () => root.style.setProperty('--sa-find-h', `${el.offsetHeight}px`)
    set()
    const obs = new ResizeObserver(set)
    obs.observe(el)
    return () => {
      obs.disconnect()
      root.style.removeProperty('--sa-find-h')
    }
  }, [])

  // Reveal the compact Men/Women on the frozen search line once its own filter
  // row has scrolled up behind the search bar.
  useEffect(() => {
    const find = findRef.current
    const filt = filtersRef.current
    if (!find || !filt) return
    const onScroll = () => setCompactGender(filt.getBoundingClientRect().bottom < find.getBoundingClientRect().bottom)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  const jumpToLadder = () => {
    setLadderOpen(true)
    ladderRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // Switching gender clears the selection — packages are gender-specific, so a
  // half-built men's quote shouldn't carry over to a women's one (and vice versa).
  const changeGender = (g: Gender) => {
    if (g === gender) return
    setGender(g)
    setUndo(null)
    setLines([])
    setSuggDiscount({ type: 'pct', value: 0 })
    setSuggDiscOpen(false)
  }

  // Every ordinary edit goes through here so it also invalidates a pending undo.
  const edit = (fn: (prev: QuoteLine[]) => QuoteLine[]) => {
    setUndo(null)
    setLines(fn)
  }

  // Append services, skipping any already selected. HEALTHMAXXING expands into
  // its component packages (expandForQuote) rather than being added as one line.
  const appendServices = (services: CatalogueService[]) =>
    edit((prev) => {
      const next = [...prev]
      for (const svc of services.flatMap((s) => expandForQuote(s, gender))) {
        if (!next.some((l) => l.service.id === svc.id)) {
          next.push({ service: svc, qty: 1, discountType: 'pct' as DiscountType, discountValue: 0 })
        }
      }
      return next
    })

  const addServiceById = (id?: number) => {
    if (id == null) return
    const service = getServiceById(id)
    if (!service) return
    appendServices([service])
    setLadderOpen(true)
  }

  const toggleInQuote = (service: CatalogueService) => {
    // A HEALTHMAXXING package is never a line of its own, so it can't be "in" the
    // quote — selecting it always expands into its components.
    if (!isHealthmaxxing(service.name) && lines.some((l) => l.service.id === service.id)) {
      edit((prev) => prev.filter((l) => l.service.id !== service.id))
      return
    }
    appendServices([service])
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
    setLines(
      expandForQuote(suggestion, gender).map((service) => ({
        service,
        qty: 1,
        discountType: 'pct' as DiscountType,
        discountValue: 0,
      }))
    )
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
          <span>Everything runs locally in your browser and works offline. No data is ever sent out.</span>
        </p>

        {/* Package Ladder */}
        <details
          ref={ladderRef}
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
                    usdRate={showUsd ? usdRate : undefined}
                  />

                  {(journey.steps.length > 0 || journey.consultMinutes > 0) && (
                    <div className="sa-journey">
                      <h4 className="sa-subhead">Client journey</h4>
                      <p className="sa-muted sa-small">What the client goes through to use {selectedCountText(lines.length)}.</p>
                      <ol className="sa-journey-list">
                        {journey.steps.map((s) => (
                          <li key={s.label}>
                            <span className="sa-journey-label">{s.label}</span>
                            {s.tubes ? (
                              <span className="sa-journey-time">{s.tubes} tube{s.tubes === 1 ? '' : 's'}</span>
                            ) : (
                              s.count > 1 && <span className="sa-journey-x">× {s.count}</span>
                            )}
                          </li>
                        ))}
                        {journey.consultMinutes > 0 && (
                          <li>
                            <span className="sa-journey-label">Doctor Consultation</span>
                            <span className="sa-journey-time">{formatDuration(journey.consultMinutes)}</span>
                          </li>
                        )}
                      </ol>
                    </div>
                  )}
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
                      service={suggestion}
                      gross={suggestion.price ?? 0}
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
                      className="sa-btn sa-btn-quiet sa-btn-flush sa-btn-sm sa-btn-icon"
                      onClick={() => setSuggDiscOpen(true)}
                      aria-label="Try a discount on the suggestion"
                      title="Try a discount on the suggestion"
                    >
                      <Icon name="tag" small />
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
        <section ref={findRef} className="sa-find" aria-label="Find packages">
          <div className="sa-field">
            <div className="sa-input-wrap">
              <input
                id="sa-search"
                className="sa-input"
                type="text"
                aria-label="Search packages"
                placeholder="Search packages by name, category or marker…"
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
          <button type="button" className="sa-btn sa-btn-secondary sa-find-btn" onClick={() => setFinderOpen(true)}>
            <Icon name="search" />
            Package picker
          </button>
          <div
            className={`sa-seg sa-seg-compact${compactGender ? ' is-shown' : ''}`}
            role="group"
            aria-label="Show packages for"
            aria-hidden="true"
          >
            <button type="button" tabIndex={-1} aria-pressed={gender === 'M'} onClick={() => changeGender('M')}>
              Men
            </button>
            <button type="button" tabIndex={-1} aria-pressed={gender === 'W'} onClick={() => changeGender('W')}>
              Women
            </button>
          </div>
        </section>

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

          <div className="sa-filters" ref={filtersRef}>
            <div className="sa-checks">
              <div className="sa-seg" role="group" aria-label="Show packages for">
                <button type="button" aria-pressed={gender === 'M'} onClick={() => changeGender('M')}>
                  Men
                </button>
                <button type="button" aria-pressed={gender === 'W'} onClick={() => changeGender('W')}>
                  Women
                </button>
              </div>
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
              {grouped.covered > 0 && ` · ${grouped.covered} hidden (already covered by your selection)`}
            </p>
          </div>

        {/* Results grouped by category */}
        {grouped.list.length === 0 ? (
          <p className="sa-muted">No packages match your search.</p>
        ) : (
          <div className="sa-cats">
            {grouped.groups.map(([cat, items], idx) => (
              <section key={cat} className="sa-cat" data-tone={categoryTone(cat, idx)} aria-labelledby={`sa-c-${idx}`}>
                <h3 id={`sa-c-${idx}`}>
                  <span className="sa-cat-dot" aria-hidden="true" />
                  {cat}
                  <span className="sa-cat-n">{items.length}</span>
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

        {showLadderFab && (
          <button type="button" className="sa-ladder-fab" onClick={jumpToLadder}>
            <Icon name="chevron" className="sa-chev-up" />
            Package Ladder
            {lines.length > 0 && <span className="sa-ladder-fab-n">{lines.length}</span>}
          </button>
        )}

        {finderOpen && (
          <div className="sa-finder-backdrop" onClick={() => setFinderOpen(false)} role="presentation">
            <div
              className="sa-finder"
              role="dialog"
              aria-modal="true"
              aria-label="Find package by markers"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sa-finder-head">
                <div>
                  <h3>Find package by markers</h3>
                  <p className="sa-muted">
                    {pickedIds.size === 0
                      ? `Pick markers for ${gender === 'M' ? 'Men' : 'Women'} — the two best matching packages appear below.`
                      : `${pickedIds.size} marker${pickedIds.size === 1 ? '' : 's'} selected`}
                  </p>
                </div>
                <div className="sa-finder-head-side">
                  <div className="sa-seg" role="group" aria-label="Show packages for">
                    <button type="button" aria-pressed={gender === 'M'} onClick={() => changeGender('M')}>
                      Men
                    </button>
                    <button type="button" aria-pressed={gender === 'W'} onClick={() => changeGender('W')}>
                      Women
                    </button>
                  </div>
                  <button type="button" className="sa-icon-btn" onClick={() => setFinderOpen(false)} aria-label="Close">
                    <Icon name="x" />
                  </button>
                </div>
              </div>

              <div className="sa-finder-search">
                <div className="sa-input-wrap">
                  <input
                    className="sa-input"
                    type="text"
                    aria-label="Search markers"
                    placeholder="Search markers or profiles…"
                    autoComplete="off"
                    value={finderQuery}
                    onChange={(e) => setFinderQuery(e.target.value)}
                  />
                  {finderQuery && (
                    <button type="button" className="sa-icon-btn" onClick={() => setFinderQuery('')} aria-label="Clear">
                      <Icon name="x" />
                    </button>
                  )}
                </div>
              </div>

              <div className="sa-finder-body">
                {finderGroups.length === 0 ? (
                  <p className="sa-muted">No markers match your search.</p>
                ) : (
                  finderGroups.map((g) => {
                    const sel = g.markers.filter((m) => pickedIds.has(m.id)).length
                    return (
                      <div key={g.group} className="sa-finder-group">
                        <h4>
                          {g.group}
                          <span className="sa-muted sa-fig">
                            {sel > 0 ? `${sel}/${g.markers.length}` : g.markers.length}
                          </span>
                        </h4>
                        <div className="sa-markers">
                          {g.markers.map((m) => (
                            <button
                              key={m.id}
                              type="button"
                              className={`sa-marker sa-marker-pick${pickedIds.has(m.id) ? ' is-on' : ''}`}
                              aria-pressed={pickedIds.has(m.id)}
                              onClick={() => toggleMarker(m.id)}
                            >
                              {m.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              <div className="sa-finder-foot">
                <div className="sa-finder-results" aria-live="polite">
                  {finderResults.length === 0 ? (
                    <span className="sa-muted">{pickedIds.size === 0
                      ? 'Select markers to see the two best packages.'
                      : 'No available package covers any selected marker.'}</span>
                  ) : (
                    finderResults.map((match, index) => (
                      <div className="sa-finder-option" key={match.service.id}>
                        <div className="sa-finder-option-head">
                          <strong>{index + 1}. {match.service.name}</strong>
                          <span className="sa-fig">{formatAED(match.service.price)}</span>
                        </div>
                        <span className={match.complete ? 'sa-match-complete' : 'sa-match-partial'}>
                          {match.complete ? 'Full coverage' : 'Partial coverage'} · {match.covered}/{match.total} markers
                        </span>
                        {match.missing.length > 0 && (
                          <p className="sa-muted sa-small">Not included: {match.missing.slice(0, 8).join(', ')}
                            {match.missing.length > 8 ? `, +${match.missing.length - 8} more` : ''}
                          </p>
                        )}
                        <button type="button" className="sa-btn sa-btn-secondary sa-btn-sm"
                          onClick={() => {
                            appendServices([match.service])
                            setLadderOpen(true)
                            setFinderOpen(false)
                          }}>
                          <Icon name="plus" small />
                          Add this package
                        </button>
                      </div>
                    ))
                  )}
                </div>
                <div className="sa-finder-actions">
                  <button type="button" className="sa-btn sa-btn-quiet"
                    onClick={() => setPickedIds(new Set())} disabled={pickedIds.size === 0}>
                    Clear markers
                  </button>
                </div>
              </div>
            </div>
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
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </>
  ),
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
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
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
  const services = useMemo(() => getVisibleServices(), [])
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

  const same = Boolean(a && b && a.id === b.id)
  const comparison = useMemo(() => a && b && !same ? comparePackageMarkers(a, b) : null, [a, b, same])
  const priceDifference = a && b && a.price != null && b.price != null ? b.price - a.price : null

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

  const diffColumn = (label: string, markers: string[], components: string[]) => (
    <div className="sa-cmp-column">
      <h4 className="sa-subhead">{label} <span className="sa-muted sa-fig">{markers.length} markers</span></h4>
      {markers.length === 0 && components.length === 0 ? (
        <p className="sa-muted">No additional markers or components.</p>
      ) : (
        <>
          {markers.length > 0 && <div className="sa-markers">
            {markers.map((name, i) => <span key={i} className="sa-marker">{name}</span>)}
          </div>}
          {components.length > 0 && <>
            <p className="sa-muted sa-small">Additional procedures / modules</p>
            <div className="sa-markers">
              {components.map((name) => <span key={name} className="sa-marker sa-marker-pkg">{name}</span>)}
            </div>
          </>}
        </>
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
        <p className="sa-muted">Choose two packages to compare shared tests, differences and prices.</p>
      ) : same ? (
        <p className="sa-muted">Those are the same package — pick two different ones to compare.</p>
      ) : (
        <div className="sa-compare-diff">
          <div className="sa-cmp-overview">
            <div><strong>{a.name}</strong><span className="sa-fig">{formatAED(a.price)}</span></div>
            <div><strong>{b.name}</strong><span className="sa-fig">{formatAED(b.price)}</span></div>
            {priceDifference !== null && (
              <p>Package B is {priceDifference === 0 ? 'the same price as A' :
                `${formatAED(Math.abs(priceDifference))} ${priceDifference > 0 ? 'more' : 'less'} than A`}.</p>
            )}
          </div>
          <div className="sa-cmp-common">
            <h4 className="sa-subhead">Included in both packages <span className="sa-muted sa-fig">{comparison!.common.length} markers</span></h4>
            <details>
              <summary>View shared markers</summary>
              <div className="sa-markers">
                {comparison!.common.map((name, i) => <span key={i} className="sa-marker">{name}</span>)}
              </div>
            </details>
          </div>
          {diffColumn(`Only in ${a.name}`, comparison!.onlyA, comparison!.onlyAComponents)}
          {diffColumn(`Only in ${b.name}`, comparison!.onlyB, comparison!.onlyBComponents)}
        </div>
      )}
    </div>
  )
}

function QuoteTotalsRows({
  gross,
  discount,
  total,
  usdRate,
}: {
  gross: number
  discount: number
  total: number
  /** AED per USD; when set, a USD approximation of the total is shown. */
  usdRate?: number
}) {
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
      {usdRate ? (
        <div className="sa-totals-usd">
          <span />
          <span>{formatUSD(total, usdRate)}</span>
        </div>
      ) : null}
    </div>
  )
}

/** Discount value + % / AED switch, shared by selected lines and the suggestion. */
function DiscountControls({
  id,
  label,
  service,
  gross,
  type,
  value,
  applied,
  onChange,
}: {
  id: string
  label: string
  service: CatalogueService
  gross: number
  type: DiscountType
  value: number
  applied: number
  onChange: (patch: Partial<Pick<QuoteLine, 'discountType' | 'discountValue'>>) => void
}) {
  const cap = maxDiscountPct(service)
  // Effective discount as a percent of the line, so an AED amount is checked too.
  const effectivePct = type === 'pct' ? value : gross > 0 ? (value / gross) * 100 : 0
  const overCap = cap != null && effectivePct > cap + 0.01
  return (
    <div className="sa-disc">
      <label className="sa-sr" htmlFor={id}>
        Discount value for {label}
      </label>
      <input
        id={id}
        className={`sa-input sa-num${overCap ? ' sa-input-warn' : ''}`}
        type="number"
        min={0}
        max={type === 'pct' ? 100 : undefined}
        placeholder="0"
        aria-invalid={overCap}
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
      {overCap && (
        <span className="sa-disc-warn" role="alert">
          Max {cap}% discount on {service.name}.
        </span>
      )}
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
          service={line.service}
          gross={lineGross(line)}
          type={line.discountType}
          value={line.discountValue}
          applied={discount}
          onChange={onSetDiscount}
        />
      ) : (
        <div>
          <button
            type="button"
            className="sa-btn sa-btn-quiet sa-btn-flush sa-btn-sm sa-btn-icon"
            onClick={() => setDiscountOpen(true)}
            aria-label="Add discount"
            title="Add discount"
          >
            <Icon name="tag" small />
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
  // "Included packages" summary: the lab panels, plus anything else that composes
  // the bundle but isn't a panel — BCA, ECG, the gut microbiome kit — and the DNA
  // modules collapsed to one "DNA (N modules)" chip. Consultation/vitals are left
  // out (shown under Components). Lets staff read the whole bundle at a glance.
  const included = useMemo(() => {
    // Drop panels that belong to a DNA package (e.g. DNA Hair Loss/Acne Panel);
    // DNA is summarised as package chips below, so the panel would be a duplicate.
    const dnaPanels = dnaPackagePanelNames()
    const items = service.panels.filter((p) => !dnaPanels.has(p))
    for (const c of service.comps) {
      if (c.group === 'Doctor & Vital Signs' || c.group === 'DNA Modules') continue
      items.push(c.name)
    }
    // DNA modules collapse to DNA package name chip(s) when they fully decompose
    // into standalone DNA packages, otherwise a single "DNA (N modules)" chip.
    for (const lbl of dnaPackageLabels(service)) items.push(lbl)
    return items
  }, [service])
  // Kit components from the catalogue, plus the doctor consultation (tracked in a
  // separate `doctor` field, so it never appears in the components list itself).
  const components = useMemo(() => {
    if (!expanded) return []
    const tubes = bloodTubes(service)
    const base = packageComponents(service).map((c) =>
      c === 'Blood Collection' && tubes ? `Blood Collection · ${tubes} tube${tubes === 1 ? '' : 's'}` : c
    )
    return service.doctor ? [...base, `Doctor Consultation · ${service.doctor}`] : base
  }, [service, expanded])
  // Markers grouped by their profile/panel name (Liver Profile, Thyroid Profile, …),
  // split into labelled sections where it helps (food allergy vs intolerance).
  const sections = useMemo(() => (expanded ? markerSections(service) : []), [service, expanded])
  const panelCount = useMemo(() => sections.reduce((n, s) => n + s.groups.length, 0), [sections])
  const detailId = `sa-d-${service.id}`
  // Client-friendly package overview, shown through the information button.
  const summary = packageSummary(service)
  const [summaryOpen, setSummaryOpen] = useState(false)
  const summaryId = `sa-summary-${service.id}`
  const [openMarker, setOpenMarker] = useState<ActiveClinicalMarker | null>(null)
  const markerTooltipId = `sa-marker-insight-${service.id}`
  useEffect(() => { if (!expanded) setOpenMarker(null) }, [expanded])
  // On expand, bring this row to the top so its details unfold downward into view.
  const rowRef = useRef<HTMLElement>(null)
  useEffect(() => {
    if (expanded) rowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [expanded])

  return (
    <article ref={rowRef} className={`sa-pkg${expanded ? ' open' : ''}`}>
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
            className={`sa-icon-btn${summaryOpen ? ' is-on' : ''}`}
            aria-expanded={summaryOpen}
            aria-controls={summaryId}
            aria-label={`Package summary for ${service.name}`}
            title="Package summary"
            onClick={() => setSummaryOpen((v) => !v)}
          >
            <Icon name="info" />
          </button>
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

      {summaryOpen && (
        <div id={summaryId} className="sa-pitch" role="note">
          <div className="sa-pitch-head">
            <Icon name="info" small />
            <span>Package summary</span>
          </div>
          <p className="sa-pitch-what">{summary}</p>
        </div>
      )}

      {expanded && (
        <div id={detailId} className="sa-pkg-detail">
          {groups.length === 0 && panelCount === 0 && components.length === 0 ? (
            <p className="sa-muted">No breakdown available for this package.</p>
          ) : (
            <>
              {included.length > 0 && (
                <div>
                  <h4 className="sa-subhead">Included packages ({included.length})</h4>
                  <div className="sa-markers">
                    {included.map((p, i) => (
                      <span key={i} className="sa-marker sa-marker-pkg">
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {components.length > 0 && (
                <div>
                  <h4 className="sa-subhead">Components ({components.length})</h4>
                  <div className="sa-markers">
                    {components.map((c, i) => (
                      <span key={i} className="sa-marker sa-marker-pkg">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}

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

              {panelCount > 0 && (
                <div>
                  <h4 className="sa-subhead">Blood panels ({panelCount})</h4>
                  <div className="sa-stack">
                    {sections.map((sec, si) => (
                      <div key={sec.label ?? `main-${si}`} className="sa-stack">
                        {sec.label && <h4 className="sa-section-label">{sec.label}</h4>}
                        {sec.groups.map((p) => (
                          <div key={p.group}>
                            <h4>
                              {p.group} <span className="sa-muted sa-fig">{p.tests.length}</span>
                            </h4>
                            <div className="sa-markers">
                              {p.tests.map((t, i) => {
                                const insight = clinicalMarkerInsight(t.name)
                                return insight ? (
                                  <button
                                    type="button"
                                    key={i}
                                    className="sa-marker sa-clinical-marker"
                                    aria-label={`Explain ${t.name}`}
                                    aria-expanded={openMarker?.name === t.name}
                                    aria-describedby={openMarker?.name === t.name ? markerTooltipId : undefined}
                                    onClick={(event) => {
                                      const anchor = event.currentTarget
                                      setOpenMarker((current) => current?.name === t.name ? null : { name: t.name, anchor })
                                    }}
                                  >
                                    {t.name}
                                  </button>
                                ) : (
                                  <span key={i} className="sa-marker">{t.name}</span>
                                )
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
      {expanded && (
        <ClinicalMarkerPopover
          id={markerTooltipId}
          active={openMarker}
          onClose={() => setOpenMarker(null)}
        />
      )}
    </article>
  )
}
