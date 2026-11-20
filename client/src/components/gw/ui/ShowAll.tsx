import { useState, type ReactNode } from 'react'
import './gw-ui.css'
import { useIsAPhone } from '../../../lib/a-phone-is-not-a-narrow-desktop'

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

/**
 * A LONG LIST IS CUT ON A PHONE, NEVER ON A DESKTOP (Hafsah, 15 November: a desktop page of two hundred rows is a normal page; two hundred
 * stacked rows on a phone were forty thousand pixels). The first rows are drawn, then "Show the other N"; nothing is gone.
 */
export function OnAPhoneShowFirst<T>({ items, render, first = 10 }: {
  items: T[]
  render: (item: T, index: number) => ReactNode
  first?: number
}) {
  const phone = useIsAPhone()
  const [all, setAll] = useState(false)
  const cut = phone && !all && items.length > first
  const shown = cut ? items.slice(0, first) : items
  return (
    <>
      {shown.map(render)}
      {cut && (
        <button type="button" className="gwui-show-all" onClick={() => setAll(true)}>
          {`Show the other ${items.length - first}`}
        </button>
      )}
    </>
  )
}
