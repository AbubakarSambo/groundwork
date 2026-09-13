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
 */
import { BOARD_MUTED_INK, BOARD_BODY_INK } from './the-board-reads-on-a-dark-ground'

export function WhatToSettleTogether({ question, tone = 'light' }: {
  question: string | null | undefined
  /* The board is the one dark surface in this product. Nothing else changes. */
  tone?: 'light' | 'dark'
}) {
  if (!question?.trim()) return null
  const ink = tone === 'dark'
    ? { label: BOARD_MUTED_INK, body: BOARD_BODY_INK, note: BOARD_MUTED_INK }
    : { label: 'var(--gw-muted)', body: 'var(--gw-text)', note: 'var(--gw-sub)' }
  return (
    <>
      <div style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '.3px', color: ink.label, fontWeight: 700, marginBottom: 3 }}>
        What to settle together
      </div>
      <div style={{ fontSize: 13, color: ink.body, lineHeight: 1.6, maxWidth: '68ch' }}>{question}</div>
      {/* Where it goes. A question with nowhere to put it is a question somebody reads and drops. */}
      <div style={{ fontSize: 12, color: ink.note, marginTop: 6 }}>Bring this to your next check-in.</div>
    </>
  )
}
