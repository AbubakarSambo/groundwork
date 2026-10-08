import type { TheAnchorBoardSections as TheAnchorBoardSectionsShape } from '@/api/anchorShapes'
import { Section } from './ui/Section'
import { Panel } from './ui/Panel'
import { Stack } from './ui/Stack'
import { SubHeading } from './ui/SubHeading'
import { Note } from './ui/NoteEmpty'

/**
 * THE ANCHOR'S SECTIONS, ON THE ORDINARY BOARD, NAMED BY THE SWITCHBOARD (decision 114;
 * docs/answers-from-engine.md, "8 October (later): the anchor through the ordinary routes, route
 * by route"; mirrors `api/src/modules/board/the-anchor-sections-on-the-board.ts`).
 *
 * `BoardPage.tsx` passes each field straight through from the board payload, gated on
 * `b.sections.includes(...)`, the same mechanism every other kind of work's sections already use -
 * WHO READS WHAT IS DECIDED BY THE SERVER: a section this reader may not read is simply absent from
 * what was served, so this component draws nothing for a field it was not handed; there is no
 * reader check in here at all. `ideasFromTheTeam` is not drawn here - it is the same shape
 * `TheIdeasFromYourTeam` already draws, so `BoardPage.tsx` hands that field to the existing
 * component instead of building a second one. `recommendations` is not drawn here either: the lead
 * already reads "Groundwork recommends" through the dedicated `recommendedCheckInsApi` listing and
 * its own yes/not-now handling, which this would only duplicate - see BoardPage.tsx for why.
 */
export function TheAnchorBoardSections({ sections }: { sections: TheAnchorBoardSectionsShape }) {
  const { whatYouAreCarrying, howGroundworkWillWork, theFourLenses, peopleHelpingTheTeamMove, weeklyInsight } = sections
  return (
    <>
      {whatYouAreCarrying && (
        <Section heading={whatYouAreCarrying.heading}>
          <Note tone="muted">{whatYouAreCarrying.text}</Note>
        </Section>
      )}

      {theFourLenses && theFourLenses.lenses.length > 0 && (
        <div className="gwui-stack-18">
          <div>
            <div className="gwui-section-title" style={{ fontSize: 22, fontWeight: 800 }}>{theFourLenses.heading}</div>
            <p className="gwui-panel-text" style={{ margin: '2px 0 0', color: 'var(--gw-sub)' }}>{theFourLenses.question}</p>
          </div>
          <Panel>
            <Stack gap={12}>
              {theFourLenses.lenses.map((lens) => (
                <div key={lens.key}>
                  <SubHeading as="h3">{lens.heading}</SubHeading>
                  <p className="gwui-panel-text" style={{ color: 'var(--gw-sub)' }}>{lens.question}</p>
                  <p className="gwui-panel-text">{lens.reading}</p>
                </div>
              ))}
            </Stack>
          </Panel>
        </div>
      )}

      {peopleHelpingTheTeamMove && peopleHelpingTheTeamMove.people.length > 0 && (
        <Section heading={peopleHelpingTheTeamMove.heading}>
          <Stack gap={10}>
            {peopleHelpingTheTeamMove.people.map((p, i) => (
              <div key={i}>
                <SubHeading as="h3">{p.name}</SubHeading>
                <p className="gwui-panel-text">{p.sentence}</p>
              </div>
            ))}
          </Stack>
        </Section>
      )}

      {howGroundworkWillWork && howGroundworkWillWork.ways.length > 0 && (
        <Section heading={howGroundworkWillWork.heading}>
          <Stack gap={10}>
            {howGroundworkWillWork.ways.map((w) => (
              <div key={w.key}>
                <SubHeading as="h3">{w.heading}</SubHeading>
                <p className="gwui-panel-text">{w.sentence}</p>
              </div>
            ))}
          </Stack>
        </Section>
      )}

      {weeklyInsight && (
        <Section heading={weeklyInsight.heading}>
          <Note tone="muted">{weeklyInsight.text}</Note>
        </Section>
      )}
    </>
  )
}
