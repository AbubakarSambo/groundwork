import { useEffect, useState, type ReactNode } from 'react'

/**
 * A LONG LIST, TEN ROWS A PAGE (Hafsah, 21 November 2026: "Pagination at 10 rows for long lists").
 *
 * FOR MERGING: wip/combined has a shared part for this, `Paged` (client/src/components/gw/ui/Paged.tsx), not committed when this
 * was written. Once it is in, this file goes and its callers use `Paged`. Until then it does the same thing with the parts already
 * here: every row can be reached, the count is always said, and Previous and Next sit at the foot. Ten rows or fewer have no foot.
 */
export function TenAPage<T>({ items, label, children, per = 10 }: {
  items: T[]
  /** What the list is, for the page links ("your commitments"). */
  label: string
  children: (shown: T[]) => ReactNode
  per?: number
}) {
  const [page, setPage] = useState(0)
  const pages = Math.max(1, Math.ceil(items.length / per))
  useEffect(() => { if (page > pages - 1) setPage(0) }, [page, pages])
  const at = Math.min(page, pages - 1)
  const shown = items.slice(at * per, at * per + per)
  return (
    <>
      {children(shown)}
      {items.length > per && (
        <div className="gwui-sentence-row" role="navigation" aria-label={`Pages of ${label}`}>
          <p className="gwui-panel-text-muted">{`Showing ${at * per + 1} to ${Math.min(items.length, at * per + per)} of ${items.length}.`}</p>
          <span>
            <button type="button" className="gwui-plain-link gwui-tap-44" disabled={at === 0} onClick={() => setPage(at - 1)}>Previous</button>
            {' '}
            <button type="button" className="gwui-plain-link gwui-tap-44" disabled={at === pages - 1} onClick={() => setPage(at + 1)}>Next</button>
          </span>
        </div>
      )}
    </>
  )
}
