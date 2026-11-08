import Link from 'next/link'
import clsx from 'clsx'
import type { Locale } from '@/i18n/config'
import type { Dictionary } from '@/i18n/dictionary'
import { LevelTag } from '@/components/ui/primitives'
import { domainTitle } from '@/content/domains'
import type { MapNode } from '@/content/registry'
import { fill } from '@/i18n/fill'

/**
 * The domain map. Lessons are laid out in columns by dependency depth, so
 * the path through the domain is visible rather than implied by a list
 * order. Written lessons are links; planned ones are dimmed but still
 * placed, so a learner can see where a topic will sit.
 *
 * The layout is computed from the `after` edges, not authored, so adding a
 * lesson to a domain re-flows the map with no further work.
 */
export function DomainMap({
  locale,
  nodes,
  dict,
}: {
  locale: Locale
  nodes: MapNode[]
  dict: Dictionary
}) {
  const depth = computeDepth(nodes)
  const columns = groupByDepth(nodes, depth)

  if (nodes.length === 0) {
    return <p className="text-[12px] text-ink-muted">{dict.lesson.noneYet}</p>
  }

  return (
    <div>
      {/*
        Columns scroll horizontally on a narrow screen rather than reflowing,
        because the column position is the information.
      */}
      <div className="-mx-4 overflow-x-auto px-4 pb-2">
        <ol className="flex min-w-max items-start gap-0">
          {columns.map((col, ci) => (
            <li key={ci} className="flex items-start">
              <div className="flex w-[220px] flex-col gap-2">
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-[10px] tabular-nums text-ink-muted">
                    {String(ci + 1).padStart(2, '0')}
                  </span>
                  <span aria-hidden="true" className="h-[1px] flex-1 bg-line-soft" />
                </div>
                {col.map((n) => (
                  <MapCard key={n.slug} node={n} locale={locale} dict={dict} />
                ))}
              </div>
              {ci < columns.length - 1 ? (
                <span
                  aria-hidden="true"
                  className="mt-12 h-[1px] w-6 shrink-0"
                  style={{ background: 'var(--line-mid)' }}
                />
              ) : null}
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}

function MapCard({
  node,
  locale,
  dict,
}: {
  node: MapNode
  locale: Locale
  dict: Dictionary
}) {
  const live = Boolean(node.lesson)
  const elsewhere = node.canonicalIn

  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <span
          className={clsx(
            'text-[12.5px] font-semibold leading-snug',
            live ? 'text-ink-strong group-hover:text-accent' : 'text-ink-muted',
          )}
        >
          {node.title}
        </span>
        {live ? null : (
          <span aria-hidden="true" className="mt-0.5 shrink-0 text-[9px] text-ink-muted/60">
            ○
          </span>
        )}
      </div>
      {node.lesson ? (
        <p className="mt-1 text-[10.5px] leading-snug text-ink-muted">{node.lesson.tagline}</p>
      ) : (
        <p className="mt-1 text-[10.5px] text-ink-muted/70">{dict.lesson.planned}</p>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1">
        <LevelTag level={node.level} label={dict.lesson[node.level]} />
        {node.lesson ? (
          <span className="text-[9.5px] text-ink-muted">
            {fill(dict.lesson.minutes, { n: node.lesson.minutes })}
          </span>
        ) : null}
        {elsewhere ? (
          <span className="text-[9.5px] text-ink-muted">
            {dict.lesson.alsoIn} {domainTitle(elsewhere)}
          </span>
        ) : null}
      </div>
    </>
  )

  const shell = clsx(
    'group block border p-2.5 transition-colors',
    live
      ? 'border-line-mid bg-panel hover:border-accent'
      : 'border-dashed border-line-soft bg-transparent',
  )

  return live ? (
    <Link href={`/${locale}/lessons/${node.slug}`} className={shell}>
      {body}
    </Link>
  ) : (
    <div className={shell} title={dict.lesson.plannedNote}>
      {body}
    </div>
  )
}

/**
 * Longest-path depth over the `after` edges. Cycles cannot happen in valid
 * content (the validator rejects an `after` that is not in the domain), but
 * the visited set keeps a bad edge from hanging the render anyway.
 */
function computeDepth(nodes: MapNode[]): Map<string, number> {
  const bySlug = new Map(nodes.map((n) => [n.slug, n]))
  const memo = new Map<string, number>()

  const walk = (slug: string, seen: Set<string>): number => {
    if (memo.has(slug)) return memo.get(slug)!
    if (seen.has(slug)) return 0
    const node = bySlug.get(slug)
    if (!node?.after?.length) {
      memo.set(slug, 0)
      return 0
    }
    seen.add(slug)
    const d = 1 + Math.max(...node.after.map((a) => walk(a, seen)))
    seen.delete(slug)
    memo.set(slug, d)
    return d
  }

  for (const n of nodes) walk(n.slug, new Set())
  return memo
}

function groupByDepth(nodes: MapNode[], depth: Map<string, number>): MapNode[][] {
  const max = Math.max(0, ...nodes.map((n) => depth.get(n.slug) ?? 0))
  const cols: MapNode[][] = Array.from({ length: max + 1 }, () => [])
  for (const n of nodes) cols[depth.get(n.slug) ?? 0].push(n)
  return cols.filter((c) => c.length > 0)
}
