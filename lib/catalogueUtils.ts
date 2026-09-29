/**
 * lib/catalogueUtils.ts — Typed access to the bundled sales catalogue.
 *
 * The Sale Assistant tab is powered by a STATIC snapshot at lib/catalogue.json
 * (imported below), so nothing here makes a network request — the app's
 * "100% local · no data shared" guarantee is preserved.
 *
 * TO REFRESH THE DATA (prices/packages changed upstream):
 *     node scripts/fetch-catalogue.mjs
 * That regenerates lib/catalogue.json from the upstream catalogue page.
 *
 * This module only reads that JSON and offers small pure helpers (search,
 * filtering, price formatting, panel/test drill-down, quote totals). No React.
 */

import catalogue from './catalogue.json'

// ---------- types ----------

/** One curated "what's included" row shown in a service's comparison table. */
export interface CatalogueComp {
  group: string
  name: string
  value: string
}

/** A sellable package/service with its price and contents. */
export interface CatalogueService {
  id: number
  category: string
  sub: string
  name: string
  price: number | null
  currency: string
  /** Number of biomarkers/tests covered (upstream `count`). */
  biomarkers: number
  /** Doctor/consult time descriptor, if any (e.g. "30 min"). */
  doctor: string | null
  /** Names of the lab panels this service includes (keys into `panels`). */
  panels: string[]
  comps: CatalogueComp[]
}

/** A lab panel: the set of test ids it runs. */
export interface CataloguePanel {
  tests: number[]
  count: number
}

/** A single test/biomarker in the dictionary. */
export interface CatalogueTest {
  name: string
  group: string
  method: string
  /** Prerequisite tests, if any (newline-separated upstream). */
  req: string | null
}

export interface Catalogue {
  meta: {
    source: string
    fetchedAt: string
    currency: string
    serviceCount: number
  }
  services: CatalogueService[]
  panels: Record<string, CataloguePanel>
  tests: Record<string, CatalogueTest>
}

const data = catalogue as Catalogue

// ---------- reads ----------

export const CATALOGUE_META = data.meta

export function getServices(): CatalogueService[] {
  return data.services
}

/** Category display order = order of first appearance in the source sheet. */
export function getCategories(): string[] {
  const seen: string[] = []
  for (const s of data.services) if (!seen.includes(s.category)) seen.push(s.category)
  return seen
}

export function getServiceById(id: number): CatalogueService | undefined {
  return data.services.find((s) => s.id === id)
}

/**
 * Filter services by free-text query and/or an exact category.
 * Query matches name, sub-label, and category (case-insensitive).
 */
export function searchServices(query: string, category?: string): CatalogueService[] {
  const q = query.trim().toLowerCase()
  return data.services.filter((s) => {
    if (category && s.category !== category) return false
    if (!q) return true
    return (
      s.name.toLowerCase().includes(q) ||
      (s.sub || '').toLowerCase().includes(q) ||
      s.category.toLowerCase().includes(q)
    )
  })
}

/** Resolve a panel name to its list of test records (skips unknown ids). */
export function getPanelTests(panelName: string): CatalogueTest[] {
  const panel = data.panels[panelName]
  if (!panel) return []
  return panel.tests
    .map((id) => data.tests[String(id)])
    .filter((t): t is CatalogueTest => Boolean(t))
}

/** All test records across every panel a service includes (de-duplicated by name). */
export function getServiceTests(service: CatalogueService): CatalogueTest[] {
  const byName = new Map<string, CatalogueTest>()
  for (const panelName of service.panels) {
    for (const t of getPanelTests(panelName)) if (!byName.has(t.name)) byName.set(t.name, t)
  }
  return [...byName.values()]
}

/**
 * A service's full resolved lab tests, grouped by their test `group` (e.g.
 * "Complete Blood Count", "Lipid Profile"), in first-appearance order and
 * de-duplicated by test name. This is the complete biomarker breakdown, as
 * opposed to `comps` which only covers service-level items (doctor, vitals,
 * DNA modules, ECG, vaccinations, microbiome).
 */
export function groupServiceTests(
  service: CatalogueService
): { group: string; tests: CatalogueTest[] }[] {
  const order: string[] = []
  const map = new Map<string, CatalogueTest[]>()
  const seen = new Set<string>()
  for (const t of getServiceTests(service)) {
    if (seen.has(t.name)) continue
    seen.add(t.name)
    const g = t.group || 'Other'
    if (!map.has(g)) {
      map.set(g, [])
      order.push(g)
    }
    map.get(g)!.push(t)
  }
  return order.map((g) => ({ group: g, tests: map.get(g)! }))
}

// ---------- bundle (comprehensive-package) suggestions ----------

/** Set of resolved lab-test ids a service includes (across all its panels). */
function serviceTestIds(service: CatalogueService): Set<number> {
  const ids = new Set<number>()
  for (const panelName of service.panels) {
    const panel = data.panels[panelName]
    if (panel) for (const id of panel.tests) ids.add(id)
  }
  return ids
}

/** Set of a service's component keys ("group::name") from its `comps`. */
function serviceCompKeys(service: CatalogueService): Set<string> {
  return new Set(service.comps.map((c) => `${c.group}::${c.name}`))
}

export interface BundleSuggestion {
  /** The comprehensive package that covers the whole selection. */
  bundle: CatalogueService
  /** Sum of the selected packages' prices (buying them individually). */
  individualTotal: number
  /** The comprehensive package's price. */
  bundlePrice: number
  /** bundlePrice − individualTotal. Negative = the bundle is cheaper (a saving). */
  delta: number
  /** How many extra lab tests the bundle adds beyond the selection. */
  extraTests: number
  /** Extra service components the bundle adds (display names, e.g. DNA modules, BCA/ECG). */
  extraComponents: string[]
}

/**
 * Given a set of selected packages, find comprehensive packages that fully
 * cover them — i.e. that include every selected lab test AND every selected
 * service component — and are worth surfacing (they add something extra, or
 * they cost less than buying the selection individually).
 *
 * Coverage is content-based (tests + comps), not panel-name based, so it
 * correctly matches e.g. the "Food Allergy & Intolerance Bundle" to its two
 * component tests even though their panel names differ.
 *
 * Returns suggestions sorted by delta ascending (best deal first). Requires at
 * least two selected packages (a bundle only makes sense for a combination).
 */
export function findBundleSuggestions(selected: CatalogueService[]): BundleSuggestion[] {
  if (selected.length < 2) return []

  const selectedIds = new Set(selected.map((s) => s.id))
  const unionTests = new Set<number>()
  const unionComps = new Set<string>()
  let individualTotal = 0
  for (const s of selected) {
    individualTotal += s.price ?? 0
    for (const id of serviceTestIds(s)) unionTests.add(id)
    for (const k of serviceCompKeys(s)) unionComps.add(k)
  }

  const suggestions: BundleSuggestion[] = []
  for (const candidate of data.services) {
    if (selectedIds.has(candidate.id) || candidate.price == null) continue

    const candTests = serviceTestIds(candidate)
    const candComps = serviceCompKeys(candidate)

    // Must contain every selected test and every selected component.
    let covers = true
    for (const id of unionTests) if (!candTests.has(id)) { covers = false; break }
    if (covers) for (const k of unionComps) if (!candComps.has(k)) { covers = false; break }
    if (!covers) continue

    const extraTests = [...candTests].filter((id) => !unionTests.has(id)).length
    const extraComponents = [...candComps]
      .filter((k) => !unionComps.has(k))
      .map((k) => k.split('::')[1])
    const delta = candidate.price - individualTotal

    // Only worth showing if it adds something or saves money (skip a pure,
    // more-expensive duplicate of the selection).
    if (extraTests === 0 && extraComponents.length === 0 && delta >= 0) continue

    suggestions.push({
      bundle: candidate,
      individualTotal,
      bundlePrice: candidate.price,
      delta,
      extraTests,
      extraComponents,
    })
  }

  return suggestions.sort((a, b) => a.delta - b.delta)
}

/** Group a service's curated "what's included" rows by their `group` label. */
export function groupComps(service: CatalogueService): { group: string; rows: CatalogueComp[] }[] {
  const order: string[] = []
  const map = new Map<string, CatalogueComp[]>()
  for (const c of service.comps) {
    if (!map.has(c.group)) {
      map.set(c.group, [])
      order.push(c.group)
    }
    map.get(c.group)!.push(c)
  }
  return order.map((g) => ({ group: g, rows: map.get(g)! }))
}

// ---------- formatting & quote math ----------

/** Format a number as an AED price, matching the upstream `AED 1,250` style. */
export function formatAED(n: number | null): string {
  if (n == null) return 'POA'
  return `AED ${n.toLocaleString('en-US')}`
}

export interface QuoteLine {
  service: CatalogueService
  qty: number
}

export interface QuoteTotals {
  subtotal: number
  discountPct: number
  discountAmount: number
  total: number
  itemCount: number
}

/**
 * Compute quote totals from basket lines and an optional percentage discount
 * (0–100). Services with no price (POA) contribute 0 to the subtotal.
 */
export function quoteTotals(lines: QuoteLine[], discountPct = 0): QuoteTotals {
  const subtotal = lines.reduce((sum, l) => sum + (l.service.price ?? 0) * l.qty, 0)
  const pct = Math.min(100, Math.max(0, discountPct))
  const discountAmount = Math.round((subtotal * pct) / 100)
  const itemCount = lines.reduce((sum, l) => sum + l.qty, 0)
  return { subtotal, discountPct: pct, discountAmount, total: subtotal - discountAmount, itemCount }
}
