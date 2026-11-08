'use client'

import { useMemo } from 'react'
import type { Intent, Lesson, SceneNode, Transit } from '@/lib/schema'
import { intentGlyph, intentVar } from '@/components/ui/primitives'
import { useActiveSteps, usePlayer, useRevealed } from '@/player/store'

const VB = { w: 1000, h: 400 }
const NODE = { w: 142, h: 60 }

/** The role glyph. Shape, not colour, says what a node is. */
const roleMark: Record<SceneNode['role'], string> = {
  client: '▭',
  server: '▤',
  attacker: '▲',
  defender: '◆',
  infra: '◇',
  identity: '◉',
  store: '▣',
}

function pos(node: SceneNode) {
  return { x: (node.x / 100) * VB.w, y: (node.y / 100) * VB.h }
}

/** Smooth in and out. Never bouncy: motion is for following, not delight. */
function ease(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

export function Stage({ lesson, dir }: { lesson: Lesson; dir: 'ltr' | 'rtl' }) {
  // Atomic selectors: one subscription per primitive. An object selector
  // here would hand zustand a new reference every render.
  const index = usePlayer((s) => s.index)
  const t = usePlayer((s) => s.t)
  const phase = usePlayer((s) => s.phase)
  const stepThrough = usePlayer((s) => s.stepThrough)
  const steps = useActiveSteps()
  const revealed = useRevealed()
  const step = phase === 'steps' ? steps[index] : null

  const byId = useMemo(
    () => new Map(lesson.nodes.map((n) => [n.id, n])),
    [lesson.nodes],
  )

  /** Every link any step uses, drawn faintly so the topology is stable. */
  const links = useMemo(() => {
    const seen = new Map<string, [string, string]>()
    const all = [...lesson.steps, ...lesson.steps.flatMap((s) => s.branches?.flatMap((b) => b.steps) ?? [])]
    for (const s of all)
      for (const tr of s.transit ?? []) {
        const key = [tr.from, tr.to].sort().join('~')
        if (!seen.has(key)) seen.set(key, [tr.from, tr.to])
      }
    return [...seen.values()]
  }, [lesson.steps])

  // Centres of every node, so an artifact can be routed clear of all of them.
  const nodePoints = useMemo(() => lesson.nodes.map(pos), [lesson.nodes])

  const highlight = new Set(step?.highlight ?? [])
  const active = new Set((step?.transit ?? []).flatMap((tr) => [tr.from, tr.to]))
  // Step-through parks the artifact mid-path: a still frame that reads clearly.
  const progress = stepThrough ? 0.55 : ease(Math.min(t, 1))

  return (
    <svg
      viewBox={`0 0 ${VB.w} ${VB.h}`}
      className="h-full w-full"
      role="img"
      aria-label={step ? `${step.title}. ${step.desc}` : lesson.overview.description}
      // The diagram keeps its physical left-to-right reading of a wire even
      // in RTL locales; only the text inside the boxes flips.
      direction="ltr"
    >
      <defs>
        <marker id="sv-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="var(--line)" />
        </marker>
      </defs>

      {links.map(([a, b]) => {
        const na = byId.get(a)
        const nb = byId.get(b)
        if (!na || !nb) return null
        const on = revealed.has(a) && revealed.has(b)
        const hot = active.has(a) && active.has(b)
        const pa = pos(na)
        const pb = pos(nb)
        return (
          <line
            key={`${a}~${b}`}
            x1={pa.x}
            y1={pa.y}
            x2={pb.x}
            y2={pb.y}
            stroke={hot ? 'var(--accent)' : 'var(--line-mid)'}
            strokeWidth={hot ? 1.5 : 1}
            opacity={on ? (hot ? 0.9 : 0.5) : 0.12}
            style={{ transition: 'opacity 300ms var(--ease-out), stroke 300ms var(--ease-out)' }}
          />
        )
      })}

      {lesson.nodes.map((n) => (
        <NodeBox
          key={n.id}
          node={n}
          shown={revealed.has(n.id)}
          lit={highlight.has(n.id) || active.has(n.id)}
          dir={dir}
        />
      ))}

      {(step?.transit ?? []).map((tr, i) => {
        const from = byId.get(tr.from)
        const to = byId.get(tr.to)
        if (!from || !to) return null
        return (
          <TransitBox
            key={`${step?.id}-${i}`}
            transit={tr}
            from={pos(from)}
            to={pos(to)}
            nodes={nodePoints}
            progress={progress}
            dir={dir}
          />
        )
      })}
    </svg>
  )
}

function NodeBox({
  node,
  shown,
  lit,
  dir,
}: {
  node: SceneNode
  shown: boolean
  lit: boolean
  dir: 'ltr' | 'rtl'
}) {
  const { x, y } = pos(node)
  const color =
    node.role === 'attacker'
      ? 'var(--attacker)'
      : node.role === 'defender'
        ? 'var(--defender)'
        : lit
          ? 'var(--accent)'
          : 'var(--line)'

  return (
    <g
      opacity={shown ? 1 : 0.14}
      style={{ transition: 'opacity 400ms var(--ease-out)' }}
      aria-hidden="true"
    >
      <rect
        x={x - NODE.w / 2}
        y={y - NODE.h / 2}
        width={NODE.w}
        height={NODE.h}
        fill="var(--panel)"
        stroke={color}
        strokeWidth={lit ? 1.6 : 1}
        style={{ transition: 'stroke 300ms var(--ease-out), stroke-width 300ms var(--ease-out)' }}
      />
      {/* A corner tick marks an active node without relying on the stroke colour. */}
      {lit ? (
        <path
          d={`M${x - NODE.w / 2} ${y - NODE.h / 2 + 10} L${x - NODE.w / 2} ${y - NODE.h / 2} L${x - NODE.w / 2 + 10} ${y - NODE.h / 2}`}
          fill="none"
          stroke={color}
          strokeWidth={2.5}
        />
      ) : null}
      <text
        x={x}
        y={y - 6}
        textAnchor="middle"
        fill="var(--ink-strong)"
        fontSize="13"
        fontWeight="600"
        fontFamily="var(--font-mono)"
        direction={dir}
      >
        <tspan fill={color} aria-hidden="true">
          {roleMark[node.role]}{' '}
        </tspan>
        {node.label}
      </text>
      {node.sub ? (
        <text
          x={x}
          y={y + 13}
          textAnchor="middle"
          fill="var(--ink-muted)"
          fontSize="10.5"
          fontFamily="var(--font-mono)"
          direction={dir}
        >
          {node.sub}
        </text>
      ) : null}
    </g>
  )
}

type Pt = { x: number; y: number }

function TransitBox({
  transit,
  from,
  to,
  nodes,
  progress,
  dir,
}: {
  transit: Transit
  from: Pt
  to: Pt
  nodes: Pt[]
  progress: number
  dir: 'ltr' | 'rtl'
}) {
  const lines = transit.payload ?? []
  const w = 164
  const h = lines.length ? 26 + lines.length * 13 : 26
  const color = intentVar[transit.intent as Intent]

  /*
   * The artifact flies beside the wire rather than along it, so it never
   * covers a label --- not the two nodes it runs between, and not a third
   * node that happens to sit on the path.
   *
   * `offsetPath` searches the two perpendicular sides at a few distances
   * and takes the first that keeps the whole swept area inside the stage
   * and clear of every node. It is a handful of rectangle tests per step,
   * which is cheaper than asking authors to hand-place every artifact.
   */
  const { a, b } = offsetPath(from, to, w, h, nodes)

  // A dropped artifact stops short of its target and is struck out there.
  const travel = transit.dropped ? Math.min(progress, 0.62) : progress
  const x = a.x + (b.x - a.x) * travel
  const y = a.y + (b.y - a.y) * travel
  const struck = transit.dropped && progress > 0.62

  return (
    <g opacity={progress <= 0.001 ? 0 : 1}>
      {/* The travelled path, so the direction of movement stays readable. */}
      <line
        x1={a.x}
        y1={a.y}
        x2={x}
        y2={y}
        stroke={color}
        strokeWidth="1"
        strokeDasharray={transit.dropped ? '4 4' : undefined}
        opacity="0.45"
      />
      {/* A tick back down to the node it left, so the path reads at a glance. */}
      <line
        x1={from.x}
        y1={from.y}
        x2={a.x}
        y2={a.y}
        stroke={color}
        strokeWidth="1"
        opacity="0.3"
      />
      <g>
        <rect
          x={x - w / 2}
          y={y - h / 2}
          width={w}
          height={h}
          fill="var(--raised)"
          stroke={color}
          strokeWidth="1.4"
        />
        <text
          x={x - w / 2 + 8}
          y={y - h / 2 + 14}
          fill={color}
          fontSize="11"
          fontWeight="700"
          fontFamily="var(--font-mono)"
          letterSpacing="0.06em"
          direction={dir}
        >
          <tspan aria-hidden="true">{intentGlyph[transit.intent as Intent]} </tspan>
          {transit.label}
        </text>
        {lines.map((line, i) => (
          <text
            key={i}
            x={x - w / 2 + 8}
            y={y - h / 2 + 28 + i * 13}
            fill="var(--ink-soft)"
            fontSize="10.5"
            fontFamily="var(--font-mono)"
            direction="ltr"
          >
            {line}
          </text>
        ))}
        {struck ? (
          <g stroke="var(--attacker)" strokeWidth="2.2">
            <line x1={x - 13} y1={y - 13} x2={x + 13} y2={y + 13} />
            <line x1={x + 13} y1={y - 13} x2={x - 13} y2={y + 13} />
          </g>
        ) : null}
      </g>
    </g>
  )
}


type Rect = { x: number; y: number; w: number; h: number }

function overlaps(a: Rect, b: Rect, pad = 2) {
  return (
    Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) > pad &&
    Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) > pad
  )
}

/**
 * Where to fly an artifact of w x h from one node to another.
 *
 * Returns the two endpoints of the offset path. The box sweeps between
 * them, so the area it covers is the union of the box at each end, and
 * that union is what the candidates are tested against.
 */
function offsetPath(from: Pt, to: Pt, w: number, h: number, nodes: Pt[]) {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const dist = Math.hypot(dx, dy) || 1
  const ux = dx / dist
  const uy = dy / dist

  const nodeRects: Rect[] = nodes.map((n) => ({
    x: n.x - NODE.w / 2,
    y: n.y - NODE.h / 2,
    w: NODE.w,
    h: NODE.h,
  }))

  // Perpendicular sides, the one above the wire first.
  const sides: [number, number][] = [
    [uy, -ux],
    [-uy, ux],
  ]
  sides.sort((p, q) => p[1] - q[1])

  const candidate = (nx: number, ny: number, k: number) => {
    // Clearance along the offset direction: a sideways hop has to clear the
    // node's width, an upward one its height.
    const base = Math.abs(nx) * (NODE.w / 2 + w / 2) + Math.abs(ny) * (NODE.h / 2 + h / 2) + 12
    const d = base * k
    const a = { x: from.x + nx * d, y: from.y + ny * d }
    const b = { x: to.x + nx * d, y: to.y + ny * d }
    /*
     * Only the two rest positions are tested, not the whole swept area.
     * An artifact passing over a router while in flight reads correctly ---
     * that is what a packet does. What must never happen is an artifact
     * coming to rest on top of a label, which is where a step pauses and
     * where the learner reads.
     */
    const at = (pt: Pt): Rect => ({ x: pt.x - w / 2, y: pt.y - h / 2, w, h })
    const boxes = [at(a), at(b)]
    const inside = boxes.every(
      (r) => r.x >= 4 && r.y >= 4 && r.x + r.w <= VB.w - 4 && r.y + r.h <= VB.h - 4,
    )
    const hits = boxes.reduce((n, r) => n + nodeRects.filter((q) => overlaps(r, q)).length, 0)
    return { a, b, ok: inside && hits === 0, score: (inside ? 0 : 100) + hits }
  }

  let best = candidate(sides[0][0], sides[0][1], 1)
  for (const [nx, ny] of sides) {
    // Tighter offsets as well as wider ones: between two close rows the
    // only clear route is sometimes a short hop, not a long one.
    for (const k of [1, 0.85, 1.25, 0.7, 1.5, 1.8, 2.1]) {
      const c = candidate(nx, ny, k)
      if (c.ok) return c
      if (c.score < best.score) best = c
    }
  }
  // Nothing was clear. Keep the least bad option, but never off the stage.
  const clamp = (pt: Pt): Pt => ({
    x: Math.min(Math.max(pt.x, w / 2 + 4), VB.w - w / 2 - 4),
    y: Math.min(Math.max(pt.y, h / 2 + 4), VB.h - h / 2 - 4),
  })
  return { a: clamp(best.a), b: clamp(best.b) }
}
