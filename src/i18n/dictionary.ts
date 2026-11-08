import 'server-only'
import type { Locale } from './config'
import en from './dictionaries/en.json'

export type Dictionary = typeof en

/**
 * Locale files may be partial. Everything merges over English key by key,
 * so a half-translated locale shows translated strings where they exist
 * and English where they do not, instead of blank labels. That lets
 * translations land incrementally without blocking a release.
 */
const loaders: Record<Locale, () => Promise<{ default: unknown }>> = {
  en: () => import('./dictionaries/en.json'),
  es: () => import('./dictionaries/es.json'),
  'pt-BR': () => import('./dictionaries/pt-BR.json'),
  fr: () => import('./dictionaries/fr.json'),
  de: () => import('./dictionaries/de.json'),
  tr: () => import('./dictionaries/tr.json'),
  uk: () => import('./dictionaries/uk.json'),
  id: () => import('./dictionaries/id.json'),
  ja: () => import('./dictionaries/ja.json'),
  'zh-CN': () => import('./dictionaries/zh-CN.json'),
  'zh-TW': () => import('./dictionaries/zh-TW.json'),
  ko: () => import('./dictionaries/ko.json'),
  hi: () => import('./dictionaries/hi.json'),
  ar: () => import('./dictionaries/ar.json'),
  he: () => import('./dictionaries/he.json'),
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function merge<T>(base: T, over: unknown): T {
  if (!isRecord(base) || !isRecord(over)) {
    return (over === undefined || over === '' ? base : (over as T))
  }
  const out: Record<string, unknown> = { ...base }
  for (const key of Object.keys(base)) {
    if (key in over) out[key] = merge((base as Record<string, unknown>)[key], over[key])
  }
  return out as T
}

export async function getDictionary(locale: Locale): Promise<Dictionary> {
  if (locale === 'en') return en
  try {
    const mod = await loaders[locale]()
    return merge(en, mod.default)
  } catch {
    return en
  }
}

/** `t('Step {n} of {total}', { n: 3, total: 9 })` */
export function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m))
}
