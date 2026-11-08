'use client'

import { useEffect, useState } from 'react'

/**
 * Light and dark. The value is written to localStorage and read by the
 * inline script in the layout, so a reload does not flash the other theme.
 */
export function ThemeToggle({ label }: { label: string }) {
  const [dark, setDark] = useState(true)

  useEffect(() => {
    setDark(document.documentElement.dataset.theme !== 'light')
  }, [])

  const apply = (next: boolean) => {
    setDark(next)
    document.documentElement.dataset.theme = next ? 'dark' : 'light'
    try {
      localStorage.setItem('secviz:theme', next ? 'dark' : 'light')
    } catch {
      // A browser with storage blocked still gets the theme for this page.
    }
  }

  return (
    <button
      type="button"
      onClick={() => apply(!dark)}
      aria-label={label}
      aria-pressed={!dark}
      className="border border-line-mid px-2 py-1 text-[11px] text-ink-soft transition-colors hover:border-accent hover:text-accent"
    >
      <span aria-hidden="true">{dark ? '◐' : '◑'}</span>
    </button>
  )
}
