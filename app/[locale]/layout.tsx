import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'
import { dirOf, isLocale, localeCodes, type Locale } from '@/i18n/config'
import { getDictionary } from '@/i18n/dictionary'
import { SiteHeader } from '@/components/shell/SiteHeader'
import { SiteFooter } from '@/components/shell/SiteFooter'

export function generateStaticParams() {
  return localeCodes.map((locale) => ({ locale }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  if (!isLocale(locale)) return {}
  const dict = await getDictionary(locale)
  return {
    title: {
      default: `SecViz · ${dict.tagline}`,
      template: '%s · SecViz',
    },
    description: dict.home.lead,
    applicationName: 'SecViz',
    alternates: {
      canonical: `/${locale}`,
      languages: Object.fromEntries(localeCodes.map((l) => [l, `/${l}`])),
    },
  }
}

/** Sets the theme before the first paint, so the page never flashes. */
const themeScript = `
try {
  var saved = localStorage.getItem('secviz:theme')
  var dark = saved ? saved === 'dark' : !window.matchMedia('(prefers-color-scheme: light)').matches
  document.documentElement.dataset.theme = dark ? 'dark' : 'light'
} catch (e) {
  document.documentElement.dataset.theme = 'dark'
}
`.trim()

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const dict = await getDictionary(locale as Locale)
  const dir = dirOf(locale as Locale)

  return (
    <html lang={locale} dir={dir} data-theme="dark" suppressHydrationWarning>
      <head>
        <meta name="color-scheme" content="dark light" />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-screen flex-col">
        <a
          href="#player"
          className="sr-only focus:not-sr-only focus:absolute focus:start-2 focus:top-2 focus:z-50 focus:border focus:border-accent focus:bg-panel focus:px-3 focus:py-1.5 focus:text-[12px]"
        >
          {dict.nav.skipToPlayer}
        </a>
        <SiteHeader locale={locale as Locale} dict={dict} />
        <main className="flex-1">{children}</main>
        <SiteFooter dict={dict} />
      </body>
    </html>
  )
}
