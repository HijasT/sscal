# Security & Privacy Policy

_Kleon — incentive calculator & Sale Assistant_

Kleon is a **single-page, client-side-only** web app. It has **no backend, no database, and no server-side code** of its own: everything runs in the browser, and the only persistence is the browser's own storage on the user's device. This document describes what that means for security and privacy, and how to report a vulnerability.

---

## 1. Privacy policy

**The core promise: no data ever leaves your device.** The UI states this permanently ("Everything runs locally in your browser. No data is ever sent out"), and it is enforced in code, not just claimed.

- **No collection.** Kleon does not have a server, account system, or user profiles. It cannot collect what it has no way to receive.
- **No telemetry or analytics.** There is no analytics SDK, no tracking pixel, no error-reporting service, no "phone home". (An earlier Analytics feature was removed in v10.0.0; nothing reads its old key.)
- **No third parties.** No external scripts, no CDN, no web fonts from Google or anyone else — fonts are self-hosted. The heavy libraries (`xlsx` for Excel, `jspdf` for PDF export) are bundled into the app and loaded via dynamic `import()`, never from a network.
- **No cookies for tracking.** The app sets no tracking cookies.
- **What you enter stays with you.** Team sales figures, uploaded Excel workbooks, the individual calculator inputs, and the Sale Assistant selection are processed entirely in your browser and stored only in that browser's local storage.

### What is stored, and for how long

All state lives in the browser's `localStorage` / `sessionStorage` on the device you use. Nothing is uploaded.

**Entered / uploaded data — auto-expires after 1 hour** (deleted automatically 1 hour after it last changed; see `lib/storage.ts`, `DATA_RETENTION_MS` in `lib/config.ts`):

| Key | Store | Contents |
| --- | --- | --- |
| `sic_bulk_upload` | localStorage | the uploaded Excel data |
| `sic_bulk_results` | localStorage | the computed bulk results table |
| `sic_individual_inputs` | sessionStorage | the Individual calculator form |
| `sic_sale_quote` | sessionStorage | the Sale Assistant selection |

A countdown timer in the header shows the time remaining, and the page reloads to clear the data when it reaches zero. Opting into **"Keep data on this device"** (`sic_persist_data`) turns this expiry off so the data stays until you clear it yourself — it still never leaves the device.

**Preferences — kept until you change them** (not expired): theme (`sic_theme`), Kleon robot toggle (`sic_robot_enabled`), incentive tiers (`sic_tiers` + backup), staff-center allocation (`sic_staff_centers` + backup), USD display (`sic_show_usd`, `sic_usd_rate`), and the hide-covered-packages toggle (`sic_hide_covered`).

### Clearing your data

- Use **"Keep data on this device"** = off (the default) and the entered/uploaded data clears itself within an hour.
- Clear the site's storage in your browser (site settings → clear data) to remove everything immediately, including preferences.

---

## 2. Security model

### No server, no server-side attack surface
There is no API, no auth system, no server-side session, and no database to attack. Kleon has **no `.env` file and no secrets, API keys, tokens, or credentials** of its own. There is therefore no server-side data to breach.

### Exfiltration is blocked at the Content-Security-Policy level
Even a bug or a malicious dependency cannot quietly send your data out, because the Content-Security-Policy restricts network connections to the app's own origin. Security headers are applied to every route (`next.config.js`):

| Header | Value | Purpose |
| --- | --- | --- |
| `Content-Security-Policy` | `default-src 'self'`; `script-src 'self' 'unsafe-inline'`; `style-src 'self' 'unsafe-inline'`; `img-src 'self' data: blob:`; `font-src 'self'`; **`connect-src 'self'`**; `object-src 'none'`; `frame-ancestors 'none'`; `base-uri 'self'`; `form-action 'self'` | `connect-src 'self'` is the key guarantee: scripts cannot open connections to any other host, so data cannot be exfiltrated. |
| `X-Frame-Options` | `DENY` | No embedding in frames (clickjacking). |
| `X-Content-Type-Options` | `nosniff` | No MIME sniffing. |
| `Referrer-Policy` | `no-referrer` | No referrer leakage. |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | HTTPS only. |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | No access to camera, mic, or location. |

`X-Powered-By` is removed. `'unsafe-inline'` remains on `script-src`/`style-src` only because the statically prerendered pages rely on Next.js's inline bootstrap and a no-flash theme script and cannot carry a per-request nonce; it does **not** weaken the `connect-src` exfiltration guarantee.

### File handling
Uploaded `.xlsx` files are parsed **in the browser** by the bundled `xlsx` library (`lib/excelUtils.ts`); the file is never uploaded anywhere. PDF export is generated in the browser by `jspdf`. Only open spreadsheet files from sources you trust, as with any spreadsheet tool.

### Dependencies
The runtime dependency surface is deliberately small: `next`, `react`, `react-dom`, `xlsx`, `jspdf`, `jspdf-autotable`. New dependencies are added rarely and reviewed for bundle/maintenance impact; nothing is loaded from a CDN or global script tag.

---

## 3. Residual risks (be aware)

Kleon's design removes network and server risk, but a few things remain the user's responsibility:

- **Shared / public devices.** Local storage is readable by anyone who uses the same browser profile on the same device. On a shared machine, keep **"Keep data on this device"** off (the default) so entered data auto-clears, or clear site data before you leave.
- **Browser-level compromise.** Malware, a malicious browser extension, or someone with access to your unlocked device can read what any site stores locally. Kleon cannot protect against a compromised browser or OS.
- **Not for payroll or official records.** Kleon is a planning/estimation aid. Figures are not authoritative; verify against source systems before acting on them (see the in-app disclaimer).
- **Accuracy of inputs.** Garbage in, garbage out — the app computes from exactly what you enter or upload.

---

## 4. Reporting a vulnerability

If you believe you have found a security or privacy issue, please report it **privately** — do not open a public issue or post details publicly until it has been addressed.

- Preferred: open a **private security advisory** on the repository (GitHub → Security → *Report a vulnerability*), or contact the repository maintainer directly.
- Please include: a description of the issue, steps to reproduce, the affected version (shown in the app header and the About tab), and the potential impact.
- Please do **not** include working exploit payloads or data-extraction scripts in the initial report — describe the class of problem; details can follow once contact is established.

This is a proprietary project maintained by one owner; expect an acknowledgement and a fix on a best-effort basis. Responsible disclosure is appreciated.

### Scope

In scope: anything that would cause Kleon to send user data off the device, execute untrusted code, weaken the security headers, or mishandle locally stored data.

Out of scope: issues that require a already-compromised device/browser, social-engineering of the user, or missing hardening that does not lead to a concrete impact given the no-backend architecture.

### Supported versions

Only the latest version (see `APP_VERSION` in `lib/config.ts`, shown in the header and the About tab) is maintained. Fixes land on `main`.

---

_This policy describes the app as built. If the architecture ever changes (e.g. a backend or account system is added), this document and the in-app privacy notice must be updated in the same change._
