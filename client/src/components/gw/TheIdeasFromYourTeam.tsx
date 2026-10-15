import type { TheIdeasFromYourTeam as TheIdeasFromYourTeamShape } from '@/api/anchorShapes'
import { Section } from './ui/Section'
import { Stack } from './ui/Stack'
import { SubHeading } from './ui/SubHeading'
import { Note } from './ui/NoteEmpty'

/**
 * PIECE 19/20: "IDEAS FROM YOUR TEAM" (section 18; plan section 5, row 7; decision 96, item 10;
 * docs/answers-from-engine.md, "Request 149, missing (1)", `TheIdeasFromYourTeam`).
 *
 * To everyone in the check-in, not the lead alone: `BoardPage.tsx` draws this with no
 * `viewerRunsThisCheckIn` gate, unlike `TheMonthBoard`. An idea is captured only after the person's
 * own yes (`TheIdeaOfferInTheCheckIn`, drawn in the chat), and from then on it is seen by everyone
 * in that check-in, "Raised by <name>" - never a label and never anonymous. Draws nothing at all
 * when `ideasFromYourTeam` is undefined: the field is not served yet, so today every caller passes
 * nothing and this component is simply absent, the same as before it existed.
 *
 * `whenThereAreNone` is a sentence the engine serves, drawn in place of the list when there are no
 * ideas yet - this section is shown either way, since the engine always has something to say here.
 */
export function TheIdeasFromYourTeam({ ideasFromYourTeam }: { ideasFromYourTeam: TheIdeasFromYourTeamShape | undefined }) {
  if (!ideasFromYourTeam) return null

  return (
    <Section heading={ideasFromYourTeam.heading}>
      {ideasFromYourTeam.ideas.length === 0 ? (
        <Note tone="muted">{ideasFromYourTeam.whenThereAreNone}</Note>
      ) : (
        <Stack gap={10}>
          {ideasFromYourTeam.ideas.map((idea) => (
            <div key={idea.id}>
              <SubHeading as="h3">{idea.title}</SubHeading>
              <p className="gwui-panel-text">{idea.raisedBy}</p>
              {idea.similarNeedsSentence && (
                <p className="gwui-panel-text" style={{ color: 'var(--gw-sub)' }}>{idea.similarNeedsSentence}</p>
              )}
            </div>
          ))}
        </Stack>
      )}
    </Section>
  )
}
