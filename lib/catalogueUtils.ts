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

export interface MarkerSection {
  /** Section heading, or null for a package shown as a single unlabelled list. */
  label: string | null
  groups: { group: string; tests: CatalogueTest[] }[]
}

/** Source panels used to tell a food-allergy marker from a food-intolerance one. */
const FOOD_ALLERGY_PANEL = 'Food Allergy Panel'
const FOOD_INTOLERANCE_PANEL = 'Food Intolerance Panel'

/** Group a list of test ids by their profile group, de-duplicated by name,
 *  in first-appearance order. */
function groupTestIds(ids: number[]): { group: string; tests: CatalogueTest[] }[] {
  const order: string[] = []
  const map = new Map<string, CatalogueTest[]>()
  const seen = new Set<string>()
  for (const id of ids) {
    const t = data.tests[String(id)]
    if (!t || seen.has(t.name)) continue
    seen.add(t.name)
    const g = t.group || 'Other'
    if (!map.has(g)) { map.set(g, []); order.push(g) }
    map.get(g)!.push(t)
  }
  return order.map((g) => ({ group: g, tests: map.get(g)! }))
}

/** Ordered, de-duplicated test ids across a service's panels. */
function orderedServiceTestIds(service: CatalogueService): number[] {
  const seen = new Set<number>()
  const out: number[] = []
  for (const panelName of service.panels) {
    const panel = data.panels[panelName]
    if (!panel) continue
    for (const id of panel.tests) if (!seen.has(id)) { seen.add(id); out.push(id) }
  }
  return out
}

/**
 * A package's markers for display: usually one unlabelled section grouped by
 * profile. But any package that includes BOTH the food-allergy and the
 * food-intolerance panels (the bundle, and everything built on it — Ultimate
 * Gut Health, Dubai It, HEALTHMAXXING) gets its food markers split into labelled
 * "Food Allergy" and "Food Intolerance" sections, since those two panels share
 * ~39 marker names (Apple, Anchovy…) that would otherwise merge into one and
 * hide which is which. The non-food markers stay in the leading main section.
 */
export function markerSections(service: CatalogueService): MarkerSection[] {
  const allergyIds = new Set(data.panels[FOOD_ALLERGY_PANEL]?.tests ?? [])
  const intolIds = new Set(data.panels[FOOD_INTOLERANCE_PANEL]?.tests ?? [])

  const allergy: number[] = []
  const intolerance: number[] = []
  const other: number[] = []
  for (const id of orderedServiceTestIds(service)) {
    if (allergyIds.has(id)) allergy.push(id)
    else if (intolIds.has(id)) intolerance.push(id)
    else other.push(id)
  }

  // Only split when both kinds are present; otherwise a single plain list
  // (keeps standalone Food Allergy / Food Intolerance tests as they were).
  if (allergy.length === 0 || intolerance.length === 0) {
    const groups = groupServiceTests(service)
    return groups.length ? [{ label: null, groups }] : []
  }

  const sections: MarkerSection[] = []
  const otherGroups = groupTestIds(other)
  if (otherGroups.length) sections.push({ label: null, groups: otherGroups })
  sections.push({ label: 'Food Allergy', groups: groupTestIds(allergy) })
  sections.push({ label: 'Food Intolerance', groups: groupTestIds(intolerance) })
  return sections
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

/** Comp groups that make a package more than "just blood tests". */
const NON_BLOOD_GROUPS = new Set(['DNA Modules', 'Microbiome', 'BCA / ECG'])

/**
 * A pure blood-test package: it has lab tests and carries none of the non-blood
 * add-ons (DNA modules, gut microbiome kit, BCA or ECG). Used by the "Blood
 * tests only" filter. A doctor consultation is still allowed.
 */
export function isBloodTestOnly(service: CatalogueService): boolean {
  if (!hasLabTests(service)) return false
  return !service.comps.some((c) => NON_BLOOD_GROUPS.has(c.group))
}

/** DNA module collected by cheek swab, not a blood draw — so it's non-invasive. */
const SWAB_DNA_MODULES = new Set(['DNA - Ancestry'])

/**
 * A non-invasive package: nothing that pricks the patient. It has no blood
 * markers and no blood-drawn DNA modules and no vaccination (a needle) — e.g.
 * body composition, ECG, gut microbiome, DNA Ancestry (swab), a plain consult.
 */
export function isNonInvasive(service: CatalogueService): boolean {
  if (hasLabTests(service)) return false
  return !service.comps.some(
    (c) =>
      (c.group === 'DNA Modules' && !SWAB_DNA_MODULES.has(c.name)) || c.group === 'Vaccinations'
  )
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

/**
 * DNA-module names present in `from` but missing from `within`. Used to flag when
 * a suggested package's business composition claims a DNA package but the actual
 * package carries fewer modules (e.g. Ultimate/Executive have 11 of DNA - All of
 * You's 12, missing Ancestry).
 */
export function excludedDnaModules(from: CatalogueService[], within: CatalogueService[]): string[] {
  const covered = new Set<string>()
  for (const s of within) for (const c of s.comps) if (c.group === 'DNA Modules') covered.add(c.name)
  const out: string[] = []
  const seen = new Set<string>()
  for (const s of from) {
    for (const c of s.comps) {
      if (c.group !== 'DNA Modules' || covered.has(c.name) || seen.has(c.name)) continue
      seen.add(c.name)
      out.push(c.name)
    }
  }
  return out
}

/** Category that holds the comprehensive/bundle packages. */
const COMPREHENSIVE_CATEGORY = 'Comprehensive Packages / Bundles'

/** Category of the nested base screenings (HDS ⊂ Standard ⊂ Premium ⊂ Premium PLUS). */
const CORE_CATEGORY = 'Core Health Screening'

/**
 * Business composition of packages: which other purchasable packages each
 * package is made up of (direct components; transitive relationships are
 * resolved by includesClosure). This drives package suggestions — the cheapest
 * package that includes a set of selected individual packages is offered.
 * Names must match catalogue service names exactly.
 */
const COMPOSITION: Record<string, string[]> = {
  // Base screenings are nested (HDS ⊂ Standard ⊂ Premium ⊂ Premium PLUS), so a
  // higher tier covers a lower one for suggestions.
  'Standard Health Screening': ['Household Domestic Health Screening'],
  'Premium Health Screening': ['Standard Health Screening'],
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
  // Essentials & All of You do NOT include Body Composition Analysis (their
  // contents carry no BCA), so BCA is not listed here — otherwise they'd be
  // suggested as covering a selection that includes BCA.
  "Essentials Men's Package": ['DNA - Essentials', "Premium PLUS Men's Health Screening"],
  "Essentials Women's Package": ['DNA - Essentials', "Premium PLUS Women's Health Screening"],
  "All of You Men's Package": ['DNA - All of You', "Premium PLUS Men's Health Screening"],
  "All of You Women's Package": ['DNA - All of You', "Premium PLUS Women's Health Screening"],
  // Ultimate & Executive DO include BCA (see their contents), so it is listed
  // directly here rather than inherited from All of You (which no longer has it).
  "Ultimate Men's Longevity Package": ["All of You Men's Package", 'Longevity Profile', 'Body Composition Analysis'],
  "Ultimate Women's Longevity Package": ["All of You Women's Package", 'Longevity Profile', 'Body Composition Analysis'],
  "Executive Men's Health Package": [
    "All of You Men's Package",
    'ECG & Consult',
    'Cancer Risk Profile - Men',
    'Blood Group Test',
    'Cancer Risk - BRCA Genetic Test',
    'Body Composition Analysis',
  ],
  "Executive Women's Health Package": [
    "All of You Women's Package",
    'ECG & Consult',
    "Cancer Risk Profile - Women's",
    'Blood Group Test',
    'Cancer Risk - BRCA Genetic Test',
    'Body Composition Analysis',
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

/**
 * The maximum discount (percent) allowed on a package, or null when unrestricted.
 * All of You / Essentials bundles cap at 50%; Core Health Screening and Dubai It
 * packages cap at 10%. Everything else is uncapped.
 */
export function maxDiscountPct(service: CatalogueService): number | null {
  const n = service.name
  if (/^All of You /.test(n) || /^Essentials /.test(n)) return 50
  if (/^Dubai It /.test(n) || service.category === CORE_CATEGORY) return 10
  return null
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
 * business composition) but is NOT itself one of the selected packages — i.e.
 * the next rung up the ladder that still covers all the markers in the
 * selection. Null when nothing above the selection covers it. Gender-filtered
 * when a gender is given, and HEALTHMAXXING is only offered once the selection's
 * own total reaches AED 10,000.
 *
 * Already-selected packages are skipped on purpose: when one selected package
 * already contains another (e.g. Premium PLUS Men's already includes Cancer Risk
 * Profile - Men), re-offering the one in the cart would just drop the other — a
 * lost sale. Instead we suggest the next package up that bundles both (here,
 * Essentials Men's), so "Replace selection" is a genuine upsell.
 */
export function suggestPackage(selected: CatalogueService[], gender?: 'M' | 'W'): CatalogueService | null {
  if (selected.length < 2) return null
  const selNames = new Set(selected.map((s) => s.name))
  const sum = selected.reduce((a, s) => a + (s.price ?? 0), 0)

  // All selected from the Core Health Screening ladder nest into one another, so
  // the biggest selected already covers the rest — suggest that one (consolidate)
  // rather than upselling to a higher-category bundle. Returns null if no single
  // selected package covers the others (e.g. two different-gender Premium PLUS).
  if (selected.every((s) => s.category === CORE_CATEGORY)) {
    const covering = selected.filter((p) =>
      selected.every((o) => o.name === p.name || includesClosure(p.name).has(o.name))
    )
    if (!covering.length) return null
    return covering.reduce((a, b) => ((b.price ?? 0) > (a.price ?? 0) ? b : a))
  }
  let best: CatalogueService | null = null
  for (const p of data.services) {
    if (p.price == null) continue
    if (selNames.has(p.name)) continue // must be a step up, not a package already selected
    const inc = includesClosure(p.name)
    if (inc.size === 0) continue
    const g = serviceGender(p)
    if (gender && g && g !== gender) continue
    if (p.name === 'HEALTHMAXXING' && sum < 10000) continue
    // A candidate must cover every selected package.
    let coversAll = true
    for (const n of selNames) if (!inc.has(n)) { coversAll = false; break }
    if (!coversAll) continue
    if (!best || (p.price as number) < (best.price as number)) best = p
  }
  return best
}

/**
 * Catch-all packages excluded from the PARTIAL suggestion: they cover almost
 * everything, so offering them as "most of your selection" is overkill — the
 * point of the partial suggestion is a reasonable mid-tier combined package.
 */
const CATCHALL_PACKAGES = new Set(["Dubai It Men's Package", "Dubai It Women's Package", 'HEALTHMAXXING'])

export interface PartialSuggestion {
  service: CatalogueService
  /** Ids of the selected packages this combined package covers (via composition). */
  coveredIds: number[]
}

/**
 * The best combined (comprehensive) package that covers MOST — but not all — of
 * the selected individual packages, leaving the rest as standalone lines. Ranked
 * by how many selected packages it covers (most first), tie-broken by price. The
 * oversized catch-alls (Dubai It / HEALTHMAXXING) are excluded so this stays a
 * sensible mid-tier upsell rather than "just buy everything". Returns null when
 * nothing covers at least two of the selection while leaving a leftover.
 */
export function suggestPartialPackage(
  selected: CatalogueService[],
  gender?: 'M' | 'W'
): PartialSuggestion | null {
  if (selected.length < 3) return null
  let best: PartialSuggestion | null = null
  for (const p of data.services) {
    if (p.price == null || p.category !== COMPREHENSIVE_CATEGORY || CATCHALL_PACKAGES.has(p.name)) continue
    const g = serviceGender(p)
    if (gender && g && g !== gender) continue
    const inc = includesClosure(p.name)
    if (inc.size === 0) continue
    const covered = selected.filter((s) => s.name !== p.name && inc.has(s.name))
    // Needs 2+ covered AND at least one leftover, else it's not "combined + individual".
    if (covered.length < 2 || covered.length >= selected.length) continue
    const better =
      !best ||
      covered.length > best.coveredIds.length ||
      (covered.length === best.coveredIds.length && (p.price as number) < (best.service.price as number))
    if (better) best = { service: p, coveredIds: covered.map((s) => s.id) }
  }
  return best
}

/**
 * The atomic (non-composite) packages a suggested package includes that are not
 * yet selected — i.e. what still needs adding to build up to that package.
 * Sorted cheapest first.
 */
export interface ExtraItem {
  /** Chip label: a package name when complete, or "+N Group" / "+N DNA modules" when partial. */
  label: string
  /** True when the whole of a recognised package (all its markers/modules) is added. */
  complete: boolean
  /** The actual extra marker/module names, shown in the click-bubble (partial items). */
  markers: string[]
  /** The catalogue package a complete item maps to — offered with an "Add" button. */
  serviceId?: number
}

/**
 * What a suggested package adds beyond what's already selected. When the extra
 * markers make up a complete individual package (none of it already selected),
 * the package name is returned; otherwise the remaining markers are summarised
 * per profile ("+3 Thyroid Profile"). DNA modules and service add-ons (BCA/ECG/
 * gut microbiome) are appended. Each item carries the extra marker names for a
 * click-to-reveal bubble.
 */
export function getSuggestionExtras(
  selected: CatalogueService[],
  suggestion: CatalogueService
): ExtraItem[] {
  const selNames = new Set(selected.map((s) => s.name))
  const selTests = new Set<number>()
  for (const s of selected) for (const id of serviceTestIds(s)) selTests.add(id)
  const nameOf = (id: number) => data.tests[String(id)]?.name || ''

  // Extra lab markers the suggestion has that the selection doesn't.
  const extra = new Set<number>()
  for (const id of serviceTestIds(suggestion)) if (!selTests.has(id)) extra.add(id)

  const items: ExtraItem[] = []

  // Complete individual packages fully contained in the extra set (largest first).
  const candidates = data.services
    .filter((s) => s.category !== COMPREHENSIVE_CATEGORY && !selNames.has(s.name) && serviceTestIds(s).size > 0)
    .sort((a, b) => serviceTestIds(b).size - serviceTestIds(a).size)
  for (const p of candidates) {
    const pm = serviceTestIds(p)
    let allIn = true
    for (const id of pm) if (!extra.has(id)) { allIn = false; break }
    if (!allIn) continue
    items.push({ label: p.name, complete: true, markers: [...pm].map(nameOf), serviceId: p.id })
    for (const id of pm) extra.delete(id)
  }

  // Remaining extra markers, summarised per profile.
  const order: string[] = []
  const groups = new Map<string, number[]>()
  for (const id of extra) {
    const g = data.tests[String(id)]?.group || 'Other'
    if (!groups.has(g)) {
      groups.set(g, [])
      order.push(g)
    }
    groups.get(g)!.push(id)
  }
  for (const g of order.sort((a, b) => groups.get(b)!.length - groups.get(a)!.length)) {
    const ids = groups.get(g)!
    items.push({ label: `${ids.length} more ${g} marker${ids.length === 1 ? '' : 's'}`, complete: false, markers: ids.map(nameOf) })
  }

  // DNA modules — complete DNA package name, or a partial count.
  const dnaOf = (svc: CatalogueService[]) => {
    const set = new Set<string>()
    for (const s of svc) for (const c of s.comps) if (c.group === 'DNA Modules') set.add(c.name)
    return set
  }
  const selDna = dnaOf(selected)
  const remainingDna = new Set([...dnaOf([suggestion])].filter((m) => !selDna.has(m)))
  if (remainingDna.size > 0) {
    // Peel off complete DNA packages whose modules are all in the extra set,
    // largest first (e.g. 11 modules → DNA - Essentials (6) + "+5 DNA modules").
    const dnaPkgs = data.services
      .filter((s) => /^DNA -/.test(s.name) && !selNames.has(s.name) && dnaOf([s]).size > 0)
      .sort((a, b) => dnaOf([b]).size - dnaOf([a]).size)
    for (const p of dnaPkgs) {
      const mods = [...dnaOf([p])]
      if (mods.length >= 1 && mods.every((m) => remainingDna.has(m))) {
        items.push({ label: p.name, complete: true, markers: mods, serviceId: p.id })
        for (const m of mods) remainingDna.delete(m)
      }
    }
    if (remainingDna.size > 0) {
      items.push({ label: `${remainingDna.size} more DNA module${remainingDna.size === 1 ? '' : 's'}`, complete: false, markers: [...remainingDna] })
    }
  }

  // Service add-ons (BCA / ECG / gut microbiome), mapped to their standalone package.
  const byName = new Map(data.services.map((s) => [s.name, s]))
  const addonPackage = (comp: CatalogueComp): CatalogueService | undefined => {
    if (comp.group === 'Microbiome') return byName.get('Gut Microbiome Test')
    if (comp.name === 'BCA') return byName.get('Body Composition Analysis')
    if (comp.name === 'ECG') return byName.get('ECG & Consult')
    return undefined
  }
  const addGroups = new Set(['BCA / ECG', 'Microbiome'])
  const selAdd = new Set<string>()
  for (const s of selected) for (const c of s.comps) if (addGroups.has(c.group)) selAdd.add(c.name)
  const seenAdd = new Set<string>()
  for (const c of suggestion.comps) {
    if (addGroups.has(c.group) && !selAdd.has(c.name) && !seenAdd.has(c.name)) {
      seenAdd.add(c.name)
      const pkg = addonPackage(c)
      items.push({ label: c.name, complete: true, markers: [], serviceId: pkg?.id })
    }
  }

  return items
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

/**
 * Approximate AED as USD for display only (AED stays the primary currency).
 * `rate` is AED per 1 USD; returns an empty string when the amount or rate is
 * unusable.
 */
export function formatUSD(aed: number | null, rate: number): string {
  if (aed == null || !(rate > 0)) return ''
  return `≈ USD ${(aed / rate).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
}

// ---------- client journey (components) ----------

/**
 * The components (steps) a client goes through for a package, excluding Doctor
 * Consultation (always handled last, with summed time). Derived from the
 * package's existing data — lab panels, `comps` groups, and comp names — so it
 * updates automatically when a package's contents change. Order: Blood
 * Collection, Swab, BCA, ECG, Gut Kit, Questionnaire, Vital Signs — with Doctor
 * Consultation appended last by buildJourney.
 */
export const JOURNEY_COMPONENT_ORDER = [
  'Blood Collection',
  'Swab',
  'BCA',
  'ECG',
  'Gut Kit',
  'Questionnaire',
  'Vital Signs',
] as const

export function packageComponents(service: CatalogueService): string[] {
  const comps = service.comps || []
  const hasComp = (test: (c: CatalogueComp) => boolean) => comps.some(test)
  // Any package with DNA modules includes both a Questionnaire and a Swab.
  const hasDna = hasComp((c) => c.group === 'DNA Modules')
  const out: string[] = []
  if (hasDna || hasComp((c) => /questionnaire/i.test(c.name) || /questionnaire/i.test(c.group))) out.push('Questionnaire')
  if (hasComp((c) => /vital sign/i.test(c.name))) out.push('Vital Signs')
  if (hasLabTests(service)) out.push('Blood Collection')
  if (hasDna) out.push('Swab')
  if (hasComp((c) => c.name === 'BCA')) out.push('BCA')
  if (hasComp((c) => c.name === 'ECG')) out.push('ECG')
  if (hasComp((c) => c.group === 'Microbiome' || /gut/i.test(c.name))) out.push('Gut Kit')
  return out
}

/** Total consultation minutes declared in a `doctor` field like "30 min + 15 min" or "1 hr". */
export function parseConsultMinutes(doctor: string | null): number {
  if (!doctor) return 0
  let total = 0
  const re = /(\d+(?:\.\d+)?)\s*(hours?|hrs?|h|minutes?|mins?|m)\b/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(doctor))) {
    const n = parseFloat(m[1])
    total += /^h/i.test(m[2]) ? n * 60 : n
  }
  return total
}

/** Format minutes as "1 hr 15 min" / "45 min" / "2 hr". */
export function formatDuration(minutes: number): string {
  if (minutes <= 0) return ''
  const h = Math.floor(minutes / 60)
  const mm = Math.round(minutes % 60)
  const parts: string[] = []
  if (h) parts.push(`${h} hr`)
  if (mm) parts.push(`${mm} min`)
  return parts.join(' ')
}

export interface JourneyStep {
  label: string
  /** How many selected packages include this component (shown as "× N" when > 1). */
  count: number
}

export interface Journey {
  steps: JourneyStep[]
  /** Summed Doctor Consultation time across all selected packages, in minutes. */
  consultMinutes: number
}

/**
 * The client journey for a set of selected packages: each component with a count
 * (repeats shown, not deduped — e.g. BCA × 2), and the summed Doctor
 * Consultation time, which the UI shows as the final step.
 */
export function buildJourney(services: CatalogueService[]): Journey {
  const counts = new Map<string, number>()
  let consultMinutes = 0
  for (const s of services) {
    for (const label of packageComponents(s)) counts.set(label, (counts.get(label) ?? 0) + 1)
    consultMinutes += parseConsultMinutes(s.doctor)
  }
  const steps: JourneyStep[] = []
  for (const label of JOURNEY_COMPONENT_ORDER) {
    const count = counts.get(label)
    if (count) steps.push({ label, count })
  }
  return { steps, consultMinutes }
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
