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
 */
export function SubHeading({ children }: { children: ReactNode }) {
  return <h2 className="gwui-subheading">{children}</h2>
}
