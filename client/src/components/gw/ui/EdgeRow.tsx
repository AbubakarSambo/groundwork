import React from 'react'
import { Link } from 'react-router-dom'
import { useTheDesignSystem } from './the-design-system'
import './gw-ui.css'

/**
 * EDGE LIST / EDGE ROW (prototype: .list, .item, .sp, app.css) - `NeedsYouRow` made general.
 *
 * A 4px edge with 2px corners, the words, and the buttons on the right, 16px apart, 16px above and
 * below, a 1px line above the first row and under each. Title 17px bold; line 15px muted. On a
 * phone the buttons drop under the words. Used for "Waiting to be let in", the no-seat warning, and
 * anything that needs you (design-audit.md item 7).
 */
export type EdgeKind = 'ready' | 'decide' | 'look' | 'concern'

/*
 * SECOND BOARD REVIEW, WORDING: "A decision for you." and "Something to look at." read, for a
 * screen reader, as a floating label stapled in front of whatever the row actually says - not a
 * sentence, since neither says what decision or what to look at; the title that follows is already
 * a full sentence of its own. See kit.tsx's own `NEED_REASON`, the same fix there. "Ready to read."
 * and "A problem." are kept: both name a real state the title does not otherwise carry.
 *
 * WALKTHROUGH PASS 2, ITEM 5: "A problem." IS A FRAGMENT, NOT A SENTENCE. It has no subject and no
 * verb, unlike "Ready to read." (which is a complete imperative). Said in full instead: "There is a
 * problem."
 */
const EDGE_REASON: Partial<Record<EdgeKind, string>> = {
  ready: 'Ready to read.',
  concern: 'There is a problem.',
}

export function EdgeRow({ kind, title, detail, actions, reason: givenReason, to }: {
  /** What the edge colour means, for a screen reader, where the kind's own reason does not fit; null for none. */
  reason?: string | null
  /** Where the whole row goes when it is tapped (the prototype's phone rows have no button of their own). */
  to?: string
  /** Why the row is here, drawn as a small dot. On a rebuilt page a plain row may leave it out. */
  kind?: EdgeKind
  title: string
  /** Usually one sentence; the no-seat warning also lists each person waiting under it. */
  detail?: React.ReactNode
  /** One or two buttons. The first is the main one. */
  actions?: React.ReactNode
}) {
  /*
   * WALKTHROUGH PASS 2, ITEM 1: "Ready to read." BEFORE EVERY TITLE THAT ALREADY SAYS SO.
   *
   * Every report row's title already reads "...is ready" ("The report for Sales team, Q3 is
   * ready"), so the sr-only "Ready to read." that used to go in front of every one of them repeated
   * the same word a screen reader had just been given no reason to need twice. Said once would mean
   * never, here, since the title always carries it; said only when the title does not already say
   * "ready" leaves the word in exactly where a reader needs it and nowhere it is already said.
   */
  const reason = givenReason !== undefined ? givenReason : typeof title === 'string' && title.toLowerCase().includes('ready') ? undefined : (kind ? EDGE_REASON[kind] : undefined)
  /* The prototype's row in a list (.item): a coloured edge (.sp), the line and its detail (.h, .s), then the action. */
  const edge = ({ ready: 'rec', decide: 'act', look: 'att', concern: 'con' } as Record<string, string>)[kind ?? 'decide'] ?? 'act'
  /*
   * ON A REBUILT PAGE, THE DESIGN SYSTEM'S ROW (rule 9): a small dot when the row has a kind, the
   * title at 18px and its detail at 14px, then its actions on the right as links (blocks.css).
   */
  const ds = useTheDesignSystem()
  if (ds) {
    return (
      <div className={kind ? 'ds-row ds-row-dotted' : 'ds-row'} role="listitem">
        {kind && <i className={`ds-row-dot ${edge}`} aria-hidden />}
        <div className="ds-row-main">
          {reason && <span className="gwui-sr-only">{reason} </span>}
          <p className="ds-text-card">{to ? <Link to={to} className="ds-row-link">{title}</Link> : title}</p>
          {detail && <div className="ds-text-secondary">{detail}</div>}
        </div>
        {actions && <div className="ds-row-actions">{actions}</div>}
      </div>
    )
  }
  return (
    <div className="item" role="listitem">
      <i className={`sp ${edge}`} aria-hidden />
      <div className="gw-min0">
        {reason && <span className="gwui-sr-only">{reason} </span>}
        <div className="h">{to ? <Link to={to} className="gw-row-link">{title}</Link> : title}</div>
        {detail && <div className="s">{detail}</div>}
      </div>
      {actions && <span className="acts gw-acts">{actions}</span>}
    </div>
  )
}

export function EdgeList({ label, children }: { label: string; children: React.ReactNode }) {
  const ds = useTheDesignSystem()
  return <div className={ds ? 'ds-rows' : 'list'} role="list" aria-label={label}>{children}</div>
}
