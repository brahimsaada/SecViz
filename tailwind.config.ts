import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        panel: 'var(--panel)',
        raised: 'var(--raised)',
        ink: {
          DEFAULT: 'var(--ink)',
          strong: 'var(--ink-strong)',
          soft: 'var(--ink-soft)',
          muted: 'var(--ink-muted)',
        },
        line: {
          DEFAULT: 'var(--line)',
          mid: 'var(--line-mid)',
          soft: 'var(--line-soft)',
        },
        accent: 'var(--accent)',
        // the four fixed meanings - never used for decoration
        inert: 'var(--inert)',
        attacker: 'var(--attacker)',
        defender: 'var(--defender)',
        anomalous: 'var(--anomalous)',
      },
      fontFamily: {
        mono: 'var(--font-mono)',
        sans: 'var(--font-sans)',
      },
      maxWidth: { read: '46rem', shell: '90rem' },
      transitionTimingFunction: {
        out: 'cubic-bezier(.16, 1, .3, 1)',
        in: 'cubic-bezier(.5, 0, .75, 0)',
      },
    },
  },
  plugins: [],
}

export default config
