import React, { useId } from 'react'
import './gw-ui.css'

/**
 * SECTION (prototype: section.sec, .sec-h, .note, app.css).
 *
 * A heading row: the heading at 21px bold ink, and an optional note on the right at 14.5px muted,
 * lined up on the text's baseline, wrapping below on a narrow screen; the content 14px below; an
 * optional 13.5px muted note at the end. Headings are never navy (design-audit.md item 5).
 *
 * `aria-labelledby` points the section at its own heading, so it is a named landmark
 * (`getByRole('region', { name: heading })`) without every caller writing an `aria-label` that
 * could drift from the heading text actually on screen.
 *
 * `action` is for a button (or two) beside the heading, on the right - "Who's in it", People and
 * setup (check-in-people-and-setup.txt): a secondary "Copy an invite link" and a primary
 * "Add people" sit beside that heading, not under it. Separate from `note`, which is a sentence,
 * not a control.
 *
 * `children` IS OPTIONAL (U.10 (b)): the board (BoardPage.tsx) draws a heading, then its content as
 * plain siblings built from `Card`/`Row` further down the same switchboard - rebuilding that content
 * into this component's own body is the next piece of that task, not this one. With no children,
 * only the heading row is drawn: no empty body div, so a heading-only call costs nothing beyond the
 * heading itself, same as the old `Sec size="board"` it replaces.
 */
export function Section({ heading, note, action, foot, children }: {
  heading: string
  note?: string
  action?: React.ReactNode
  foot?: string
  children?: React.ReactNode
}) {
  const headingId = useId()
  return (
    <section className="gwui-section" aria-labelledby={headingId}>
      <div className="gwui-section-h">
        <h2 id={headingId} className="gwui-section-title">{heading}</h2>
        {note && <span className="gwui-section-note">{note}</span>}
        {action && <span className="gwui-section-action">{action}</span>}
      </div>
      {children !== undefined && <div className="gwui-section-body">{children}</div>}
      {foot && <p className="gwui-section-foot">{foot}</p>}
    </section>
  )
}
