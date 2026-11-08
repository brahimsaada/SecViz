import { parseLesson, type Lesson } from '@/lib/schema'
import { domains, type Domain, type DomainEntry } from './domains'
import { dnsResolution } from './lessons/dns-resolution'
import { kerberos } from './lessons/kerberos'
import { passwordStorage } from './lessons/password-storage'
import { siemPipeline } from './lessons/siem-pipeline'
import { tcpHandshake } from './lessons/tcp-handshake'
import { tlsHandshake } from './lessons/tls-handshake'

/**
 * Every written lesson. Adding one means importing it here and listing its
 * slug in the right domain; nothing else in the codebase changes.
 *
 * Each lesson is validated against the schema at module load, so a
 * malformed lesson fails the build rather than rendering half a player.
 */
const written: Lesson[] = [
  tlsHandshake,
  dnsResolution,
  tcpHandshake,
  siemPipeline,
  kerberos,
  passwordStorage,
].map((l, i) => parseLesson(l, `lesson[${i}]`))

export const lessons = written
export const lessonBySlug = new Map(written.map((l) => [l.slug, l]))

export function getLesson(slug: string): Lesson | undefined {
  return lessonBySlug.get(slug)
}

export function isWritten(slug: string): boolean {
  return lessonBySlug.has(slug)
}

/** The flagship, linked from the home page. */
export const flagshipSlug = 'tls-handshake'

export type DomainStats = { total: number; written: number }

export function domainStats(domain: Domain): DomainStats {
  return {
    total: domain.entries.length,
    written: domain.entries.filter((e) => isWritten(e.slug)).length,
  }
}

/**
 * A domain entry joined to its lesson, where one exists. The domain map
 * renders both, so an unwritten node still shows its place in the path.
 */
export type MapNode = DomainEntry & { lesson?: Lesson }

export function domainMap(domain: Domain): MapNode[] {
  return domain.entries.map((e) => ({ ...e, lesson: lessonBySlug.get(e.slug) }))
}

/** Which domains reference this lesson, for the cross-link row. */
export function domainsFor(lesson: Lesson): Domain[] {
  const slugs = new Set([lesson.domain, ...(lesson.alsoIn ?? [])])
  return domains.filter((d) => slugs.has(d.slug))
}

export { domains }
export type { Domain, DomainEntry }
