'use client'

import { useEffect } from 'react'
import clsx from 'clsx'
import type { Lesson, Perspective } from '@/lib/schema'
import { Button, Eyebrow, FactTable, IntentTag } from '@/components/ui/primitives'
import { usePlayerClock, usePlayerKeys, useReducedMotionSync } from '@/player/clock'
import { useActiveSteps, usePlayer } from '@/player/store'
import type { Dictionary } from '@/i18n/dictionary'
import { DecodePanel } from './DecodePanel'
import { Stage } from './Stage'
import { TelemetryPanel } from './TelemetryPanel'
import { Timeline } from './Timeline'
import { WhatIf } from './WhatIf'

/**
 * The Scenario Player. Every lesson in the platform is this one component
 * plus data: the stage, the decode panel, the telemetry panel and the
 * transport all read a single timeline, so they cannot disagree about which
 * moment is on screen.
 */
export function ScenarioPlayer({
  lesson,
  dict,
  dir,
}: {
  lesson: Lesson
  dict: Dictionary
  dir: 'ltr' | 'rtl'
}) {
  const load = usePlayer((s) => s.load)
  const phase = usePlayer((s) => s.phase)
  const index = usePlayer((s) => s.index)
  const perspective = usePlayer((s) => s.perspective)
  const setPerspective = usePlayer((s) => s.setPerspective)
  const steps = useActiveSteps()
  const loaded = usePlayer((s) => s.lesson?.slug === lesson.slug)

  useEffect(() => {
    load(lesson, window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  }, [lesson, load])

  useReducedMotionSync()
  usePlayerClock()
  usePlayerKeys(dir)

  // Until the store holds this lesson, render the intro from props alone:
  // that keeps the server and first client paint identical.
  const step = loaded && phase === 'steps' ? steps[index] : null
  const showActor = perspective !== 'defender'
  const showDefender = perspective !== 'actor'

  return (
    <div className="border border-line-mid bg-bg" id="player">
      <header className="flex flex-wrap items-center gap-3 border-b border-line-mid px-3 py-2">
        <div className="min-w-0 flex-1">
          <div dir="auto" className="truncate text-[12px] font-semibold text-ink-strong">
            {phase === 'intro'
              ? dict.player.overview
              : phase === 'outro'
                ? lesson.outro.title
                : `${index + 1}. ${step?.title ?? ''}`}
          </div>
          <div dir="auto" className="truncate text-[11px] text-ink-muted">
            {phase === 'intro'
              ? lesson.tagline
              : phase === 'outro'
                ? lesson.outro.desc
                : (step?.desc ?? '')}
          </div>
        </div>

        <div className="flex items-center gap-1" role="group" aria-label={dict.player.perspective}>
          <span className="me-1 hidden text-[10px] uppercase tracking-wider text-ink-muted sm:inline">
            {dict.player.perspective}
          </span>
          {(['actor', 'both', 'defender'] as Perspective[]).map((p) => (
            <Button key={p} onClick={() => setPerspective(p)} active={perspective === p}>
              {dict.player[p]}
            </Button>
          ))}
        </div>
      </header>

      <div className="grid lg:grid-cols-[1fr_332px]">
        <div className="flex min-w-0 flex-col border-line-mid lg:border-e">
          <div
            className={clsx(
              'hairline-grid relative min-h-[300px] bg-bg',
              'h-[clamp(300px,42vh,460px)]',
            )}
          >
            <Stage lesson={lesson} dir={dir} />
          </div>

          {/* The legend sits in its own strip so it can never cover a node. */}
          {lesson.legend?.length ? (
            <div className="flex flex-wrap items-center gap-1.5 border-t border-line-soft px-3 py-1.5">
              <Eyebrow className="me-1">{dict.player.legend}</Eyebrow>
              {lesson.legend.map(([intent, label]) => (
                <IntentTag key={intent + label} intent={intent} label={label} />
              ))}
            </div>
          ) : null}

          <Timeline dict={dict} />
          <WhatIf branches={step?.branches} atIndex={index} dict={dict} />

          {/* Actor narrative and the step's fact table. */}
          {showActor ? (
            <div className="border-t border-line-mid p-3">
              <Eyebrow className="mb-1.5">{dict.player.stepDetails}</Eyebrow>
              <p dir="auto" className="prose-sans max-w-read text-ink">
                {phase === 'intro'
                  ? lesson.overview.description
                  : phase === 'outro'
                    ? lesson.outro.text
                    : (step?.detail ?? '')}
              </p>
              {(() => {
                const facts =
                  phase === 'intro'
                    ? lesson.overview.facts
                    : phase === 'outro'
                      ? lesson.outro.facts
                      : step?.facts
                return facts?.length ? (
                  <div className="mt-3 max-w-read border-t border-line-soft">
                    <FactTable facts={facts} />
                  </div>
                ) : null
              })()}
            </div>
          ) : null}
        </div>

        {/* The inspection column: wire on top, defender below. Both persist. */}
        <aside className="flex min-h-0 flex-col divide-y divide-line-mid border-t border-line-mid lg:border-t-0">
          <div className="min-h-[260px] lg:h-[clamp(300px,42vh,460px)]">
            <DecodePanel artifact={step?.artifact} dict={dict} />
          </div>
          {showDefender ? (
            <div className="flex min-h-[180px] flex-col lg:max-h-[380px]">
              <header className="flex shrink-0 items-center justify-between border-b border-line-soft px-3 py-2">
                <Eyebrow>{dict.player.telemetry}</Eyebrow>
                <span className="text-[9.5px] uppercase tracking-wider text-ink-muted">
                  {dict.player.defender}
                </span>
              </header>
              <div className="min-h-0 flex-1">
                <TelemetryPanel events={step?.telemetry} dict={dict} />
              </div>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  )
}
