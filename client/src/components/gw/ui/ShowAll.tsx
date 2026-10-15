import { useState, type ReactNode } from 'react'
import './gw-ui.css'

/**
 * "SHOW ALL" AFTER THREE (light prototype, s72). A long list shows its first three, then
 * "Show all 8"; the rest is one tap away, never gone. Three or fewer show as they are.
 */
export function ShowAll<T>({ items, render, first = 3 }: {
  items: T[]
  render: (item: T, index: number) => ReactNode
  first?: number
}) {
  const [all, setAll] = useState(false)
  const shown = all ? items : items.slice(0, first)
  return (
    <>
      {shown.map(render)}
      {items.length > first && (
        <button type="button" className="gwui-show-all" aria-expanded={all} onClick={() => setAll(!all)}>
          {all ? 'Show fewer' : `Show all ${items.length}`}
        </button>
      )}
    </>
  )
}
