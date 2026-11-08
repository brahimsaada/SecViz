'use client'

import { useMemo } from 'react'
import clsx from 'clsx'
import type { Artifact, DecodedField } from '@/lib/schema'
import { Eyebrow, intentVar } from '@/components/ui/primitives'
import { usePlayer } from '@/player/store'
import { fill } from '@/i18n/fill'
import type { Dictionary } from '@/i18n/dictionary'

/**
 * The decode panel. This is the signature interaction carried over from the
 * reference: the artifact on the wire taken apart field by field, with a
 * hex grid wired to the field list by byte offset.
 *
 * It is a panel, never a modal, so inspecting a field does not interrupt
 * the animation.
 */
export function DecodePanel({ artifact, dict }: { artifact?: Artifact; dict: Dictionary }) {
  // The empty case is split out so the panel below can use hooks freely.
  if (!artifact) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-[12px] text-ink-muted">
        {dict.player.noArtifact}
      </div>
    )
  }
  return <Decoded artifact={artifact} dict={dict} />
}

function Decoded({ artifact, dict }: { artifact: Artifact; dict: Dictionary }) {
  const selected = usePlayer((s) => s.selectedField)
  const select = usePlayer((s) => s.selectField)

  const bytes = useMemo(() => parseHex(artifact.hex), [artifact.hex])
  const field = selected !== null ? artifact.fields[selected] : undefined

  /** byte index -> field index, so hovering either side lights the other. */
  const owner = useMemo(() => {
    const map = new Map<number, number>()
    artifact.fields.forEach((f, i) => {
      if (f.offset === undefined) return
      for (let b = f.offset; b < f.offset + (f.length ?? 1); b++) map.set(b, i)
    })
    return map
  }, [artifact.fields])

  const groups = useMemo(() => groupFields(artifact.fields), [artifact.fields])

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-line-soft px-3 py-2">
        <div dir="auto" className="text-[12px] font-semibold text-ink-strong">{artifact.label}</div>
        {artifact.sub ? (
          <div dir="auto" className="mt-0.5 text-[11px] text-ink-muted">{artifact.sub}</div>
        ) : null}
      </div>

      {bytes.length > 0 ? (
        <div className="shrink-0 border-b border-line-soft p-3">
          <Eyebrow className="mb-2">{dict.player.bytes}</Eyebrow>
          <HexGrid
            bytes={bytes}
            owner={owner}
            fields={artifact.fields}
            selected={selected}
            onSelect={select}
          />
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="px-3 pb-2 pt-3">
          <Eyebrow>{dict.player.decode}</Eyebrow>
          <p className="mt-1 text-[10.5px] leading-snug text-ink-muted">{dict.player.fieldHint}</p>
        </div>
        {groups.map((g) => (
          <div key={g.name ?? '_'}>
            {g.name ? (
              <div className="border-y border-line-soft bg-raised px-3 py-1">
                <Eyebrow>{g.name}</Eyebrow>
              </div>
            ) : null}
            <ul>
              {g.items.map(({ field: f, index: i }) => (
                <FieldRow
                  key={`${f.name}-${i}`}
                  field={f}
                  on={selected === i}
                  onSelect={() => select(selected === i ? null : i)}
                  dict={dict}
                />
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/*
        The note for the selected field is pinned at the bottom rather than
        shown as a tooltip, so it is reachable by keyboard and stays put
        while the learner reads it.
      */}
      {field ? (
        <div
          className="shrink-0 border-t-2 bg-raised px-3 py-2"
          style={{ borderTopColor: intentVar[field.intent ?? 'signal'] }}
        >
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[11px] font-semibold text-ink-strong">{field.name}</span>
            {field.offset !== undefined ? (
              <span className="shrink-0 text-[10px] text-ink-muted">
                {fill(dict.player.offsetFmt, {
                  offset: field.offset,
                  length: field.length ?? 1,
                })}
              </span>
            ) : null}
          </div>
          <p dir="auto" className="mt-1 text-[12px] leading-snug text-ink">{field.note}</p>
        </div>
      ) : null}
    </div>
  )
}

function FieldRow({
  field,
  on,
  onSelect,
  dict,
}: {
  field: DecodedField
  on: boolean
  onSelect: () => void
  dict: Dictionary
}) {
  const color = intentVar[field.intent ?? 'signal']
  // A long value gets its own line. Side by side it would either crowd the
  // field name or force both to wrap mid-word.
  const stacked = field.value.length > 24 || field.name.length > 22

  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        onMouseEnter={onSelect}
        onFocus={onSelect}
        aria-expanded={on}
        className={clsx(
          'w-full border-b border-line-soft px-3 py-1.5 text-start transition-colors duration-100',
          on ? 'bg-raised' : 'hover:bg-raised',
        )}
      >
        <div className={clsx('flex gap-2', stacked ? 'flex-col' : 'items-baseline')}>
          <span className="flex min-w-0 items-baseline gap-2">
            {/* A connector tick from the field to its label, in the reference's manner. */}
            <span
              aria-hidden="true"
              className="h-[1px] w-2 shrink-0 self-center"
              style={{ background: on ? color : 'var(--line-mid)' }}
            />
            <span dir="auto" className="min-w-0 flex-1 text-[11px] text-ink-soft">{field.name}</span>
          </span>
          <span
            className={clsx(
              'break-all text-[11.5px] font-semibold',
              stacked ? 'ps-4 text-start' : 'ms-auto max-w-[55%] text-end',
            )}
            style={{ color: on ? color : 'var(--ink-strong)' }}
            dir="ltr"
          >
            {field.value}
          </span>
        </div>
        {field.offset !== undefined ? (
          <div className="ps-4 text-[9.5px] text-ink-muted">
            {fill(dict.player.offsetFmt, { offset: field.offset, length: field.length ?? 1 })}
          </div>
        ) : null}
      </button>
    </li>
  )
}

function HexGrid({
  bytes,
  owner,
  fields,
  selected,
  onSelect,
}: {
  bytes: number[]
  owner: Map<number, number>
  fields: DecodedField[]
  selected: number | null
  onSelect: (i: number | null) => void
}) {
  const perRow = 8
  const rows = Math.ceil(bytes.length / perRow)
  return (
    <div className="space-y-0.5 text-[11px]" dir="ltr">
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="flex items-center gap-2">
          <span className="w-8 shrink-0 select-none text-end text-[10px] text-ink-muted">
            {(r * perRow).toString(16).padStart(4, '0')}
          </span>
          <div className="flex gap-[3px]">
            {Array.from({ length: perRow }, (_, c) => {
              const idx = r * perRow + c
              if (idx >= bytes.length) return <span key={c} className="w-[19px]" />
              const fi = owner.get(idx)
              const f = fi !== undefined ? fields[fi] : undefined
              const on = fi !== undefined && fi === selected
              const color = f ? intentVar[f.intent ?? 'signal'] : 'var(--line-mid)'
              return (
                <button
                  key={c}
                  type="button"
                  tabIndex={-1}
                  onMouseEnter={() => fi !== undefined && onSelect(fi)}
                  onClick={() => onSelect(fi ?? null)}
                  title={f?.name}
                  aria-label={f ? `${f.name}: ${f.value}` : undefined}
                  className={clsx(
                    'w-[19px] border-b-2 text-center tabular-nums transition-colors duration-100',
                    on ? 'bg-raised' : '',
                  )}
                  style={{
                    borderBottomColor: f ? color : 'transparent',
                    color: on ? color : 'var(--ink-soft)',
                    opacity: f ? 1 : 0.4,
                  }}
                >
                  {bytes[idx].toString(16).padStart(2, '0')}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

function parseHex(hex?: string): number[] {
  if (!hex) return []
  const clean = hex.replace(/[^0-9a-fA-F]/g, '')
  const out: number[] = []
  for (let i = 0; i + 1 < clean.length; i += 2) out.push(parseInt(clean.slice(i, i + 2), 16))
  return out
}

function groupFields(fields: DecodedField[]) {
  const out: { name?: string; items: { field: DecodedField; index: number }[] }[] = []
  fields.forEach((field, index) => {
    const last = out[out.length - 1]
    if (last && last.name === field.group) last.items.push({ field, index })
    else out.push({ name: field.group, items: [{ field, index }] })
  })
  return out
}
