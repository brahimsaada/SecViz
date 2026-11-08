import clsx from 'clsx'
import type { ReactNode } from 'react'
import type { Intent, Level } from '@/lib/schema'

/** Panel heading. Small caps with a hairline under it, as on the reference. */
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={clsx('eyebrow', className)}>{children}</div>
}

export function Panel({
  title,
  aside,
  children,
  className,
  bodyClassName,
}: {
  title?: ReactNode
  aside?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
}) {
  return (
    <section
      className={clsx('flex min-h-0 flex-col border border-line-mid bg-panel', className)}
    >
      {title ? (
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-line-soft px-3 py-2">
          <Eyebrow>{title}</Eyebrow>
          {aside}
        </header>
      ) : null}
      <div className={clsx('min-h-0 flex-1', bodyClassName)}>{children}</div>
    </section>
  )
}

/**
 * The two-column fact table. It carries a lot of the information density,
 * so it stays tight: label muted, value in full ink.
 */
export function FactTable({ facts }: { facts: [string, string][] }) {
  return (
    <dl className="divide-y divide-line-soft">
      {facts.map(([label, value]) => (
        <div key={label} className="flex gap-3 py-1.5 text-[12px] leading-snug">
          <dt dir="auto" className="w-[38%] shrink-0 text-ink-muted">{label}</dt>
          <dd dir="auto" className="min-w-0 flex-1 break-words text-ink-strong">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

/* ---------------------------------------------------------------------------
 * Intent is never carried by colour alone. Every intent has a glyph, so the
 * meaning survives greyscale, colour blindness and a printed page.
 * ------------------------------------------------------------------------- */

export const intentGlyph: Record<Intent, string> = {
  inert: '·',
  attacker: '▲',
  defender: '◆',
  anomalous: '!',
  signal: '›',
}

export const intentVar: Record<Intent, string> = {
  inert: 'var(--inert)',
  attacker: 'var(--attacker)',
  defender: 'var(--defender)',
  anomalous: 'var(--anomalous)',
  signal: 'var(--accent)',
}

export function IntentTag({ intent, label }: { intent: Intent; label: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 border px-1.5 py-0.5 text-[10px] uppercase tracking-wider"
      style={{ color: intentVar[intent], borderColor: intentVar[intent] }}
    >
      <span aria-hidden="true">{intentGlyph[intent]}</span>
      {label}
    </span>
  )
}

export function LevelTag({ level, label }: { level: Level; label: string }) {
  // Level is structural, not semantic, so it uses ink weight rather than
  // one of the four reserved colours.
  const bars = level === 'foundations' ? 1 : level === 'intermediate' ? 2 : 3
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-ink-muted">
      <span aria-hidden="true" className="flex items-end gap-[2px]">
        {[1, 2, 3].map((i) => (
          <span
            key={i}
            className={clsx('w-[3px]', i <= bars ? 'bg-accent' : 'bg-line-mid')}
            style={{ height: `${3 + i * 2}px` }}
          />
        ))}
      </span>
      {label}
    </span>
  )
}

export function Button({
  children,
  onClick,
  active,
  label,
  className,
  disabled,
  wide,
}: {
  children: ReactNode
  onClick?: () => void
  active?: boolean
  label?: string
  className?: string
  disabled?: boolean
  wide?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      className={clsx(
        'border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider transition-colors duration-150',
        wide && 'min-w-[72px]',
        disabled && 'cursor-not-allowed opacity-40',
        active
          ? 'border-accent bg-accent text-bg'
          : 'border-line-mid text-ink-soft hover:border-accent hover:text-accent',
        className,
      )}
    >
      {children}
    </button>
  )
}
