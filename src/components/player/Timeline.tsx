'use client'

import clsx from 'clsx'
import { Button } from '@/components/ui/primitives'
import { SPEEDS, useActiveSteps, usePlayer } from '@/player/store'
import { fill } from '@/i18n/fill'
import type { Dictionary } from '@/i18n/dictionary'

/**
 * The transport. Play, pause, step either way, a scrubber, and a speed
 * control. Nothing here plays faster than a person can read: the slowest
 * speed is the lesson's authored pace and 2x is the ceiling.
 */
export function Timeline({ dict }: { dict: Dictionary }) {
  const phase = usePlayer((s) => s.phase)
  const index = usePlayer((s) => s.index)
  const t = usePlayer((s) => s.t)
  const playing = usePlayer((s) => s.playing)
  const speed = usePlayer((s) => s.speed)
  const stepThrough = usePlayer((s) => s.stepThrough)
  const steps = useActiveSteps()
  // Actions never change identity, so reading them off the store directly
  // costs nothing and avoids subscribing to the whole state.
  const p = usePlayer.getState()
  const total = steps.length
  const atEnd = phase === 'outro'

  return (
    <div className="border-t border-line-mid bg-panel">
      <div className="flex flex-wrap items-center gap-2 px-3 py-2">
        <Button
          onClick={p.toggle}
          label={dict.player.playPause}
          active={playing}
          wide
          disabled={stepThrough && !atEnd && phase !== 'intro'}
        >
          {atEnd ? dict.player.replay : playing ? dict.player.pause : dict.player.play}
        </Button>

        <div className="flex gap-1">
          <Button
            onClick={() => {
              p.pause()
              p.prev()
            }}
            label={dict.player.prevStep}
            disabled={phase === 'intro'}
          >
            <span aria-hidden="true">◀</span>
          </Button>
          <Button
            onClick={() => {
              p.pause()
              p.next()
            }}
            label={dict.player.nextStep}
            disabled={atEnd}
          >
            <span aria-hidden="true">▶</span>
          </Button>
        </div>

        <Button onClick={p.reset} label={dict.player.reset}>
          {dict.player.reset}
        </Button>

        <div className="ms-auto flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-wider text-ink-muted">
            {phase === 'intro'
              ? dict.player.intro
              : atEnd
                ? dict.player.outro
                : fill(dict.player.stepOf, { n: index + 1, total })}
          </span>
          <div
            className="flex gap-1"
            role="group"
            aria-label={dict.player.speed}
          >
            {SPEEDS.map((s) => (
              <Button
                key={s}
                onClick={() => p.setSpeed(s)}
                active={speed === s}
                label={`${dict.player.speed}: ${s}x`}
              >
                {s}x
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/*
        The scrubber is a real range input: it is keyboard-operable and
        screen-reader-labelled for free, and we draw the step ticks over it.
      */}
      {/*
        The track is held left-to-right even in RTL locales, because the
        stage animates an artifact left-to-right. A mirrored progress bar
        would run the opposite way to the thing it is measuring.
      */}
      <div className="relative px-3 pb-3" dir="ltr">
        <div className="relative h-7">
          <div className="absolute inset-x-0 top-3 h-[3px] bg-line-soft" />
          <div
            className="absolute top-3 h-[3px] bg-accent"
            style={{
              width: `${
                phase === 'intro' ? 0 : atEnd ? 100 : ((index + Math.min(t, 1)) / total) * 100
              }%`,
              transition: playing ? 'none' : 'width 200ms var(--ease-out)',
            }}
          />
          <div className="absolute inset-x-0 top-0 flex">
            {steps.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  p.pause()
                  p.goTo(i)
                }}
                title={`${i + 1}. ${s.title}`}
                aria-label={`${i + 1}. ${s.title}. ${s.desc}`}
                aria-current={phase === 'steps' && i === index}
                className="group relative h-7"
                style={{ width: `${100 / total}%` }}
              >
                <span
                  className={clsx(
                    'absolute left-0 top-1.5 h-[9px] w-[2px] transition-colors',
                    phase === 'steps' && i === index
                      ? 'bg-accent'
                      : 'bg-line-mid group-hover:bg-accent',
                  )}
                />
                <span dir="auto" className="absolute left-0 top-[19px] max-w-full truncate pr-1 text-[9px] text-ink-muted group-hover:text-accent">
                  {s.title}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {stepThrough ? (
        <p className="border-t border-line-soft px-3 py-1.5 text-[10.5px] text-ink-muted">
          {dict.player.stepThrough}
        </p>
      ) : null}
    </div>
  )
}
