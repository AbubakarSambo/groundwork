/**
 * A LONG LIST IS NOT A PAGE.
 *
 * Hafsah, 23 September 2026: "if you can collapse anything on the tool from people on the people
 * page etc, lets do it, this platform may fail at a 100 people org."
 *
 * Driven against a hundred-person check-in: the server answered in 43ms and the page rendered in
 * 0.3 seconds, so nothing was broken - and the Context tab was 14,866 pixels tall, with a hundred
 * one-row groups in the targets table and a hundred identical lines under what people are down as
 * doing. Nobody reads that; they scroll past it, which is the same as it not being there.
 *
 * So every list that grows with the team shows the first few and says how many more there are. The
 * count is the point: "and 94 more" tells a lead something that ninety-four rows do not.
 */
import { useState } from 'react'

export function ShowAFew<T>({
  rows,
  few = 6,
  what,
  children,
}: {
  rows: T[]
  /** How many before it stops. Six is about a screen of rows at this page's density. */
  few?: number
  /** What these are, for the line that offers the rest: "more people", "more to-dos". */
  what: string
  children: (row: T, index: number) => React.ReactNode
}) {
  const [all, setAll] = useState(false)
  const shown = all ? rows : rows.slice(0, few)
  const hidden = rows.length - shown.length
  return (
    <>
      {shown.map((r, i) => children(r, i))}
      {hidden > 0 && (
        <button
          onClick={() => setAll(true)}
          style={{
            display: 'block', width: '100%', textAlign: 'left', padding: '9px 13px',
            fontSize: 12, fontWeight: 700, color: 'var(--gw-navy)', background: 'none',
            border: 'none', borderTop: '1px solid var(--gw-line)', cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          Show {hidden} more {what}
        </button>
      )}
      {all && rows.length > few && (
        <button
          onClick={() => setAll(false)}
          style={{
            display: 'block', width: '100%', textAlign: 'left', padding: '9px 13px',
            fontSize: 12, color: 'var(--gw-sub)', background: 'none',
            border: 'none', borderTop: '1px solid var(--gw-line)', cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          Show fewer
        </button>
      )}
    </>
  )
}
