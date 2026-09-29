import type { ReactNode } from 'react'

/**
 * A NOTE (prototype: `.note`, app.css - `font-size:13.5px;color:var(--muted)`).
 *
 * Plain, muted, small text in the page's own flow - not a coloured box. The prototype's own use of
 * this (read-only-view.txt, A4): "You can read this check-in's board and reports. Wairimu Kamau
 * runs it." sits as an ordinary line under the tabs, not inside a callout.
 *
 * ROUND 5, ITEM H1: replaces the old blue admin banner and a separate small line that said the
 * same thing twice - a reader who is not the lead used to be told so in two places, in two
 * different visual treatments, on the same screen.
 */
export function Note({ children }: { children: ReactNode }) {
  return (
    <p style={{ fontSize: 13.5, color: 'var(--gw-sub)', lineHeight: 1.6, margin: '10px 0 0' }}>
      {children}
    </p>
  )
}
