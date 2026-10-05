import React from 'react'
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
 */
const EDGE_REASON: Partial<Record<EdgeKind, string>> = {
  ready: 'Ready to read.',
  concern: 'A problem.',
}

export function EdgeRow({ kind, title, detail, actions }: {
  kind: EdgeKind
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
  const reason = typeof title === 'string' && title.toLowerCase().includes('ready') ? undefined : EDGE_REASON[kind]
  return (
    <li className="gwui-edge-row">
      <span className={`gwui-edge-sp gwui-edge-sp-${kind}`} aria-hidden />
      <div style={{ minWidth: 0 }}>
        {reason && <span className="gwui-sr-only">{reason} </span>}
        <div className="gwui-edge-h">{title}</div>
        {detail && <div className="gwui-edge-s">{detail}</div>}
      </div>
      {actions && <div className="gwui-edge-acts">{actions}</div>}
    </li>
  )
}

export function EdgeList({ label, children }: { label: string; children: React.ReactNode }) {
  return <ul className="gwui-edge-list" aria-label={label}>{children}</ul>
}
