/**
 * Locales. The reference ships 15; SecViz carries the same list so a
 * learner arriving from there finds their language.
 *
 * `dir` is declared per locale rather than inferred, and the layout sets
 * it on <html>, so right-to-left is a first-class case and not a retrofit.
 */
export const locales = [
  { code: 'en', name: 'English', dir: 'ltr' },
  { code: 'es', name: 'Español', dir: 'ltr' },
  { code: 'pt-BR', name: 'Português', dir: 'ltr' },
  { code: 'fr', name: 'Français', dir: 'ltr' },
  { code: 'de', name: 'Deutsch', dir: 'ltr' },
  { code: 'tr', name: 'Türkçe', dir: 'ltr' },
  { code: 'uk', name: 'Українська', dir: 'ltr' },
  { code: 'id', name: 'Indonesia', dir: 'ltr' },
  { code: 'ja', name: '日本語', dir: 'ltr' },
  { code: 'zh-CN', name: '简体中文', dir: 'ltr' },
  { code: 'zh-TW', name: '繁體中文', dir: 'ltr' },
  { code: 'ko', name: '한국어', dir: 'ltr' },
  { code: 'hi', name: 'हिन्दी', dir: 'ltr' },
  { code: 'ar', name: 'العربية', dir: 'rtl' },
  { code: 'he', name: 'עברית', dir: 'rtl' },
] as const

export type Locale = (typeof locales)[number]['code']

export const localeCodes = locales.map((l) => l.code) as Locale[]
export const defaultLocale: Locale = 'en'

export function isLocale(value: string): value is Locale {
  return (localeCodes as string[]).includes(value)
}

export function dirOf(locale: Locale): 'ltr' | 'rtl' {
  return locales.find((l) => l.code === locale)?.dir ?? 'ltr'
}

export function nameOf(locale: Locale): string {
  return locales.find((l) => l.code === locale)?.name ?? locale
}
