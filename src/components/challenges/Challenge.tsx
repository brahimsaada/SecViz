'use client'

import { useState } from 'react'
import clsx from 'clsx'
import type { Challenge as ChallengeData } from '@/lib/schema'
import { Button, Eyebrow } from '@/components/ui/primitives'
import type { Dictionary } from '@/i18n/dictionary'

/**
 * End-of-lesson challenges. Each kind is a small reusable component, so a
 * lesson picks one by naming its `kind` and supplying the data.
 *
 * All three share one behaviour: the learner commits to an answer, then
 * sees why every option is right or wrong. Nothing is scored or stored.
 */
export function Challenge({ data, dict }: { data: ChallengeData; dict: Dictionary }) {
  return (
    <section className="border border-line-mid bg-panel">
      <header className="border-b border-line-soft px-4 py-2">
        <Eyebrow>{dict.challenge.title}</Eyebrow>
      </header>
      <div className="p-4">
        <p className="mb-3 text-[13px] text-ink-strong">{data.prompt}</p>
        {data.kind === 'log-picker' ? (
          <Picker
            options={data.lines.map((l) => ({ label: l.text, correct: l.correct, why: l.why }))}
            dict={dict}
            mono
          />
        ) : data.kind === 'toggle' ? (
          <Picker options={data.options} dict={dict} />
        ) : (
          <RulePicker data={data} dict={dict} />
        )}
      </div>
    </section>
  )
}

type Option = { label: string; correct?: boolean; why: string }

function Picker({
  options,
  dict,
  mono,
}: {
  options: Option[]
  dict: Dictionary
  mono?: boolean
}) {
  const [pick, setPick] = useState<number | null>(null)
  const [checked, setChecked] = useState(false)
  const right = pick !== null && options[pick].correct === true

  return (
    <>
      <ul className="space-y-1">
        {options.map((o, i) => {
          const shown = checked && (i === pick || o.correct)
          const good = o.correct === true
          return (
            <li key={i}>
              <button
                type="button"
                onClick={() => {
                  setPick(i)
                  setChecked(false)
                }}
                aria-pressed={pick === i}
                className={clsx(
                  'flex w-full items-start gap-2.5 border px-2.5 py-1.5 text-start transition-colors',
                  pick === i ? 'border-accent' : 'border-line-soft hover:border-line-mid',
                )}
              >
                <span
                  aria-hidden="true"
                  className="mt-[3px] shrink-0 text-[11px]"
                  style={{
                    color: shown
                      ? good
                        ? 'var(--defender)'
                        : 'var(--attacker)'
                      : 'var(--line)',
                  }}
                >
                  {shown ? (good ? '◆' : '✕') : '○'}
                </span>
                <span
                  className={clsx(
                    'min-w-0 flex-1 break-words text-[11.5px] leading-snug',
                    mono && 'font-mono',
                  )}
                  dir={mono ? 'ltr' : undefined}
                >
                  {o.label}
                </span>
              </button>
              {shown ? (
                <p className="ps-7 pt-1 text-[11px] leading-snug text-ink-muted">{o.why}</p>
              ) : null}
            </li>
          )
        })}
      </ul>

      <div className="mt-3 flex items-center gap-3">
        <Button onClick={() => setChecked(true)} disabled={pick === null} active={!checked && pick !== null}>
          {dict.challenge.check}
        </Button>
        {checked ? (
          <span
            className="text-[11.5px] font-semibold"
            style={{ color: right ? 'var(--defender)' : 'var(--attacker)' }}
          >
            <span aria-hidden="true">{right ? '◆ ' : '✕ '}</span>
            {right ? dict.challenge.correct : dict.challenge.incorrect}
          </span>
        ) : (
          <span className="text-[11px] text-ink-muted">{dict.challenge.pickOne}</span>
        )}
      </div>
    </>
  )
}

/**
 * The rule editor: the learner fills the blank in a detection rule, then
 * watches which sample lines it would match.
 */
function RulePicker({
  data,
  dict,
}: {
  data: Extract<ChallengeData, { kind: 'rule' }>
  dict: Dictionary
}) {
  const [pick, setPick] = useState<number | null>(null)
  const [checked, setChecked] = useState(false)
  const chosen = pick !== null ? data.options[pick] : null
  const right = chosen?.correct === true

  return (
    <>
      <pre className="mb-3 overflow-x-auto border border-line-soft bg-raised p-2.5 text-[11.5px] leading-relaxed text-ink-strong" dir="ltr">
        {data.template.split('___').map((part, i, arr) => (
          <span key={i}>
            {part}
            {i < arr.length - 1 ? (
              <span
                className="border-b-2 px-1 font-semibold"
                style={{
                  borderBottomColor: 'var(--accent)',
                  color: chosen ? 'var(--accent)' : 'var(--ink-muted)',
                }}
              >
                {chosen ? chosen.label : '___'}
              </span>
            ) : null}
          </span>
        ))}
      </pre>

      <div className="mb-3 flex flex-wrap gap-1.5">
        {data.options.map((o, i) => (
          <Button
            key={i}
            onClick={() => {
              setPick(i)
              setChecked(false)
            }}
            active={pick === i}
          >
            {o.label}
          </Button>
        ))}
      </div>

      {data.sample?.length ? (
        <div className="mb-3">
          <Eyebrow className="mb-1">{dict.player.telemetry}</Eyebrow>
          <ul className="divide-y divide-line-soft border border-line-soft">
            {data.sample.map((line, i) => (
              <li key={i} className="px-2 py-1 text-[11px] text-ink-soft" dir="ltr">
                {line}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="flex items-center gap-3">
        <Button onClick={() => setChecked(true)} disabled={pick === null} active={!checked && pick !== null}>
          {dict.challenge.check}
        </Button>
        {checked && chosen ? (
          <span
            className="text-[11.5px] font-semibold"
            style={{ color: right ? 'var(--defender)' : 'var(--attacker)' }}
          >
            <span aria-hidden="true">{right ? '◆ ' : '✕ '}</span>
            {right ? dict.challenge.correct : dict.challenge.incorrect}
          </span>
        ) : null}
      </div>
      {checked && chosen ? (
        <p className="mt-2 text-[11px] leading-snug text-ink-muted">{chosen.why}</p>
      ) : null}
    </>
  )
}
