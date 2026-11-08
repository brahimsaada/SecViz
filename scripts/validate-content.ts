/**
 * Checks every lesson against the schema, and checks the cross-links
 * between lessons and domains. Run with `npm run validate:content`.
 *
 * It verifies things the schema cannot: that a prerequisite names a real
 * lesson, that a lesson's domain exists and lists it, that branch and
 * transit nodes exist on the stage, and that an attack lesson names its
 * detection counterpart.
 */
import { domains } from '../src/content/domains'
import { lessons } from '../src/content/registry'

const problems: string[] = []
const warnings: string[] = []

const domainSlugs = new Set(domains.map((d) => d.slug))
const allEntries = new Set(domains.flatMap((d) => d.entries.map((e) => e.slug)))
const writtenSlugs = new Set(lessons.map((l) => l.slug))

for (const l of lessons) {
  const at = `${l.slug}`

  if (!domainSlugs.has(l.domain)) problems.push(`${at}: domain "${l.domain}" does not exist`)
  for (const d of l.alsoIn ?? [])
    if (!domainSlugs.has(d)) problems.push(`${at}: alsoIn "${d}" does not exist`)

  // The lesson must be listed by every domain it claims to be in.
  for (const d of [l.domain, ...(l.alsoIn ?? [])]) {
    const domain = domains.find((x) => x.slug === d)
    if (domain && !domain.entries.some((e) => e.slug === l.slug))
      problems.push(`${at}: domain "${d}" does not list it`)
  }

  for (const p of l.prerequisites ?? [])
    if (!allEntries.has(p)) problems.push(`${at}: prerequisite "${p}" is in no domain`)
  for (const r of l.related ?? [])
    if (!allEntries.has(r)) problems.push(`${at}: related "${r}" is in no domain`)

  if (l.detectionCounterpart && !allEntries.has(l.detectionCounterpart))
    problems.push(`${at}: detectionCounterpart "${l.detectionCounterpart}" is in no domain`)
  if (l.attack?.length && !l.detectionCounterpart)
    warnings.push(`${at}: maps to ATT&CK but names no detectionCounterpart`)

  const nodeIds = new Set(l.nodes.map((n) => n.id))
  for (const s of l.start ?? [])
    if (!nodeIds.has(s)) problems.push(`${at}: start node "${s}" is not in nodes`)

  const steps = [...l.steps, ...l.steps.flatMap((s) => s.branches?.flatMap((b) => b.steps) ?? [])]
  const seen = new Set<string>()
  for (const s of steps) {
    if (seen.has(s.id)) problems.push(`${at}: duplicate step id "${s.id}"`)
    seen.add(s.id)
    for (const id of [...(s.reveal ?? []), ...(s.highlight ?? [])])
      if (!nodeIds.has(id)) problems.push(`${at}/${s.id}: references unknown node "${id}"`)
    for (const t of s.transit ?? []) {
      if (!nodeIds.has(t.from)) problems.push(`${at}/${s.id}: transit from unknown node "${t.from}"`)
      if (!nodeIds.has(t.to)) problems.push(`${at}/${s.id}: transit to unknown node "${t.to}"`)
    }
    // A byte offset past the end of the supplied hex means the grid and the
    // field list would disagree, which is worse than having no hex at all.
    const a = s.artifact
    if (a?.hex) {
      const len = a.hex.replace(/[^0-9a-fA-F]/g, '').length / 2
      for (const f of a.fields)
        if (f.offset !== undefined && f.offset + (f.length ?? 1) > len)
          problems.push(`${at}/${s.id}: field "${f.name}" runs past the ${len} bytes of hex`)
    }
  }

  // Every challenge needs exactly one right answer.
  const c = l.challenge
  if (c) {
    const opts = c.kind === 'log-picker' ? c.lines : c.options
    const right = opts.filter((o) => o.correct === true).length
    if (right !== 1) problems.push(`${at}: challenge has ${right} correct options, expected 1`)
    for (const o of opts)
      if (!o.why.trim()) problems.push(`${at}: a challenge option has no explanation`)
  }
}

for (const d of domains) {
  const seen = new Set<string>()
  for (const e of d.entries) {
    if (seen.has(e.slug)) problems.push(`${d.slug}: lists "${e.slug}" twice`)
    seen.add(e.slug)
    for (const a of e.after ?? [])
      if (!d.entries.some((x) => x.slug === a))
        problems.push(`${d.slug}/${e.slug}: after "${a}" is not in this domain`)
    if (e.canonicalIn && !domainSlugs.has(e.canonicalIn))
      problems.push(`${d.slug}/${e.slug}: canonicalIn "${e.canonicalIn}" does not exist`)
  }
}

const total = new Set(domains.flatMap((d) => d.entries.map((e) => e.slug))).size
console.log(`${lessons.length} lessons written, ${total} planned across ${domains.length} domains`)
for (const w of warnings) console.log(`  warn  ${w}`)
if (problems.length) {
  for (const p of problems) console.error(`  FAIL  ${p}`)
  console.error(`\n${problems.length} problem(s).`)
  process.exit(1)
}
console.log(`${writtenSlugs.size} lessons valid, cross-links consistent.`)
