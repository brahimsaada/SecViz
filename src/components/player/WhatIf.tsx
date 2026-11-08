'use client'

import type { Branch } from '@/lib/schema'
import { Button, Eyebrow } from '@/components/ui/primitives'
import { usePlayer } from '@/player/store'
import type { Dictionary } from '@/i18n/dictionary'

/**
 * The what-if control. Taking a branch rewrites the rest of the timeline,
 * so the learner sees the consequence play out rather than reading about it.
 */
export function WhatIf({
  branches,
  atIndex,
  dict,
}: {
  branches?: Branch[]
  atIndex: number
  dict: Dictionary
}) {
  const onBranch = usePlayer((s) => s.branch !== null)
  const take = usePlayer((s) => s.takeBranch)
  const clear = usePlayer((s) => s.clearBranch)

  if (onBranch) {
    return (
      <div className="flex items-center gap-3 border-t border-line-soft bg-raised px-3 py-2">
        <span
          aria-hidden="true"
          className="text-[11px]"
          style={{ color: 'var(--anomalous)' }}
        >
          !
        </span>
        <span className="text-[11px] text-ink-soft">{dict.player.onBranch}</span>
        <Button onClick={clear} className="ms-auto">
          {dict.player.whatIfBack}
        </Button>
      </div>
    )
  }

  if (!branches?.length) return null

  return (
    <div className="border-t border-line-soft bg-raised px-3 py-2">
      <Eyebrow className="mb-1.5">{dict.player.whatIf}</Eyebrow>
      <div className="flex flex-col gap-1.5">
        {branches.map((b) => (
          <button
            key={b.id}
            type="button"
            onClick={() => take(atIndex, b)}
            className="group border border-line-mid px-2.5 py-1.5 text-start transition-colors hover:border-accent"
          >
            <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-strong group-hover:text-accent">
              {b.label}
            </div>
            <div className="mt-0.5 text-[10.5px] leading-snug text-ink-muted">{b.note}</div>
          </button>
        ))}
      </div>
    </div>
  )
}
