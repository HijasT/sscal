import type { Metadata } from 'next'
import './globals.css'
import { DEFAULT_THEME } from '@/lib/config'

// Applied before first paint. The stylesheet defaults to the dark palette and
// the light theme is a `body.light-mode` override, so without this a light-theme
// user (the default) sees the page flash dark until React hydrates. Mirrors the
// logic in app/page.tsx: saved preference, else DEFAULT_THEME.
const themeScript = `try{var t=localStorage.getItem('sic_theme')||'${DEFAULT_THEME}';if(t==='light')document.body.classList.add('light-mode')}catch(e){if('${DEFAULT_THEME}'==='light')document.body.classList.add('light-mode')}`

export const metadata: Metadata = {
  title: 'Kleon',
  description: 'Kleon - Track sales performance, incentives, and achievements',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
  },
  // Deterrents against AI scraping / dataset collection. These are hints that
  // only compliant crawlers honour — they cannot stop a browser (or a human
  // pointing an AI tool at the URL) from reading a publicly served page. The
  // source is private and proprietary (see LICENSE).
  other: {
    robots: 'noai, noimageai',
    'ai-content-declaration': 'no-training, no-replication',
    copyright: 'HT (Keep Alive Project) — All rights reserved',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      {/* suppressHydrationWarning: the script above adds a class React didn't render */}
      <body suppressHydrationWarning>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {children}
      </body>
    </html>
  )
}
