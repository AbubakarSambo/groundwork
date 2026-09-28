import React from 'react'
import './gw-ui.css'

/**
 * SECTION (prototype: section.sec, .sec-h, .note, app.css).
 *
 * A heading row: the heading at 21px bold ink, and an optional note on the right at 14.5px muted,
 * lined up on the text's baseline, wrapping below on a narrow screen; the content 14px below; an
 * optional 13.5px muted note at the end. Headings are never navy (design-audit.md item 5).
 */
export function Section({ heading, note, foot, children }: {
  heading: string
  note?: string
  foot?: string
  children: React.ReactNode
}) {
  return (
    <section className="gwui-section">
      <div className="gwui-section-h">
        <h2 className="gwui-section-title">{heading}</h2>
        {note && <span className="gwui-section-note">{note}</span>}
      </div>
      <div className="gwui-section-body">{children}</div>
      {foot && <p className="gwui-section-foot">{foot}</p>}
    </section>
  )
}
