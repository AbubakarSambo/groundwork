import { useState } from 'react'
import { toast } from 'sonner'
import { askApi, type AskBlock, type AskReply } from '@/api/ask'
import { Composer as NoteComposer } from './GroundChat'
import { ConversationCard } from './ui/ConversationCard'
import { TheCheckInHeader } from './checkin/TheCheckInHeader'
import { Bubble } from './ui/Bubble'
import { QuickReplies } from './ui/QuickReplies'
import { Composer } from './ui/Composer'
import { Button } from './ui/Button'

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
 * cadence may be days or weeks out), still opens GroundChat's private note box - a note is not an
 * answer, so it is not a bubble.
 *
 * "Change how often this runs" no longer waits behind the note box: it is its own quiet link under
 * the card, reachable directly, the same as the note itself.
 */

/** The reply's blocks, reduced to plain lines. Nothing this card cannot show (a proposal's yes/no,
    a picker's options) is dropped silently - it prints as a line of text instead, same as it would
    read aloud, since this card has no room for buttons of its own. */
function linesOf(reply: AskReply): string[] {
  return reply.blocks.map((b: AskBlock) => {
    if (b.type === 'text' && typeof b.body === 'string') return b.body
    if (b.type === 'claim' && typeof b.says === 'string') return b.says
    if (b.type === 'proposal' && typeof b.summary === 'string') return b.summary
    if (b.type === 'picker' && Array.isArray(b.options)) {
      return (b.options as { label: string }[]).map(o => o.label).join(' / ')
    }
    if (b.type === 'next_step' && typeof b.label === 'string') return b.label
    return null
  }).filter((s): s is string => !!s)
}

type Exchange = { mine: boolean; text: string }

export function BetweenCheckIns({ groundLabel, nextOpensSaying, groundId, canChangeTheRhythm, onGoToSetup }: {
  groundLabel: string
  /** "Your next check-in opens tomorrow at 4pm." - from whenTheNextOneOpens(), or null when
      nothing is scheduled yet. */
  nextOpensSaying: string | null
  groundId: string
  canChangeTheRhythm?: boolean
  onGoToSetup?: () => void
}) {
  const [addingNote, setAddingNote] = useState(false)
  const [exchanges, setExchanges] = useState<Exchange[]>([])
  const [draft, setDraft] = useState('')
  const [asking, setAsking] = useState(false)

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

  const send = () => {
    const m = draft.trim()
    if (!m) return
    setDraft('')
    void ask(m)
  }

  return (
    <div style={{ height: '100%', minHeight: 420, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ flex: 1, minHeight: 0 }}>
        <ConversationCard
          header={<TheCheckInHeader title={groundLabel} underTitle="No check-in open right now" mayPause={false} />}
          footer={
            <Composer
              value={draft}
              onChange={setDraft}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
              onSend={send}
              disabled={asking}
              sendDisabled={!draft.trim() || asking}
              placeholder="Ask, or add a note"
            />
          }
        >
          <Bubble mine={false}>
            {nextOpensSaying ? `${nextOpensSaying} ` : ''}Anything I can help with in the meantime?
          </Bubble>
          <QuickReplies
            label="Anything I can help with in the meantime?"
            stacked
            disabled={asking}
            items={['What am I missing?', 'Review my goals', 'What did I say I’d do?', 'Add a note for next time']}
            onPick={(item) => {
              if (item === 'Add a note for next time') { setAddingNote(true); return }
              void ask(item)
            }}
          />
          {exchanges.map((ex, i) => (
            <Bubble key={i} mine={ex.mine}>{ex.text}</Bubble>
          ))}
          {addingNote && (
            <NoteComposer
              groundId={groundId}
              openCheckInId={null}
              openSessionNumber={null}
              totalSessions={null}
              nextOpensAt={null}
              canChangeTheRhythm={false}
            />
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
