import type { TheAnchorBoardSections as TheAnchorBoardSectionsShape, TheContinueOption } from '@/api/anchorShapes'
import { Section } from './ui/Section'
import { Panel } from './ui/Panel'
import { Stack } from './ui/Stack'
import { SubHeading } from './ui/SubHeading'
import { Note } from './ui/NoteEmpty'
import { Button } from './ui/Button'

/**
 * THE ANCHOR'S SECTIONS, ON THE ORDINARY BOARD, NAMED BY THE SWITCHBOARD (decision 114;
 * docs/answers-from-engine.md, "8 October (later): the anchor through the ordinary routes, route
 * by route", and "8 October (evening): the anchor's last month parts are board sections"; mirrors
 * `api/src/modules/board/the-anchor-sections-on-the-board.ts`).
 *
 * `BoardPage.tsx` and `EndingPage.tsx` pass each field straight through from the board payload,
 * gated on `b.sections.includes(...)`, the same mechanism every other kind of work's sections
 * already use - WHO READS WHAT IS DECIDED BY THE SERVER: a section this reader may not read is
 * simply absent from what was served, so this component draws nothing for a field it was not
 * handed; there is no reader check in here at all. `ideasFromTheTeam` is not drawn here - it is the
 * same shape `TheIdeasFromYourTeam` already draws, so `BoardPage.tsx` hands that field to the
 * existing component instead of building a second one. `recommendations` is not drawn here either:
 * the lead already reads "Groundwork recommends" through the dedicated `recommendedCheckInsApi`
 * listing and its own yes/not-now handling, which this would only duplicate - see BoardPage.tsx for
 * why.
 *
 * `whereTheMonthIs` THROUGH `whatGroundworkIsWorkingOnNext`, AND `theEndOfTheMonth`, ARE THE LAST
 * PARTS OF THE OLDER `TheMonthBoard` AND `TheEndOfMonthRead` COMPONENTS (decision 114, 8 October
 * evening), now drawn here as sections instead - see
 * the-anchor-old-and-new-sections-agree.spec.tsx for the proof that the same sentences still
 * appear from either payload. `onContinue` is only needed when `theEndOfTheMonth` is handed in:
 * `BoardPage.tsx` never passes that field, and `EndingPage.tsx` is the only caller that does, the
 * same place the four continue options always lived.
 */
export function TheAnchorBoardSections({ sections, onContinue }: {
  sections: TheAnchorBoardSectionsShape
  onContinue?: (option: TheContinueOption) => void
}) {
  const {
    whatYouAreCarrying, howGroundworkWillWork, theFourLenses, peopleHelpingTheTeamMove, weeklyInsight,
    whereTheMonthIs, whatIsMoving, whatTheTeamIsContributing, wherePerspectivesDiffer, whatIsStillInTheWay,
    whatGroundworkIsWorkingOnNext, theEndOfTheMonth,
  } = sections
  return (
    <>
      {whatYouAreCarrying && (
        <Section heading={whatYouAreCarrying.heading}>
          <Note tone="muted">{whatYouAreCarrying.text}</Note>
        </Section>
      )}

      {whereTheMonthIs && (
        <Section heading={whereTheMonthIs.heading}>
          <Note tone="muted">{whereTheMonthIs.text}</Note>
        </Section>
      )}

      {theFourLenses && theFourLenses.lenses.length > 0 && (
        <div className="gwui-stack-18">
          <div>
            <div className="t-h2" style={{ fontSize: 22, fontWeight: 700 }}>{theFourLenses.heading}</div>
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

      {whatIsMoving && whatIsMoving.items.length > 0 && (
        <Section heading={whatIsMoving.heading}>
          <Stack gap={6}>
            {whatIsMoving.items.map((s, i) => <Note key={i} tone="muted">{s}</Note>)}
          </Stack>
        </Section>
      )}

      {whatTheTeamIsContributing && whatTheTeamIsContributing.items.length > 0 && (
        <Section heading={whatTheTeamIsContributing.heading}>
          <Stack gap={6}>
            {whatTheTeamIsContributing.items.map((s, i) => <Note key={i} tone="muted">{s}</Note>)}
          </Stack>
        </Section>
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

      {wherePerspectivesDiffer && wherePerspectivesDiffer.items.length > 0 && (
        <Section heading={wherePerspectivesDiffer.heading}>
          <Stack gap={6}>
            {wherePerspectivesDiffer.items.map((s, i) => <Note key={i} tone="muted">{s}</Note>)}
          </Stack>
        </Section>
      )}

      {whatIsStillInTheWay && whatIsStillInTheWay.items.length > 0 && (
        <Section heading={whatIsStillInTheWay.heading}>
          <Stack gap={6}>
            {whatIsStillInTheWay.items.map((s, i) => <Note key={i} tone="muted">{s}</Note>)}
          </Stack>
        </Section>
      )}

      {whatGroundworkIsWorkingOnNext && whatGroundworkIsWorkingOnNext.items.length > 0 && (
        <Section heading={whatGroundworkIsWorkingOnNext.heading}>
          <Stack gap={6}>
            {whatGroundworkIsWorkingOnNext.items.map((s, i) => <Note key={i} tone="muted">{s}</Note>)}
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

      {theEndOfTheMonth && (
        <div className="gwui-stack-18">
          <div>
            <div className="t-h2" style={{ fontSize: 22, fontWeight: 700 }}>{theEndOfTheMonth.heading}</div>
            <p className="gwui-panel-text" style={{ margin: '6px 0 0', fontStyle: 'italic' }}>&ldquo;{theEndOfTheMonth.yourOwnWords}&rdquo;</p>
          </div>

          <Stack gap={12}>
            {theEndOfTheMonth.parts.map((part) => (
              <Section key={part.heading} heading={part.heading}>
                <Stack gap={6}>{part.items.map((s, i) => <Note key={i} tone="muted">{s}</Note>)}</Stack>
              </Section>
            ))}
            {theEndOfTheMonth.people.length > 0 && (
              <Section heading="People who helped move the thinking">
                <Stack gap={10}>
                  {theEndOfTheMonth.people.map((p, i) => (
                    <div key={i}>
                      <SubHeading as="h3">{p.name}</SubHeading>
                      <p className="gwui-panel-text">{p.sentence}</p>
                    </div>
                  ))}
                </Stack>
              </Section>
            )}
          </Stack>

          <Panel heading={theEndOfTheMonth.revealSaid.heading}>
            <Stack gap={6}>
              <p className="gwui-panel-text">{theEndOfTheMonth.revealSaid.intro}</p>
              {theEndOfTheMonth.revealSaid.lines.map((line, i) => <Note key={i} tone="muted">{line}</Note>)}
            </Stack>
            <p className="gwui-panel-text" style={{ marginTop: 12, fontWeight: 700 }}>{theEndOfTheMonth.revealSaid.closing}</p>
          </Panel>

          {theEndOfTheMonth.continueOptions.length > 0 && onContinue && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-start' }}>
              {theEndOfTheMonth.continueOptions.map((o, i) => (
                i === 0 ? (
                  <Button key={o.key} kind="primary" onClick={() => onContinue(o)}>{o.label}</Button>
                ) : (
                  <button key={o.key} type="button" className="gwui-plain-link" onClick={() => onContinue(o)}>{o.label}</button>
                )
              ))}
            </div>
          )}
        </div>
      )}
    </>
  )
}
