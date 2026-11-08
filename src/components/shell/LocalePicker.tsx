'use client'

import { usePathname, useRouter } from 'next/navigation'
import { localeCodes, locales, type Locale } from '@/i18n/config'

/**
 * Swaps the locale segment of the current path, so changing language keeps
 * you on the lesson you were reading.
 */
export function LocalePicker({ locale, label }: { locale: Locale; label: string }) {
  const router = useRouter()
  const pathname = usePathname() ?? `/${locale}`

  const change = (next: string) => {
    const parts = pathname.split('/')
    // parts[0] is empty, parts[1] is the locale.
    if (localeCodes.includes(parts[1] as Locale)) parts[1] = next
    else parts.splice(1, 0, next)
    router.push(parts.join('/') || `/${next}`)
  }

  return (
    <label className="flex items-center gap-1.5">
      <span className="sr-only">{label}</span>
      <select
        value={locale}
        onChange={(e) => change(e.target.value)}
        aria-label={label}
        className="border border-line-mid bg-panel px-1.5 py-1 text-[11px] text-ink-soft transition-colors hover:border-accent hover:text-accent"
      >
        {locales.map((l) => (
          <option key={l.code} value={l.code}>
            {l.name}
          </option>
        ))}
      </select>
    </label>
  )
}
