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
 * Query matches package name, sub-label, category, and — so packages can be
 * found by what they test for — the name of any lab test/marker they include
 * (case-insensitive). The marker match is only evaluated when the cheaper
 * name/category checks miss, so typing stays responsive.
 */
export function searchServices(query: string, category?: string): CatalogueService[] {
  const q = query.trim().toLowerCase()
  return data.services.filter((s) => {
    if (category && s.category !== category) return false
    if (!q) return true
    return (
      s.name.toLowerCase().includes(q) ||
      (s.sub || '').toLowerCase().includes(q) ||
      s.category.toLowerCase().includes(q) ||
      getServiceTests(s).some((t) => t.name.toLowerCase().includes(q))
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

/** Whether a service includes at least one resolved lab/blood test. */
export function hasLabTests(service: CatalogueService): boolean {
  return serviceTestIds(service).size > 0
}

/**
 * The individual packages a bundle/comprehensive package is built from. Each of
 * a service's panels maps to the standalone single-panel package that offers
 * exactly that panel (e.g. the "Longevity Panel" → "Longevity Profile"), so a
 * comprehensive resolves to the building-block packages it combines. Returns an
 * empty list for a plain single-panel package (nothing to decompose).
 */
export function getComponentPackages(service: CatalogueService): CatalogueService[] {
  const components: CatalogueService[] = []
  const seen = new Set<number>()
  for (const panelName of service.panels) {
    const provider = data.services.find(
      (s) => s.id !== service.id && s.panels.length === 1 && s.panels[0] === panelName
    )
    if (provider && !seen.has(provider.id)) {
      seen.add(provider.id)
      components.push(provider)
    }
  }
  return components
}

/** True when `containerTests`/`containerComps` fully include every test and component of `p`. */
function packageContains(
  containerTests: Set<number>,
  containerComps: Set<string>,
  p: CatalogueService
): boolean {
  for (const id of serviceTestIds(p)) if (!containerTests.has(id)) return false
  for (const k of serviceCompKeys(p)) if (!containerComps.has(k)) return false
  return true
}

/** Category that holds the comprehensive/bundle packages. */
const COMPREHENSIVE_CATEGORY = 'Comprehensive Packages / Bundles'

/** Candidate bundle/comprehensive packages that can replace a group of packages. */
function bundleCandidates(): CatalogueService[] {
  return data.services.filter(
    (s) => s.price != null && (s.category === COMPREHENSIVE_CATEGORY || /\bbundle\b/i.test(s.name))
  )
}

/**
 * Greedily cover a selection with bundles under a given "pick the best next
 * bundle" rule. Each chosen bundle must cover 2+ still-uncovered packages, and
 * covered packages are removed before the next pick, so bundles never overlap.
 */
function greedyCover(
  selected: CatalogueService[],
  candidates: CatalogueService[],
  better: (a: { covered: CatalogueService[]; cand: CatalogueService }, b: { covered: CatalogueService[]; cand: CatalogueService }) => boolean
): { bundles: CatalogueService[]; leftovers: CatalogueService[] } {
  const bundles: CatalogueService[] = []
  let remaining = [...selected]
  // eslint-disable-next-line no-constant-condition
  while (true) {
    let best: { covered: CatalogueService[]; cand: CatalogueService } | null = null
    for (const cand of candidates) {
      const ct = serviceTestIds(cand)
      const cc = serviceCompKeys(cand)
      const covered = remaining.filter((p) => cand.id !== p.id && packageContains(ct, cc, p))
      if (covered.length < 2) continue
      const option = { covered, cand }
      if (!best || better(option, best)) best = option
    }
    if (!best) break
    bundles.push(best.cand)
    const coveredIds = new Set(best.covered.map((c) => c.id))
    remaining = remaining.filter((p) => !coveredIds.has(p.id))
  }
  return { bundles, leftovers: remaining }
}

export interface BundledQuote {
  /** Bundle/comprehensive packages chosen to cover subsets of the selection. */
  bundles: CatalogueService[]
  /** Selected packages not covered by any bundle — kept as individual lines. */
  leftovers: CatalogueService[]
  /** The full bundled composition: bundles first, then leftovers. */
  services: CatalogueService[]
  /** Sum of the composition's prices. */
  total: number
}

const priceOf = (list: CatalogueService[]) => list.reduce((sum, s) => sum + (s.price ?? 0), 0)

/**
 * Produce the fully-bundled version of a selection: replace every group of 2+
 * selected packages that a comprehensive/bundle package covers with that
 * bundle, composing multiple bundles when the selection spans several groups
 * (e.g. men's packages + food tests → Ultimate Men's + Food Allergy &
 * Intolerance Bundle), and keeping any uncovered packages as individual lines.
 *
 * Coverage is content-based (a package is covered when the bundle includes all
 * of its lab tests AND service components). Two greedy strategies are tried —
 * fewest-bundles (max coverage first) and cheapest-bundle-first — and the
 * lower-priced resulting composition is returned, which avoids both over-reach
 * (one huge comprehensive) and redundant overlapping bundles.
 */
export function bundleAll(selected: CatalogueService[]): BundledQuote {
  const uniq = [...new Map(selected.map((s) => [s.id, s])).values()]
  if (uniq.length < 2) {
    return { bundles: [], leftovers: uniq, services: uniq, total: priceOf(uniq) }
  }

  const candidates = bundleCandidates()

  // Strategy 1: cover the most packages per bundle (fewest bundles).
  const byCoverage = greedyCover(uniq, candidates, (a, b) =>
    a.covered.length !== b.covered.length
      ? a.covered.length > b.covered.length
      : (a.cand.price ?? 0) < (b.cand.price ?? 0)
  )
  // Strategy 2: use the cheapest qualifying bundle at each step.
  const byPrice = greedyCover(uniq, candidates, (a, b) =>
    (a.cand.price ?? 0) !== (b.cand.price ?? 0)
      ? (a.cand.price ?? 0) < (b.cand.price ?? 0)
      : a.covered.length > b.covered.length
  )

  const totalOf = (r: { bundles: CatalogueService[]; leftovers: CatalogueService[] }) =>
    priceOf(r.bundles) + priceOf(r.leftovers)
  const best = totalOf(byPrice) < totalOf(byCoverage) ? byPrice : byCoverage

  const services = [...best.bundles, ...best.leftovers]
  return { bundles: best.bundles, leftovers: best.leftovers, services, total: priceOf(services) }
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

/** Per-line discount type: a percentage of the line, or a fixed AED amount. */
export type DiscountType = 'pct' | 'amt'

export interface QuoteLine {
  service: CatalogueService
  qty: number
  /** How this line's discount is interpreted. */
  discountType: DiscountType
  /** Discount value: 0–100 when type is 'pct', an AED amount when type is 'amt'. */
  discountValue: number
}

/** Line total before discount = unit price × qty (a POA/no-price item counts as 0). */
export function lineGross(line: QuoteLine): number {
  return (line.service.price ?? 0) * line.qty
}

/**
 * The discount amount applied to a line, always clamped so it can neither be
 * negative nor exceed the line's gross. Percentages are clamped to 0–100.
 */
export function lineDiscountAmount(line: QuoteLine): number {
  const gross = lineGross(line)
  const v = Math.max(0, line.discountValue || 0)
  if (line.discountType === 'pct') return Math.round((gross * Math.min(100, v)) / 100)
  return Math.min(Math.round(v), gross)
}

/** Line total after its own discount. */
export function lineNet(line: QuoteLine): number {
  return lineGross(line) - lineDiscountAmount(line)
}

export interface QuoteTotals {
  /** Sum of line grosses (before any discounts). */
  gross: number
  /** Sum of per-line discount amounts. */
  discount: number
  /** gross − discount. */
  total: number
  itemCount: number
}

/**
 * Compute quote totals from basket lines, applying each line's own discount.
 * Services with no price (POA) contribute 0.
 */
export function quoteTotals(lines: QuoteLine[]): QuoteTotals {
  let gross = 0
  let discount = 0
  let itemCount = 0
  for (const l of lines) {
    gross += lineGross(l)
    discount += lineDiscountAmount(l)
    itemCount += l.qty
  }
  return { gross, discount, total: gross - discount, itemCount }
}
