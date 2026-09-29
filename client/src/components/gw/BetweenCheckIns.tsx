import { useState } from 'react'
import { useAskStore } from '@/stores/ask'
import { Composer } from './GroundChat'
import { QuickReplies } from './ui/QuickReplies'

/**
 * BETWEEN CHECK-INS (B3, docs/prototype/screens/B3-the-check-in/between-check-ins.jpg/.txt):
 * "<check-in name>" / "No check-in open right now" / "Your next check-in opens <when>. Anything I
 * can help with in the meantime?" / four chips / a conversation area.
 *
 * ROUND 5, ITEM E1: replaces what a participant with no open session used to see - GroundChat's
 * old Composer alone (the note box, "+ Document", "Note it"), flush against the sidebar with no
 * page margin, and none of the rest of this screen. The Check-in tab (GroundParticipantPage.tsx)
 * renders this now, inside the page's own column, like every other page.
 *
 * THE CHIPS. Three ask Ask Groundwork the question they name, with this check-in as their
 * context - `useAskStore().showWith(question)` opens the panel already asking it, the same one
 * step the board's own Ask bar uses (BoardPage.tsx's `AskTheBoard`). No context needs wiring by
 * hand: `AskGroundwork.tsx` reads which check-in "about" means straight off the page's own
 * address, and this page's address already is this check-in's - the same reason the board's bar
 * needs nothing extra either. The fourth, "Add a note for tomorrow", opens the private note box
 * instead of asking anything - GroundChat's own `Composer`, kept exactly: notes are yours alone,
 * not part of the record, and the next check-in asks about them; "+ Document" and "Change how
 * often this runs" stay reachable from it, unchanged.
 */
export function BetweenCheckIns({ groundLabel, nextOpensSaying, groundId, canChangeTheRhythm, onGoToSetup }: {
  groundLabel: string
  /** "Your next check-in opens tomorrow at 4pm." - from whenTheNextOneOpens(), or null when
      nothing is scheduled yet. */
  nextOpensSaying: string | null
  groundId: string
  canChangeTheRhythm?: boolean
  onGoToSetup?: () => void
}) {
  const showWith = useAskStore((s) => s.showWith)
  const [addingNote, setAddingNote] = useState(false)

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', width: '100%', padding: '24px 16px 48px' }}>
      <h1 style={{ fontFamily: 'var(--gw-font-name)', fontSize: 24, fontWeight: 600, color: 'var(--gw-text)', margin: '0 0 8px' }}>
        {groundLabel}
      </h1>
      <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--gw-text)', margin: '0 0 6px' }}>
        No check-in open right now
      </p>
      <p style={{ fontSize: 14, color: 'var(--gw-sub)', lineHeight: 1.6, margin: '0 0 20px' }}>
        {nextOpensSaying ? `${nextOpensSaying} ` : ''}Anything I can help with in the meantime?
      </p>
      <div style={{ marginBottom: 24 }}>
        <QuickReplies
          label="Anything I can help with in the meantime?"
          items={['What am I missing?', 'Review my goals', 'What did I say I’d do?', 'Add a note for tomorrow']}
          onPick={(item) => {
            if (item === 'Add a note for tomorrow') { setAddingNote(true); return }
            showWith(item)
          }}
        />
      </div>
      {addingNote && (
        <Composer
          groundId={groundId}
          openCheckInId={null}
          openSessionNumber={null}
          totalSessions={null}
          nextOpensAt={null}
          canChangeTheRhythm={canChangeTheRhythm}
          onGoToSetup={onGoToSetup}
        />
      )}
    </div>
  )
}
