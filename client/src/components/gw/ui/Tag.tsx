import React from 'react'
import './gw-ui.css'

/**
 * TAG (prototype: .tag / .tag.rec / .tag.att / .tag.act / .tag.con / .tag.plain, app.css).
 *
 * Brought over from kit.tsx's `Tag` (A1, 26 September): 26px tall, round ends, 13.5px bold, a
 * thin inside line in the tone's own colour. A short fact about a thing, never a label on a
 * person - CLAUDE.md: "No labels on people."
 */
export type TagTone = 'proven' | 'attention' | 'action' | 'concern' | 'plain'

export function Tag({ tone = 'plain', children }: { tone?: TagTone; children: React.ReactNode }) {
  return <span className={`gwui-tag gwui-tag-${tone}`}>{children}</span>
}
