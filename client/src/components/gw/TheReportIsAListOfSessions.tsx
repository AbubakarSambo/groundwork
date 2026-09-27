import { useNavigate } from 'react-router-dom'
import { whenItWas } from '@/lib/a-date-reads-the-same-everywhere'
import { Tag } from './kit'

/**
 * EVERY SESSION: THE BOARD, THEN ONE LINE FOR EACH SESSION, NEWEST FIRST (U.9, B4).
 *
 * The words are the prototype's, from docs/prototype/screens/B4-reports-and-sharing/sessions.txt:
 * "Every session", "Below is the board, then one line for each session, newest first. Open a
 * session to see its report.", "The board", "Everything so far", and for each row "Session 37",
 * "Tue, 22 Sept", "6 of 6 checked in" and "Shared" or "Not shared".
 *
 * WHAT IT REPLACED. "Session reports · 12, 11 released", folded under the board, with rows reading
 * "3 of 5 answered · waiting on Omar, Brian" and a pill saying "Released", "Ready to release" or
 * "Forming". Pieces joined with dots, and three words for two states.
 *
 * SHARED MEANS THE ROUND CLOSED. A round closes when its report goes out to everyone in it (the
 * listener releases it), so `closed` is the same fact as shared. Anything else is "Not shared",
 * whoever it is waiting for.
 *
 * WHO IT IS WAITING FOR STAYS, AS A SENTENCE. The prototype's row has no such line, but the product
 * has had one since Hafsah asked to "see who's checked in, the report is counting". It is kept, and
 * said as a sentence: "Omar has not checked in yet."
 *
 * The list is no longer folded under the board. The prototype shows every row open below it.
 */
export interface SessionRow {
  /** The session number. */
  sessionNumber: number
  /** The check-in id of the reader's OWN session at this number, when they have one. */
  myCheckInId: string | null
  /** How many people have answered this session, and how many the report is waiting for. */
  answered: number
  total: number
  /** True once the round closed and its report went out to everyone in it. */
  closed: boolean
  /** Names of the people who have not answered yet, for the line under the row. */
  waitingOn: string[]
  /** When this session opened, for "Wed 23 Sept". Absent when nothing says. */
  opened?: string | null
}

export const EVERY_SESSION = {
  heading: 'Every session',
  intro: 'Below is the board, then one line for each session, newest first. Open a session to see its report.',
  board: 'The board',
  boardSub: 'Everything so far',
  shared: 'Shared',
  notShared: 'Not shared',
  nothingYet: 'No session has finished yet. Each one gets its own report here as it completes.',
} as const

/** "Wed, 23 Sept", as the prototype's rows read. */
export function sessionDay(d: string | Date): string {
  return whenItWas(d, 'shortWeekdayAndDay').replace(/^(\S+) /, '$1, ')
}

export function checkedIn(answered: number, total: number): string {
  return `${answered} of ${total} checked in`
}

/** "Omar has not checked in yet." Names, never a count alone, because the lead needs to know who. */
export function stillToCheckIn(names: string[]): string {
  if (names.length === 0) return ''
  if (names.length === 1) return `${names[0]} has not checked in yet.`
  if (names.length === 2) return `${names[0]} and ${names[1]} have not checked in yet.`
  if (names.length === 3) return `${names[0]}, ${names[1]} and ${names[2]} have not checked in yet.`
  const more = names.length - 2
  return `${names[0]}, ${names[1]} and ${more} others have not checked in yet.`
}

export function TheReportIsAListOfSessions({
  rows,
  boardRenders,
  onOpenBoard,
  onOpenSession,
}: {
  rows: SessionRow[]
  boardRenders: boolean
  onOpenBoard: () => void
  /** Opening a session with no check-in of your own on it - the lead's view of a round. */
  onOpenSession: (sessionNumber: number) => void
}) {
  const navigate = useNavigate()

  return (
    <section aria-labelledby="every-session">
      <h2 id="every-session" style={{ fontSize: 17, fontWeight: 700, margin: '0 0 4px', color: 'var(--gw-text)' }}>{EVERY_SESSION.heading}</h2>
      <p style={{ fontSize: 14, color: 'var(--gw-sub)', lineHeight: 1.55, margin: '0 0 14px' }}>{EVERY_SESSION.intro}</p>

      {boardRenders && (
        <button
          onClick={onOpenBoard}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%',
            background: 'white', color: 'var(--gw-text)', border: '1px solid var(--gw-border)',
            borderRadius: 10, padding: '14px 16px', marginBottom: 12, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
          }}
        >
          <span>
            <span style={{ display: 'block', fontSize: 15, fontWeight: 700 }}>{EVERY_SESSION.board}</span>
            <span style={{ display: 'block', fontSize: 13, color: 'var(--gw-sub)', marginTop: 2 }}>{EVERY_SESSION.boardSub}</span>
          </span>
          <span aria-hidden style={{ fontSize: 14, color: 'var(--gw-navy)' }}>&rarr;</span>
        </button>
      )}

      {rows.length === 0 ? (
        <div style={{ border: '1px solid var(--gw-border)', borderRadius: 10, padding: 20, fontSize: 14, color: 'var(--gw-sub)', lineHeight: 1.6 }}>
          {EVERY_SESSION.nothingYet}
        </div>
      ) : (
        <div style={{ border: '1px solid var(--gw-border)', borderRadius: 10, overflow: 'hidden' }}>
          {rows.map((r, i) => (
            <button
              key={r.sessionNumber}
              onClick={() => (r.myCheckInId ? navigate(`/checkin/${r.myCheckInId}/report`) : onOpenSession(r.sessionNumber))}
              style={{
                display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap',
                gap: '6px 14px', padding: '13px 16px', background: 'white', border: 'none',
                borderTop: i > 0 ? '1px solid var(--gw-border)' : undefined,
                cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
              }}
            >
              <span style={{ minWidth: 0, display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '2px 16px' }}>
                <span style={{ fontSize: 15, fontWeight: 700 }}>Session {r.sessionNumber}</span>
                {r.opened && <span style={{ fontSize: 13.5, color: 'var(--gw-sub)' }}>{sessionDay(r.opened)}</span>}
                <span style={{ fontSize: 13.5, color: 'var(--gw-sub)' }}>{checkedIn(r.answered, r.total)}</span>
                {!r.closed && r.waitingOn.length > 0 && (
                  <span style={{ flexBasis: '100%', fontSize: 13, color: 'var(--gw-sub)' }}>{stillToCheckIn(r.waitingOn)}</span>
                )}
              </span>
              <span style={{ whiteSpace: 'nowrap' }}>
                <Tag tone={r.closed ? 'proven' : 'attention'}>{r.closed ? EVERY_SESSION.shared : EVERY_SESSION.notShared}</Tag>
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
