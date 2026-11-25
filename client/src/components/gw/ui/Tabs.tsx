import React, { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useTheDesignSystem } from './the-design-system'
import './gw-ui.css'

/**
 * TABS (prototype: .tabs / .tab / .tab.on, app.css).
 *
 * Each tab is 46px tall, 14px at the sides, 16px, muted; the chosen tab is ink, bold, with a 3px
 * navy underline; a 1px line runs under the whole row; the row scrolls sideways on a phone.
 *
 * BUG FIX (design-audit.md section 2, "Lines": "The check-in header's tabs use 2 pixels, not 3" and
 * "every tab is underlined"): only the chosen tab gets a visible underline. The others get a 3px
 * TRANSPARENT border of the same weight, so nothing shifts when the choice changes, but nothing is
 * drawn under a tab that is not chosen.
 *
 * GROUP 3 REVIEW, BATCH B: AT 375px THE CHOSEN TAB CAN OPEN OFF SCREEN. The row scrolls sideways
 * (`overflow-x: auto` above), and a reader can land on a page with its later tab already chosen -
 * "My work" on the lead's own check-in page, say - with the row still scrolled to its own start, so
 * the one tab that says where they are sits past the right edge, unseen, on a phone. Scrolled into
 * view as soon as the page opens, and again whenever the choice changes under this same row (the
 * report tab redirecting elsewhere does not touch this - a changed `active` prop is what moves it).
 *
 * B-203 (review round 2): AT 390px THE ROW COULD STILL OPEN MID-WORD, EVEN AFTER THE FIRST FIX.
 *
 * `inline: 'nearest'` moved the row only as far as needed for the CHOSEN tab to be fully on
 * screen, which could leave an earlier tab's own label cut in half right at the left edge - read
 * live as Pia on Riverbank's "Okr alignment" at 390px, ?tab=report: the row opened on "eck-in |
 * Context and resources | My work", half of "Check-in" sitting past the fade with no way to tell it
 * was ever a whole word.
 *
 * Asking the browser for `inline: 'start'` instead (scroll the chosen tab's own left edge to the
 * row's left edge) turned out not to be enough either: when the chosen tab sits near the END of the
 * row, there is not enough content to its right for the browser to scroll that far - the scroll
 * clamps to the row's actual maximum, which can itself land mid-tab. Read live on the very same
 * page: "My work" is the fourth of five tabs, and the clamped position still showed "resources",
 * the back half of "Context and resources", sitting whole and unlabelled in front of it.
 *
 * So the target is worked out by hand, below: the chosen tab's own left edge, clamped to the row's
 * real maximum scroll, then rounded DOWN to the nearest tab's own left edge at or before that
 * point. Whichever tab the row lands on, the left edge of the visible row is always THAT tab's own
 * start - never a cut word, whether or not it is the chosen tab itself.
 *
 * B-203 (review round 3): THE ROW STILL LANDED 18px PAST A TAB'S OWN START, AT 390px.
 *
 * `el.offsetLeft` is an element's distance from its nearest POSITIONED ancestor (or, failing that,
 * the page) - not from this row. `.gwui-tabs` itself is never given `position: relative`, so each
 * tab's `offsetLeft` was being measured from further out, picking up whatever sits outside the row
 * (here, the page's own 18px side gutter) on top of the tab's real position inside it. Read live as
 * Pia on Riverbank's "Okr alignment" at 390px: ?tab=report opened on "ontext and resources | My work
 * | People a" - "Context" cut to "ontext" by that stray 18px - and ?tab=checkin opened on "heck-in".
 * `offsetLeftInRow` below measures each tab against the ROW's own edge instead, with
 * `getBoundingClientRect`, which is never thrown off by what the row's own ancestors do.
 */
function offsetLeftInRow(el: HTMLElement, row: HTMLElement): number {
  return el.getBoundingClientRect().left - row.getBoundingClientRect().left + row.scrollLeft
}
export type TabItem = { key: string; label: string; to?: string }

export function Tabs({ items, active, onChange, label }: {
  items: TabItem[]
  active: string
  /** Called when a tab with no `to` is pressed (for tabs that switch state rather than navigate). */
  onChange?: (key: string) => void
  label?: string
}) {
  /* ON A REBUILT PAGE (rule 11): the design system's tabs, which share the row so every tab fits at 390px without scrolling (blocks.css). */
  const ds = useTheDesignSystem()
  const rowRef = useRef<HTMLDivElement>(null)
  const tabRefs = useRef(new Map<string, HTMLAnchorElement | HTMLButtonElement>())

  useEffect(() => {
    const row = rowRef.current
    const activeEl = tabRefs.current.get(active)
    // Not every environment that hands this a row hands it a real scroller (jsdom's tests
    // included, which implement none of the layout or scroll APIs below) - scrolling a tab row
    // into place is a nicety, and must never be fatal. Same guard `lib/scroll-to.ts` keeps for the
    // page-level version of this.
    if (!row || !activeEl || typeof row.scrollTo !== 'function') return

    const maxScroll = Math.max(0, row.scrollWidth - row.clientWidth)
    const wanted = Math.min(offsetLeftInRow(activeEl, row), maxScroll)
    /* The largest tab-start offset at or before the clamped target - always a whole tab, in the
       row's own left-to-right order, so the first one found at or past `wanted` ends the search. */
    let target = 0
    for (const item of items) {
      const el = tabRefs.current.get(item.key)
      if (!el) continue
      const left = offsetLeftInRow(el, row)
      if (left > wanted) break
      target = left
    }

    const reduce = typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    row.scrollTo({ left: target, behavior: reduce ? 'auto' : 'smooth' })
  }, [active, items])

  /* On a phone a rebuilt tab may wrap between its words, never inside one ("Check-in" stays whole). */
  const words = (label: string) => (ds ? <span>{label.split(' ').map((w, i) => <React.Fragment key={i}>{i > 0 && ' '}<span className="ds-word">{w}</span></React.Fragment>)}</span> : label)
  return (
    <div className={ds ? 'ds-tabs' : 'gwui-tabs'} role="tablist" aria-label={label} ref={rowRef}>
      {items.map(item => {
        const isOn = item.key === active
        const className = ds ? `ds-tab${isOn ? ' ds-tab-on' : ''}` : `gwui-tab${isOn ? ' gwui-tab-on' : ''}`
        const setRef = (el: HTMLAnchorElement | HTMLButtonElement | null) => {
          if (el) tabRefs.current.set(item.key, el)
          else tabRefs.current.delete(item.key)
        }
        if (item.to) {
          return (
            <Link
              key={item.key}
              ref={setRef as React.Ref<HTMLAnchorElement>}
              to={item.to}
              className={className}
              role="tab"
              aria-selected={isOn}
            >
              {words(item.label)}
            </Link>
          )
        }
        return (
          <button
            key={item.key}
            ref={setRef as React.Ref<HTMLButtonElement>}
            type="button"
            className={className}
            role="tab"
            aria-selected={isOn}
            onClick={() => onChange?.(item.key)}
          >
            {words(item.label)}
          </button>
        )
      })}
    </div>
  )
}
