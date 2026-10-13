import type { ReactNode } from 'react'
import './gw-ui.css'

/**
 * SUB-HEADING (join-invite.jpg: "What it asks", "Who sees your answers", inside the white panel).
 *
 * Smaller than `Section`'s 21px heading - this is the prototype's other kind of heading, the one
 * used for a short label over one fact inside a panel rather than over a whole page section: about
 * 15px, bold, ink, a small gap above its own text and a bigger gap before the next block. Pair it
 * with a plain paragraph and put more than one pair in a `.gwui-subheading-list` for the gap
 * between blocks.
 *
 * `tone="dark"` (group 3, piece 5): the same label, faint white instead of ink, for the one place
 * it sits on a dark panel instead of a white one - a person's private report, previewed on the
 * lead's own roster after they have shared it. Replaces `kit.tsx`'s `Sec title=... on="dark"`.
 *
 * `tone="kicker"` (board task, batch 3): a smaller, quieter label over one block inside a wider
 * read that is not itself a panel - "Settle these before deciding anything", "What people said
 * they would do" on the lead's across-every-session read (`WhatTheRecordShows.tsx`). 13.5px, the
 * prototype's own `.note` size, `--gw-sub` rather than `--gw-text`, 18px above and 7px below -
 * values that component's own local `Head` already drew, named here instead of left as a one-off
 * size, colour and spacing combination.
 */
export function SubHeading({ tone, as, children }: {
  tone?: 'dark' | 'kicker'
  /**
   * BOARD REVIEW, SALES PIECE C, ITEM 10: A COACHING SUBHEADING IS AN h3, NOT A SECOND h2.
   *
   * `WhatToWorkOnNext` and `WhatToProbeThemOn` sit inside a `Panel` under the board's own h2
   * (`Section`'s own heading); each of their own subheadings - "Rukia Otieno", "Worth asking" and
   * the rest - was still an h2, so a page with one section read as several, each starting its own
   * new top-level heading. Defaults to `h2`, which is every other caller's own heading level,
   * unchanged.
   */
  as?: 'h2' | 'h3'
  children: ReactNode
}) {
  const cls = tone === 'dark' ? 'gwui-subheading gwui-subheading-dark' : tone === 'kicker' ? 'gwui-subheading gwui-subheading-kicker' : 'gwui-subheading'
  const Tag = as ?? 'h2'
  return <Tag className={cls}>{children}</Tag>
}
