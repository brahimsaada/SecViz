import Link from 'next/link'
import type { Locale } from '@/i18n/config'
import type { Dictionary } from '@/i18n/dictionary'
import { LocalePicker } from './LocalePicker'
import { ThemeToggle } from './ThemeToggle'

export function SiteHeader({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const base = `/${locale}`
  return (
    <header className="sticky top-0 z-40 border-b border-line-mid bg-bg/95 backdrop-blur">
      <div className="mx-auto flex max-w-shell items-center gap-4 px-4 py-2.5">
        <Link href={base} className="group flex items-baseline gap-2">
          <span className="text-[15px] font-bold tracking-tight text-ink-strong group-hover:text-accent">
            SecViz
          </span>
          <span className="hidden text-[11px] text-ink-muted sm:inline">{dict.tagline}</span>
        </Link>

        <nav className="ms-auto flex items-center gap-1 text-[11px] uppercase tracking-wider">
          <Link
            href={`${base}/domains`}
            className="px-2 py-1 text-ink-soft transition-colors hover:text-accent"
          >
            {dict.nav.domains}
          </Link>
          <Link
            href={`${base}/about`}
            className="px-2 py-1 text-ink-soft transition-colors hover:text-accent"
          >
            {dict.nav.about}
          </Link>
        </nav>

        <div className="flex items-center gap-1.5">
          <LocalePicker locale={locale} label={dict.nav.language} />
          <ThemeToggle label={dict.nav.theme} />
        </div>
      </div>
    </header>
  )
}
