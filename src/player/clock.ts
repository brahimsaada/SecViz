'use client'

import { useEffect } from 'react'
import { usePlayer } from './store'

/**
 * A requestAnimationFrame clock that feeds the store. Kept apart from the
 * store so nothing but this hook touches wall time, and so a test can
 * drive the timeline by calling `tick` directly.
 *
 * The frame delta is capped: coming back to a backgrounded tab must not
 * jump the lesson forward by however long it was hidden.
 */
export function usePlayerClock() {
  const playing = usePlayer((s) => s.playing)
  const stepThrough = usePlayer((s) => s.stepThrough)

  useEffect(() => {
    if (!playing || stepThrough) return
    let raf = 0
    let last = performance.now()
    const frame = (now: number) => {
      const delta = Math.min(now - last, 50)
      last = now
      usePlayer.getState().tick(delta)
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [playing, stepThrough])
}

/**
 * Honours prefers-reduced-motion, and keeps honouring it if the setting
 * changes while the lesson is open.
 */
export function useReducedMotionSync() {
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const apply = () => usePlayer.getState().setStepThrough(mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])
}

/**
 * Full keyboard control of the player: space plays and pauses, the arrow
 * keys step. Arrows follow the writing direction, so in Arabic and Hebrew
 * the left arrow still means "the way the artifact is travelling".
 */
export function usePlayerKeys(dir: 'ltr' | 'rtl') {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null
      const tag = el?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el?.isContentEditable) return

      const p = usePlayer.getState()
      const forward = dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight'
      const back = dir === 'rtl' ? 'ArrowRight' : 'ArrowLeft'

      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault()
          p.toggle()
          break
        case forward:
          e.preventDefault()
          p.pause()
          p.next()
          break
        case back:
          e.preventDefault()
          p.pause()
          p.prev()
          break
        case 'Home':
          e.preventDefault()
          p.setPhase('intro')
          break
        case 'End':
          e.preventDefault()
          p.setPhase('outro')
          break
        case 'r':
          p.reset()
          break
        default:
          break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [dir])
}
