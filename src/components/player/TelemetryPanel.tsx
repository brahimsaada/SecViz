'use client'

import clsx from 'clsx'
import type { LogEvent } from '@/lib/schema'
import type { Dictionary } from '@/i18n/dictionary'

/**
 * The defender view: what the current step leaves behind in the logs. This
 * panel is the platform's differentiator, so it sits beside the wire view
 * rather than on a separate tab.
 */
const sevStyle: Record<LogEvent['severity'], { color: string; mark: string }> = {
  info: { color: 'var(--inert)', mark: '·' },
  notice: { color: 'var(--accent)', mark: '›' },
  warning: { color: 'var(--anomalous)', mark: '!' },
  alert: { color: 'var(--attacker)', mark: '▲' },
}

export function TelemetryPanel({
  events,
  dict,
}: {
  events?: LogEvent[]
  dict: Dictionary
}) {
  if (!events || events.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-5 text-center text-[12px] text-ink-muted">
        {dict.player.noTelemetry}
      </div>
    )
  }

  return (
    <ul className="h-full divide-y divide-line-soft overflow-y-auto">
      {events.map((e, i) => {
        const sev = sevStyle[e.severity]
        return (
          <li
            key={i}
            className={clsx('px-3 py-2', e.suspicious && 'bg-raised')}
            style={e.suspicious ? { boxShadow: `inset 2px 0 0 ${sev.color}` } : undefined}
          >
            <div className="flex items-baseline gap-2">
              <span aria-hidden="true" className="shrink-0 text-[11px]" style={{ color: sev.color }}>
                {sev.mark}
              </span>
              <span className="shrink-0 text-[10px] uppercase tracking-wider text-ink-muted">
                {e.source}
                {e.code ? <span className="text-ink-soft"> {e.code}</span> : null}
              </span>
              <span
                className="ms-auto shrink-0 text-[9.5px] uppercase tracking-wider"
                style={{ color: sev.color }}
              >
                {dict.severity[e.severity]}
              </span>
            </div>
            <p className="mt-1 break-words text-[11.5px] leading-snug text-ink-strong" dir="ltr">
              {e.message}
            </p>
            {e.fields?.length ? (
              <dl className="mt-1.5 space-y-0.5">
                {e.fields.map((f) => (
                  <div key={f.name} className="flex flex-wrap gap-x-2 text-[10.5px]">
                    <dt className="shrink-0 text-ink-muted">{f.name}</dt>
                    <dd className="min-w-0 break-all text-ink-soft" dir="ltr">
                      {f.value}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : null}
            {e.suspicious ? (
              <div
                className="mt-1.5 inline-flex items-center gap-1 text-[9.5px] uppercase tracking-wider"
                style={{ color: sev.color }}
              >
                <span aria-hidden="true">▲</span>
                {dict.player.suspicious}
              </div>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}
