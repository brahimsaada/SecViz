# SecViz

**Watch security work, step by step.**

An interactive platform that teaches cybersecurity by animating how it
happens. Every topic is a timeline you can play, pause, scrub and inspect:
the attacker's action on one side, the artifact crossing the wire decoded
field by field in the middle, and the logs a SOC would see on the other.

All data is simulated. No live targets, no working exploit payloads.

## Running it

```bash
npm install
```

```bash
npm run dev
```

```bash
npm run build && npm start
```

Static output, no backend. It deploys to Vercel as-is.

## How it is put together

One component, the **Scenario Player**, drives every lesson. A lesson is
data validated against a schema, so adding one touches no engine code.

```
src/lib/schema.ts          the lesson contract (zod)
src/player/                the timeline store and the clock
src/components/player/     Stage, DecodePanel, TelemetryPanel, Timeline, WhatIf
src/components/challenges/ the three end-of-lesson task types
src/components/map/        the per-domain dependency map
src/content/domains.ts     the twelve domains and every lesson they plan
src/content/lessons/       the lessons that have been written
src/i18n/                  locale config and 15 dictionaries
scripts/validate-content.ts  schema and cross-link checks
```

Panels never disagree about which moment is on screen, because they all
read one timeline. The store holds `index` plus `t` (0..1 through the
current step) and nothing else about time; the speed control and the
scrubber therefore need to know nothing about a step's duration.

### Adding a lesson

1. Write `src/content/lessons/<slug>.ts` exporting a `Lesson`.
2. Import it in `src/content/registry.ts` and add it to the `written` array.
3. List its slug under the right domain in `src/content/domains.ts`.
4. `npm run validate:content`.

The validator checks what the schema cannot: that prerequisites name real
lessons, that every domain a lesson claims actually lists it, that transit
and highlight ids exist on the stage, that byte offsets fit the hex
supplied, and that each challenge has exactly one correct answer. It fails
the build rather than rendering a broken player.

### Writing style for annotations

Short, declarative, and say *why* the field matters rather than restating
its name:

> "All zeros: this is what the request wants to find out."

Not "This field is set to zero." See `docs/design-reference.md`.

## What is built

**Engine** — complete. Timeline with play/pause/step/scrub/speed, the
byte-and-field decode panel, the defender telemetry panel, the actor /
both / defender toggle, one-level what-if branching, three challenge
types, the domain dependency map, 15 locales with RTL, light and dark
themes, full keyboard control, reduced-motion step-through mode.

**Content** — 6 lessons written of 99 planned across all 12 domains:

| Lesson | Domain | Why it is here |
|---|---|---|
| The TLS handshake | Cryptography (also Networking) | the flagship, built first as the reference implementation |
| DNS resolution | Networking | the richest defender log source |
| TCP, reliably | Networking | the foundation other networking lessons build on |
| How a SIEM works | Defense and detection | validates the defender view before content scales |
| Kerberos | Active Directory (also Authentication) | proves a canonical lesson living once, referenced twice |
| Password storage | Authentication | foundations |

The other 93 are declared in `src/content/domains.ts` and appear on the
domain maps as dimmed nodes in their proper place in the path, so the
shape of the whole syllabus is visible before it is written.

## Known gaps

- **Lesson text is English only.** UI strings are translated into all 15
  locales and merge over English key by key, so a partial dictionary never
  shows a blank label. Lesson content has no translation layer yet; adding
  one means a per-locale override map keyed by lesson slug, which the
  loader already has the shape for.
- **`about` is untranslated in 8 locales** (tr, uk, id, pt-BR, zh-TW, ko,
  hi) and falls back to English. The rest of the interface is translated
  in all 15.
- **No saved progress.** Everything is static and client-rendered; there
  are no accounts and nothing is stored but the theme choice.

## Credit

The interaction model is modelled on [Protocol
Explorer](https://protocol-explorer-alpha.vercel.app/) by Dilum Sanjaya,
which teaches networking by animating packets and decoding every one byte
by byte. SecViz applies that pedagogy across security and adds the
defender view. `docs/design-reference.md` records exactly what was carried
over.
