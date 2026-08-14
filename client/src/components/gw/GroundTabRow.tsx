import { useEffect, useRef } from 'react'
import type { GroundTab } from '@/pages/grounds/ground-tabs'

/**
 * THE TAB ROW, ONCE, AND FINDABLE ON A PHONE.
 *
 * Two problems, and the second is the one she saw.
 *
 * The markup was written twice - the lead's page and the party's page each drew their own row from the
 * shared list, with their own paddings and their own idea of what the active tab looks like. Sharing the
 * list stopped them disagreeing about ORDER; this stops them disagreeing about everything else.
 *
 * And at 390px there are seven tabs in a 390px row. It scrolled, but nothing said so: no fade, no
 * indicator, and the active tab could be off-screen after a reload. So on a phone "Team board" and
 * "Ground settings" simply were not there, which is what she meant by the tabs looking wrong.
 *
 * WHAT THIS DOES ABOUT IT. The active tab is scrolled into view whenever it changes, so a page that
 * opens on Report does not open with Report out of sight. A fade on the right edge appears only when
 * there is more to the right, because a permanent one is decoration and teaches nothing. Nothing is
 * hidden behind a "More" menu: seven destinations that each mean something are not an overflow problem,
 * they are a row you scroll, and hiding half of them behind a chevron is how a tab stops being found at
 * all.
 */
export function GroundTabRow<K extends string>({ tabs, active, onPick }: {
  tabs: GroundTab[]
  active: K
  /** The page's own key for the tab, so neither page has to change its state machine. */
  onPick: (key: GroundTab['key']) => void
}) {
  const row = useRef<HTMLDivElement | null>(null)
  const activeEl = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    /**
     * `nearest` and not `center`: on a wide screen there is nothing to scroll and centring would jump
     * the row for no reason. `block: 'nearest'` keeps the page from scrolling vertically as a side
     * effect, which it did on the first attempt.
     */
    /**
     * Guarded because jsdom has no `scrollIntoView`, and an unguarded call took the whole tab row
     * down in tests - which is also what would happen in any browser that lacked it. A tab that did
     * not scroll into view is a small loss; a tab row that throws is every tab gone.
     */
    const el = activeEl.current
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: 'smooth' })
    }
  }, [active])

  return (
    <div style={{ position: 'relative' }}>
      <div
        ref={row}
        className="gw-tabs-scroll"
        style={{ display: 'flex', borderTop: '0.5px solid var(--gw-border)', overflowX: 'auto' }}
      >
        {tabs.map(t => {
          const isActive = t.key === (active as string)
          return (
            <button
              key={t.key}
              ref={isActive ? activeEl : undefined}
              onClick={() => onPick(t.key)}
              style={{
                flex: '0 0 auto', padding: '10px 16px', fontSize: 12, fontWeight: isActive ? 700 : 500,
                color: isActive ? 'var(--gw-navy)' : 'var(--gw-sub)', background: 'none', border: 'none',
                borderBottom: isActive ? '2px solid var(--gw-navy)' : '2px solid transparent',
                cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
              }}
            >
              {t.label}
            </button>
          )
        })}
      </div>
      {/**
        * The fade, on the right only, and only where the row can actually scroll. `pointerEvents: none`
        * so it cannot swallow a tap on the tab underneath it - which is exactly the bug a decorative
        * overlay introduces.
        */}
      <div
        className="gw-tabs-fade"
        style={{
          position: 'absolute', top: 0, right: 0, bottom: 2, width: 28, pointerEvents: 'none',
          background: 'linear-gradient(to right, transparent, var(--gw-bg))',
        }}
      />
    </div>
  )
}
