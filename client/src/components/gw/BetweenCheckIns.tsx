import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { askApi, type AskBlock, type AskReply } from '@/api/ask'
import { groundsApi } from '@/api/grounds'
import { ConversationCard } from './ui/ConversationCard'
import { TheCheckInHeader } from './checkin/TheCheckInHeader'
import { Bubble } from './ui/Bubble'
import { GroundworkIsWriting } from './ui/GroundworkIsWriting'
import { QuickReplies } from './ui/QuickReplies'
import { Composer } from './ui/Composer'
import { Button } from './ui/Button'
import { theNextOne } from '@/lib/what-the-end-of-a-check-in-can-say'

/**
 * BETWEEN CHECK-INS (B3, docs/prototype/screens/B3-the-check-in/between-check-ins.jpg/.txt).
 *
 * REVIEW ROUND 3, ITEM 4: REBUILT AS THE PROTOTYPE'S CONVERSATION-STYLE CARD, not the standalone
 * page this had become (a plain heading, a paragraph, a flat row of chips, and GroundChat's own
 * note box appearing below everything once one chip was pressed). The prototype's own picture is a
 * conversation: the small header ("<name>" / "No check-in open right now"), Groundwork's sentence
 * in its own bubble, four chips stacked one per line, and each chip's answer arriving as a further
 * bubble in the SAME card - "What did I say I'd do?" answered inline, not sent off to a side panel.
 *
 * So the three "ask" chips (and the composer) now call `askApi.ask` directly and draw the reply as
 * bubbles here, rather than `useAskStore().showWith()` opening the separate Ask Groundwork panel -
 * this is the prototype's own conversation, in its own card, and the panel is a different surface
 * for a different moment (asking about anything, from anywhere). The fourth chip, "Add a note for
 * next time" (the screen's old "for tomorrow" assumed the next session is tomorrow's, when the
 * cadence may be days or weeks out), switches the same footer composer into note mode - a note is
 * not an answer, so it does not arrive as a bubble.
 *
 * "Change how often this runs" no longer waits behind the note box: it is its own quiet link under
 * the card, reachable directly, the same as the note itself.
 *
 * RE-REVIEW BUG: "Add a note for next time" opened GroundChat's own note box ABOVE this card's own
 * footer composer, so two input boxes were on screen together - "Ask, or add a note" at the foot,
 * and a second textarea with its own "Note it" button sitting in the messages above it. There is
 * only one composer now. The chip switches it into note mode: the placeholder becomes "Note
 * something for your next check-in…", the send button reads "Save", and what is typed goes to the
 * same private note endpoint GroundChat's own composer used, rather than to Ask Groundwork.
 *
 * RESTORED (nothing-removed-screens.md, item 1): live's `GroundChat.tsx` (lines 362 to 449) listed
 * every note waiting for the person's next check-in, under "Waiting for your next check-in", with a
 * way to delete one. That was lost when this card replaced `GroundChat` on this tab - the card could
 * only add a note, never see or take one back. The list is restored here, in the same place live put
 * it: above the composer, the last thing in the card before someone writes anything new. Only the
 * viewer's own notes, ever - `groundsApi.myNotes` already scopes to the signed-in person on the
 * server, so there is nothing further to filter here. Deleting asks first ("Delete this note?" /
 * "Yes, delete it" / "Keep it"), the same shape `CheckInPeopleAndSetup.tsx` uses for deleting a
 * check-in, rather than removing it on one click as live did.
 */

/**
 * The reply's blocks, reduced to plain lines. Nothing this card cannot show (a proposal's yes/no,
 * a picker's options) is dropped silently - it prints as a line of text instead, same as it would
 * read aloud, since this card has no room for buttons of its own.
 *
 * B-036: A REPLY SAYING THE SAME SENTENCE TWICE - as both its own `text` block and a `claim` or
 * `proposal` block repeating it - rendered as two identical bubbles, one directly under the other
 * (Grace's leave dates, and the next reply in the same conversation). `AskGroundwork.tsx`'s own
 * `drawBlocks` already guards exactly this case for the sidebar panel (`!texts.has(b.summary)`);
 * this card had no such guard, so a `claim`'s or `proposal`'s own text is dropped here too when a
 * `text` block already said the same words.
 */
function linesOf(reply: AskReply): string[] {
  const texts = new Set(reply.blocks.filter((b): b is AskBlock & { type: 'text'; body: string } => b.type === 'text' && typeof b.body === 'string').map((b) => b.body))
  return reply.blocks.map((b: AskBlock) => {
    if (b.type === 'text' && typeof b.body === 'string') return b.body
    if (b.type === 'claim' && typeof b.says === 'string') return texts.has(b.says) ? null : b.says
    if (b.type === 'proposal' && typeof b.summary === 'string') return texts.has(b.summary) ? null : b.summary
    if (b.type === 'picker' && Array.isArray(b.options)) {
      return (b.options as { label: string }[]).map(o => o.label).join(' / ')
    }
    if (b.type === 'next_step' && typeof b.label === 'string') return b.label
    return null
  }).filter((s): s is string => !!s)
}

type Exchange = { mine: boolean; text: string }

export function BetweenCheckIns({ groundLabel, myCheckIns, groundId, canChangeTheRhythm, onGoToSetup }: {
  groundLabel: string
  /**
   * The reader's own check-ins. The header and the sentence under it both read `theNextOne` from these (Hafsah, 30 October
   * 2026): the header used to be fixed words, "No check-in open right now", over "Your next check-in is open now."
   */
  myCheckIns: { id: string; sessionNumber: number; status: string; availableFrom?: string | null }[] | null | undefined
  groundId: string
  canChangeTheRhythm?: boolean
  onGoToSetup?: () => void
}) {
  /** 'ask' talks to Groundwork; 'note' writes a private note for the next check-in. One composer,
      one mode at a time - never both boxes at once. */
  const [mode, setMode] = useState<'ask' | 'note'>('ask')
  const [exchanges, setExchanges] = useState<Exchange[]>([])
  const [draft, setDraft] = useState('')
  const [asking, setAsking] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const qc = useQueryClient()
  const next = theNextOne(myCheckIns, null)

  const { data: notes = [] } = useQuery({
    queryKey: ['my-notes', groundId],
    queryFn: () => groundsApi.myNotes(groundId),
  })
  // A note a session has already asked about belongs to that conversation, not to the pile still
  // waiting for the next one.
  const waitingNotes = notes.filter(n => !n.carriedIntoCheckInId)

  const deleteNote = useMutation({
    mutationFn: (noteId: string) => groundsApi.deleteMyNote(groundId, noteId),
    onSuccess: () => {
      setConfirmDeleteId(null)
      qc.invalidateQueries({ queryKey: ['my-notes', groundId] })
      toast.success('Deleted.')
    },
    onError: () => toast.error('That did not delete. Try again.'),
  })

  const ask = async (message: string) => {
    const m = message.trim()
    if (!m || asking) return
    setAsking(true)
    setExchanges(e => [...e, { mine: true, text: m }])
    try {
      const reply = await askApi.ask(m, groundId)
      const lines = linesOf(reply)
      setExchanges(e => [...e, ...lines.map(text => ({ mine: false, text }))])
    } catch {
      toast.error('That did not send. Try again.')
    } finally {
      setAsking(false)
    }
  }

  const addNote = useMutation({
    mutationFn: (t: string) => groundsApi.addMyNote(groundId, t),
    onSuccess: () => {
      setDraft('')
      setMode('ask')
      qc.invalidateQueries({ queryKey: ['my-notes', groundId] })
      toast.success('Noted. Your next check-in will ask you about it.')
    },
    onError: () => toast.error('The note didn’t save. Try again.'),
  })

  const send = () => {
    const m = draft.trim()
    if (!m) return
    if (mode === 'note') {
      addNote.mutate(m)
      return
    }
    setDraft('')
    void ask(m)
  }

  return (
    <div style={{ height: '100%', minHeight: 420, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ flex: 1, minHeight: 0 }}>
        <ConversationCard
          header={<TheCheckInHeader title={groundLabel} underTitle={next.openId ? 'Your next check-in is open' : 'No check-in open right now'} />}
          footer={
            <Composer
              value={draft}
              onChange={setDraft}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
              onSend={send}
              disabled={mode === 'note' ? addNote.isPending : asking}
              sendDisabled={!draft.trim() || (mode === 'note' ? addNote.isPending : asking)}
              placeholder={mode === 'note' ? 'Note something for your next check-in…' : 'Ask, or add a note'}
              sendLabel={mode === 'note' ? 'Save' : 'Send'}
            />
          }
        >
          <Bubble mine={false}>
            {next.openId ? 'Anything I can help with before you start?' : `${next.says ? `${next.says} ` : ''}Anything I can help with in the meantime?`}
          </Bubble>
          <QuickReplies
            label="Anything I can help with in the meantime?"
            stacked
            disabled={asking}
            items={['What am I missing?', 'Review my goals', 'What did I say I’d do?', 'Add a note for next time']}
            onPick={(item) => {
              if (item === 'Add a note for next time') { setMode('note'); return }
              void ask(item)
            }}
          />
          {mode === 'note' && (
            <Bubble mine={false}>
              Notes are yours alone. They are not part of the record, and your next check-in will ask you about them.
            </Bubble>
          )}
          {exchanges.map((ex, i) => (
            <Bubble key={i} mine={ex.mine}>{ex.text}</Bubble>
          ))}
          {/* No sign of work while waiting existed here at all before this (Hafsah, 9 October):
              the composer just went quietly disabled. Same shared indicator every chat uses. */}
          {asking && <GroundworkIsWriting />}
          {waitingNotes.length > 0 && (
            <div style={{ marginTop: 4 }}>
              <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.5px', color: 'var(--gw-muted)', fontWeight: 700, marginBottom: 6 }}>
                Waiting for your next check-in
              </div>
              {waitingNotes.map(n => (
                <div key={n.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, background: 'var(--gw-bg)', border: '1px solid var(--gw-border)', borderRadius: 8, padding: '9px 11px', marginBottom: 6 }}>
                  <div style={{ flex: 1, fontSize: 12, color: 'var(--gw-text)', lineHeight: '19px', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', minWidth: 0 }}>{n.text}</div>
                  {confirmDeleteId === n.id ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 12, color: 'var(--gw-muted)' }}>Delete this note?</span>
                      <Button kind="danger" size="small" disabled={deleteNote.isPending} onClick={() => deleteNote.mutate(n.id)}>
                        {deleteNote.isPending ? 'Deleting…' : 'Yes, delete it'}
                      </Button>
                      <Button kind="secondary" size="small" onClick={() => setConfirmDeleteId(null)}>Keep it</Button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(n.id)}
                      aria-label="Delete this note"
                      style={{ background: 'none', border: 'none', color: 'var(--gw-muted)', cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: 0, fontFamily: 'inherit' }}
                    >×</button>
                  )}
                </div>
              ))}
            </div>
          )}
        </ConversationCard>
      </div>
      {/* REVIEW ROUND 3, ITEM 4: REACHABLE DIRECTLY, NOT ONLY FROM INSIDE THE NOTE BOX - which
          never actually offered it here anyway (it is gated on `nextOpensAt`, always null on this
          screen). A quiet link under the card, the same as the note itself. */}
      {canChangeTheRhythm && onGoToSetup && (
        <div style={{ maxWidth: 560, margin: '0 auto', width: '100%' }}>
          <Button kind="quiet" size="small" onClick={onGoToSetup}>Change how often this runs</Button>
        </div>
      )}
    </div>
  )
}
