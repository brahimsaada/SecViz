# Design reference: what SecViz carries over from Protocol Explorer

Extracted from the live build of `protocol-explorer-alpha.vercel.app`
(CSS/JS bundles, Nov 2026). Recorded so the look stays consistent as
SecViz grows, and so later contributors know which choices are deliberate.

## Typeface

The whole site is set in **one monospace family** (Iosevka), with
per-script fallbacks rather than a second family:

- latin: `Iosevka, ui-monospace, monospace`
- ja: `+ Hiragino Sans, Yu Gothic UI, Noto Sans JP`
- zh-CN / zh-TW / ko / hi / ar / he: equivalent per-script stacks

This all-mono setting is the single strongest part of the aesthetic: it
makes the page read as an instrument, not an article. SecViz keeps one
mono family for data, labels and chrome, and uses a sans only for long
prose passages, where reading comfort wins.

## Colour

Ink is **blue-tinted, never neutral grey** — the blueprint feel.

| token       | light     | dark      | use                       |
|-------------|-----------|-----------|---------------------------|
| `--bg`      | `#fdfdfe` | `#0b1020` | page                      |
| `--panel`   | `#fefeff` | `#0f1628` | panels, cards             |
| `--ink`     | `#0032a0` | `#afc4f2` | body text                 |
| `--ink-strong` | `#00238a` | `#b7c6f3` | headings               |
| `--ink-soft`   | `#5a73a8` | `#acb8d3` | secondary              |
| `--ink-muted`  | `#7d96c6` | `#859cc9` | captions, hints        |
| `--line`       | `#6f94c9` | `#3c649f` | strong borders         |
| `--line-mid`   | `#c8d6ec` | `#1d304e` | panel borders          |
| `--line-soft`  | `#e3e9f3` | `#1a283e` | hairlines, grids       |

Semantic accents (light / dark):

- active / interactive `#1f5fe0` (same in both)
- blue `#0a78f5`
- green `#00a86b` / `#00ef98`
- cyan `#0a7c88` / `#0fb9cb`
- amber `#f8b900` (same)
- violet `#7656e0` (same)
- slate / inert `#8495b2` (same)

Per-lesson a `legend` maps these to meanings, e.g. TCP uses
`[["green","Handshake and ACKs"], ["amber","Data from laptop"],
["violet","Data from server"], ["slate","Closing (FIN)"]]`.

SecViz fixes four meanings globally and never reuses them for
decoration: inert (slate), attacker (rose), defender (green),
anomalous (amber). Cyan is the signal/accent.

## Motion

- `--ease-out: cubic-bezier(.16, 1, .3, 1)`
- `--ease-in: cubic-bezier(.5, 0, .75, 0)`

## Layout tokens

- details/decode panel width: `300px`–`332px`
- flow (stage) height: `248px`

## Control vocabulary

Buttons are short uppercase words; keyboard hints live in the
`aria-label`, in parentheses:

- `PLAY` / `PAUSE`, `REPLAY`, `RESET`, `STEP DETAILS`, `BYTES`
- "Play / pause (Space)", "Next packet (→)", "Previous step (←)",
  "Back to the overview (Esc)", "Playback speed"

Field annotations are written as `offset 72, 9 bytes`.

## Lesson data shape (the part worth copying)

```
{ id, name, title, layer, nodes, latency, legend,
  overview: { full, description, facts: [[label, value], …] },
  start:    { nodes, frame },
  steps:    [ { title, desc, detail, facts, events } ],
  outro:    { title, desc, text, facts } }
```

Two things to keep:

1. `facts: [[label, value], …]` — a two-column fact table on every
   step and on the intro/outro. Cheap to author, dense, scannable.
2. Steps carry three text layers: `title` (2–3 words), `desc` (a
   one-line claim), `detail` (a short paragraph). The player shows
   title+desc always and `detail` in the side panel.

SecViz adds to each step: `perspective`, `telemetry` (the defender
view), and `branches` (what-if).

## Annotation voice

Short, declarative, plain-language, and it says why the field matters
rather than restating its name. Samples from the original:

- "All zeros: this is what the request wants to find out."
- "Broadcast: every device on the network receives it."
- "A number this side picked for the session; the other side puts it in
  every packet it sends back."
- "Bytes that arrived after the gap, so only the gap needs resending."

Write every SecViz annotation this way. No marketing tone, no "simply",
no exclamation marks.

## Locales shipped by the original (15)

en, es, pt-BR, fr, de, tr, uk, id, ja, zh-CN, zh-TW, ko, hi, ar, he —
with ar and he right-to-left.
