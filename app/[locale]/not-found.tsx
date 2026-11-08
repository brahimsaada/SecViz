import Link from 'next/link'
import { defaultLocale } from '@/i18n/config'
import { getDictionary } from '@/i18n/dictionary'

export default async function NotFound() {
  // A not-found boundary cannot read route params, so it renders in the
  // default locale. The links go back to a page that can pick one up.
  const dict = await getDictionary(defaultLocale)
  return (
    <div className="mx-auto max-w-read px-4 py-20">
      <h1 className="text-[20px] font-bold text-ink-strong">{dict.error.notFound}</h1>
      <p className="prose-sans mt-2 text-ink-soft">{dict.error.notFoundBody}</p>
      <Link
        href={`/${defaultLocale}`}
        className="mt-5 inline-block border border-line-mid px-3 py-1.5 text-[11px] uppercase tracking-wider text-ink-soft hover:border-accent hover:text-accent"
      >
        {dict.error.backHome}
      </Link>
    </div>
  )
}
