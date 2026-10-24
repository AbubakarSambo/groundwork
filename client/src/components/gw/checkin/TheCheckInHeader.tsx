import { useEffect, useRef, useState } from 'react'
import '@/components/gw/ui/gw-ui.css'
import { useTheDirectMorning } from '@/lib/the-direct-morning'

/**
 * THE CHECK-IN'S HEADER (B3, docs/prototype/screens/B3-the-check-in/check-in-start.txt).
 *
 * "Sales team check-in", a line under it, and "Pause" on the right. The line under it says
 * "About two minutes" (ROUND 6, ITEM 1: restored - the estimate is about this one conversation,
 * which is honest to say for every check-in, not a claim about the record behind it) until
 * Groundwork has closed the conversation, when it says "That’s everything for today" instead
 * (check-in-end-card.txt). `title`/`underTitle` are the caller's own words - ChatPage.tsx builds
 * both.
 *
 * PAUSE OPENS TWO CHOICES, and both are things the product already does:
 *   Stop for now        leave; every answer is already saved (nothing is sent on leaving)
 *   Skip this check-in  the existing decline, which still asks first and says what follows
 * No prototype screen shows the menu open, so its words are the fewest plain ones, listed in the
 * morning report for Hafsah.
 *
 * GROUP 3, PIECE 3: rebuilt from the shared parts - every size, colour and spacing it draws now
 * lives in gw-ui.css's `.gwui-ci-*` classes rather than an inline style, the same as the rest of
 * this screen.
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
  /* The direct morning (lib/the-direct-morning.tsx): each choice says what it does, and nothing that defends the product. */
  const direct = useTheDirectMorning()
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
    <div className="ci-h">
      <div>
        <b className="t-body" style={{ display: 'block' }}>{title}</b>
        {underTitle && <div className="t-tiny mut">{underTitle}</div>}
      </div>
      {mayPause && (onStopForNow || onSkip) && (
        <div ref={box} className="gwui-ci-pause-wrap">
          <button
            type="button"
            onClick={() => setOpen(o => !o)}
            aria-expanded={open}
            aria-haspopup="true"
            className="btn quiet sm"
          >
            Pause
          </button>
          {open && (
            <div role="menu" className="gwui-ci-menu">
              {onStopForNow && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => { setOpen(false); onStopForNow() }}
                  className="gwui-ci-menu-item"
                >
                  <span className="gwui-ci-menu-item-title">Stop for now</span>
                  <span className="gwui-ci-menu-item-note">{direct ? 'You can come back to it later.' : 'Everything you have said is saved. You can come back to it any time.'}</span>
                </button>
              )}
              {onSkip && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => { setOpen(false); onSkip() }}
                  className="gwui-ci-menu-item"
                >
                  <span className="gwui-ci-menu-item-title">Skip this check-in</span>
                  {!direct && <span className="gwui-ci-menu-item-note">You can say no. You will see what that means before anything is recorded.</span>}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
