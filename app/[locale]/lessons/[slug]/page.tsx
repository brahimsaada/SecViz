import Link from 'next/link'
import { notFound } from 'next/navigation'
import { dirOf, isLocale, localeCodes, type Locale } from '@/i18n/config'
import { getDictionary } from '@/i18n/dictionary'
import { fill } from '@/i18n/fill'
import { Challenge } from '@/components/challenges/Challenge'
import { ScenarioPlayer } from '@/components/player/ScenarioPlayer'
import { Eyebrow, LevelTag } from '@/components/ui/primitives'
import { domainBySlug } from '@/content/domains'
import { domainsFor, getLesson, isWritten, lessons } from '@/content/registry'

export function generateStaticParams() {
  return localeCodes.flatMap((locale) => lessons.map((l) => ({ locale, slug: l.slug })))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const lesson = getLesson(slug)
  if (!lesson) return { title: 'Lesson' }
  return { title: lesson.title, description: lesson.tagline }
}

export default async function LessonPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}) {
  const { locale, slug } = await params
  if (!isLocale(locale)) notFound()
  const lesson = getLesson(slug)
  if (!lesson) notFound()

  const dict = await getDictionary(locale as Locale)
  const dir = dirOf(locale as Locale)
  const base = `/${locale}`
  const inDomains = domainsFor(lesson)

  /** Only links lessons that exist; planned ones are shown as plain text. */
  const crossLink = (s: string) => {
    const l = getLesson(s)
    const title = l?.title ?? s.replace(/-/g, ' ')
    return isWritten(s) ? (
      <Link key={s} href={`${base}/lessons/${s}`} className="text-accent hover:underline">
        {title}
      </Link>
    ) : (
      <span key={s} className="text-ink-muted/70" title={dict.lesson.plannedNote}>
        {title} ○
      </span>
    )
  }

  return (
    <div className="mx-auto max-w-shell px-4 py-8">
      <nav className="mb-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-ink-muted">
        <Link href={`${base}/domains`} className="hover:text-accent">
          {dict.nav.domains}
        </Link>
        {inDomains.map((d) => (
          <span key={d.slug} className="flex items-center gap-2">
            <span aria-hidden="true">/</span>
            <Link href={`${base}/domains/${d.slug}`} className="hover:text-accent">
              {d.title}
            </Link>
          </span>
        ))}
      </nav>

      <header className="mb-5">
        <h1 className="text-[clamp(1.3rem,3vw,1.75rem)] font-bold leading-tight tracking-tight text-ink-strong">
          {lesson.title}
        </h1>
        <p className="mt-1 text-[13px] text-ink-soft">{lesson.tagline}</p>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <LevelTag level={lesson.level} label={dict.lesson[lesson.level]} />
          <span className="text-[11px] text-ink-muted">
            {fill(dict.lesson.minutes, { n: lesson.minutes })}
          </span>
          {lesson.overview.full ? (
            <span className="text-[11px] text-ink-muted">{lesson.overview.full}</span>
          ) : null}
          {lesson.attack?.length ? (
            <span className="text-[11px] text-ink-muted">
              {dict.lesson.attack} {lesson.attack.join(', ')}
            </span>
          ) : null}
        </div>
      </header>

      <ScenarioPlayer lesson={lesson} dict={dict} dir={dir} />

      {lesson.challenge ? (
        <div className="mt-6">
          <Challenge data={lesson.challenge} dict={dict} />
        </div>
      ) : null}

      <section className="mt-8 grid gap-6 border-t border-line-soft pt-6 sm:grid-cols-3">
        {lesson.prerequisites?.length ? (
          <div>
            <Eyebrow>{dict.lesson.prerequisites}</Eyebrow>
            <ul className="mt-2 space-y-1 text-[12px]">
              {lesson.prerequisites.map((s) => (
                <li key={s}>{crossLink(s)}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {lesson.related?.length ? (
          <div>
            <Eyebrow>{dict.lesson.related}</Eyebrow>
            <ul className="mt-2 space-y-1 text-[12px]">
              {lesson.related.map((s) => (
                <li key={s}>{crossLink(s)}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="space-y-5">
          {lesson.detectionCounterpart ? (
            <div>
              <Eyebrow>{dict.lesson.detectionCounterpart}</Eyebrow>
              <p className="mt-2 text-[12px]">{crossLink(lesson.detectionCounterpart)}</p>
            </div>
          ) : null}
          {lesson.alsoIn?.length ? (
            <div>
              <Eyebrow>{dict.lesson.alsoIn}</Eyebrow>
              <ul className="mt-2 space-y-1 text-[12px]">
                {lesson.alsoIn.map((d) => (
                  <li key={d}>
                    <Link href={`${base}/domains/${d}`} className="text-accent hover:underline">
                      {domainBySlug.get(d)?.title ?? d}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  )
}
