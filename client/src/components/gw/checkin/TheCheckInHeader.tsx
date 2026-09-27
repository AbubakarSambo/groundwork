import { useEffect, useRef, useState } from 'react'

/**
 * THE CHECK-IN'S HEADER (B3, docs/prototype/screens/B3-the-check-in/check-in-start.txt).
 *
 * "Sales team check-in", a line under it, and "Pause" on the right. The line under it says
 * "That’s everything for today" once Groundwork has closed the conversation (check-in-end-card.txt).
 * The prototype's "About two minutes" is not shown: nothing in the record says how long a check-in
 * takes, and a promise of two minutes on a probation review would not be true.
 *
 * PAUSE OPENS TWO CHOICES, and both are things the product already does:
 *   Stop for now        leave; every answer is already saved (nothing is sent on leaving)
 *   Skip this check-in  the existing decline, which still asks first and says what follows
 * No prototype screen shows the menu open, so its words are the fewest plain ones, listed in the
 * morning report for Hafsah.
 */
export function TheCheckInHeader({
  title,
  underTitle,
  mayPause,
  onStopForNow,
  onSkip,
}: {
  title: string
  /** The line under the title. Null draws nothing. */
  underTitle: string | null
  /** Whether Pause is offered at all: not before the check-in opens, and not once it is finished. */
  mayPause: boolean
  /** Leave out where there is nowhere to go back to, as in the one-question link. */
  onStopForNow?: () => void
  /** Leave out to offer only "Stop for now". */
  onSkip?: () => void
}) {
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)

  /* A menu that stays open after you look away covers the conversation. */
  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false) }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc) }
  }, [open])

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, padding: '14px 18px', borderBottom: '1px solid var(--gw-border)', background: 'white', flexShrink: 0 }}>
      <div style={{ minWidth: 0 }}>
        <h1 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--gw-text)', lineHeight: 1.35, overflowWrap: 'anywhere' }}>{title}</h1>
        {underTitle && <div style={{ fontSize: 13, color: 'var(--gw-sub)', marginTop: 2 }}>{underTitle}</div>}
      </div>
      {mayPause && (onStopForNow || onSkip) && (
        <div ref={box} style={{ position: 'relative', flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => setOpen(o => !o)}
            aria-expanded={open}
            aria-haspopup="true"
            style={{ background: 'none', border: 'none', padding: '6px 4px', fontSize: 14, fontWeight: 700, color: 'var(--gw-navy)', cursor: 'pointer', fontFamily: 'inherit', minHeight: 36 }}
          >
            Pause
          </button>
          {open && (
            <div role="menu" style={{ position: 'absolute', right: 0, top: 40, zIndex: 30, background: 'white', border: '1px solid var(--gw-border)', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', padding: 6, width: 260 }}>
              {onStopForNow && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => { setOpen(false); onStopForNow() }}
                  style={menuItem}
                >
                  <span style={{ fontWeight: 700, color: 'var(--gw-text)' }}>Stop for now</span>
                  <span style={{ fontSize: 12.5, color: 'var(--gw-sub)', lineHeight: 1.45 }}>Everything you have said is saved. You can come back to it any time.</span>
                </button>
              )}
              {onSkip && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => { setOpen(false); onSkip() }}
                  style={menuItem}
                >
                  <span style={{ fontWeight: 700, color: 'var(--gw-text)' }}>Skip this check-in</span>
                  <span style={{ fontSize: 12.5, color: 'var(--gw-sub)', lineHeight: 1.45 }}>You can say no. You will see what that means before anything is recorded.</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const menuItem: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2, width: '100%',
  padding: '10px 12px', borderRadius: 8, background: 'none', border: 'none', cursor: 'pointer',
  fontFamily: 'inherit', fontSize: 14, textAlign: 'left',
}
