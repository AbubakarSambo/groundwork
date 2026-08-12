import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { groundsApi } from '@/api/grounds'
import { documentsApi } from '@/api/documents'
import { conversationApi } from '@/api/conversation'
import { reportsApi } from '@/api/reports'
import { toast } from 'sonner'

/**
 * A GROUND, READ AS A CONVERSATION.
 *
 * THE LAYOUT IS THE ENTRY CHAT'S, NOT ONE I CHOSE. Her answer when I asked what it
 * should look like: the setup chat at /start, with some of the live check-in. So:
 * a 680px reading column that scrolls inside `flex: 1`, gap 12 between bubbles,
 * 82% wide, and the place to type pinned underneath rather than floating after the
 * last message. Two earlier attempts at this were my own approximations and both
 * read as a different product.
 *
 * Hafsah's model: a ground is a channel you come back to and keep adding to, and
 * a channel opens to what has been said with the place to type at the bottom. This
 * is that view - every session's turns in order, session dividers between them,
 * and at the bottom the one thing there is to do.
 *
 * WHAT IT DELIBERATELY IS NOT. It is not a live composer wired to the engine. The
 * session itself still happens on its own page, because a check-in is a piece of
 * work with an ending, an upload and a confirmation, not a message box. Reading
 * your ground and doing a check-in are different acts and this only merges the
 * first one.
 *
 * ONLY YOUR OWN WORDS ARE HERE, EVER. A channel shape is exactly where somebody
 * would expect to see other people talking, and in this product they never can -
 * a check-in is private until the report releases, and the report never quotes
 * anybody. The endpoint enforces it by reading turns through the requesting
 * person's own participant row, so it is not a filter this component could drop.
 *
 * DIVIDERS ARE BY SESSION, NOT BY DATE, which is the one departure from how a chat
 * app usually reads. Slack divides by day because a day is the unit a conversation
 * happens in. Here the unit is the session - it is what the ground plans, what the
 * report compares, and what a person is asked to do - and a session can span days.
 * The date rides along on the divider for orientation.
 */

/**
 * WHAT WE HEARD FROM YOU, under the session it came from.
 *
 * This lived on the card view, which Hafsah has now retired ("we have made the
 * more obsolete which is fine"). It is not decoration and it is not a duplicate of
 * the turns above it: it is what the engine took FROM the conversation, which is
 * the thing a person actually wants to check - "did it hear me right" - and it is
 * the entry point to correcting a session that got it wrong.
 *
 * Fetched on expand. Twelve of these on load would be twelve requests for
 * something most people will not open.
 */
function SessionSummary({ checkInId, groundId, sessionNumber }: {
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
      <button
        onClick={() => setOpen(o => !o)}
        style={{ fontSize: 11.5, color: 'var(--gw-navy)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit', fontWeight: 600 }}
      >
        {open ? 'Hide what we heard' : 'What we heard from you'}
      </button>
      {open && (
        <div style={{ marginTop: 8, background: 'var(--gw-bg)', border: '1px solid var(--gw-border)', borderRadius: 8, padding: '10px 12px' }}>
          {isLoading && <div style={{ fontSize: 12, color: 'var(--gw-muted)' }}>Loading…</div>}
          {data?.artifact ? (
            <>
              <div style={{ fontSize: 12.5, color: 'var(--gw-text)', lineHeight: 1.6 }}>{data.artifact.summary}</div>
              {data.artifact.whatToCarry && (
                <div style={{ fontSize: 12.5, color: 'var(--gw-navy)', fontWeight: 600, borderTop: '1px solid var(--gw-border)', paddingTop: 8, marginTop: 8 }}>
                  Carry forward: {data.artifact.whatToCarry}
                </div>
              )}
              <button
                onClick={() => correct.mutate()}
                disabled={correct.isPending}
                style={{ marginTop: 10, fontSize: 11.5, color: 'var(--gw-navy)', background: 'none', border: '1px solid var(--gw-border)', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}
              >
                {correct.isPending ? 'Opening…' : 'This is not right - add to it'}
              </button>
            </>
          ) : !isLoading && (
            <div style={{ fontSize: 12, color: 'var(--gw-muted)' }}>No summary was written for this session.</div>
          )}
        </div>
      )}
    </div>
  )
}

function SessionDivider({ sessionNumber, date, isCorrection, correctionOf }: {
  sessionNumber: number
  date: string
  isCorrection: boolean
  correctionOf: number | null
}) {
  const when = new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  const label = isCorrection
    ? `Added to session ${correctionOf ?? sessionNumber}`
    : `Session ${sessionNumber}`
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '22px 0 14px' }}>
      <div style={{ flex: 1, height: 1, background: 'var(--gw-border)' }} />
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gw-sub)', whiteSpace: 'nowrap' }}>
        {label} <span style={{ fontWeight: 500, color: 'var(--gw-muted)' }}>· {when}</span>
      </div>
      <div style={{ flex: 1, height: 1, background: 'var(--gw-border)' }} />
    </div>
  )
}

function Message({ role, content }: { role: 'AI' | 'PERSON'; content: string }) {
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
        lineHeight: 1.65,
        whiteSpace: 'pre-wrap',
        boxShadow: mine ? 'none' : '0 1px 3px rgba(0,0,0,.06)',
      }}
    >
      {content}
    </div>
  )
}

/**
 * The bottom of the scroll: the one thing to do, or the honest reason there is
 * nothing to do yet.
 *
 * Between sessions this takes a note. That is not decoration - a channel that
 * shows a dead input for thirteen days out of fourteen teaches people the product
 * is broken. What they write is private and is carried into the next session as
 * something to be ASKED about, never as part of the record. See
 * api/src/modules/conversation/between-session-notes.ts.
 */
function Composer({ groundId, openCheckInId, openSessionNumber, totalSessions, nextOpensAt, onOpenSession, openPending }: {
  groundId: string
  openCheckInId: string | null
  openSessionNumber: number | null
  totalSessions: number | null
  nextOpensAt: string | null
  /**
   * OPENING A SESSION CAN COST MONEY, so this does not navigate on its own.
   *
   * The page owns `probeSession`, which POSTs `:id/open`, and handles a 403 by
   * offering the free extension, the access code or the purchase. ChatPage's own
   * open handler does none of that - it shows "Could not open session" and stops.
   * So a button here that went straight to /checkin/:id would have quietly removed
   * the paid path for anybody whose ground had run out of sessions.
   *
   * Found by deleting the card view and reading what went with it, rather than by
   * anything going red.
   */
  onOpenSession?: () => void
  openPending?: boolean
}) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [text, setText] = useState('')

  const { data: notes = [] } = useQuery({
    queryKey: ['my-notes', groundId],
    queryFn: () => groundsApi.myNotes(groundId),
  })

  const add = useMutation({
    mutationFn: (t: string) => groundsApi.addMyNote(groundId, t),
    onSuccess: () => { setText(''); qc.invalidateQueries({ queryKey: ['my-notes', groundId] }) },
    onError: () => toast.error('That note did not save. Try again.'),
  })

  const remove = useMutation({
    mutationFn: (noteId: string) => groundsApi.deleteMyNote(groundId, noteId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-notes', groundId] }),
  })

  /**
   * A DOCUMENT BETWEEN SESSIONS, WHICH IS THE OTHER HALF OF "SOMETHING TO ADD".
   *
   * The upload already existed on the Documents tab and nowhere near the moment
   * somebody actually has the file - which is when a meeting has just happened and
   * they still have the notes open. Same endpoint, same default: it is private to
   * the uploader until they choose otherwise on the Documents tab.
   */
  const upload = useMutation({
    mutationFn: (file: File) => documentsApi.upload(groundId, file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['docs', groundId] })
      toast.success('Added. Your next check-in can draw on it.')
    },
    onError: () => toast.error('That file did not upload. Try again.'),
  })

  // Notes no session has raised yet. Once one has been picked up it belongs to the
  // conversation above, not to the pile of things still waiting.
  const waiting = notes.filter(n => !n.carriedIntoCheckInId)

  if (openCheckInId) {
    return (
      <div style={{ borderTop: '1px solid var(--gw-border)', paddingTop: 14, marginTop: 18 }}>
        <button
          onClick={() => (onOpenSession ? onOpenSession() : navigate(`/checkin/${openCheckInId}`))}
          disabled={openPending}
          style={{ width: '100%', padding: '13px 16px', borderRadius: 10, background: 'var(--gw-navy)', color: 'white', fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
        >
          {/* The total rides along here on purpose. In the card view it lived on the
              open-session card; in a conversation there is nowhere else for "how
              many of these are there" to be, and it is the thing that tells
              somebody whether they are at the start of this or near the end. */}
          {openPending
            ? 'Opening…'
            : openSessionNumber != null
              ? `Continue session ${openSessionNumber}${totalSessions ? ` of ${totalSessions}` : ''} →`
              : 'Continue your check-in →'}
        </button>
      </div>
    )
  }

  return (
    <div style={{ borderTop: '1px solid var(--gw-border)', paddingTop: 14, marginTop: 18 }}>
      {waiting.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '.5px', color: 'var(--gw-muted)', fontWeight: 700, marginBottom: 6 }}>
            Waiting for your next check-in
          </div>
          {waiting.map(n => (
            <div key={n.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, background: 'var(--gw-bg)', border: '1px solid var(--gw-border)', borderRadius: 8, padding: '9px 11px', marginBottom: 6 }}>
              <div style={{ flex: 1, fontSize: 12.5, color: 'var(--gw-text)', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{n.text}</div>
              <button
                onClick={() => remove.mutate(n.id)}
                title="Delete this note"
                style={{ background: 'none', border: 'none', color: 'var(--gw-muted)', cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: 0, fontFamily: 'inherit' }}
              >×</button>
            </div>
          ))}
        </div>
      )}

      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && text.trim()) add.mutate(text.trim())
        }}
        placeholder="Note something for your next check-in…"
        rows={2}
        style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--gw-border)', fontSize: 13.5, fontFamily: 'inherit', lineHeight: 1.6, resize: 'vertical', outline: 'none', background: 'white' }}
      />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 8 }}>
        {/*
          THE HONEST STATE, RATHER THAN A PROMISE. Between sessions there is
          nothing to add to the record, and saying so is better than an input that
          looks like a check-in. It also says where the note goes, because a
          private box in a product about shared records needs to say which it is.
        */}
        <div style={{ fontSize: 11.5, color: 'var(--gw-sub)', lineHeight: 1.5 }}>
          {nextOpensAt
            ? `Your next check-in opens ${new Date(nextOpensAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}. `
            : 'No check-in is open right now. '}
          Notes are yours alone. They are not part of your record, and the next check-in will ask you about them.
        </div>
        <label
          title="Attach a document for your next check-in"
          style={{ flexShrink: 0, fontSize: 12.5, fontWeight: 600, color: 'var(--gw-navy)', cursor: upload.isPending ? 'wait' : 'pointer', padding: '9px 6px' }}
        >
          {upload.isPending ? 'Adding…' : '+ Document'}
          <input
            type="file"
            accept=".pdf,.docx,.jpeg,.jpg,.png,.csv,.xlsx"
            style={{ display: 'none' }}
            onChange={e => { const f = e.target.files?.[0]; if (f) upload.mutate(f); e.target.value = '' }}
          />
        </label>
        <button
          onClick={() => text.trim() && add.mutate(text.trim())}
          disabled={!text.trim() || add.isPending}
          style={{ flexShrink: 0, padding: '9px 16px', borderRadius: 8, background: text.trim() ? 'var(--gw-navy)' : 'var(--gw-border)', color: text.trim() ? 'white' : 'var(--gw-muted)', fontSize: 13, fontWeight: 700, border: 'none', cursor: text.trim() ? 'pointer' : 'default', fontFamily: 'inherit' }}
        >
          {add.isPending ? 'Saving…' : 'Note it'}
        </button>
      </div>
    </div>
  )
}

export function GroundChat({ groundId, openCheckInId, openSessionNumber, totalSessions, nextOpensAt, onOpenSession, openPending }: {
  groundId: string
  openCheckInId: string | null
  openSessionNumber: number | null
  totalSessions: number | null
  nextOpensAt: string | null
  onOpenSession?: () => void
  openPending?: boolean
}) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['my-transcript', groundId],
    queryFn: () => groundsApi.myTranscript(groundId),
  })

  const sessions = (data?.sessions ?? []).filter(s => s.turns.length > 0)

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {/* The conversation scrolls; the composer below it does not. */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 680, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
        {isLoading && <div style={{ fontSize: 13, color: 'var(--gw-muted)' }}>Loading your check-ins…</div>}
        {isError && (
          <div style={{ fontSize: 13, color: 'var(--gw-sub)' }}>
            Your check-ins could not be loaded. Try again in a moment.
          </div>
        )}

        {!isLoading && !isError && sessions.length === 0 && (
          <div style={{ fontSize: 13, color: 'var(--gw-sub)', lineHeight: 1.6 }}>
            Nothing on record yet. Your first check-in starts the conversation, and everything
            you say in it stays here for you to come back to.
          </div>
        )}

        {sessions.map(s => (
          <div key={s.checkInId} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
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
        ))}
      </div>

      <div style={{ maxWidth: 680, width: '100%', margin: '0 auto', padding: '0 20px 16px', boxSizing: 'border-box', flexShrink: 0 }}>
      <Composer
        groundId={groundId}
        openCheckInId={openCheckInId}
        openSessionNumber={openSessionNumber}
        totalSessions={totalSessions}
        nextOpensAt={nextOpensAt}
        onOpenSession={onOpenSession}
        openPending={openPending}
      />
      </div>
    </div>
  )
}
