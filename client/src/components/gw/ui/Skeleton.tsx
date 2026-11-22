import { useLayoutEffect, useState, type ReactNode } from 'react'
import { partialMatchKey, useIsFetching, useQueryClient, type Query, type QueryKey } from '@tanstack/react-query'
import './gw-ui.css'

/**
 * SKELETON (design playbook rule 1, "the page arrives finished"): grey shapes the size of the real content, never the word "Loading".
 *
 * One part for every wait a person can see. `what` is for a screen reader only ("Getting your check-ins"), so the wait is still
 * announced; nothing on screen is a word. `shape` is the size of what is coming: `rows` for a list, `cards` for a row of panels,
 * `lines` for a paragraph or a short section. The pulse stops for anybody who has asked their device for less motion.
 */
export function Skeleton({ what, shape = 'rows', count }: {
  /** What is on its way, in a few plain words, for a screen reader: "Getting your check-ins". */
  what: string
  shape?: 'rows' | 'cards' | 'lines'
  /** How many rows, cards or lines; three by default. */
  count?: number
}) {
  const n = count ?? 3
  return (
    <div role="status" aria-busy="true" className={`gwui-skeleton gwui-skeleton-${shape}`}>
      <span className="gwui-sr-only">{what}</span>
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="gwui-skeleton-item" aria-hidden>
          <span className="gwui-skeleton-line gwui-skeleton-line-title" />
          <span className="gwui-skeleton-line gwui-skeleton-line-text" />
        </div>
      ))}
    </div>
  )
}

/**
 * HELD (page loads, 22 November 2026, causes C to H): a page, or the part of it that waits, is drawn whole, once, when its reads are
 * in, so nothing on it ever moves under the reader. Until then the reader sees one Skeleton. The page itself is already mounted out
 * of sight, so every read its parts make for themselves starts at once, beside the page's own. `waiting` is the page's own reads;
 * `alsoFor` names the reads a part makes for itself that would otherwise arrive late and push the page around. Once shown it stays
 * shown; a later refresh never takes it away again. A page whose reads are all in already is shown at once, with no placeholder.
 */
export function Held({ waiting = false, alsoFor = [], what, shape = 'rows', count, children }: {
  /** True while the page's own reads are out. */
  waiting?: boolean
  /** The query keys of reads a part of the page makes for itself, waited for too. */
  alsoFor?: readonly QueryKey[]
  what: string
  shape?: 'rows' | 'cards' | 'lines'
  count?: number
  children: ReactNode
}) {
  const qc = useQueryClient()
  const [ours] = useState(() => (q: Query) => alsoFor.some(k => partialMatchKey(q.queryKey, k)))
  /* Read here only so the page is drawn again when one of those reads comes back. */
  useIsFetching({ predicate: ours })
  const [shown, setShown] = useState(false)
  /* Before the screen is painted, so a page whose reads are all in already is never shown as a placeholder first. The parts have
     rendered by now, so a read they make is in the cache; one that is not, or is switched off, is not being asked and is not waited for. */
  useLayoutEffect(() => {
    if (shown || waiting) return
    const stillOut = alsoFor.some((k) => {
      const q = qc.getQueryCache().find({ queryKey: k })
      if (!q || q.state.data !== undefined || q.state.status === 'error') return false
      const enabled = (q.options as { enabled?: boolean | ((q: Query) => boolean) }).enabled
      return (typeof enabled === 'function' ? enabled(q) : enabled) !== false
    })
    if (!stillOut) setShown(true)
  })
  return (
    <>
      {!shown && <Skeleton what={what} shape={shape} count={count} />}
      <div hidden={!shown} style={shown ? { display: 'contents' } : undefined}>{children}</div>
    </>
  )
}
