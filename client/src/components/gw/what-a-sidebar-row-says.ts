import type { RailAttention } from '@/lib/rail-attention'
import type { AlignmentRead } from '@/lib/alignment'

/**
 * WHAT A CHECK-IN'S ROW IN THE SIDEBAR SAYS, when pointed at or read aloud.
 *
 * It was pieces joined by full stops: "Coamana growth, Q3 paying customers. 2 of 12 sessions done. 1
 * open. Session 2 is ready for you". Now it is sentences, from the reader's side.
 *
 * AND ONE NUMBER, MEANING ONE THING. The "2 of 12 sessions done" counted every session in which at
 * least one person had finished, while the check-in's card beside it said "0 of 12 sessions done",
 * counting sessions that EVERYBODY had finished (`roundsDone`, from the list endpoint). Same words,
 * two counts, contradicting each other. The row now uses the card's count, and says what it is:
 * sessions everybody has finished.
 */
export interface RowFacts {
  label: string
  attention: RailAttention
  /** The session the waiting count is about, the latest one anybody has started. */
  round: number
  /** Sessions planned, when the check-in has a plan. */
  planned: number | null
  /** Sessions everybody has finished, as the list endpoint counts them. */
  roundsDone: number | null | undefined
  alignment: AlignmentRead | null | undefined
  closed: boolean
}

const count = (n: number, one: string, many: string) => (n === 1 ? `one ${one}` : `${n} ${many}`)
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export function whatTheRowSays(f: RowFacts): string {
  const of = (n: number) => (f.planned ? `${n} of ${f.planned}` : `${n}`)
  let state: string | null = null
  switch (f.attention.kind) {
    case 'yours':
      state = `session ${of(f.attention.sessionNumber)} is ready for you`
      break
    case 'overdue':
      state = `your session ${of(f.attention.sessionNumber)} is ${f.attention.daysLate} days past its date`
      break
    case 'waiting':
      state = f.attention.done === 0
        ? `nobody has checked in yet for session ${of(f.round)}`
        : `${f.attention.done} of ${f.attention.total} people have checked in for session ${of(f.round)}`
      break
    default:
      if (f.closed) state = 'this check-in has ended'
      else if (f.roundsDone != null && f.planned) {
        state = f.roundsDone === 0
          ? `nobody has finished a whole session yet, out of ${f.planned}`
          : `everybody has finished ${f.roundsDone} of ${f.planned} sessions`
      }
  }

  const a = f.alignment
  let open: string | null = null
  if (a && a.agreed + a.open > 0) {
    open = a.open > 0
      ? `${count(a.open, 'thing is', 'things are')} still open`
      : `${count(a.agreed, 'thing is', 'things are')} agreed and nothing is still open`
  }

  const said = [state, open].filter(Boolean).join(', and ')
  return said ? `${f.label}. ${cap(said)}.` : `${f.label}.`
}
