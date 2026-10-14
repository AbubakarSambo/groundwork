import React, { createContext, useContext, useId } from 'react'
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
export function Section({ heading, note, action, foot, children, id, headingRef }: {
  heading: string
  note?: string
  action?: React.ReactNode
  foot?: string
  children?: React.ReactNode
  /** So another part of the same page, or another page, can link straight to this section. */
  id?: string
  /**
   * So a caller can move keyboard focus to this section's own heading once it has scrolled there
   * - a `#your-data`-style arrival, where a click or a reload should land you reading the heading
   * that explains the section, not somewhere on the page with nothing said about where you are
   * (B-221). Carries `tabIndex={-1}` itself, since a heading a caller means to focus this way is
   * never also a stop on the page's own tab order.
   */
  headingRef?: React.Ref<HTMLHeadingElement>
}) {
  const headingId = useId()
  const place = useContext(SectionPlacement)
  const nested = useContext(InsideASection)
  const section = (
    <InsideASection.Provider value={true}>
    <section id={id} className="gwui-section" aria-labelledby={headingId}>
      <div className="gwui-section-h">
        <h2 id={headingId} ref={headingRef} tabIndex={headingRef ? -1 : undefined} className="gwui-section-title">{heading}</h2>
        {note && <span className="gwui-section-note">{note}</span>}
        {action && <span className="gwui-section-action">{action}</span>}
      </div>
      {children !== undefined && <div className="gwui-section-body">{children}</div>}
      {foot && <p className="gwui-section-foot">{foot}</p>}
    </section>
    </InsideASection.Provider>
  )
  return place && !nested ? <>{place(heading, section, { note: note ?? null })}</> : section
}

/**
 * WHERE A SECTION GOES (light prototype, s57 and s58). A page that lays its sections out in boxes
 * of folded lines (the sales board) provides this; every top-level `Section` inside it is then
 * handed to the page, by its heading, to be placed in the right box. The section itself, its
 * words and its buttons, are unchanged: only where it sits changes. A section inside another
 * section stays where it is. With no provider, nothing changes anywhere.
 */
export type PlaceASection = (heading: string, section: React.ReactElement, extra: { note: string | null; key?: string }) => React.ReactNode
export const SectionPlacement = createContext<null | PlaceASection>(null)
const InsideASection = createContext(false)

/**
 * The same placement, for a block that is not drawn as a `Section` (a panel of its own, such as
 * "What to work on next"). `as` is the name it is placed under; `factKey` names the record it is
 * about (a target's id), so the page can find that one's own fact. With no provider, it draws in place.
 */
export function Placed({ as, factKey, children }: { as: string; factKey?: string; children: React.ReactNode }) {
  const place = useContext(SectionPlacement)
  const nested = useContext(InsideASection)
  if (!place || nested) return <>{children}</>
  return <>{place(as, <InsideASection.Provider value={true}>{children}</InsideASection.Provider>, { note: null, key: factKey })}</>
}
