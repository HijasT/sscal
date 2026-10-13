/*
 * Kleon offline service worker — runtime caching only, no precache manifest.
 *
 * Strategy:
 *   - Navigations (the page HTML): network-first, fall back to the last cached
 *     page when offline. Keeps online users on the latest build automatically.
 *   - Other same-origin GETs (Next's hashed JS/CSS chunks, self-hosted fonts,
 *     icons, manifest, the xlsx/jspdf chunks loaded on first export): cache-first.
 *     Hashed asset URLs are immutable, so a stale cache is harmless — new HTML
 *     references new hashes, which get cached on next online visit.
 *
 * Privacy: only same-origin GET requests are touched; nothing is ever sent out,
 * matching the app's "100% local, no data shared" guarantee and connect-src 'self'.
 *
 * ponytail: single unbounded runtime cache; add per-release cache-busting only
 * if old hashed chunks ever bloat storage (negligible for this tool).
 */
const CACHE = 'kleon-cache'

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    // Network-first: freshest build online, cached page offline.
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put(request, copy))
          return res
        })
        .catch(() => caches.match(request).then((hit) => hit || caches.match('/'))),
    )
    return
  }

  // Cache-first for assets (immutable hashed chunks, fonts, icons).
  event.respondWith(
    caches.match(request).then(
      (hit) =>
        hit ||
        fetch(request).then((res) => {
          if (res.ok && res.type === 'basic') {
            const copy = res.clone()
            caches.open(CACHE).then((c) => c.put(request, copy))
          }
          return res
        }),
    ),
  )
})
