/**
 * THE TWO THINGS SOMEBODY WANTS AT A GLANCE, AND WHAT THEY REPLACE.
 *
 * "What you record can support, and how your answers are going should be clear, and maybe we use a
 * smiley or some simple way to communicate at the top."
 *
 * Both already existed and neither was legible. "What your record can support" was a five-segment
 * bar with a one-word label beside it - a mark out of a scale nobody can see. "How your answers are
 * going" was a card three screens down, below the sessions, past the carry-forward.
 *
 * THE FACE IS ABOUT THE RECORD AND NEVER ABOUT THE PERSON, and that distinction is the whole reason
 * one is allowed here at all. `specificity-belongs-to-the-person.spec.ts` removed "Overall quality
 * label: low" as "a verdict on a person's writing, handed to them with nothing to do about it". A
 * face on somebody's writing is that verdict with a picture on it. A face on what the RECORD can
 * support is a statement about an artefact, and it comes with the five things that would change it.
 *
 * NO ARROW, DELIBERATELY. `a-trajectory-is-not-a-score.spec.ts` is explicit - "no score, no tier, no
 * arrow" - so the direction is a sentence naming the session it is compared against, which is also
 * the more useful form: "more checkable than session 2" tells you where to look.
 *
 * AND NO TREND UNDER THREE SESSIONS. The server already refuses to compute one, for the reason
 * written next to it: telling somebody their record is "falling" off two numbers is a verdict
 * dressed as an observation.
 */

import { WhatTheReportCanSayYet, type CoverageFacts } from './WhatTheReportCanSayYet'

export type RecordStrength = { score?: number; label?: string; description?: string } | null | undefined

/** done: finished. corrected: finished and later corrected. Anything beyond is still to come. */
export interface SessionDot {
  sessionNumber: number
  state: 'done' | 'corrected' | 'todo'
  /** 0-1, how checkable that session's answers were. Absent until the session has been read. */
  checkable?: number | null
}

/**
 * Three states, from the five-point score the server already returns.
 *
 * Collapsed from five because a person cannot act on the difference between a 2 and a 3, and the
 * thing they can act on is listed underneath either way.
 */
function howMuchItSupports(score?: number): { face: string; says: string; tone: string } {
  if (score != null && score >= 4) {
    return {
      face: '🙂',
      says: 'A fair amount. Someone reading only this would know what happened.',
      tone: 'var(--gw-green-t)',
    }
  }
  if (score != null && score >= 2) {
    return {
      face: '😐',
      says: 'Some of it. You have said what you did; there is not much yet to check it against.',
      tone: 'var(--gw-amber-t)',
    }
  }
  return {
    face: '🙁',
    says: 'Not much yet. Most of this is general, so a reader could not tell what actually happened.',
    tone: 'var(--gw-clay)',
  }
}

/** The direction, as a sentence that names what it is comparing against. */
function howTheAnswersAreGoing(trend: string | undefined, comparedWith: number | null): string | null {
  if (!trend || trend === 'new') return null
  if (!comparedWith) return null
  if (trend === 'rising') return `Your answers are getting more checkable than session ${comparedWith}.`
  if (trend === 'falling') return `Your recent answers carry less detail than session ${comparedWith} did.`
  return `Your answers are about as checkable as session ${comparedWith}.`
}

export function WhatYourRecordCanSupport({
  strength,
  trend,
  sessions,
  totalSessions,
  coverage,
  alsoNoticed,
}: {
  strength: RecordStrength
  trend?: 'rising' | 'steady' | 'falling' | 'new'
  sessions: SessionDot[]
  /**
   * HOW MANY SESSIONS THE RUN HAS, WHICH IS NOT HOW MANY ROWS I HAVE.
   *
   * Built from my check-in rows alone, the strip read "Session 1 of 2" directly under a header
   * saying "Session 2 of 4" - because a row only exists once a session has been opened. Two
   * counters on one screen disagreeing about the same run is worse than having neither.
   */
  totalSessions?: number | null
  /**
   * THE SECOND AXIS, WHICH THE PAGE NEVER HAD. Her diagnosis: three cards, three vocabularies, one
   * verdict, all of them about the person. This one is about the report - what it can and cannot
   * say yet, and why not. It sits inside this card rather than beside it because the reason the
   * picture is thin usually belongs next to the sentence claiming it is thin.
   */
  coverage?: CoverageFacts | null
  /** Patterns the engine noticed. A line here rather than a card - it was the fourth restatement. */
  alsoNoticed?: string[]
}) {
  const read = howMuchItSupports(strength?.score)
  const done = sessions.filter(s => s.state !== 'todo')
  /* Padded to the length of the run, so the dots show what is still to come rather than only what
     has already been opened. */
  const planned = Math.max(totalSessions ?? 0, sessions.length)
  const dots: SessionDot[] = Array.from({ length: planned }, (_, i) => {
    const n = i + 1
    return sessions.find(s => s.sessionNumber === n) ?? { sessionNumber: n, state: 'todo' as const }
  })
  /* The earliest finished session is what a direction is measured from, and naming it is what makes
     the sentence checkable rather than a mood. */
  const going = howTheAnswersAreGoing(trend, done.length >= 3 ? done[0].sessionNumber : null)

  return (
    <div style={{ background: 'white', border: '1px solid var(--gw-border)', borderRadius: 12, padding: '15px 17px' }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <div style={{ fontSize: 26, lineHeight: 1 }} aria-hidden>{read.face}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10.5, letterSpacing: '.09em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--gw-muted)', marginBottom: 3 }}>
            What your record can support
          </div>
          <div style={{ fontSize: 13.5, lineHeight: 1.55, color: 'var(--gw-text)' }}>{read.says}</div>
          {going && (
            <div style={{ fontSize: 12.5, lineHeight: 1.55, color: 'var(--gw-sub)', marginTop: 5 }}>{going}</div>
          )}
        </div>
      </div>

      {dots.length > 0 && (
        <div style={{ marginTop: 13, paddingTop: 11, borderTop: '1px solid var(--gw-border)' }}>
          {/*
            THE BAR CAME BACK, WITH THE THING IT WAS MISSING.

            "The specificity bar etc was good, simple and visual." It was, and it was removed for a
            different fault: a row of coloured bars with no session numbers and no scale said nothing
            about which session was which, so nobody could act on it. That is a labelling problem, not
            a reason to go back to words only.

            So: one bar per session of the run, numbered underneath, empty for the ones not held yet,
            and a plain sentence saying what the height means. A count of finished sessions was the
            wrong thing to put here anyway - "1 of 4 done" is progress through a calendar, and this
            row is about how much each session can support.
          */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 34 }}>
            {dots.map(d => {
              const held = d.state !== 'todo'
              const level = Math.max(0, Math.min(1, d.checkable ?? 0))
              return (
                <div key={d.sessionNumber} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                  <div
                    title={held ? `Session ${d.sessionNumber}` : `Session ${d.sessionNumber} - not yet`}
                    style={{
                      width: '100%', height: 22, borderRadius: 3, position: 'relative',
                      background: held ? 'var(--gw-paper-2)' : 'transparent',
                      border: held ? 'none' : '1px dashed var(--gw-border)',
                      overflow: 'hidden',
                    }}
                  >
                    {held && (
                      <div style={{
                        position: 'absolute', bottom: 0, left: 0, right: 0,
                        height: `${Math.round(Math.max(level, 0.08) * 100)}%`,
                        background: level >= 0.6 ? 'var(--gw-green-t)' : level >= 0.35 ? 'var(--gw-amber-t)' : 'var(--gw-clay)',
                      }} />
                    )}
                  </div>
                  <div style={{ fontSize: 9.5, color: 'var(--gw-muted)', fontVariantNumeric: 'tabular-nums' }}>{d.sessionNumber}</div>
                </div>
              )
            })}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--gw-sub)', marginTop: 7, lineHeight: 1.5 }}>
            Taller means that session was easier for someone else to check. Dotted ones have not
            happened yet.
          </div>
        </div>
      )}

      {coverage && <WhatTheReportCanSayYet facts={coverage} />}

      {/*
        AND WHAT THE ENGINE NOTICED, FOLDED IN RATHER THAN GIVEN A CARD.

        "Observations from your record" was a card of its own at the foot of the page, and it was the
        fourth thing saying the same thing in a fourth vocabulary. Not dropped, though: these reach a
        person on the board too, but only where the scenario renders one - a private alignment
        check-in has no board, and dropping them would take them away from exactly the people with
        nowhere else to read them.
      */}
      {(alsoNoticed?.length ?? 0) > 0 && (
        <div style={{ marginTop: 13, paddingTop: 11, borderTop: '1px solid var(--gw-border)' }}>
          <div style={{ fontSize: 10.5, letterSpacing: '.09em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--gw-muted)', marginBottom: 5 }}>
            Also noticed
          </div>
          <div style={{ display: 'grid', gap: 5 }}>
            {alsoNoticed!.map((t, i) => (
              <div key={i} style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.5 }}>{t}</div>
            ))}
          </div>
        </div>
      )}

      {/* Kept from the card this replaces. Somebody reading a read of their own writing assumes
          their lead is reading it too unless told otherwise. */}
      <div style={{ fontSize: 11, color: 'var(--gw-muted)', marginTop: 10 }}>
        Only you see this. It is never shown to the lead or to anybody else in this check-in.
      </div>
    </div>
  )
}
