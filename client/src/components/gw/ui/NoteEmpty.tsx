import React from 'react'
import { Panel } from './Panel'
import './gw-ui.css'

/**
 * NOTE / CALLOUT / EMPTY (prototype: .note, a plain sentence, a locked-door panel, app.css).
 *
 * `Note` is 13.5px muted; pass `tone="error"` for a problem the person needs to act on (13.5px
 * red, announced as an alert). `Callout` is the tinted line the prototype shows above the
 * invitation's heading (s44.js: `background:var(--chat)`, 10px corners, 10/14px inside, 14.5px
 * text) - one sentence that matters more than the page around it, e.g. who can see what you say.
 * `Empty` says it in a sentence where the thing would be: a 14.5px muted line by default, or for
 * a door you cannot open, a `Panel` up to 640px wide with a 21px heading, one sentence and at
 * most one button ("Only an admin at Baridi can change this. Grace Achieng is your admin.").
 */
export function Note({ tone, children }: { tone?: 'error'; children: React.ReactNode }) {
  return (
    <p className={tone === 'error' ? 'gwui-note gwui-note-error' : 'gwui-note'} role={tone === 'error' ? 'alert' : undefined}>
      {children}
    </p>
  )
}

export function Callout({ children }: { children: React.ReactNode }) {
  return <p className="gwui-callout">{children}</p>
}

export function Empty({ title, children, action }: {
  /** With a title, this draws the locked-door panel instead of a plain line. */
  title?: string
  children: React.ReactNode
  action?: React.ReactNode
}) {
  if (!title) {
    return <p className="gwui-empty-line">{children}</p>
  }
  return (
    <Panel>
      <div className="gwui-empty-panel">
        <h2 className="gwui-empty-panel-title">{title}</h2>
        <p className="gwui-empty-panel-body">{children}</p>
        {action && <div className="gwui-empty-panel-action">{action}</div>}
      </div>
    </Panel>
  )
}
