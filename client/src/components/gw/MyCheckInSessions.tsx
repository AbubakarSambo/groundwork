import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { groundsApi } from '@/api/grounds'
import { conversationApi } from '@/api/conversation'
import { reportsApi } from '@/api/reports'
import { whenItWas } from '@/lib/a-date-reads-the-same-everywhere'
import { nothingInternalReachesTheBubble } from '@/lib/nothing-internal-reaches-the-bubble'

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
  /* No conversation to open yet: nothing is drawn. The card it sits in already counts the check-ins, and "Nothing on record yet" beside
     "4 of 5 done" was one of three headings that disagreed (journey 4, 23 November 2026). */
  if (sessions.length === 0) return null

  return (
    /* Rows divided by thin rules, as the prototype's lists are, not a box around each one. */
    <div className="gwui-ruled">
      {sessions.map(s => {
        const open = openId === s.checkInId
        const label = s.isSelfCorrection
          ? `Added to check-in ${s.correctionOf ?? s.sessionNumber}, on ${whenItWas(s.date, 'full')}`
          : `Check-in ${s.sessionNumber}, on ${whenItWas(s.date, 'full')}`
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

/* The three parts of a past check-in, moved here from GroundChat.tsx when that file, which nothing drew any more, was deleted (audit of the check-in pages, 15 November 2026, row 28). */
export function SessionSummary({ checkInId, groundId, sessionNumber }: {
  checkInId: string; groundId: string; sessionNumber: number
}) {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const { data, isLoading } = useQuery({
    queryKey: ['artifact', checkInId],
    queryFn: () => conversationApi.artifact(checkInId),
    enabled: open,
  })
  const correct = useMutation({
    mutationFn: () => reportsApi.startSelfCorrection(groundId, sessionNumber),
    onSuccess: (res: any) => navigate(`/checkin/${res.checkInId}`),
    onError: () => toast.error('Could not open a correction. Try again.'),
  })
  return (
    <div style={{ alignSelf: 'stretch' }}>
      {/*
        THE WAY TO FIX A SESSION IS NOT HIDDEN BEHIND A DISCLOSURE.

        Retiring the card view moved this inside "what we heard from you", so
        somebody who believed the record had them wrong had to open a summary before
        they could find out they were allowed to correct it. The persona suite caught
        it as an absence - "the self-correction affordance EXISTS (hard - absence is a
        failure, not a shrug)" - and it was right twice: the words had changed too.

        Both live on the row now, and the correction says what the product has always
        said rather than something I reworded.
      */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <button
          onClick={() => setOpen(o => !o)}
          style={{ fontSize: 12, color: 'var(--gw-navy)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit', fontWeight: 700 }}
        >
          {open ? 'Hide what you told me' : 'What you told me'}
        </button>
        <button
          onClick={() => correct.mutate()}
          disabled={correct.isPending}
          style={{ fontSize: 12, color: 'var(--gw-sub)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}
        >
          {correct.isPending ? 'Opening…' : 'Something wrong here? Continue this check-in to correct it'}
        </button>
      </div>
      {open && (
        <div style={{ marginTop: 8, background: 'var(--gw-bg)', border: '1px solid var(--gw-border)', borderRadius: 8, padding: '10px 12px' }}>
          {isLoading && <div style={{ fontSize: 12, color: 'var(--gw-muted)' }}>Loading…</div>}
          {data?.artifact ? (
            <>
              <div style={{ fontSize: 12, color: 'var(--gw-text)', lineHeight: '19px' }}>{data.artifact.summary}</div>
              {data.artifact.whatToCarry && (
                <div style={{ fontSize: 12, color: 'var(--gw-navy)', fontWeight: 700, borderTop: '1px solid var(--gw-border)', paddingTop: 8, marginTop: 8 }}>
                  <div>Carry forward</div>
                  <div style={{ fontWeight: 400 }}>{data.artifact.whatToCarry}</div>
                </div>
              )}
            </>
          ) : !isLoading && (
            <div style={{ fontSize: 12, color: 'var(--gw-muted)' }}>No summary was written for this check-in.</div>
          )}
        </div>
      )}
    </div>
  )
}

export function SessionDivider({ sessionNumber, date, isCorrection, correctionOf }: {
  sessionNumber: number
  date: string
  isCorrection: boolean
  correctionOf: number | null
}) {
  /*
   * A PLAIN PHRASE, NOT TWO PIECES JOINED WITH A DOT (U.8 re-review).
   *
   * "Session 1 · 27 Sept 2026" read as a label and a stamp stuck together, not a sentence anybody
   * would say. It is one phrase now, with the date said in full ('full', not the abbreviated
   * 'day') the way a person actually reads a date out loud.
   */
  const when = whenItWas(date, 'full')
  const label = isCorrection
    ? `Added to check-in ${correctionOf ?? sessionNumber}, on ${when}`
    : `Check-in ${sessionNumber}, on ${when}`
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '22px 0 14px' }}>
      <div style={{ flex: 1, height: 1, background: 'var(--gw-border)' }} />
      <div className="ds-text-meta">
        {label}
      </div>
      <div style={{ flex: 1, height: 1, background: 'var(--gw-border)' }} />
    </div>
  )
}

export function Message({ role, content }: { role: 'AI' | 'PERSON'; content: string }) {
  /**
   * THE SAME BUBBLE AS THE CHECK-IN, TO THE PIXEL.
   *
   * The first version of this invented its own: uppercase YOU / GROUNDWORK labels
   * above each turn, different radii, different type size. So reading your history
   * looked like a different product from the conversation that produced it, which
   * is the opposite of the point - it is meant to be the same thread.
   *
   * Copied from ChatPage's message style deliberately rather than approximated. If
   * that one changes, this should change with it.
   */
  const mine = role === 'PERSON'
  return (
    <div
      style={{
        maxWidth: '82%',
        alignSelf: mine ? 'flex-end' : 'flex-start',
        background: mine ? 'var(--gw-navy)' : 'white',
        color: mine ? 'white' : 'var(--gw-text)',
        border: mine ? 'none' : '1px solid var(--gw-border)',
        // The assistant's bubble squares its TOP-left, not its bottom-left. Copied
        // rather than guessed: I had it the other way round, which is a small thing
        // that makes a familiar surface feel like a different one.
        borderRadius: mine ? '16px 16px 4px 16px' : '4px 16px 16px 16px',
        padding: '10px 14px',
        fontSize: 14,
        lineHeight: '23px',
        whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', minWidth: 0,
      }}
    >
      {nothingInternalReachesTheBubble(content)}
    </div>
  )
}

