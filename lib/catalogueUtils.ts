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

// Clone the services array so we can inject the synthetic HEALTHMAXXING package
// below without mutating the imported (possibly frozen) JSON module.
const data: Catalogue = { ...(catalogue as Catalogue), services: [...(catalogue as Catalogue).services] }

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
 * Filter services by free-text query and/or an exact category. The query is
 * split into words and a service matches only if EVERY word appears somewhere
 * in its name, sub-label, category, or one of its lab-test/marker names — so
 * "dubai men" and marker searches like "vitamin d" both work regardless of word
 * order. Marker names are only joined when a word misses the cheaper fields, so
 * typing stays responsive.
 */
export function searchServices(query: string, category?: string): CatalogueService[] {
  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  return data.services.filter((s) => {
    if (category && s.category !== category) return false
    if (tokens.length === 0) return true
    const base = `${s.name} ${s.sub || ''} ${s.category}`.toLowerCase()
    let markers: string | null = null
    return tokens.every((tok) => {
      if (base.includes(tok)) return true
      if (markers === null) markers = getServiceTests(s).map((t) => t.name).join(' ').toLowerCase()
      return markers.includes(tok)
    })
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

/** Whether a service includes at least one resolved lab/blood test. */
export function hasLabTests(service: CatalogueService): boolean {
  return serviceTestIds(service).size > 0
}

/**
 * Marker (test) names present in `from` but missing from `within` — i.e. what a
 * bundled composition would leave out compared with the individual packages.
 * Empty when `within` covers every marker in `from`.
 */
export function excludedMarkers(from: CatalogueService[], within: CatalogueService[]): string[] {
  const covered = new Set<number>()
  for (const s of within) for (const id of serviceTestIds(s)) covered.add(id)
  const out: string[] = []
  const seen = new Set<string>()
  for (const s of from) {
    for (const id of serviceTestIds(s)) {
      if (covered.has(id)) continue
      const name = data.tests[String(id)]?.name
      if (name && !seen.has(name)) {
        seen.add(name)
        out.push(name)
      }
    }
  }
  return out
}

/** Category that holds the comprehensive/bundle packages. */
const COMPREHENSIVE_CATEGORY = 'Comprehensive Packages / Bundles'

/**
 * Business composition of packages: which other purchasable packages each
 * package is made up of (direct components; transitive relationships are
 * resolved by includesClosure). This drives package suggestions — the cheapest
 * package that includes a set of selected individual packages is offered.
 * Names must match catalogue service names exactly.
 */
const COMPOSITION: Record<string, string[]> = {
  'Fasted Glucose & Insulin Test': ['Fasted Glucose Test'],
  'Diabetes Screening': ['Fasted Glucose Test'],
  'Advanced Diabetes Screening': ['Diabetes Screening', 'Fasted Glucose & Insulin Test'],
  'Food Allergy & Intolerance Bundle': ['Food Allergy Test', 'Food Intolerance Test'],
  'DNA - All of You': ['DNA - Essentials', 'DNA - Ancestry'],
  "Premium PLUS Men's Health Screening": [
    'Premium Health Screening',
    'Cancer Risk Profile - Men',
    'Cortisol Test',
    'Liver Profile',
    'Thyroid, Hormone & Vitamin Profile',
  ],
  "Premium PLUS Women's Health Screening": [
    'Premium Health Screening',
    "Cancer Risk Profile - Women's",
    'Cortisol Test',
    'Liver Profile',
    'Thyroid, Hormone & Vitamin Profile',
  ],
  'Healthy Heart Package': ['Body Composition Analysis', 'ECG & Consult'],
  "Women's Clarity Package": ["Premium PLUS Women's Health Screening", 'Body Composition Analysis'],
  "Essentials Men's Package": ['Body Composition Analysis', 'DNA - Essentials', "Premium PLUS Men's Health Screening"],
  "Essentials Women's Package": ['Body Composition Analysis', 'DNA - Essentials', "Premium PLUS Women's Health Screening"],
  "All of You Men's Package": ['Body Composition Analysis', 'DNA - All of You', "Premium PLUS Men's Health Screening"],
  "All of You Women's Package": ['Body Composition Analysis', 'DNA - All of You', "Premium PLUS Women's Health Screening"],
  "Ultimate Men's Longevity Package": ["All of You Men's Package", 'Longevity Profile'],
  "Ultimate Women's Longevity Package": ["All of You Women's Package", 'Longevity Profile'],
  "Executive Men's Health Package": [
    "All of You Men's Package",
    'ECG & Consult',
    'Cancer Risk Profile - Men',
    'Blood Group Test',
    'Cancer Risk - BRCA Genetic Test',
  ],
  "Executive Women's Health Package": [
    "All of You Women's Package",
    'ECG & Consult',
    "Cancer Risk Profile - Women's",
    'Blood Group Test',
    'Cancer Risk - BRCA Genetic Test',
  ],
  'Ultimate Gut Health Package': ['Gut Microbiome Test', 'Food Allergy & Intolerance Bundle'],
  "Dubai It Men's Package": ["Executive Men's Health Package", 'Longevity Profile', 'Food Allergy & Intolerance Bundle'],
  "Dubai It Women's Package": ["Executive Women's Health Package", 'Longevity Profile', 'Food Allergy & Intolerance Bundle'],
  HEALTHMAXXING: [
    "Dubai It Men's Package",
    'DNA - Hair Loss Package',
    'DNA - Acne Package',
    'Gut Microbiome Test',
    'Respiratory Allergy Test',
  ],
}

/** Price of the unofficial HEALTHMAXXING package (sum of its components). */
const HEALTHMAXXING_PRICE = 19150

// Inject HEALTHMAXXING — an unofficial package that covers everything on offer —
// synthesised from the union of its component packages' panels and comps so the
// catalogue view and suggestions treat it like any other package.
;(function injectHealthmaxxing() {
  if (data.services.some((s) => s.name === 'HEALTHMAXXING')) return
  const byName = new Map(data.services.map((s) => [s.name, s]))
  const panels: string[] = []
  const comps: CatalogueComp[] = []
  const compKeys = new Set<string>()
  for (const name of COMPOSITION.HEALTHMAXXING) {
    const c = byName.get(name)
    if (!c) continue
    for (const p of c.panels) if (!panels.includes(p)) panels.push(p)
    for (const row of c.comps) {
      const k = `${row.group}::${row.name}`
      if (!compKeys.has(k)) {
        compKeys.add(k)
        comps.push(row)
      }
    }
  }
  const testIds = new Set<number>()
  for (const p of panels) {
    const panel = data.panels[p]
    if (panel) for (const id of panel.tests) testIds.add(id)
  }
  data.services.push({
    id: Math.max(...data.services.map((s) => s.id)) + 1,
    category: COMPREHENSIVE_CATEGORY,
    sub: 'Healthmaxxing',
    name: 'HEALTHMAXXING',
    price: HEALTHMAXXING_PRICE,
    currency: 'AED',
    biomarkers: testIds.size,
    doctor: '60 min + 15 min',
    panels,
    comps,
  })
})()

/** Transitive set of packages (by name) a package is composed of. */
const includesCache = new Map<string, Set<string>>()
function includesClosure(name: string): Set<string> {
  const cached = includesCache.get(name)
  if (cached) return cached
  const set = new Set<string>()
  for (const c of COMPOSITION[name] || []) {
    set.add(c)
    for (const x of includesClosure(c)) set.add(x)
  }
  includesCache.set(name, set)
  return set
}

/** 'M' for a men's package, 'W' for a women's package, or null when it applies to anyone. */
export function serviceGender(service: CatalogueService): 'M' | 'W' | null {
  const n = service.name
  if (/\bwomen/i.test(n)) return 'W'
  if (/\bmen('|\b)/i.test(n)) return 'M'
  return null
}

/**
 * The single cheapest package that INCLUDES every selected package (via the
 * business composition), or null if none does. Used to suggest the next rung on
 * the package ladder. Gender-filtered when a gender is given, and HEALTHMAXXING
 * is only offered once the selection's own total reaches AED 10,000.
 */
export function suggestPackage(selected: CatalogueService[], gender?: 'M' | 'W'): CatalogueService | null {
  if (selected.length < 2) return null
  const selNames = new Set(selected.map((s) => s.name))
  const sum = selected.reduce((a, s) => a + (s.price ?? 0), 0)
  let best: CatalogueService | null = null
  for (const p of data.services) {
    if (p.price == null || selNames.has(p.name)) continue
    const inc = includesClosure(p.name)
    if (inc.size === 0) continue
    const g = serviceGender(p)
    if (gender && g && g !== gender) continue
    if (p.name === 'HEALTHMAXXING' && sum < 10000) continue
    let coversAll = true
    for (const n of selNames) if (!inc.has(n)) { coversAll = false; break }
    if (!coversAll) continue
    if (!best || (p.price as number) < (best.price as number)) best = p
  }
  return best
}

/**
 * The atomic (non-composite) packages a suggested package includes that are not
 * yet selected — i.e. what still needs adding to build up to that package.
 * Sorted cheapest first.
 */
export function getMissingComponents(
  suggestion: CatalogueService,
  selected: CatalogueService[]
): CatalogueService[] {
  // Everything the selection already covers: each selected package plus all the
  // packages it itself includes (so e.g. Premium PLUS's Premium/Cortisol/Liver/
  // Thyroid aren't listed as still-needed once Premium PLUS is selected).
  const covered = new Set<string>()
  for (const s of selected) {
    covered.add(s.name)
    for (const n of includesClosure(s.name)) covered.add(n)
  }
  const byName = new Map(data.services.map((s) => [s.name, s]))
  return [...includesClosure(suggestion.name)]
    .filter((n) => (COMPOSITION[n] || []).length === 0 && !covered.has(n))
    .map((n) => byName.get(n))
    .filter((s): s is CatalogueService => Boolean(s))
    .sort((a, b) => (a.price ?? 0) - (b.price ?? 0))
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
