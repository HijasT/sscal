# Design mockups

Static mockups of every visible tab, with the same content as the app, drawn in the
direction documented in `DESIGN.md` ("The Clinic Counter") and corrected for the
critique and audit findings. They are **not part of the app**: Next.js does not serve
this folder, nothing imports it, and it is not deployed.

| Page | Mirrors |
|---|---|
| `index.html` | Launcher |
| `bulk.html` | Bulk (upload, view selectors, results, tier ladder, center stats, staff table, exports) |
| `individual.html` | Individual |
| `sale-assistant.html` | Sale Assistant (Men/Women, Package Ladder, search, filters, full catalogue) |
| `settings.html` | Settings (tiers, staff center allocation, preferences) |
| `about.html` | About |

## Viewing

Open any page directly, or serve the folder (any static server works, for example
`npx serve mockups`). The theme toggle (top right) switches light and dark and is
remembered per browser. Pages are responsive down to phone width.

## What changed from the app (and why)

- **No gradients, no emoji.** The violet is one flat, theme-aware fill. The app's
  `--brand-gradient` resolves once at `:root`, so in light mode it renders the dark
  theme's pale violets (white text on it is 3.3:1).
- **Contrast and targets measured, not assumed:** 0 failures across 951 text
  elements in both themes (the original had 8 of 30 token pairs failing); every
  control has a 44px target (chips and the switch get a 44px hit area around a
  smaller look).
- **Visible keyboard focus** (`:focus-visible`), `aria-pressed`/`aria-expanded`/
  `aria-current` where state exists, real headings for categories, input borders at
  3:1.
- **Sale Assistant:** the suggestion and what it adds sit together, suggestion first on
  phones; discounts are revealed on demand; whole packages show "Add", partial ones
  say "N more … markers" (no `+` with two meanings); "Details" is quieter than "Add";
  catalogue rows no longer repeat the category eyebrow; the bare catalogue "X" marks
  are omitted; "Replace" is stated plainly with an undo promise.
- **Bulk results** use compact lists and real tables instead of ten identical stat
  cards; header units move into column titles.
- **Fonts are bundled** (`assets/fonts`, IBM Plex Sans and JetBrains Mono, both
  SIL OFL) so no request leaves the device, and the theme is set before first paint
  (no dark flash).
- New tokens: `--control-border` (interactive edges), `--series-b` (second data
  series, so P1/P2 never depend on hue alone).

## Content carried over unchanged (known inaccuracies)

These are copied verbatim from the app so the mockups match it; they are worth fixing
in the app itself:

- About says "Built with Next.js 15, React 19"; `package.json` has Next 14.2 and
  React 18.
- Settings says defaults restore "Orange · Blue · Purple · Green", but the default
  tiers are blue, purple and green.
- The About disclaimer still refers to "Smart Salem".

## Sample data

All names, codes and figures are invented (`Staff A`, `AE09-001` …) and computed with
the app's own formulas, so the numbers are internally consistent. Catalogue content
comes from `lib/catalogue.json`.
