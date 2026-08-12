import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { groundsApi } from '@/api/grounds'
import { documentsApi } from '@/api/documents'
import { toast } from 'sonner'

/**
 * A GROUND, READ AS A CONVERSATION.
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
        maxWidth: '80%',
        alignSelf: mine ? 'flex-end' : 'flex-start',
        background: mine ? 'var(--gw-navy)' : 'white',
        color: mine ? 'white' : 'var(--gw-text)',
        border: mine ? 'none' : '0.5px solid var(--gw-border)',
        borderRadius: mine ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
        padding: '10px 14px',
        fontSize: 14,
        lineHeight: 1.6,
        whiteSpace: 'pre-wrap',
        boxShadow: mine ? 'none' : '0 1px 3px rgba(0,0,0,.05)',
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
function Composer({ groundId, openCheckInId, openSessionNumber, totalSessions, nextOpensAt }: {
  groundId: string
  openCheckInId: string | null
  openSessionNumber: number | null
  totalSessions: number | null
  nextOpensAt: string | null
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
          onClick={() => navigate(`/checkin/${openCheckInId}`)}
          style={{ width: '100%', padding: '13px 16px', borderRadius: 10, background: 'var(--gw-navy)', color: 'white', fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
        >
          {/* The total rides along here on purpose. In the card view it lived on the
              open-session card; in a conversation there is nowhere else for "how
              many of these are there" to be, and it is the thing that tells
              somebody whether they are at the start of this or near the end. */}
          {openSessionNumber != null
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

export function GroundChat({ groundId, openCheckInId, openSessionNumber, totalSessions, nextOpensAt }: {
  groundId: string
  openCheckInId: string | null
  openSessionNumber: number | null
  totalSessions: number | null
  nextOpensAt: string | null
}) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['my-transcript', groundId],
    queryFn: () => groundsApi.myTranscript(groundId),
  })

  const sessions = (data?.sessions ?? []).filter(s => s.turns.length > 0)

  return (
    <div>
      {isLoading && <div style={{ fontSize: 13, color: 'var(--gw-muted)', padding: '20px 0' }}>Loading your check-ins…</div>}
      {isError && (
        <div style={{ fontSize: 13, color: 'var(--gw-sub)', padding: '20px 0' }}>
          Your check-ins could not be loaded. Try again in a moment.
        </div>
      )}

      {!isLoading && !isError && sessions.length === 0 && (
        <div style={{ fontSize: 13, color: 'var(--gw-sub)', lineHeight: 1.6, padding: '18px 0' }}>
          Nothing on record yet. Your first check-in starts the conversation, and everything
          you say in it stays here for you to come back to.
        </div>
      )}

      {sessions.map(s => (
        <div key={s.checkInId} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <SessionDivider
            sessionNumber={s.sessionNumber}
            date={s.date}
            isCorrection={s.isSelfCorrection}
            correctionOf={s.correctionOf}
          />
          {s.turns.map(t => <Message key={t.id} role={t.role} content={t.content} />)}
        </div>
      ))}

      <Composer
        groundId={groundId}
        openCheckInId={openCheckInId}
        openSessionNumber={openSessionNumber}
        totalSessions={totalSessions}
        nextOpensAt={nextOpensAt}
      />
    </div>
  )
}
