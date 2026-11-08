import Link from 'next/link'
import { notFound } from 'next/navigation'
import { isLocale, type Locale } from '@/i18n/config'
import { getDictionary } from '@/i18n/dictionary'
import { fill } from '@/i18n/fill'
import { LevelTag } from '@/components/ui/primitives'
import { domainStats, domains, isWritten } from '@/content/registry'

export const metadata = { title: 'Domains' }

export default async function Domains({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const dict = await getDictionary(locale as Locale)
  const base = `/${locale}`

  return (
    <div className="mx-auto max-w-shell px-4 py-10">
      <h1 className="text-[22px] font-bold tracking-tight text-ink-strong">{dict.nav.domains}</h1>
      <p className="prose-sans mt-2 max-w-read text-ink-soft">{dict.home.domainsLead}</p>

      <ul className="mt-8 divide-y divide-line-soft border-y border-line-soft">
        {domains.map((d) => {
          const s = domainStats(d)
          return (
            <li key={d.slug} className="py-5">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="text-[12px] tabular-nums text-ink-muted">
                  {String(d.n).padStart(2, '0')}
                </span>
                <h2 className="text-[15px] font-semibold text-ink-strong">
                  <Link href={`${base}/domains/${d.slug}`} className="hover:text-accent">
                    {d.title}
                  </Link>
                </h2>
                <span className="text-[11px] text-ink-muted">{d.tagline}</span>
                <span className="ms-auto text-[11px] tabular-nums text-ink-muted">
                  {fill(dict.lesson.writtenCount, { written: s.written, total: s.total })}
                </span>
              </div>
              <p className="prose-sans mt-2 max-w-read text-[13.5px] text-ink-soft">
                {d.description}
              </p>
              <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
                {d.entries.map((e) => {
                  const live = isWritten(e.slug)
                  return (
                    <li key={e.slug} className="flex items-center gap-1.5">
                      {live ? (
                        <Link
                          href={`${base}/lessons/${e.slug}`}
                          className="text-[11.5px] text-accent hover:underline"
                        >
                          {e.title}
                        </Link>
                      ) : (
                        <span className="text-[11.5px] text-ink-muted/70" title={dict.lesson.plannedNote}>
                          {e.title}
                        </span>
                      )}
                      {live ? null : (
                        <span aria-hidden="true" className="text-[9px] text-ink-muted/60">
                          ○
                        </span>
                      )}
                    </li>
                  )
                })}
              </ul>
            </li>
          )
        })}
      </ul>

      <p className="mt-4 flex items-center gap-1.5 text-[11px] text-ink-muted">
        <span aria-hidden="true">○</span>
        {dict.lesson.plannedNote}
      </p>

      <div className="mt-8 flex flex-wrap gap-4 text-[11px] text-ink-muted">
        <LevelTag level="foundations" label={dict.lesson.foundations} />
        <LevelTag level="intermediate" label={dict.lesson.intermediate} />
        <LevelTag level="advanced" label={dict.lesson.advanced} />
      </div>
    </div>
  )
}
