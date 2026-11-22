import type { ReactNode } from 'react'
import './gw-ui.css'
import { useTheDesignPass } from '../../../lib/the-design-pass'

/**
 * FOLDED PANEL (design-audit.md section 3, People item 6: "Who reports to whom").
 *
 * A native `<details>`, styled as a closed `Panel` - 66px tall shut, the same 20 by 22 pixels
 * inside and 12-pixel corners as `Panel`, opening with no script. The summary row carries a bold
 * label (16px, ink) and an optional muted note beside it (14.5px), the way "Who reports to whom"
 * sits next to "Level and reporting lines describe the organisation...".
 */
export function Folded({ summary, note, children, open, onToggle, id, defaultOpen }: {
  summary: string
  note?: ReactNode
  children: ReactNode
  /**
   * CONTROLLED, for a caller that must keep the closed body OUT OF THE DOM entirely (not merely
   * hidden by the browser), e.g. so a closed row's private detail is never there to be read by a
   * test, or by anyone, until it is opened. Leave both out for the plain, uncontrolled disclosure
   * every other caller uses, which opens with no script and keeps its children in the DOM always.
   */
  open?: boolean
  onToggle?: (open: boolean) => void
  /** So another part of the same page can point at this fold and open it - see `scrollTo` callers. */
  id?: string
  /** Uncontrolled and open to begin with: the list is on the page, and a reader can still close it (Hafsah, 13 November 2026: nothing starts folded that need not). */
  defaultOpen?: boolean
}) {
  const isControlled = onToggle !== undefined
  /* The design pass (Hafsah, 21 November: "remove the fold line"): no toggle line. Its words are a plain heading and what it held is
     shown, always, with its note under the heading. */
  const designPass = useTheDesignPass()
  if (designPass) {
    return (
      <section id={id} className="dp-unfolded" aria-label={summary}>
        <h3 className="dp-unfolded-h">{summary}</h3>
        {note && <p className="dp-row-line">{note}</p>}
        <div className="dp-unfolded-body">{children}</div>
      </section>
    )
  }
  return (
    <details id={id} className="gwui-folded" open={isControlled ? open : defaultOpen || undefined}>
      {/*
        CONTROLLED MODE HANDLES ITS OWN CLICK, RATHER THAN THE NATIVE `toggle` EVENT: a real browser
        dispatches `toggle` when a summary click flips `<details>`'s own `open`, but that is the
        browser acting on its own DOM state, not React's - relying on it here would let the two
        disagree for a moment, and it is not dispatched reliably everywhere a controlled disclosure
        like this one is tested. `preventDefault` stops the native toggle outright, and `onToggle`
        is the single source of truth for whether this row is open.
      */}
      <summary
        className="gwui-folded-summary"
        onClick={isControlled ? (e) => { e.preventDefault(); onToggle!(!open) } : undefined}
      >
        <b>{summary}</b>
        {note && <span className="gwui-folded-note">{note}</span>}
      </summary>
      <div className="gwui-folded-body">{isControlled ? (open && children) : children}</div>
    </details>
  )
}
