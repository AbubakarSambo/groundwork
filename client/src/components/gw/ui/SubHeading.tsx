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
 */
export function SubHeading({ tone, children }: { tone?: 'dark'; children: ReactNode }) {
  return <h2 className={tone === 'dark' ? 'gwui-subheading gwui-subheading-dark' : 'gwui-subheading'}>{children}</h2>
}
