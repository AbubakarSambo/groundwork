import { Pill } from './kit'
import { theLeadsNote } from '@/lib/the-leads-note'

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
}

/** The words, in one place, so the phone and the grid can never call the same state two things. */
export const WHAT_A_CELL_MEANS: Record<Cell, string> = {
  'done': 'Checked in',
  'in-progress': 'In progress',
  'declined': 'Declined',
  'not-started': 'Not started',
  'na': 'Not on this one',
}

const TONE: Record<Cell, 'good' | 'info' | 'bad' | 'flat'> = {
  'done': 'good', 'in-progress': 'info', 'declined': 'bad', 'not-started': 'flat', 'na': 'flat',
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
    rest: each.filter((e) => e.state !== usual),
    /** The one session number, when there is only one - so a single-session row can be said by name
        ("session 1") rather than as a count of one. */
    onlySession: each.length === 1 ? each[0].s : null,
  }
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

export function theSentenceFor(name: string, shape: ReturnType<typeof theShapeOfIt>): string | null {
  if (shape.of === 0) return `${name} is not on any of these sessions.`
  if (!shape.usual) return shape.notOn > 0 ? `${name} is on ${shape.of} of these sessions.` : null
  const verb = VERB_FOR[shape.usual]
  const who = shape.onlySession != null
    ? `${verb} session ${shape.onlySession}`
    : `${verb} ${shape.howMany} of ${shape.of} sessions this phase`
  const rest = shape.notOn > 0 ? `, and was not part of the other ${shape.notOn}` : ''
  return `${name} ${who}${rest}.`
}

export function NineColumnsIsNotAPhoneScreen({ rows, sessions }: {
  rows: PersonRow[]
  sessions: (number | string)[]
}) {
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {rows.map((r) => {
        const shape = theShapeOfIt(r.cells, sessions)
        const name = r.name ?? 'A colleague'
        const sentence = theSentenceFor(name, shape)
        return (
          <div key={r.participantId} style={{ display: 'grid', gap: 7 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 700, color: 'var(--gw-dark)', fontSize: 15 }}>{name}</span>
              {r.role && r.role !== r.name && (
                <span data-leads-note style={{ fontSize: 13, color: 'var(--gw-sub)' }}>{theLeadsNote(r.role)}</span>
              )}
              {!r.role && r.managingOnly && <span style={{ fontSize: 13, color: 'var(--gw-sub)' }}>Managing only</span>}
            </div>

            {sentence && (
              <div style={{ fontSize: 14, color: shape.usual ? 'var(--gw-text)' : 'var(--gw-sub)', lineHeight: 1.5 }}>
                {sentence}
              </div>
            )}

            {/* Every session the usual state does not cover, named rather than counted. */}
            {shape.rest.length > 0 && (
              <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                {shape.rest.map((e) => (
                  <span key={String(e.s)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 13, color: 'var(--gw-sub)' }}>Session {e.s}</span>
                    <Pill tone={TONE[e.state]}>{WHAT_A_CELL_MEANS[e.state]}</Pill>
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
