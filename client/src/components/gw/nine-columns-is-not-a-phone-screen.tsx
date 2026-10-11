import { Tag, type TagTone } from './ui'
import { TheLeadsNote } from '@/components/gw/TheLeadsNote'

/**
 * WHO CHECKED IN, WHEN THE SCREEN IS TOO NARROW FOR A GRID.
 *
 * The board draws attendance as people down the side and sessions across the top. On a laptop that
 * is the right shape: you read a column to see who is missing from a round and a row to see whether
 * somebody has drifted. On a 375px screen the same table is 1088px wide inside a 301px box - nine
 * "Checked in" pills behind a horizontal scrollbar almost nobody will drag, with the names wrapping
 * to two lines to make room for it.
 *
 * There is no font size at which nine columns fit. So the facts are rearranged rather than shrunk:
 * one row per person, what they did in most rounds, and then the rounds that were different, named.
 *
 * WHICH IS THE SAME INFORMATION, NOT A SUMMARY OF IT. Every session on the grid is accounted for in
 * exactly one place here - the sentence, or the list after it. A read that quietly dropped the
 * sessions it could not fit would be worse than the scrollbar.
 */
export type Cell = 'done' | 'in-progress' | 'declined' | 'not-started' | 'na'

export interface PersonRow {
  participantId: string
  name?: string | null
  role?: string | null
  managingOnly?: boolean
  cells: Record<string, string>
  /** Decision 77: held at the organisation's door - never answered any of this check-in's
      sessions because nobody has let them in yet, not because they missed them. Read "{name} is
      waiting to be let in." instead of the usual attendance sentence. */
  notLetInYet?: boolean
}

/** The words, in one place, so the phone and the grid can never call the same state two things. */
export const WHAT_A_CELL_MEANS: Record<Cell, string> = {
  'done': 'Checked in',
  'in-progress': 'In progress',
  'declined': 'Declined',
  'not-started': 'Not started',
  'na': 'Not on this one',
}

const TONE: Record<Cell, TagTone> = {
  'done': 'proven', 'in-progress': 'action', 'declined': 'concern', 'not-started': 'plain', 'na': 'plain',
}

const asCell = (v: string | undefined): Cell =>
  v === 'done' || v === 'in-progress' || v === 'declined' || v === 'not-started' ? v : 'na'

/**
 * The state this person is in most of the time, and every session that is not it.
 *
 * Ties go to whichever is more worth reading: somebody who checked in four times and missed four is
 * not "mostly checked in", and calling it that buries the half that matters. So a state only counts
 * as the usual one when it is a clear majority; otherwise every session is listed.
 *
 * A ROUND SOMEBODY WAS NEVER ON IS NOT A THING THEY DID, AND THE FIRST DRAFT COUNTED IT AS ONE.
 *
 * Read back on the running board: two people led with "Not on this one for 6 of 10" - an absence,
 * as the headline, about rounds that had happened before they joined - and a third listed seven
 * rows of "Session 11 · Not on this one" underneath their name. The grid it replaces prints an
 * em dash in those cells for exactly this reason: it is a fact about the roster on that date, not
 * about the person.
 *
 * So the denominator is the rounds they were actually on. Somebody on none of them says that in
 * one line rather than disappearing.
 */
export function theShapeOfIt(cells: Record<string, string>, sessions: (number | string)[]) {
  const each = sessions
    .map((s) => ({ s, state: asCell(cells[String(s)]) }))
    .filter((e) => e.state !== 'na')
  const tally = new Map<Cell, number>()
  for (const e of each) tally.set(e.state, (tally.get(e.state) ?? 0) + 1)
  let usual: Cell | null = null
  for (const [state, n] of tally) if (n * 2 > each.length && (usual === null || n > (tally.get(usual) ?? 0))) usual = state
  return {
    usual,
    howMany: usual ? (tally.get(usual) ?? 0) : 0,
    of: each.length,
    /** How many of the run they were never on, for the one line that says so. */
    notOn: sessions.length - each.length,
    /** Which sessions those were, by number - so the sentence can name them rather than only count
        them (see `theSentenceFor`'s own comment). */
    notOnSessions: sessions.filter((s) => asCell(cells[String(s)]) === 'na'),
    rest: each.filter((e) => e.state !== usual),
    /** The one session number, when there is only one - so a single-session row can be said by name
        ("session 1") rather than as a count of one. */
    onlySession: each.length === 1 ? each[0].s : null,
  }
}

/** "session 2." for one, "sessions 2 and 3." for two, "sessions 2, 3 and 4." for more - never a
    bare count with nothing named. */
function namedSessions(ns: (number | string)[]): string {
  if (ns.length === 1) return `session ${ns[0]}`
  return `sessions ${ns.slice(0, -1).join(', ')} and ${ns[ns.length - 1]}`
}

/**
 * A SENTENCE A PERSON CAN FOLLOW, not "Not started for 1 of 1, and not on the other 1." (read on a
 * live admin board about Faraji Odhiambo, who is on one session in this phase and has not started
 * it - two numbers that are the same fact stated twice, and neither one named "session 1").
 */
const VERB_FOR: Record<Cell, string> = {
  'done': 'has checked in for',
  'in-progress': 'is partway through',
  'declined': 'has declined',
  'not-started': 'has not started',
  'na': 'was not on',
}

/** The same verbs, said to the reader about themselves rather than about them. */
const SELF_VERB_FOR: Record<Cell, string> = {
  'done': 'have checked in for',
  'in-progress': 'are partway through',
  'declined': 'have declined',
  'not-started': 'have not started',
  'na': 'were not on',
}

/**
 * THE READER'S OWN ROW, SAID TO THEM RATHER THAN ABOUT THEM.
 *
 * Read live by Rukia Otieno, on her own board: "Rukia Otieno has checked in for 2 of 2 sessions
 * this phase." - her own name and "has", read back at her, where every other screen on this board
 * already says "you". `isReader` switches the verb to its second-person form and the subject to
 * "You"; everyone else's sentence is untouched. "This phase" is also jargon nobody outside the
 * product says, so it is now "so far" for every row, reader or not.
 *
 * Full attendance reads as "both" when there are exactly two sessions ("You have checked in for
 * both sessions so far."), rather than echoing the same number twice ("2 of 2") - a phrasing kept
 * only for the reader's own sentence; everyone else's count is left exactly as it was.
 */
export function theSentenceFor(name: string, shape: ReturnType<typeof theShapeOfIt>, isReader = false): string | null {
  const subject = isReader ? 'You' : name
  if (shape.of === 0) return isReader ? 'You are not on any of these sessions.' : `${name} is not on any of these sessions.`
  if (!shape.usual) {
    if (shape.notOn === 0) return null
    return isReader ? `You are on ${shape.of} of these sessions.` : `${name} is on ${shape.of} of these sessions.`
  }
  const verb = (isReader ? SELF_VERB_FOR : VERB_FOR)[shape.usual]
  const who = shape.onlySession != null
    ? `${subject} ${verb} session ${shape.onlySession}`
    : isReader && shape.howMany === shape.of && shape.of === 2
      ? `You ${verb} both sessions so far`
      : `${subject} ${verb} ${shape.howMany} of ${shape.of} sessions so far`
  /*
   * U.10 RE-REVIEW: NAME THE SESSION, NOT ONLY ITS COUNT. "...and was not part of the other 1."
   * said how many sessions this person was not on, never which ones - read live, it took a second
   * trip to the grid above to find session 2. `notOnSessions` carries the actual numbers, so this
   * names them the same way `onlySession` already names a lone one: "and was not part of session
   * 2." for one, "...sessions 2 and 3." for several.
   */
  const restVerb = isReader ? 'were not part of' : 'was not part of'
  const rest = shape.notOn > 0 ? `, and ${restVerb} ${namedSessions(shape.notOnSessions)}` : ''
  return `${who}${rest}.`
}

export function NineColumnsIsNotAPhoneScreen({ rows, sessions, openSessions, myParticipantId }: {
  rows: PersonRow[]
  sessions: (number | string)[]
  /**
   * ITEM E: SAY NOTHING ABOUT A SESSION THAT HAS NOT OPENED. "Faraji Odhiambo has not started
   * session 1, and was not part of the other 1." named a second session he could not possibly have
   * been part of yet - it had not opened. When given, only these session numbers count towards
   * "the other N"; a session left out of this list is left out of the sentence entirely, not
   * counted as one more he was not on. Defaults to `sessions` (every one counts) when omitted.
   */
  openSessions?: (number | string)[]
  /** The reader's own participant id, the same way "Who owns what" knows it (`b.myParticipantId`),
      so the reader's own sentence can be said to them rather than about them. */
  myParticipantId?: string | null
}) {
  const counted = openSessions ?? sessions
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {rows.map((r) => {
        const shape = theShapeOfIt(r.cells, counted)
        const name = r.name ?? 'A colleague'
        const isReader = !!myParticipantId && r.participantId === myParticipantId
        /*
         * DECISION 77: SOMEBODY NOT LET IN YET IS NOT "HAS NOT STARTED SESSION 1". Read live,
         * Faraji Odhiambo - held at the organisation's door - was drawn here as an ordinary
         * absence: "Faraji Odhiambo has not started session 1, and was not part of session 2."
         * He cannot have started a session nobody let him into. `notLetInYet` replaces the usual
         * attendance sentence (and the per-session list below it - every session would read the
         * same way, for the same reason) with the one true fact.
         */
        const sentence = r.notLetInYet ? `${name} is waiting to be let in.` : theSentenceFor(name, shape, isReader)
        /* Re-review, 2 October: the heading above the reader's own sentence still said their own
           name - "Rukia Otieno" over "You have checked in for both sessions so far." - on the
           board she herself was reading, the same row BoardPage's 1440 view already heads "You"
           for. The sentence already reads second person; the name above it now matches. */
        const displayName = isReader ? 'You' : name
        return (
          <div key={r.participantId} style={{ display: 'grid', gap: 7 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 700, color: 'var(--gw-dark)', fontSize: 15 }}>{displayName}</span>
              {r.role && r.role !== r.name && (
                <TheLeadsNote role={r.role} style={{ fontSize: 13, color: 'var(--gw-sub)' }} />
              )}
            </div>

            {sentence && (
              <div style={{ fontSize: 14, color: shape.usual ? 'var(--gw-text)' : 'var(--gw-sub)', lineHeight: 1.5 }}>
                {sentence}
              </div>
            )}

            {/* Every session the usual state does not cover, named rather than counted. */}
            {!r.notLetInYet && shape.rest.length > 0 && (
              <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                {shape.rest.map((e) => (
                  <span key={String(e.s)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 13, color: 'var(--gw-sub)' }}>Session {e.s}</span>
                    <Tag tone={TONE[e.state]}>{WHAT_A_CELL_MEANS[e.state]}</Tag>
                  </span>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
