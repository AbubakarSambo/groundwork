import type { ReactNode } from 'react'
import { Mark } from './Mark'
import './gw-ui.css'

/**
 * SPLIT PAGE (prototype: signin.jpg, the only screen in A2 drawn this way).
 *
 * Added here for group 3, piece 1 (signing in and joining): the sign-in screen's two halves, the
 * form on the cream side and a dark panel beside it with one line about what Groundwork is. On a
 * phone the panel goes, because the form is the only thing somebody on that screen came to do.
 * Every other account screen is the narrow `Page`; this is the one exception, the same way the
 * invitation is `Page`'s own exception (see `Mark`'s comment).
 */
export function SplitPage({ panel, children }: { panel: ReactNode; children: ReactNode }) {
  return (
    <div className="gwui-split">
      <section className="gwui-split-form">
        <Mark />
        <div className="gwui-split-body">{children}</div>
      </section>
      <aside className="gwui-split-panel" aria-label="What Groundwork is">
        {panel}
      </aside>
    </div>
  )
}

/** The panel's one line, in Literata - "Short check-ins, and proof of what actually moved." */
export function SplitPanelLine({ children }: { children: ReactNode }) {
  return <p className="gwui-split-panel-line">{children}</p>
}

/** The panel's two-item list, each with its own dot - "what people say" (a ring) and "what is
    proven" (filled green), the same distinction the rest of the product draws between the two. */
export function SplitPanelList({ items }: { items: { dot: 'said' | 'proven'; text: string }[] }) {
  return (
    <ul className="gwui-split-panel-list">
      {items.map(i => (
        <li key={i.text}>
          <span className={`gwui-split-dot gwui-split-dot-${i.dot}`} aria-hidden />
          {i.text}
        </li>
      ))}
    </ul>
  )
}
