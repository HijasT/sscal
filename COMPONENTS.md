# Components / Journey — feature spec

Status: **planned, not yet built.** This document is the agreed spec; keep it in
sync as the feature evolves.

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
- **Doctor Consultation is always the last step.** All other components come
  before it (exact order among the rest: TBD).
- Multiple packages selected → the client goes through the **union** of their
  components (deduplicated), with consultation last.
- **Data-driven:** the Journey is derived from each package's declared
  components. When a package's components change later, the Journey reflects it
  automatically — the journey is never hardcoded separately from the package
  data (single source of truth).

## Marker search → packages

Searching for a particular **marker** should list the **packages that include
that marker**. (A word-based marker search already exists in the catalogue via
`searchServices` in `lib/catalogueUtils.ts`, which matches marker names; the
marker DB will make this canonical/exact and drive a dedicated marker → packages
lookup.)

## Prerequisites (in order)

1. Create a **marker / module database** (canonical list of markers and modules). *(Build later.)*
2. **Confirm the markers/modules in each package** against that DB.

Reconcile with the existing `lib/catalogue.json` (panels → test ids, `tests`
dictionary, and `comps` groups such as "BCA / ECG", "Microbiome", "DNA Modules",
"Doctor & Vital Signs") rather than duplicating that data.

## Open questions

- Order of the non-consultation components (e.g. does Vital Signs precede Blood
  Collection?).
- Whether each of the 8 components maps cleanly from existing `catalogue.json`
  data or must be declared per package.
