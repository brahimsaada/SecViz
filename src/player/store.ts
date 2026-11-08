'use client'

import { useMemo } from 'react'
import { create } from 'zustand'
import type { Branch, Lesson, Perspective, Step } from '@/lib/schema'

export type Phase = 'intro' | 'steps' | 'outro'

/**
 * The player clock. One timeline drives every panel, so the stage, the
 * decode panel and the telemetry panel can never disagree about which
 * moment is on screen.
 *
 * Progress within a step is kept as 0..1 (`t`) rather than in
 * milliseconds, so the speed control and the scrubber do not have to
 * know a step's duration.
 */
type State = {
  lesson: Lesson | null
  phase: Phase
  index: number
  /** 0..1 through the current step. 1 means the step has settled. */
  t: number
  playing: boolean
  speed: number
  perspective: Perspective
  /** Set when a what-if is taken: the step it was taken at, and the branch. */
  branch: { atIndex: number; branch: Branch } | null
  /** True when the OS asks for reduced motion, or the user turns motion off. */
  stepThrough: boolean
  selectedField: number | null
}

type Actions = {
  load: (lesson: Lesson, stepThrough: boolean) => void
  play: () => void
  pause: () => void
  toggle: () => void
  tick: (deltaMs: number) => void
  next: () => void
  prev: () => void
  goTo: (index: number) => void
  setPhase: (phase: Phase) => void
  setSpeed: (speed: number) => void
  setPerspective: (p: Perspective) => void
  takeBranch: (atIndex: number, branch: Branch) => void
  clearBranch: () => void
  setStepThrough: (v: boolean) => void
  selectField: (i: number | null) => void
  reset: () => void
}

export const SPEEDS = [0.5, 1, 1.5, 2] as const

const initial: State = {
  lesson: null,
  phase: 'intro',
  index: 0,
  t: 0,
  playing: false,
  speed: 1,
  perspective: 'both',
  branch: null,
  stepThrough: false,
  selectedField: null,
}

export const usePlayer = create<State & Actions>((set, get) => ({
  ...initial,

  load: (lesson, stepThrough) =>
    set({ ...initial, lesson, stepThrough, phase: 'intro' }),

  play: () => {
    const { phase, index } = get()
    const total = activeSteps(get()).length
    // Playing from the end restarts, so PLAY never looks broken.
    if (phase === 'outro' || (phase === 'steps' && index >= total - 1 && get().t >= 1)) {
      set({ phase: 'steps', index: 0, t: 0, playing: true, branch: null })
      return
    }
    set({ playing: true, phase: phase === 'intro' ? 'steps' : phase })
  },

  pause: () => set({ playing: false }),

  toggle: () => (get().playing ? get().pause() : get().play()),

  tick: (deltaMs) => {
    const s = get()
    if (!s.playing || s.phase !== 'steps' || s.stepThrough) return
    const steps = activeSteps(s)
    const step = steps[s.index]
    if (!step) return
    const advance = (deltaMs * s.speed) / step.duration
    const t = s.t + advance
    if (t < 1) {
      set({ t })
      return
    }
    if (s.index >= steps.length - 1) {
      set({ t: 1, playing: false, phase: 'outro' })
      return
    }
    set({ index: s.index + 1, t: 0, selectedField: null })
  },

  next: () => {
    const s = get()
    const steps = activeSteps(s)
    if (s.phase === 'intro') {
      set({ phase: 'steps', index: 0, t: 1, selectedField: null })
      return
    }
    if (s.phase === 'outro') return
    // A step mid-flight settles first: one press to finish it, one to move on.
    if (s.t < 1) {
      set({ t: 1 })
      return
    }
    if (s.index >= steps.length - 1) {
      set({ phase: 'outro', playing: false })
      return
    }
    set({ index: s.index + 1, t: 1, selectedField: null })
  },

  prev: () => {
    const s = get()
    if (s.phase === 'outro') {
      const steps = activeSteps(s)
      set({ phase: 'steps', index: Math.max(0, steps.length - 1), t: 1 })
      return
    }
    if (s.phase === 'intro') return
    if (s.index === 0) {
      set({ phase: 'intro', t: 0, playing: false })
      return
    }
    set({ index: s.index - 1, t: 1, selectedField: null })
  },

  goTo: (index) => {
    const steps = activeSteps(get())
    const clamped = Math.max(0, Math.min(index, steps.length - 1))
    set({ phase: 'steps', index: clamped, t: 1, selectedField: null })
  },

  setPhase: (phase) => set({ phase, playing: false, t: phase === 'intro' ? 0 : 1 }),

  setSpeed: (speed) => set({ speed }),

  setPerspective: (perspective) => set({ perspective }),

  /**
   * Taking a what-if keeps the steps up to and including the branch point,
   * then continues down the branch. The learner can always come back.
   */
  takeBranch: (atIndex, branch) =>
    set({ branch: { atIndex, branch }, index: atIndex + 1, t: 0, phase: 'steps', playing: true, selectedField: null }),

  clearBranch: () => {
    const s = get()
    const at = s.branch?.atIndex ?? 0
    set({ branch: null, index: at, t: 1, playing: false, selectedField: null })
  },

  setStepThrough: (v) => set({ stepThrough: v, playing: v ? false : get().playing }),

  selectField: (i) => set({ selectedField: i }),

  reset: () => {
    const { lesson, stepThrough, speed, perspective } = get()
    set({ ...initial, lesson, stepThrough, speed, perspective })
  },
}))

/**
 * The timeline actually on screen: the lesson's steps, or the branch
 * spliced in at its branch point. Everything that renders reads this, so
 * a what-if needs no special case anywhere else.
 */
export function activeSteps(s: Pick<State, 'lesson' | 'branch'>): Step[] {
  const base = s.lesson?.steps ?? []
  if (!s.branch) return base
  const { atIndex, branch } = s.branch
  return [...base.slice(0, atIndex + 1), ...branch.steps]
}

/**
 * Derived hooks.
 *
 * These select stable references only (`lesson`, `branch`) and compute with
 * useMemo. Selecting a fresh array or Set inside the selector would give
 * zustand a new reference on every render and loop forever, which is the
 * one sharp edge in this store.
 */
export function useActiveSteps(): Step[] {
  const lesson = usePlayer((s) => s.lesson)
  const branch = usePlayer((s) => s.branch)
  return useMemo(() => activeSteps({ lesson, branch }), [lesson, branch])
}

export function useCurrentStep(): Step | null {
  const steps = useActiveSteps()
  const index = usePlayer((s) => s.index)
  return steps[index] ?? null
}

/** Nodes revealed by every step up to and including the current one. */
export function useRevealed(): Set<string> {
  const lesson = usePlayer((s) => s.lesson)
  const steps = useActiveSteps()
  const phase = usePlayer((s) => s.phase)
  const index = usePlayer((s) => s.index)

  return useMemo(() => {
    const out = new Set<string>(lesson?.start ?? lesson?.nodes.map((n) => n.id) ?? [])
    if (phase === 'intro') return out
    const upto = phase === 'outro' ? steps.length - 1 : index
    for (let i = 0; i <= upto; i++) for (const id of steps[i]?.reveal ?? []) out.add(id)
    return out
  }, [lesson, steps, phase, index])
}
