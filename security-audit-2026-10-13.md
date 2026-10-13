# Security audit — Kleon

**Date:** 2026-10-13 · **Commit:** 2d4f079 · **Mode:** audit (vibe-guard, full skill)
**Scope:** `app/`, `components/`, `lib/`, `next.config.js`, `package.json`, lockfile, git history · **Method:** static review + tools (vibe-guard `scan.sh`, npm audit, semgrep `p/js`+`p/react`+`p/nextjs`, depcheck, manual git-history grep). gitleaks not installed — substituted a manual history sweep.
**Assumptions:** user away; inferred from code. No production URL provided, so live-deployment checks were not run.

## Stack
Next.js 14.2.35 (App Router, client-only) · **no** database/auth/payments/AI · hosting: Vercel · CI: none.

## Summary
A pure client-side app with **no server entry points, no backend, and zero network calls** — structurally immune to most of the vibe-guard threat model (RLS, auth, IDOR, payments, webhooks, SSRF, prompt injection all N/A). The one real item is build-time dependency CVEs under `next`; there is no shipped exploit path. Single most important action: plan a deliberate `next` upgrade.

**Score:** 90/100 — Excellent
**Findings:** 2 verified (0 Critical, 0 High, 1 Medium, 1 Low) · **Checks run:** 50/50 considered (≈34 not applicable — no server/DB/auth/payments/AI/mobile/CI)

## ⚠️ Do this now
Nothing urgent. No exposed secret, no exploitable path. (The earlier High-severity items this session — abandoned `xlsx`, CSV formula injection, missing headers — are already fixed and deployed; see "Fixed this session".)

## Quick wins (< 10 min)
| # | Fix | Severity | Where |
|---|-----|----------|-------|
| 1 | Validate numeric Excel cells instead of defaulting to `0` | Low | `lib/excelUtils.ts:282` |

## Medium
### M1. `package-lock.json` — build-time dependency CVEs (S36)
**Attacker:** none reachable at runtime — these run only during `next build` on the developer/CI machine.
**Impact:** `npm audit --omit=dev` reports 1 critical + 3 high, all transitive **under `next@14.2.35`** (`postcss` path-traversal/ReDoS, `nanoid` loop, `source-map-js` DoS). They are build-time tools (CSS compile, build IDs, sourcemaps), not part of the shipped static bundle. With no middleware, API routes, image optimizer, or SSR in this app, the usual `next` *runtime* CVE classes (CVE-2025-29927 middleware bypass, image SSRF, cache poisoning) also don't apply. Real risk is supply-chain hygiene, not a live exploit.
**Evidence:** `next@14.2.35` → `postcss@8.4.31` → `nanoid@3.3.12`, `source-map-js@1.2.1`.
**Fix:** deliberate major upgrade with a build + smoke test — `npm audit fix --force` pulls `next@16` (breaking). Do not run it blindly.
```diff
- "next": "14.2.35"
+ "next": "<latest 14.2.x or a tested 15/16 after smoke-testing the build>"
```

## Low / Info
- **L1.** `lib/excelUtils.ts:282` — a non-numeric sales cell is coerced to `0` (`parseFloat(cell.w ?? '0') || 0`), which can silently skew a total. Data-integrity (pay-accuracy), not an attacker vector. Fix: validate numeric columns and surface an error instead of defaulting.
- **I1.** `lib/storage.ts` — uploaded data + results live in `localStorage` (`sic_bulk_upload`/`sic_bulk_results`). By design: local-only, 1-hour auto-expiry (`DataExpiryTimer`), "Keep data" toggle. Acceptable for the shared-PC model; a manual "Clear now" button would be a nice-to-have.
- **I2.** Live-deployment checks (headers in prod, `/.git/HEAD`, served `.map`) not run — no URL. Smoke-test the new CSP on a Vercel preview before promoting.

## Passed
- **C1/C2 secrets** — no `process.env`, no `NEXT_PUBLIC_*`, no hardcoded keys; `scan.sh` secret-shape + service_role sweep clean; full git-history grep clean (only "design token"/`js-tokens` noise). `.env*` gitignored, none tracked.
- **C3 entry points** — none exist: no `'use server'`, no `route.ts`, no `pages/api`, no middleware.
- **C5 XSS** — only sink is the no-flash theme script built from a compile-time constant (rejected lead); all cell data renders through React (auto-escaped).
- **C15/P42 source exposure** — `productionBrowserSourceMaps` unset (off by default).
- **S19 open redirect** — no `location`/`router.push`/`window.open` fed by user input.
- **S34 prototype pollution** — SheetJS 0.20.3 (the prototype-pollution-prone `xlsx` 0.18.5 was replaced this session).
- **P41 headers / S38 CSP** — full set added this session in `next.config.js` (CSP with `connect-src 'self'`, HSTS, XFO, nosniff, Referrer-Policy, Permissions-Policy).
- **Network** — zero `fetch`/`axios`/`XHR`/`sendBeacon`/`WebSocket`; data cannot leave the browser.
- Semgrep (74 rules) and depcheck both clean.

## Not applicable
C6 IDOR, C7 CORS, C8 database/RLS, C9 client price, C10 JWT, C11 uploads (client-side parse only, no server storage), C12 SSRF, C13 privileged client key, C14 Docker — no backend/DB/containers.
S16 CSRF, S17 rate limiting, S23 password storage, S24 sessions, S25 GraphQL, S26/S27 AI, S28 webhooks, S29/S30 mobile, S31 OAuth, S32 realtime, S33 race conditions — no server, auth, or AI.
P43–P50 — no debug routes, accounts, backups, email, or CI.

## Not reviewed / limits
Production deployment (no URL): live response headers, `.git` exposure, served source maps, Vercel preview-env isolation. This is a static code + config review, not a penetration test.

## Rejected leads
- `app/layout.tsx:44` `dangerouslySetInnerHTML` (scan C5) — `__html` is `themeScript`, a module constant interpolating only `DEFAULT_THEME` (compile-time). No attacker-controlled input reaches it. Not exploitable.
- `lib/catalogueUtils.ts:829` `re.exec(doctor)` (scan C4 "command execution") — `re` is a `RegExp`; this is `RegExp.prototype.exec` on static catalogue text, not `child_process.exec`. Scanner regex false match.

## Fixed this session (verified, deployed)
`xlsx` 0.18.5 → SheetJS 0.20.3 (High) · CSV formula injection escaped (High) · security headers added (High) · 20 MB upload cap (Medium) · `jspdf` 2.5.2 → 4.2.1, vulnerable `dompurify` dropped (Medium) · 21-test calculation suite (biz-critical).

## Fix plan
1. **(Medium)** Plan the `next` major upgrade with a build/smoke test — this week.
2. **(Low)** Validate numeric Excel cells instead of defaulting to `0`.
3. **(Info)** Verify CSP on a Vercel preview; optionally add a manual "Clear data now" control.
