import Link from 'next/link'
import { notFound } from 'next/navigation'
import { isLocale, type Locale } from '@/i18n/config'
import { getDictionary } from '@/i18n/dictionary'
import { fill } from '@/i18n/fill'
import { Eyebrow } from '@/components/ui/primitives'
import { domains, domainStats, flagshipSlug, lessons } from '@/content/registry'

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const dict = await getDictionary(locale as Locale)
  const base = `/${locale}`

  const views = [
    { key: 'actor', title: dict.home.actorTitle, body: dict.home.actorBody, color: 'var(--attacker)', mark: '▲' },
    { key: 'wire', title: dict.home.wireTitle, body: dict.home.wireBody, color: 'var(--accent)', mark: '›' },
    { key: 'defender', title: dict.home.defenderTitle, body: dict.home.defenderBody, color: 'var(--defender)', mark: '◆' },
  ]

  return (
    <div className="mx-auto max-w-shell px-4">
      <section className="border-b border-line-soft py-14">
        <h1 className="max-w-read text-[clamp(1.6rem,4.5vw,2.5rem)] font-bold leading-[1.15] tracking-tight text-ink-strong">
          {dict.tagline}
        </h1>
        <p className="prose-sans mt-4 max-w-read text-ink-soft">{dict.home.lead}</p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Link
            href={`${base}/lessons/${flagshipSlug}`}
            className="border border-accent bg-accent px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-bg transition-opacity hover:opacity-85"
          >
            {dict.home.startFlagship}
          </Link>
          <Link
            href={`${base}/domains`}
            className="border border-line-mid px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-soft transition-colors hover:border-accent hover:text-accent"
          >
            {dict.home.browse}
          </Link>
        </div>
      </section>

      <section className="border-b border-line-soft py-12">
        <Eyebrow>{dict.home.promiseTitle}</Eyebrow>
        <div className="mt-4 grid gap-px bg-line-soft sm:grid-cols-3">
          {views.map((v) => (
            <div key={v.key} className="bg-bg p-4">
              <div className="flex items-center gap-2">
                <span aria-hidden="true" className="text-[13px]" style={{ color: v.color }}>
                  {v.mark}
                </span>
                <h2 className="text-[13px] font-semibold text-ink-strong">{v.title}</h2>
              </div>
              <p className="prose-sans mt-2 text-[13.5px] text-ink-soft">{v.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-b border-line-soft py-12">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <Eyebrow>{dict.home.domainsTitle}</Eyebrow>
          <span className="text-[11px] text-ink-muted">
            {fill(dict.lesson.writtenCount, {
              written: lessons.length,
              total: new Set(domains.flatMap((d) => d.entries.map((e) => e.slug))).size,
            })}
          </span>
        </div>
        <p className="prose-sans mt-2 max-w-read text-ink-soft">{dict.home.domainsLead}</p>

        <ul className="mt-6 grid gap-px bg-line-soft md:grid-cols-2 lg:grid-cols-3">
          {domains.map((d) => {
            const s = domainStats(d)
            return (
              <li key={d.slug} className="bg-bg">
                <Link
                  href={`${base}/domains/${d.slug}`}
                  className="group block h-full p-4 transition-colors hover:bg-panel"
                >
                  <div className="flex items-baseline gap-2">
                    <span className="text-[11px] tabular-nums text-ink-muted">
                      {String(d.n).padStart(2, '0')}
                    </span>
                    <h3 className="text-[13px] font-semibold text-ink-strong group-hover:text-accent">
                      {d.title}
                    </h3>
                  </div>
                  <p className="mt-1 text-[11.5px] text-ink-muted">{d.tagline}</p>
                  <div className="mt-3 flex items-center gap-2">
                    {/* A bar rather than a number: the shape of the gap reads faster. */}
                    <span
                      aria-hidden="true"
                      className="h-[3px] flex-1 bg-line-soft"
                      style={{
                        backgroundImage: `linear-gradient(90deg, var(--accent) ${(s.written / s.total) * 100}%, transparent ${(s.written / s.total) * 100}%)`,
                      }}
                    />
                    <span className="shrink-0 text-[10px] tabular-nums text-ink-muted">
                      {s.written}/{s.total}
                    </span>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      </section>

      <section className="py-12">
        <div className="max-w-read border-s-2 ps-4" style={{ borderInlineStartColor: 'var(--inert)' }}>
          <Eyebrow>{dict.home.safetyTitle}</Eyebrow>
          <p className="prose-sans mt-2 text-ink-soft">{dict.home.safetyBody}</p>
          <Link
            href={`${base}/about`}
            className="mt-3 inline-block text-[11px] uppercase tracking-wider text-accent hover:underline"
          >
            {dict.home.readAbout} →
          </Link>
        </div>
      </section>
    </div>
  )
}
