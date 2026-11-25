import type { ReactNode } from 'react'
import { metaLine } from './the-design-system'

/**
 * STAT, GRID AND META (the design system, rules 1, 5 and 7, Hafsah, 23 November 2026).
 *
 * `Stat` is one figure: what it counts (14px, muted), the figure itself (Literata 38, tabular), and
 * its date and source on one meta line under it. `Grid` lays cards or stats out in 2, 3 or 4 equal
 * columns, 16px apart, one column on a phone. `Meta` is that one line, written the same way every
 * time: "From Amani's check-in, 21 November." All three read only styles/tokens.css (blocks.css).
 */
export function Stat({ label, value, meta, role }: {
  label: string
  value: string
  /** Where the figure comes from and when, as one line. Use `Meta`'s words. */
  meta?: string | null
  role?: 'listitem'
}) {
  return (
    <div className="ds-stat" role={role}>
      <p className="ds-text-secondary">{label}</p>
      <p className="ds-text-big ds-num">{value}</p>
      {meta && <p className="ds-text-meta">{meta}</p>}
    </div>
  )
}

export function Grid({ columns, label, children }: { columns: 2 | 3 | 4; label?: string; children: ReactNode }) {
  return <div className={`ds-grid ds-grid-${columns}`} role={label ? 'list' : undefined} aria-label={label}>{children}</div>
}

export function Meta({ from, on }: { from: string; on: string }) {
  return <p className="ds-text-meta">{metaLine(from, on)}</p>
}
