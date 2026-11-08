import type { Dictionary } from '@/i18n/dictionary'

export function SiteFooter({ dict }: { dict: Dictionary }) {
  return (
    <footer className="border-t border-line-mid">
      <div className="mx-auto flex max-w-shell flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-[11px] text-ink-muted">
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" style={{ color: 'var(--inert)' }}>
            ·
          </span>
          {dict.footer.simulated}
        </span>
        <span className="ms-auto">SecViz</span>
      </div>
    </footer>
  )
}
