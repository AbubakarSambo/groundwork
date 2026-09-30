import { useQuery } from '@tanstack/react-query'
import { reportsApi } from '@/api/reports'
import { whenItWas } from '@/lib/a-date-reads-the-same-everywhere'

/**
 * HOW THINGS HAVE MOVED, UNDER THE REPORT ITSELF.
 *
 * The report at the top of this tab is always the current picture. Every round before it used to
 * be overwritten, so at day 90 there was one account of ninety days and no way to see that the
 * day-14 one had said something different.
 *
 * It lives under the report rather than on a page of its own, because it is the same report at
 * earlier moments and somebody looking for it is already here.
 *
 * NOT A SCORE, AND NOT A DIRECTION. Each line is what that round led with, on the day it closed,
 * and nothing re-decides it now. Whether the movement is improvement is the reader's judgement -
 * an arrow here would make this a rating, which is the one thing this product must not become.
 */
export function HowThisHasMoved({ groundId, viewerRunsThisCheckIn }: { groundId: string; viewerRunsThisCheckIn: boolean }) {
  const { data } = useQuery({
    queryKey: ['report-rounds', groundId],
    queryFn: () => reportsApi.rounds(groundId),
    enabled: !!groundId,
    retry: false,
  })

  const moved = data?.moved ?? []
  /* Nothing until a round has closed, which is where every check-in starts. */
  if (!moved.length) return null

  return (
    <div style={{ marginTop: 26 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gw-navy)', marginBottom: 2 }}>
        How this has moved
      </div>
      <div style={{ fontSize: 12, color: 'var(--gw-muted)', lineHeight: 1.55, marginBottom: 12, maxWidth: 560 }}>
        What the report said at the end of each session, as it stood then. Nothing here has been
        rewritten since.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {moved.map(m => {
          /*
           * U.9 RE-REVIEW: THE FIELD THE SERVER ACTUALLY SENDS IS `sessionNumber`, NOT `round`.
           * "At the end of session undefined, on 27 September, and one read differed." was wrong
           * three ways, and the first was read against the wrong field. Walked live, `GET
           * /grounds/:id/report/rounds` sends `"sessionNumber": 1` on every row of `moved[]` -
           * `m.round` was never going to be there. Engine request 59 (still open) asks the server
           * to make `howThisHasMoved`'s own return type agree with what it actually sends; this
           * reads the field that is really on the wire, so the sentence is right now rather than
           * only once that request lands. The stray "and" that used to join the date and the
           * difference count is gone, and `m.differences` (how many accounts differed WITHIN that
           * session's own reading, not a change from the session before) is said as "people saw N
           * things differently", never "differed from the one before".
           */
          const dateText = whenItWas(m.takenAt, 'dayAndMonthLong')
          const opening = m.sessionNumber != null
            ? `At the end of session ${m.sessionNumber}${dateText ? `, on ${dateText}` : ''}`
            : dateText ? `On ${dateText}` : 'At the end of this session'
          const sawDifferently = m.differences > 0
            ? `${opening}, people saw ${m.differences === 1 ? 'one thing' : `${m.differences} things`} differently.`
            : `${opening}, everybody saw it the same way.`
          return (
          <div
            key={m.sessionNumber ?? m.takenAt}
            style={{
              border: '1px solid var(--gw-border)', borderRadius: 10, background: 'white',
              padding: '11px 14px',
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--gw-navy)', marginBottom: 3 }}>
              {sawDifferently}
            </div>
            {/*
             * WRITTEN TO THE LEAD, SHOWN TO EVERYBODY. "You have received answers from all three
             * people." is `says`, written as a line addressed to whoever runs the check-in - and it
             * was rendered here for every reader, so Amani and Juma read a sentence about what they
             * themselves had received. The server carries nothing that says who a line is for
             * (request to the engine), so until it does, this shows `says` only to whoever runs
             * this check-in and says nothing here for anybody else.
             */}
            {viewerRunsThisCheckIn && (
              <div style={{ fontSize: 13, color: 'var(--gw-text)', lineHeight: 1.6 }}>{m.says}</div>
            )}
            {m.amended && (
              <div style={{ fontSize: 11.5, color: 'var(--gw-amber-t)', lineHeight: 1.5, marginTop: 5 }}>
                {m.amended}
              </div>
            )}
          </div>
          )
        })}
      </div>
    </div>
  )
}
