/** @type {import('next').NextConfig} */

// Security headers applied to every route. The app loads nothing from third
// parties (fonts are self-hosted, no analytics, no external scripts) and must
// never send data out, so `connect-src 'self'` is the key guarantee against
// exfiltration. `script-src`/`style-src` keep 'unsafe-inline' because the app
// relies on Next's inline bootstrap scripts and the no-flash theme script, and
// the statically prerendered pages can't carry a per-request nonce.
const ContentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ')

const securityHeaders = [
  { key: 'Content-Security-Policy', value: ContentSecurityPolicy },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'no-referrer' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
]

const nextConfig = {
  reactStrictMode: true,
  swcMinify: true, // Use SWC for faster minification
  compress: true, // Enable gzip compression

  // Production optimizations
  poweredByHeader: false, // Remove X-Powered-By header

  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }]
  },
}

module.exports = nextConfig
