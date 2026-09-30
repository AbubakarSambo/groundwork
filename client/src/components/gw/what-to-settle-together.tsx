/**
 * ONE QUESTION, ONE NAME, AND WHAT TO DO WITH IT.
 *
 * The same field was drawn in three places under two different names: "The question this turns on"
 * on the board, "The one thing to settle first" on the report and on a party's shared picture. A
 * person who read the board and then their report saw what looked like two different things.
 *
 * AND BOTH NAMES WERE WRONG ABOUT IT. "The one thing" was almost always two questions welded
 * together. "To settle first" reads as a job for whoever is looking at the screen, when this is a
 * question for the group - and nothing anywhere said who was meant to answer it, or when. Somebody
 * read a question and had nowhere to put it.
 *
 * So: one name, said once, with the line that makes it actionable. The question itself is the
 * model's, written from what these people said.
 *
 * BOARD REVIEW, 30 SEPTEMBER: rebuilt from the shared parts to join `REBUILT_PAGES` - every size
 * was below the prototype's own 13px floor (a 10.5px label, a 12px note), and every colour was an
 * inline `style`, which the size guard now refuses outright on a listed page. Colour still depends
 * on the ground this sits on (the board's dark header, or the light report/board page), so each ink
 * is a CSS custom property the caller sets on the wrapper, read back by a class that never changes -
 * the same `--gwui-tone` pattern `WhatSuccessLooksLike` and `how-it-is-going.tsx` already use.
 */
import './ui/gw-ui.css'
import { BOARD_MUTED_INK, BOARD_BODY_INK } from './the-board-reads-on-a-dark-ground'

export function WhatToSettleTogether({ question, tone = 'light' }: {
  question: string | null | undefined
  /* The board is the one dark surface in this product. Nothing else changes. */
  tone?: 'light' | 'dark'
}) {
  if (!question?.trim()) return null
  const vars = tone === 'dark'
    ? {
        ['--gwui-settle-label' as any]: BOARD_MUTED_INK,
        ['--gwui-settle-body' as any]: BOARD_BODY_INK,
        ['--gwui-settle-note' as any]: BOARD_MUTED_INK,
      }
    : {
        ['--gwui-settle-label' as any]: 'var(--gw-muted)',
        ['--gwui-settle-body' as any]: 'var(--gw-text)',
        ['--gwui-settle-note' as any]: 'var(--gw-sub)',
      }
  return (
    <div style={vars}>
      {/* U.9 THIRD REVIEW, ITEM 4: A HEADING IS SAID, NOT SHOUTED. Capitals and letter-spacing
          turned a plain heading into "WHAT TO SETTLE TOGETHER", the same pattern already fixed
          elsewhere on the report and the session pages. */}
      <div className="gwui-settle-label">What to settle together</div>
      <div className="gwui-settle-body">{question}</div>
      {/* Where it goes. A question with nowhere to put it is a question somebody reads and drops. */}
      <div className="gwui-settle-note">Bring this to your next check-in.</div>
    </div>
  )
}
