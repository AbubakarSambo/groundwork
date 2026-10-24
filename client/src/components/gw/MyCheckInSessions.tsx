import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { groundsApi } from '@/api/grounds'
import { whenItWas } from '@/lib/a-date-reads-the-same-everywhere'
import { Message, SessionDivider, SessionSummary } from './GroundChat'

/**
 * THE SESSION HISTORY, UNDER MY WORK (round 4, item A step 1).
 *
 * `GroundChat.tsx`'s Check-in tab used to show every past session's full transcript inline, one
 * continuous scroll - the whole reason the Check-in tab could not be "the focused conversation and
 * nothing else": reading your history and doing today's check-in were the same screen. This is
 * that history, moved: a list, newest first, each row opening (and closing again) its own
 * transcript in place, using the exact same `Message`/`SessionDivider`/`SessionSummary` rendering
 * `GroundChat` already uses for it - not a second version of the same UI.
 *
 * ONLY YOUR OWN WORDS, STILL. This calls `groundsApi.myTranscript`, the same endpoint and the same
 * query key `GroundChat` uses - the server enforces that it is only ever the caller's own turns
 * (see `myTranscript`'s own comment in api/grounds.ts), so a lead reading her own My work sees only
 * her own sessions, exactly as she does today; nothing here gives anybody a way to open somebody
 * else's transcript, which is not what today's product does either.
 */
export function MyCheckInSessions({ groundId }: { groundId: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['my-transcript', groundId],
    queryFn: () => groundsApi.myTranscript(groundId),
  })
  const [openId, setOpenId] = useState<string | null>(null)

  /* Oldest first off the wire (myTranscript's own contract); newest first is how a person wants to
     find last Tuesday's session, which is usually the one they came here about. */
  const sessions = [...(data?.sessions ?? [])].filter(s => s.turns.length > 0).reverse()

  if (isLoading) return <div style={{ fontSize: 13, color: 'var(--gw-muted)' }}>Loading your check-ins…</div>
  if (isError) {
    return (
      <div style={{ fontSize: 13, color: 'var(--gw-sub)' }}>
        Your check-ins could not be loaded. Try again in a moment.
      </div>
    )
  }
  if (sessions.length === 0) {
    return (
      <div style={{ fontSize: 13, color: 'var(--gw-sub)', lineHeight: 1.6 }}>
        Nothing on record yet. Your first check-in starts the conversation, and everything you say
        in it stays here for you to come back to.
      </div>
    )
  }

  return (
    /* Rows divided by thin rules, as the prototype's lists are, not a box around each one. */
    <div className="gwui-ruled">
      {sessions.map(s => {
        const open = openId === s.checkInId
        const label = s.isSelfCorrection
          ? `Added to session ${s.correctionOf ?? s.sessionNumber}, on ${whenItWas(s.date, 'full')}`
          : `Session ${s.sessionNumber}, on ${whenItWas(s.date, 'full')}`
        return (
          <div key={s.checkInId} className="gwui-ruled-row">
            <button
              type="button"
              onClick={() => setOpenId(open ? null : s.checkInId)}
              aria-expanded={open}
            className="gwui-session-row-btn"
            >
              <span>{label}</span>
              <span className="gwui-session-row-open">
                {open ? 'Hide' : 'Open'}
              </span>
            </button>
            {open && (
              <div className="gwui-session-row-body">
                <SessionDivider
                  sessionNumber={s.sessionNumber}
                  date={s.date}
                  isCorrection={s.isSelfCorrection}
                  correctionOf={s.correctionOf}
                />
                {s.turns.map(t => <Message key={t.id} role={t.role} content={t.content} />)}
                {s.status === 'COMPLETED' && (
                  <SessionSummary checkInId={s.checkInId} groundId={groundId} sessionNumber={s.sessionNumber} />
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
