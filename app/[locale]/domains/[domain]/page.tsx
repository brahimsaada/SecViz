import { notFound } from 'next/navigation'
import { isLocale, localeCodes, type Locale } from '@/i18n/config'
import { getDictionary } from '@/i18n/dictionary'
import { fill } from '@/i18n/fill'
import { DomainMap } from '@/components/map/DomainMap'
import { domainBySlug, domains } from '@/content/domains'
import { domainMap, domainStats } from '@/content/registry'

export function generateStaticParams() {
  return localeCodes.flatMap((locale) => domains.map((d) => ({ locale, domain: d.slug })))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ domain: string }>
}) {
  const { domain } = await params
  const d = domainBySlug.get(domain)
  return { title: d?.title ?? 'Domain' }
}

export default async function DomainPage({
  params,
}: {
  params: Promise<{ locale: string; domain: string }>
}) {
  const { locale, domain } = await params
  if (!isLocale(locale)) notFound()
  const d = domainBySlug.get(domain)
  if (!d) notFound()

  const dict = await getDictionary(locale as Locale)
  const nodes = domainMap(d)
  const stats = domainStats(d)

  return (
    <div className="mx-auto max-w-shell px-4 py-10">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-[12px] tabular-nums text-ink-muted">
          {String(d.n).padStart(2, '0')}
        </span>
        <h1 className="text-[22px] font-bold tracking-tight text-ink-strong">{d.title}</h1>
        <span className="text-[12px] text-ink-muted">{d.tagline}</span>
        <span className="ms-auto text-[11px] tabular-nums text-ink-muted">
          {fill(dict.lesson.writtenCount, { written: stats.written, total: stats.total })}
        </span>
      </div>
      <p className="prose-sans mt-3 max-w-read text-ink-soft">{d.description}</p>

      <div className="mt-8">
        <DomainMap locale={locale as Locale} nodes={nodes} dict={dict} />
      </div>
    </div>
  )
}
