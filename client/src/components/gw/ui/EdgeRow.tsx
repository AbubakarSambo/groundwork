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

const EDGE_REASON: Record<EdgeKind, string> = {
  ready: 'Ready to read.',
  decide: 'A decision for you.',
  look: 'Something to look at.',
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
  return (
    <li className="gwui-edge-row">
      <span className={`gwui-edge-sp gwui-edge-sp-${kind}`} aria-hidden />
      <div style={{ minWidth: 0 }}>
        <span className="gwui-sr-only">{EDGE_REASON[kind]} </span>
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
