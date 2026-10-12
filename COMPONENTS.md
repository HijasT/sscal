# Components / Journey — feature spec

Status: **v2 shipped in v11.5.0** — components are now an **explicit, editable
field per service** (`components: string[]`) in `lib/catalogue.json`, in journey
order, and are the single source of truth for the Journey. `packageComponents`
reads that field (falling back to the old derivation only for the runtime-only
synthetic HEALTHMAXXING). To change what a package's journey shows, edit its
`components` array. The arrays were generated from the source Service Catalogue
PDFs' "What's included" sections and cross-checked against `comps`/`panels`.
Doctor Consultation is still carried by the `doctor` field (summed, shown last).

v1 (v11.3.0) derived the components heuristically from `comps`/`panels`; v2
makes them data.

## Idea

Every package is built from a fixed set of **components**. In the Sale Assistant,
when package(s) are selected, show the client the components they will go through
to utilise the package — a client-facing **Journey** (the physical steps they
take). The section may be called "Components" or "Journey".

## The components (8)

1. Blood Collection
2. Swab
3. Doctor Consultation
4. BCA (Body Composition Analysis)
5. ECG
6. Gut Kit
7. Vital Signs
8. Questionnaire

Each package is a **combination** of these. Components are distinct from
markers/modules (the specific biomarkers / DNA modules a package's tests yield).

## Behaviour

- Selecting package(s) in the Sale Assistant renders the client Journey: the
  components the client will go through, in order.
- **Order:** Blood Collection → Swab → BCA → ECG → Gut Kit → Questionnaire →
  Vital Signs → **Doctor Consultation (always last)**.
- Multiple packages selected → aggregate their components, showing **repeats
  with a count** rather than deduping: e.g. if two selected packages both
  include BCA, the Journey shows `BCA × 2`. (Applies to the repeatable physical
  steps — BCA, ECG, Blood Collection, Swab, Gut Kit, Vital Signs, Questionnaire.)
- **Doctor Consultation time is the SUM of every selected package's consultation
  time**, shown as one final step. Example: a 1 hr package + a 15 min package →
  `Doctor Consultation — 1 hr 15 min`. Consultation is always last.
  (Consultation durations come from each service's `doctor` field, e.g.
  "30 min + 15 min"; parse and total these into minutes, then format.)
- **Data-driven:** the Journey is derived from each package's declared
  components. When a package's components change later, the Journey reflects it
  automatically — the journey is never hardcoded separately from the package
  data (single source of truth).

## Marker search → packages — ALREADY IMPLEMENTED

Searching a particular marker already lists the packages that include it: the
Sale Assistant catalogue search (`searchServices` in `lib/catalogueUtils.ts`)
matches each query word against a package's name, sub-label, category, **and its
marker names**, so e.g. "vitamin d" filters to packages containing that marker.
No rebuild needed. The marker DB (later) would only make this canonical/exact
(exact marker names rather than substring), if we decide that's worth it.

## Prerequisites (in order)

1. Create a **marker / module database** (canonical list of markers and modules). *(Build later.)*
2. **Confirm the markers/modules in each package** against that DB.

Reconcile with the existing `lib/catalogue.json` (panels → test ids, `tests`
dictionary, and `comps` groups such as "BCA / ECG", "Microbiome", "DNA Modules",
"Doctor & Vital Signs") rather than duplicating that data.

Swab and Questionnaire are counted like every other component — if two DNA
packages are selected the journey shows `Swab × 2` / `Questionnaire × 2` (not
deduped).

## Open questions

- Whether each of the 8 components maps cleanly from existing `catalogue.json`
  data or must be declared per package (the marker/module + components DB).
