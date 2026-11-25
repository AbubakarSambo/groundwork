import React from 'react'
import { Panel } from './Panel'
import { useTheDesignPass } from '../../../lib/the-design-pass'
import { useTheDesignSystem } from './the-design-system'
import './gw-ui.css'

/**
 * NOTE / CALLOUT / EMPTY (prototype: .note, a plain sentence, a locked-door panel, app.css).
 *
 * `Note` is 13.5px, `--gw-sub` by default; pass `tone="error"` for a problem the person needs to act
 * on (13.5px red, announced as an alert). `tone="amber"`/`"green"`/`"navy"` (group 3's drift-list
 * review, part 2) are the same 13.5px line in the product's own amber/green/navy ink, for the
 * one-sentence state a check-in's own header carries above its tabs ("Your turn. It is 1 day
 * late.", "Ended well.") - the same three colours `Tag`'s own tones already draw from, not a new
 * one invented for this. `tone="muted"` (board task, batch 3) is the same 13.5px line in
 * `--gw-muted` - the fainter of the product's two secondary inks (see index.css's own note on
 * `--gw-sub`/`--gw-muted`), already on a one-off muted-colour-plus-13.5px-size pair of classes
 * across several board rows (a person's "ask"/"finding" line, a blocker's history, a record row's
 * caption) - named here rather than left as that pair. `Callout` is the tinted line the prototype shows above the
 * invitation's heading (s44.js: `background:var(--chat)`, 10px corners, 10/14px inside, 14.5px
 * text) - one sentence that matters more than the page around it, e.g. who can see what you say.
 * `tone="emphasis"` (board task, batch 3, part 3): the one thing on the whole board a reader is
 * meant to remember - "The gap", on the lead's judgement (`TheJudgement.tsx`). Blue, like `"info"`,
 * but at the larger size and panel-level padding (20/22px) that single sentence already carried as
 * a one-off box, so naming it here loses nothing: 13.5px navy title, 16px bold near-black body,
 * both read off the box this replaces, not invented for this.
 * `Empty` says it in a sentence where the thing would be: a 14.5px muted line by default, or for
 * a door you cannot open, a `Panel` up to 640px wide with a 21px heading, one sentence and at
 * most one button ("Only an admin at Baridi can change this. Grace Achieng is your admin.").
 */
export function Note({ tone, center, role, children }: {
  tone?: 'error' | 'amber' | 'green' | 'navy' | 'muted'
  /** Centred, as the prototype's own divider line between Google and the email form (signup.jpg). */
  center?: boolean
  /**
   * `'status'` for a line that announces itself as it arrives, e.g. "Getting your report…" (group 3
   * drift list, piece 1). Defaults to `'alert'` for `tone="error"` and nothing otherwise.
   */
  role?: 'status' | 'alert'
  children: React.ReactNode
}) {
  /* ON A REBUILT PAGE, one line of secondary text (rule 5), coloured only by its tone (blocks.css). */
  const ds = useTheDesignSystem()
  if (ds) {
    const tint = ({ error: 'ds-note-con', amber: 'ds-note-att', green: 'ds-note-rec', navy: 'ds-note-act' } as Record<string, string>)[tone ?? '']
    return <p className={tint ? `ds-text-secondary ${tint}` : 'ds-text-secondary'} role={role ?? (tone === 'error' ? 'alert' : undefined)}>{children}</p>
  }
  const className = [
    'gwui-note',
    'gw-line',
    tone === 'error' && 'gwui-note-error',
    tone === 'amber' && 'gwui-note-amber',
    tone === 'green' && 'gwui-note-green',
    tone === 'navy' && 'gwui-note-navy',
    tone === 'muted' && 'gwui-note-muted',
    center && 'gwui-note-centre',
  ].filter(Boolean).join(' ')
  return (
    <p className={className} role={role ?? (tone === 'error' ? 'alert' : undefined)}>
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
  tone?: 'success' | 'warning' | 'info' | 'concern' | 'emphasis'
  /**
   * A bold first line above the sentence, the same two-line shape `AuthNotice` (auth-kit.tsx)
   * already draws for its amber notices - added here so every tone can use it, not only warning.
   * Leaving it out keeps the single-paragraph shape every existing caller already renders.
   */
  title?: string
  role?: React.AriaRole
  children: React.ReactNode
}) {
  const cls = tone === 'success' ? 'gwui-callout-success' : tone === 'warning' ? 'gwui-callout-warning' : tone === 'info' ? 'gwui-callout-info' : tone === 'concern' ? 'gwui-callout-concern' : tone === 'emphasis' ? 'gwui-callout-emphasis' : null
  const className = cls ? `gwui-callout ${cls}` : 'gwui-callout'
  if (title) {
    return (
      <div className={className} role={role}>
        <p className="gwui-callout-title">{title}</p>
        <div className="gwui-callout-body">{children}</div>
      </div>
    )
  }
  /* A DIV, NOT A P (browser test, 20 October 2026): a callout often holds a row with a button in it (People and
     setup's problems), and a <div> inside a <p> is not allowed, so React warned on every opening of that tab. */
  return (
    <div className={className} role={role}>
      {children}
    </div>
  )
}

export function Empty({ title, children, action }: {
  /** With a title, this draws the locked-door panel instead of a plain line. */
  title?: string
  children: React.ReactNode
  action?: React.ReactNode
}) {
  /* The design pass: an empty state is its title, its line and its one action, with no card round them. */
  const designPass = useTheDesignPass()
  /*
   * ON A REBUILT PAGE, THE EMPTY LINE (rule 10): one line and one action, centred, never a box. A
   * title, where one is given, leads the same line in bold, so nothing a caller wrote is lost.
   */
  const ds = useTheDesignSystem()
  if (ds) {
    return (
      <p className="ds-empty">
        {title && <><b>{title}</b>{' '}</>}
        {children}
        {action && <>{' '}{action}</>}
      </p>
    )
  }
  if (!title) {
    return <p className="gwui-empty-line gw-line">{children}</p>
  }
  if (designPass) {
    return (
      <div className="dp-empty">
        <p className="t-body"><b>{title}</b></p>
        <p className="gwui-panel-text">{children}</p>
        {action}
      </div>
    )
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
