import { useEffect, useState, type ReactNode } from 'react'
import './gw-ui.css'

/**
 * A LONG LIST, TEN ROWS A PAGE (Hafsah, 21 November 2026). One shared part for every long list with the design pass on: People,
 * a check-in's People and setup, the Desk's Who works here. Every row can be reached and the count is always said ("Showing 1 to
 * 10 of 15"), with Previous, the page numbers and Next as quiet links at the foot. Searching and filtering happen before the list
 * is given here, so they run over the whole list, never one page. A list of ten or fewer is drawn whole, with no foot.
 */
export function Paged<T>({ items, render, per = 10, label }: {
  items: T[]
  render: (item: T, index: number) => ReactNode
  per?: number
  /** What the list is, for the page links ("People"). */
  label: string
}) {
  const [page, setPage] = useState(0)
  const pages = Math.max(1, Math.ceil(items.length / per))
  /* A search that leaves fewer rows starts again from the first page. */
  useEffect(() => { if (page > pages - 1) setPage(0) }, [page, pages])
  const at = Math.min(page, pages - 1)
  const shown = items.slice(at * per, at * per + per)
  return (
    <>
      {shown.map((item, i) => render(item, at * per + i))}
      {items.length > per && (
        <li className="dp-pages" aria-label={`Pages of ${label}`}>
          <span className="dp-pages-count">{`Showing ${at * per + 1} to ${Math.min(items.length, at * per + per)} of ${items.length}`}</span>
          <span className="dp-pages-links">
            <button type="button" className="gwui-plain-link" disabled={at === 0} onClick={() => setPage(at - 1)}>Previous</button>
            {Array.from({ length: pages }, (_, n) => (
              <button key={n} type="button" className="gwui-plain-link" aria-current={n === at ? 'page' : undefined} aria-label={`Page ${n + 1} of ${label}`} onClick={() => setPage(n)}>{n + 1}</button>
            ))}
            <button type="button" className="gwui-plain-link" disabled={at === pages - 1} onClick={() => setPage(at + 1)}>Next</button>
          </span>
        </li>
      )}
    </>
  )
}
