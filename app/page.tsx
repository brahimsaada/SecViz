import type { Metadata } from 'next'
import { defaultLocale } from '@/i18n/config'

/*
 * The root sends you to a locale.
 *
 * This is a rendered page rather than a `redirect()` call because the
 * static export has no server to issue a 302. The target is relative, so
 * it resolves correctly whether the site is served from the domain root
 * or from a sub-path such as /SecViz on GitHub Pages.
 */
const target = `${defaultLocale}/`

export const metadata: Metadata = {
  title: 'SecViz',
  robots: { index: false },
}

export default function Root() {
  return (
    <html lang={defaultLocale} data-theme="dark">
      <head>
        <meta httpEquiv="refresh" content={`0; url=${target}`} />
        <link rel="canonical" href={target} />
      </head>
      <body
        style={{
          background: '#0b1020',
          color: '#afc4f2',
          fontFamily: 'ui-monospace, monospace',
          padding: '3rem',
        }}
      >
        {/* Shown only if the refresh does not fire. */}
        <p>
          <a href={target} style={{ color: '#14d1e5' }}>
            Continue to SecViz
          </a>
        </p>
        <script
          dangerouslySetInnerHTML={{
            __html: `location.replace(new URL(${JSON.stringify(target)}, location.href))`,
          }}
        />
      </body>
    </html>
  )
}
