import { notFound } from 'next/navigation'
import { isLocale, locales, type Locale } from '@/i18n/config'
import { getDictionary } from '@/i18n/dictionary'
import { Eyebrow } from '@/components/ui/primitives'

export const metadata = { title: 'About' }

export default async function About({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const dict = await getDictionary(locale as Locale)

  const sections = [
    { key: 'intent', title: dict.about.intent, body: dict.about.intentBody },
    { key: 'safety', title: dict.about.safety, body: dict.about.safetyBody, accent: true },
    { key: 'how', title: dict.about.how, body: dict.about.howBody },
    { key: 'access', title: dict.about.access, body: dict.about.accessBody },
    { key: 'credit', title: dict.about.credit, body: dict.about.creditBody },
  ]

  return (
    <div className="mx-auto max-w-shell px-4 py-10">
      <h1 className="text-[22px] font-bold tracking-tight text-ink-strong">{dict.about.title}</h1>

      <div className="mt-8 max-w-read space-y-8">
        {sections.map((s) => (
          <section
            key={s.key}
            className={s.accent ? 'border-s-2 ps-4' : undefined}
            style={s.accent ? { borderInlineStartColor: 'var(--anomalous)' } : undefined}
          >
            <Eyebrow>{s.title}</Eyebrow>
            <p className="prose-sans mt-2 text-ink-soft">{s.body}</p>
          </section>
        ))}

        <section>
          <Eyebrow>{dict.nav.language}</Eyebrow>
          <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11.5px] text-ink-muted">
            {locales.map((l) => (
              <span key={l.code}>
                {l.name}
                {l.dir === 'rtl' ? ' (RTL)' : ''}
              </span>
            ))}
          </p>
        </section>
      </div>
    </div>
  )
}
