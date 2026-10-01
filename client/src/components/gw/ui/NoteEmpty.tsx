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

export function Callout({ tone, title, role, children }: {
  /**
   * 'success' for a fact that just became true, e.g. "You are in." (green, `role="status"`).
   * 'warning' for something the person should know, not an error (amber, group 3, piece 1: a
   * passwordless account told it has been emailed a link, a session that expired).
   * 'info' for an instruction that matters now but is neither of those (blue, group 3, piece 4:
   * "Save this to receive the report.").
   * 'concern' for something broken that needs fixing, not only knowing (red, group 3, piece 5: an
   * invite that bounced, with nobody able to get in until the lead acts).
   */
  tone?: 'success' | 'warning' | 'info' | 'concern'
  /**
   * A bold first line above the sentence, the same two-line shape `AuthNotice` (auth-kit.tsx)
   * already draws for its amber notices - added here so every tone can use it, not only warning.
   * Leaving it out keeps the single-paragraph shape every existing caller already renders.
   */
  title?: string
  role?: React.AriaRole
  children: React.ReactNode
}) {
  const cls = tone === 'success' ? 'gwui-callout-success' : tone === 'warning' ? 'gwui-callout-warning' : tone === 'info' ? 'gwui-callout-info' : tone === 'concern' ? 'gwui-callout-concern' : null
  const className = cls ? `gwui-callout ${cls}` : 'gwui-callout'
  if (title) {
    return (
      <div className={className} role={role}>
        <p className="gwui-callout-title">{title}</p>
        <p className="gwui-callout-body">{children}</p>
      </div>
    )
  }
  return (
    <p className={className} role={role}>
      {children}
    </p>
  )
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
