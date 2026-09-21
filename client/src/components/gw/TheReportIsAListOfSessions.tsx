import { useNavigate } from 'react-router-dom'

/**
 * THE REPORT TAB IS A LIST: THE BOARD, THEN ONE ROW PER SESSION.
 *
 * "The report page is annoying and carries too much. It is just meant to show a list of sessions
 * and then you click and get the report. And you see who's checked in, the report is counting."
 *
 * What was on it: the board, a release control, the forming report's whole body, a resolution
 * strip, "how this report is put together", a correction paragraph, two alignment empty states and
 * a list of your own sessions - eight things competing on the screen you open to read one report.
 *
 * A run is six or twelve sessions. The tab's job is to get you to the right one and to tell you,
 * before you click, whether it is finished and who it is counting.
 */
export interface SessionRow {
  /** The session number. */
  sessionNumber: number
  /** The check-in id of the reader's OWN session at this number, when they have one. */
  myCheckInId: string | null
  /** How many people have answered this session, and how many the report is waiting for. */
  answered: number
  total: number
  /** True once the round closed and the report for it stopped moving. */
  closed: boolean
  /** Names of the people who have not answered yet, for the line under the row. */
  waitingOn: string[]
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
    <div>
      {boardRenders && (
        <button
          onClick={onOpenBoard}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%',
            background: 'var(--gw-dark)', color: 'white', border: 'none',
            borderRadius: 10, padding: '14px 18px', marginBottom: 14, cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          <span style={{ textAlign: 'left' }}>
            <span style={{ display: 'block', fontSize: 13, fontWeight: 700 }}>Open the team board</span>
            <span style={{ display: 'block', fontSize: 11.5, color: 'rgba(255,255,255,.6)', marginTop: 2 }}>
              The whole run in one place - every session, and what moved between them.
            </span>
          </span>
          <span style={{ fontSize: 13 }}>&rarr;</span>
        </button>
      )}

      {/*
        THE BOARD IS THE PAGE; THE SESSION LIST FOLDS UNDER IT. Hafsah, 21 Sep 2026: "keep the team board
        on this page and minimize the other things, since we can assess the session reports via the team
        boards." Every session's report is still one click away, behind a summary that says how many
        there are and how many are released; where no board renders yet, the list stays open so a person
        with no board loses nothing.
      */}
      {rows.length === 0 ? (
        !boardRenders && (
          <div style={{ border: '1px solid var(--gw-border)', borderRadius: 10, padding: 20, fontSize: 13, color: 'var(--gw-sub)', lineHeight: 1.6 }}>
            No session has finished yet. Each one gets its own report here as it completes.
          </div>
        )
      ) : (
        <details open={!boardRenders} style={{ marginTop: 4 }}>
          <summary className="gw-fold-summary" style={{ cursor: 'pointer', fontSize: 12.5, color: 'var(--gw-sub)', padding: '6px 2px', display: 'flex', justifyContent: 'space-between' }}>
            <span>Session reports · {rows.length}{rows.filter((r) => r.closed).length ? `, ${rows.filter((r) => r.closed).length} released` : ''}</span>
            <span style={{ fontSize: 11.5 }}>each session's own report</span>
          </summary>
        <div style={{ border: '1px solid var(--gw-border)', borderRadius: 10, overflow: 'hidden', marginTop: 6 }}>
          {rows.map((r, i) => (
            <button
              key={r.sessionNumber}
              onClick={() => (r.myCheckInId ? navigate(`/checkin/${r.myCheckInId}/report`) : onOpenSession(r.sessionNumber))}
              style={{
                display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between',
                gap: 12, padding: '13px 14px', background: 'white', border: 'none',
                borderTop: i > 0 ? '1px solid var(--gw-border)' : undefined,
                cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
              }}
            >
              <span style={{ minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 13, fontWeight: 700 }}>Session {r.sessionNumber}</span>
                {/*
                  WHO THE REPORT IS COUNTING, before you click. One count, from the same definition
                  the release rule uses - people still holding an invitation are in it, because the
                  round waits for them.
                */}
                <span style={{ display: 'block', fontSize: 11.5, color: 'var(--gw-sub)', marginTop: 1 }}>
                  {r.answered} of {r.total} answered
                  {r.waitingOn.length > 0 && ` · waiting on ${r.waitingOn.slice(0, 3).join(', ')}${r.waitingOn.length > 3 ? ` and ${r.waitingOn.length - 3} more` : ''}`}
                </span>
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                <span
                  style={{
                    fontSize: 11, fontWeight: 600, borderRadius: 6, padding: '2px 8px',
                    background: r.closed ? 'var(--gw-green-bg)' : 'var(--gw-amber-bg)',
                    color: r.closed ? 'var(--gw-green-t)' : 'var(--gw-amber-t)',
                    border: `1px solid ${r.closed ? 'var(--gw-green-b)' : 'var(--gw-amber-b)'}`,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {/*
                    'Final' read as 'the last one' on every row. It means the report is out.

                    AND "FORMING" ON A ROUND WHERE EVERYBODY HAS ANSWERED IS WRONG IN THE OTHER
                    DIRECTION. Read off a lead's own screen: "Session 1 · 3 of 3 answered · Forming",
                    on a round whose report was written, complete and sitting behind that row. It
                    is not forming; it is waiting for her, and she is the only person who can move
                    it. Saying which of the two it is turns a status into the next thing to do.
                  */}
                  {r.closed ? 'Released' : r.answered >= r.total && r.total > 0 ? 'Ready to release' : 'Forming'}
                </span>
                <span style={{ fontSize: 13, color: 'var(--gw-navy)' }}>&rarr;</span>
              </span>
            </button>
          ))}
        </div>
        </details>
      )}
    </div>
  )
}
