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
 *
 * THE STORY IS THE BOARD'S HEADLINE (board review, 30 September): the reviewer found it drawn at
 * 12.5px, where the prototype (board-as-lead.jpg, s2.js's `.t-title` at 32px) makes it the largest,
 * serif text on the page - "Will we reach 25 sales by 30 September?" above it is the small label,
 * this sentence is the answer, and it is what a lead reads first. `.gwui-how-story` in gw-ui.css now
 * carries that size and font.
 *
 * COLOUR STILL DEPENDS ON THE GROUND. This sits on the board's dark header as well as the light
 * page, so its inks cannot be one fixed value - but a listed page may not set `color` inline either
 * (the guard bans it outright). The way out, already used by `WhatSuccessLooksLike`'s `--gwui-tone`:
 * a CSS *custom property*, which the guard's regex does not treat as a banned prop name, carrying
 * the one value only the caller knows, read back by a class that never changes.
 */
import './ui/gw-ui.css'
import { BOARD_MUTED_INK, BOARD_BODY_INK } from './the-board-reads-on-a-dark-ground'

export interface Glance {
  progress: { roundsDone: number; roundsPlanned: number | null; answeredThisRound: number; ofPeople: number }
  inTheWay: {
    count: number; oldest: string | null; daysWaiting: number | null
    /** Engine merge, 2 October (request 117, part 9): "since 27 September", drawn from the
        wait's own clock so it never changes when the board is opened - unlike `daysWaiting`,
        which creeps forward on every visit. Draw this when it is sent; fall back to the day
        count only when it is absent. */
    sinceSays?: string | null
  }
}

/** "1" reads as a code on a sentence a person reads; "One" is the word. Never touches any other number. */
const spellOne = (n: number) => (n === 1 ? 'One' : String(n))

/**
 * ONE OF THE 12 SESSIONS IS DONE, NOT "1 OF 12 SESSIONS ARE DONE" (board review, 30 September, item
 * 6). The subject is however many sessions are done, so the verb agrees with THAT number, not with
 * the total: one session takes "is", more than one takes "are" - whether or not a total is still
 * named.
 *
 * "SESSION", NOT "ROUND" (real-user walk, Kijani Foods, fault 2): the wording rule says "session"
 * everywhere a person reads about one of these; "round" was the old, jargon word.
 */
function roundsSentence(progress: Glance['progress']): string {
  const { roundsPlanned } = progress
  /*
   * B-057: A COUNT THAT CAN NEVER PASS THE PLANNED NUMBER. E1 on Riverbank Trading's old data
   * (docs/existing-users-check.md) found this board reading "9 sessions are done." on a check-in
   * planned for 8 - the old data gave one person far more completed sessions than the check-in was
   * ever planned to run, because it was put in with that person's own stray session numbers.
   * `roundsDone` is clamped to the planned total here, the one place this sentence is built, so a
   * check-in can never be reported as further along than its own plan allows.
   */
  const roundsDone = roundsPlanned ? Math.min(progress.roundsDone, roundsPlanned) : progress.roundsDone
  const verb = roundsDone === 1 ? 'is' : 'are'
  /* None done yet reads as a sentence, not "0 of the 12 sessions are done." */
  if (roundsDone === 0) return roundsPlanned ? `None of the ${roundsPlanned} sessions is done yet.` : 'No session is done yet.'
  if (roundsPlanned && roundsDone < roundsPlanned) {
    return `${spellOne(roundsDone)} of the ${roundsPlanned} sessions ${verb} done.`
  }
  return `${spellOne(roundsDone)} ${roundsDone === 1 ? 'session is' : 'sessions are'} done.`
}

/**
 * "ANSWERED THIS SESSION", READ NATURALLY (board review, 30 September, second pass). "1 of 1 people
 * have answered" was wrong twice over - "people" for one person, and "have" for a single "1" - and
 * simply making the numbers agree with each other still left "1 of 6 people has answered", which
 * nobody would actually say. Five shapes, the way a person reading the board would say each one:
 *  - nobody yet:            "Nobody has answered this session yet."
 *  - the only person, done: "The one person in this session has answered."
 *  - one of several, done:  "1 of 6 people has answered this session." ("has": the subject is "1")
 *  - several of several:    "4 of 6 people have answered this session."
 *  - everybody, more than one: "Everybody has answered this session."
 */
function answeredSentence(progress: Glance['progress'], readerIsTheOnlyPerson?: boolean): string {
  const { answeredThisRound: a, ofPeople: n } = progress
  if (a === 0) return 'Nobody has answered this session yet.'
  /*
   * THE FOUNDER'S OWN CHECK-IN BOARD, AND ANY OTHER ONE-PERSON CHECK-IN READ BY THAT PERSON
   * (founder.txt): "The one person in this session has answered." talks about the reader in the
   * third person, on their own board - "You have answered this session." says the same true thing,
   * the way the rest of the board already speaks to "you". A reader who is NOT that person (a
   * read-only admin, say) still reads the third-person sentence, unchanged.
   */
  if (n === 1) return readerIsTheOnlyPerson ? 'You have answered this session.' : 'The one person in this session has answered.'
  if (a === n) return 'Everybody has answered this session.'
  return `${a} of ${n} people ${a === 1 ? 'has' : 'have'} answered this session.`
}

/**
 * THE SUMMARY, WHICH IS THE PARAGRAPH AND NOT THE HEADLINE.
 *
 * The last round's shared picture, cut to three sentences on the server, in plain words, about how
 * it is actually going. Falls back to the brief only where no round has finished - a check-in
 * nobody has answered has no picture yet and still has to say what it is for.
 */
export function HowItIsGoing({ summary, brief, glance, tone = 'light', waitingToBeLetIn, readerIsTheOnlyPerson }: {
  summary?: string | null
  brief?: string | null
  glance?: Glance | null
  /* On the board's dark header the same inks would be invisible. Nothing else changes. */
  tone?: 'light' | 'dark'
  /**
   * Decision 77: "Faraji Odhiambo is waiting to be let in." (or "...was not let in.", or null),
   * sent only to whoever runs the check-in, the admin who set it up, or an admin with access -
   * everybody else is sent null. Drawn as a muted note under the headline's own count, never
   * folded into it.
   */
  waitingToBeLetIn?: string | null
  /** True when the one person this round's "answered" count is about is the reader themselves
      (the founder's own check-in board, among any other one-person check-in) - see `answeredSentence`. */
  readerIsTheOnlyPerson?: boolean
}) {
  const late = (glance?.inTheWay?.count ?? 0) > 0
  const vars = tone === 'dark'
    ? {
        ['--gwui-how-story' as any]: BOARD_BODY_INK,
        ['--gwui-how-brief' as any]: BOARD_MUTED_INK,
        ['--gwui-how-people' as any]: BOARD_BODY_INK,
        ['--gwui-how-strong' as any]: '#FFFFFF',
        ['--gwui-how-warn' as any]: '#F5C97A',
      }
    : {
        ['--gwui-how-story' as any]: 'var(--gw-text)',
        ['--gwui-how-brief' as any]: 'var(--gw-muted)',
        ['--gwui-how-people' as any]: 'var(--gw-sub)',
        ['--gwui-how-strong' as any]: 'var(--gw-text)',
        ['--gwui-how-warn' as any]: 'var(--gw-amber-t)',
      }
  return (
    <div className="gwui-how" style={vars}>
      {summary
        ? <p className="gwui-how-story">{summary}</p>
        : brief
          ? <p className="gwui-how-brief">{brief}</p>
          : null}

      {glance && (
        <div className="gwui-how-glance">
          <div>
            {/*
              ONE SENTENCE, NOT A LABEL AND TWO NUMBERS JOINED BY A DOT. "8 OF 8 ROUNDS" BESIDE
              "1 OF 4 ANSWERED THIS ROUND" IS A CARD ARGUING WITH ITSELF, so past the plan the
              count drops the total: the rounds are done, the run is still going, and how far
              through is no longer the useful fact.
            */}
            <span className="gwui-how-strong">{roundsSentence(glance.progress)}</span>
            {glance.progress.ofPeople > 0 && (
              <span className="gwui-how-people"> {answeredSentence(glance.progress, readerIsTheOnlyPerson)}</span>
            )}
          </div>
          {/* Decision 77: beside the count, never inside it - a fact about the organisation's own
              door, not about how far through this round is. */}
          {waitingToBeLetIn && <div className="gwui-how-people">{waitingToBeLetIn}</div>}
          <div>
            {late
              ? (
                <span className="gwui-how-warn">
                  {/* "(0d)" read as a code on a live board. Days, in words, and nothing on the day it was named. */}
                  {glance!.inTheWay.count} {glance!.inTheWay.count === 1 ? 'thing is' : 'things are'} in the way
                  {glance!.inTheWay.oldest ? `, the oldest being ${glance!.inTheWay.oldest}` : ''}
                  {/*
                    Engine merge, 2 October (request 117, part 9): `daysWaiting` creeps forward on
                    every visit - a wait first read as "waiting 2 days" reads "waiting 3 days" the
                    next morning with nothing having changed on the board itself. `sinceSays`
                    ("since 27 September") is drawn from the wait's own clock instead, so the same
                    wait reads the same at any hour; `daysWaiting` is now only the fallback, for a
                    served payload that has not been updated to send it yet.
                  */}
                  {glance!.inTheWay.sinceSays
                    ? `, waiting ${glance!.inTheWay.sinceSays}`
                    : glance!.inTheWay.daysWaiting != null && glance!.inTheWay.daysWaiting > 0
                      ? `, waiting ${glance!.inTheWay.daysWaiting} ${glance!.inTheWay.daysWaiting === 1 ? 'day' : 'days'}`
                      : ''}
                  .
                </span>
              )
              : <span className="gwui-how-strong">Nothing is in the way.</span>}
          </div>
        </div>
      )}
    </div>
  )
}
