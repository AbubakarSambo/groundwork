/**
 * HOW IT IS GOING, AND WHAT IS IN THE WAY - ONE COMPONENT, BECAUSE IT BELONGS IN THREE PLACES.
 *
 * A manager asked for the same two facts on the check-in list, on the boards page and at the top of
 * the board itself. Written three times they would drift three ways, and this product has already
 * paid for that four times over - four copies of the card names, five of the groupings, two of the
 * durations.
 *
 * WHAT IT IS NOT. Not the finding: that is one ranked line, whichever read came out highest that
 * round, and it is neither "how far through" nor "what is stuck". Not a score, and not an arrow.
 * The two questions here are the ones somebody running a team actually opens a screen to answer.
 *
 * Both halves always draw. "Nothing" is an answer; an empty slot reads as a page that failed.
 */
import { BOARD_MUTED_INK, BOARD_BODY_INK, BOARD_ACCENT_INK } from './the-board-reads-on-a-dark-ground'

export interface Glance {
  progress: { roundsDone: number; roundsPlanned: number | null; answeredThisRound: number; ofPeople: number }
  inTheWay: { count: number; oldest: string | null; daysWaiting: number | null }
}

/**
 * THE SUMMARY, WHICH IS THE PARAGRAPH AND NOT THE HEADLINE.
 *
 * The last round's shared picture, cut to three sentences on the server, in plain words, about how
 * it is actually going. Falls back to the brief only where no round has finished - a check-in
 * nobody has answered has no picture yet and still has to say what it is for.
 */
export function HowItIsGoing({ summary, brief, glance, tone = 'light' }: {
  summary?: string | null
  brief?: string | null
  glance?: Glance | null
  /* On the board's dark header the same inks would be invisible. Nothing else changes. */
  tone?: 'light' | 'dark'
}) {
  const ink = tone === 'dark'
    ? { body: BOARD_BODY_INK, quiet: BOARD_MUTED_INK, strong: '#FFFFFF', rule: BOARD_ACCENT_INK, warn: '#F5C97A' }
    : { body: 'var(--gw-text)', quiet: 'var(--gw-muted)', strong: 'var(--gw-text)', rule: 'var(--gw-amber-b)', warn: 'var(--gw-amber-t)' }
  const late = (glance?.inTheWay.count ?? 0) > 0
  return (
    <>
      {summary
        ? (
          <div style={{ fontSize: 12.5, color: ink.body, lineHeight: 1.55, marginBottom: 10, borderLeft: `2px solid ${ink.rule}`, paddingLeft: 10 }}>
            {summary}
          </div>
        )
        : brief
          ? <div style={{ fontSize: 12, color: ink.quiet, lineHeight: 1.5, marginBottom: 10 }}>{brief}</div>
          : null}

      {glance && (
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 10, fontSize: 11.5 }}>
          <div>
            <span style={{ color: ink.quiet }}>Progress </span>
            <span style={{ color: ink.strong, fontWeight: 600 }}>
              {/*
                "8 OF 8 ROUNDS" BESIDE "1 OF 4 ANSWERED THIS ROUND" IS A CARD ARGUING WITH ITSELF.
                Past the plan the count drops the total: the rounds are done, the run is still
                going, and how far through is no longer the useful fact.
              */}
              {glance.progress.roundsPlanned && glance.progress.roundsDone < glance.progress.roundsPlanned
                ? `${glance.progress.roundsDone} of ${glance.progress.roundsPlanned} rounds`
                : `${glance.progress.roundsDone} ${glance.progress.roundsDone === 1 ? 'round' : 'rounds'} done`}
            </span>
            {glance.progress.ofPeople > 0 && (
              <span style={{ color: tone === 'dark' ? BOARD_BODY_INK : 'var(--gw-sub)' }}>
                {' · '}{glance.progress.answeredThisRound} of {glance.progress.ofPeople} answered this round
              </span>
            )}
          </div>
          <div>
            <span style={{ color: ink.quiet }}>In the way </span>
            {late
              ? (
                <span style={{ color: ink.warn, fontWeight: 600 }}>
                  {glance.inTheWay.count}
                  {glance.inTheWay.oldest ? ` · ${glance.inTheWay.oldest}` : ''}
                  {glance.inTheWay.daysWaiting != null ? ` (${glance.inTheWay.daysWaiting}d)` : ''}
                </span>
              )
              : <span style={{ color: ink.strong, fontWeight: 600 }}>Nothing</span>}
          </div>
        </div>
      )}
    </>
  )
}
