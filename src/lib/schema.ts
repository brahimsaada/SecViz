import { z } from 'zod'

/**
 * The lesson schema. This is the contract between content and engine:
 * the Scenario Player renders anything that validates here, and a new
 * lesson never needs new engine code.
 *
 * Authoring note: write annotations the way the reference does. Short,
 * declarative, and say why the field matters instead of restating its
 * name. "All zeros: this is what the request wants to find out." --- not
 * "This field is set to zero."
 */

/** The four fixed meanings, plus the neutral accent. Nothing decorative. */
export const Intent = z.enum(['inert', 'attacker', 'defender', 'anomalous', 'signal'])
export type Intent = z.infer<typeof Intent>

export const Level = z.enum(['foundations', 'intermediate', 'advanced'])
export type Level = z.infer<typeof Level>

/** Which panel a step speaks from. `both` shows actor and defender together. */
export const Perspective = z.enum(['actor', 'defender', 'both'])
export type Perspective = z.infer<typeof Perspective>

/** A two-column fact table. Dense, scannable, cheap to author. */
export const Facts = z.array(z.tuple([z.string(), z.string()]))
export type Facts = z.infer<typeof Facts>

/** A labelled box on the stage: a host, a service, a queue, a graph vertex. */
export const SceneNode = z.object({
  id: z.string(),
  label: z.string(),
  sub: z.string().optional(),
  role: z.enum(['client', 'server', 'attacker', 'defender', 'infra', 'identity', 'store']),
  /** Percentages of the stage box, so the stage scales without re-authoring. */
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
})
export type SceneNode = z.infer<typeof SceneNode>

/**
 * One decoded field. `offset`/`length` are optional: present for
 * byte-oriented artifacts (packets, records), absent for keyed ones
 * (token claims, log fields). The same panel renders both.
 */
export const DecodedField = z.object({
  name: z.string(),
  value: z.string(),
  /** Plain-language note. Shown on hover and on keyboard focus. */
  note: z.string(),
  offset: z.number().int().min(0).optional(),
  length: z.number().int().min(1).optional(),
  /** Groups adjacent fields under one sub-heading in the panel. */
  group: z.string().optional(),
  intent: Intent.optional(),
})
export type DecodedField = z.infer<typeof DecodedField>

/** The artifact the decode panel takes apart for the selected step. */
export const Artifact = z.object({
  kind: z.enum(['packet', 'record', 'token', 'ticket', 'log', 'config', 'manifest']),
  label: z.string(),
  sub: z.string().optional(),
  /**
   * Raw bytes as a hex string, whitespace ignored. Supply this and the
   * panel draws a hex grid wired to the fields by offset. Omit it and the
   * panel shows the field list alone.
   */
  hex: z.string().optional(),
  fields: z.array(DecodedField),
})
export type Artifact = z.infer<typeof Artifact>

/** One line a SOC would actually see. This is the defender view. */
export const LogEvent = z.object({
  source: z.string(),
  /** e.g. "4624", "sysmon/1", "zeek/dns". Shown in mono beside the source. */
  code: z.string().optional(),
  severity: z.enum(['info', 'notice', 'warning', 'alert']),
  message: z.string(),
  fields: z.array(DecodedField).optional(),
  /** Marks the line the end-of-lesson challenge may ask the learner to find. */
  suspicious: z.boolean().optional(),
})
export type LogEvent = z.infer<typeof LogEvent>

/** An artifact crossing the stage: a packet, a ticket, a token, a push. */
export const Transit = z.object({
  from: z.string(),
  to: z.string(),
  label: z.string(),
  /** Up to two short lines rendered inside the moving box. */
  payload: z.array(z.string()).max(2).optional(),
  intent: Intent.default('signal'),
  /** Draws the path as a dashed line: blocked, dropped, or refused. */
  dropped: z.boolean().optional(),
})
export type Transit = z.infer<typeof Transit>

const stepShape = {
  id: z.string(),
  /** Two or three words. */
  title: z.string(),
  /** A one-line claim about this step. */
  desc: z.string(),
  /** A short paragraph, shown in the side panel. */
  detail: z.string(),
  facts: Facts.optional(),
  perspective: Perspective.default('both'),
  /** Milliseconds this step holds when playing. Never below reading pace. */
  duration: z.number().int().min(600).default(2600),
  /** Nodes revealed from this step onward. */
  reveal: z.array(z.string()).optional(),
  /** Nodes drawn as active for this step. */
  highlight: z.array(z.string()).optional(),
  transit: z.array(Transit).optional(),
  artifact: Artifact.optional(),
  telemetry: z.array(LogEvent).optional(),
}

/**
 * A step inside a branch. Identical to a step, minus `branches`: what-ifs
 * do not nest. One level keeps the timeline something a learner can still
 * hold in their head, and keeps the schema free of recursion.
 */
export const BranchStep = z.object(stepShape)
export type BranchStep = z.infer<typeof BranchStep>

/**
 * A what-if. Choosing a branch replaces every step from this one onward
 * with the branch's own steps, so a lesson can show a second outcome
 * without the engine knowing anything about the subject.
 */
export const Branch = z.object({
  id: z.string(),
  label: z.string(),
  /** One line on the control: what the learner is about to change. */
  note: z.string(),
  steps: z.array(BranchStep).min(1),
})
export type Branch = z.infer<typeof Branch>

export const Step = z.object({
  ...stepShape,
  branches: z.array(Branch).optional(),
})
export type Step = z.infer<typeof Step>

/* ---------------------------------------------------------------- challenges */

/** Find the one bad line among many. Tests the defender view. */
const LogPickerChallenge = z.object({
  kind: z.literal('log-picker'),
  prompt: z.string(),
  lines: z.array(
    z.object({
      text: z.string(),
      correct: z.boolean().optional(),
      why: z.string(),
    }),
  ),
})

/** Toggle controls until the attack is stopped. Tests cause and effect. */
const ToggleChallenge = z.object({
  kind: z.literal('toggle'),
  prompt: z.string(),
  options: z.array(
    z.object({
      label: z.string(),
      correct: z.boolean().optional(),
      why: z.string(),
    }),
  ),
})

/** Pick the clause that makes a detection rule fire. Tests rule reading. */
const RuleChallenge = z.object({
  kind: z.literal('rule'),
  prompt: z.string(),
  /** The rule, with one blank written as `___`. */
  template: z.string(),
  options: z.array(
    z.object({
      label: z.string(),
      correct: z.boolean().optional(),
      why: z.string(),
    }),
  ),
  /** Lines the rule is evaluated against, so the learner sees it fire. */
  sample: z.array(z.string()).optional(),
})

export const Challenge = z.discriminatedUnion('kind', [
  LogPickerChallenge,
  ToggleChallenge,
  RuleChallenge,
])
export type Challenge = z.infer<typeof Challenge>

/* ------------------------------------------------------------------- lesson */

export const Lesson = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string(),
  /** The claim under the title, e.g. "Keys agreed before a byte is read". */
  tagline: z.string(),
  domain: z.string(),
  level: Level,
  minutes: z.number().int().min(1),

  /** Other domains this lesson is referenced from. A lesson lives once. */
  alsoIn: z.array(z.string()).optional(),
  prerequisites: z.array(z.string()).optional(),
  related: z.array(z.string()).optional(),
  /** ATT&CK technique ids, where the lesson maps to one. */
  attack: z.array(z.string()).optional(),

  /** Attack lessons must name the detection lesson that answers them. */
  detectionCounterpart: z.string().optional(),

  overview: z.object({
    full: z.string().optional(),
    description: z.string(),
    facts: Facts.optional(),
  }),

  nodes: z.array(SceneNode).min(1),
  /** Nodes visible before the first step runs. */
  start: z.array(z.string()).optional(),
  legend: z.array(z.tuple([Intent, z.string()])).optional(),

  steps: z.array(Step).min(1),

  outro: z.object({
    title: z.string(),
    desc: z.string(),
    text: z.string(),
    facts: Facts.optional(),
  }),

  challenge: Challenge.optional(),
})
export type Lesson = z.infer<typeof Lesson>

/** Throws with the offending path if a lesson file is malformed. */
export function parseLesson(input: unknown, where = 'lesson'): Lesson {
  const r = Lesson.safeParse(input)
  if (!r.success) {
    const first = r.error.issues[0]
    throw new Error(`${where}: ${first.path.join('.')} - ${first.message}`)
  }
  return r.data
}
