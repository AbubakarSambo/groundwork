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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {sessions.map(s => {
        const open = openId === s.checkInId
        const label = s.isSelfCorrection
          ? `Added to session ${s.correctionOf ?? s.sessionNumber}, on ${whenItWas(s.date, 'full')}`
          : `Session ${s.sessionNumber}, on ${whenItWas(s.date, 'full')}`
        return (
          <div key={s.checkInId} style={{ border: '1px solid var(--gw-border)', borderRadius: 10, background: 'white', overflow: 'hidden' }}>
            <button
              type="button"
              onClick={() => setOpenId(open ? null : s.checkInId)}
              aria-expanded={open}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                padding: '12px 14px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                fontSize: 13.5, fontWeight: 600, color: 'var(--gw-text)', textAlign: 'left',
              }}
            >
              <span>{label}</span>
              <span style={{ fontSize: 12, color: 'var(--gw-navy)', fontWeight: 700, flexShrink: 0 }}>
                {open ? 'Hide' : 'Open'}
              </span>
            </button>
            {open && (
              <div style={{ padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: 12, borderTop: '1px solid var(--gw-border)', paddingTop: 12 }}>
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
