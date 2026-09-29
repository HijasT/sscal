/**
 * scripts/fetch-catalogue.mjs — Re-sync the bundled sales catalogue.
 *
 * The Sale Assistant tab reads a STATIC snapshot at lib/catalogue.json so the
 * app makes no runtime network calls (preserving the "100% local · no data
 * shared" guarantee). This script regenerates that snapshot from the upstream
 * catalogue page. Run it manually whenever packages/prices change:
 *
 *     node scripts/fetch-catalogue.mjs
 *
 * It fetches the upstream single-page catalogue (all data is embedded inline as
 * `const DATA={...}` and `const PRICES={...}`), extracts those two literals,
 * merges price into each service, and writes lib/catalogue.json.
 *
 * No dependencies — plain Node 18+ (global fetch). Nothing here runs in the app.
 */

import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const SOURCE_URL =
  'https://smartsalemmktgassets.blob.core.windows.net/catalogue/catalogue.html'

const OUT_PATH = join(dirname(fileURLToPath(import.meta.url)), '..', 'lib', 'catalogue.json')

/**
 * Pull a `const NAME={...};` object literal out of the page source.
 * DATA sits on a single line; PRICES spans several lines and closes with `};`
 * on its own line — so we scan line-by-line rather than rely on line numbers,
 * which keeps this working if the upstream page reflows.
 */
function extractConst(source, name) {
  const lines = source.split(/\r?\n/)
  const startIdx = lines.findIndex((l) => l.trimStart().startsWith(`const ${name}=`))
  if (startIdx === -1) throw new Error(`Could not find "const ${name}=" in source`)

  const first = lines[startIdx]
  // Single-line literal (e.g. DATA): the whole assignment is on one line.
  if (/;\s*$/.test(first) && first.includes('=')) {
    return JSON.parse(first.replace(new RegExp(`^\\s*const ${name}=`), '').replace(/;\s*$/, ''))
  }

  // Multi-line literal (e.g. PRICES): collect until a line that is just `};`.
  const collected = [first]
  for (let i = startIdx + 1; i < lines.length; i++) {
    collected.push(lines[i])
    if (/^\s*};\s*$/.test(lines[i])) break
  }
  const body = collected
    .join('\n')
    .replace(new RegExp(`^\\s*const ${name}=`), '')
    .replace(/;\s*$/, '')
    .replace(/,(\s*})/g, '$1') // tolerate a trailing comma before the closing brace
  return JSON.parse(body)
}

async function main() {
  process.stdout.write(`Fetching ${SOURCE_URL} ...\n`)
  const res = await fetch(SOURCE_URL)
  if (!res.ok) throw new Error(`Fetch failed: HTTP ${res.status}`)
  const html = await res.text()

  const DATA = extractConst(html, 'DATA')
  const PRICES = extractConst(html, 'PRICES')

  const services = DATA.services.map((s, i) => ({
    id: i,
    category: s.category,
    sub: s.sub,
    name: s.name,
    price: PRICES[s.name] ?? null,
    currency: 'AED',
    biomarkers: s.count,
    doctor: s.doctor || null,
    panels: s.panels,
    comps: s.comps,
  }))

  const missing = services.filter((s) => s.price == null).map((s) => s.name)
  if (missing.length) {
    process.stderr.write(`Warning: ${missing.length} service(s) have no price: ${missing.join(', ')}\n`)
  }

  const bundle = {
    meta: {
      source: SOURCE_URL,
      fetchedAt: new Date().toISOString().slice(0, 10),
      currency: 'AED',
      serviceCount: services.length,
    },
    services,
    panels: DATA.panels,
    tests: DATA.tests,
  }

  writeFileSync(OUT_PATH, JSON.stringify(bundle, null, 1) + '\n')
  process.stdout.write(
    `Wrote ${OUT_PATH}\n  ${services.length} services · ` +
      `${Object.keys(DATA.panels).length} panels · ${Object.keys(DATA.tests).length} tests\n`
  )
}

main().catch((err) => {
  process.stderr.write(`\nError: ${err.message}\n`)
  process.exit(1)
})
