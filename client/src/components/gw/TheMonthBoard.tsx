import type { TheMonthBoard as TheMonthBoardShape } from '@/api/anchorShapes'
import { Section } from './ui/Section'
import { Panel } from './ui/Panel'
import { Stack } from './ui/Stack'
import { SubHeading } from './ui/SubHeading'
import { Note } from './ui/NoteEmpty'

/**
 * PIECES 12, 13 AND 20: THE LEAD'S MONTH BOARD, "Are we moving together?" (plan section 5, row 6;
 * docs/anchor-scenario.md section 24; docs/answers-from-engine.md, "Request 147", `TheMonthBoard`).
 *
 * Lead only - drawn only for whoever runs the check-in, only while the engine actually serves
 * `theMonthBoard` (which itself only happens for an anchor Ground, with `anchorScenarioOn`). Draws
 * nothing when `monthBoard` is undefined, the same as before this existed. "Ideas from your team"
 * (plan row 7) and the part of "People helping the team move" beyond `peopleHelpingThingsMove`
 * (plan row 8) are not pinned shapes yet (docs/answers-from-engine.md, request 147, does not give
 * them their own fields on `TheMonthBoard`) - see the build report.
 */
export function TheMonthBoard({ monthBoard }: { monthBoard: TheMonthBoardShape | undefined }) {
  if (!monthBoard) return null

  /* The engine says where the month is, and says so plainly once the check-in has ended. */
  const weekLabel = monthBoard.weekSaid

  return (
    <div className="gwui-stack-18">
      <div>
        <div className="gwui-section-title" style={{ fontSize: 22, fontWeight: 800 }}>{monthBoard.question}</div>
        <p className="gwui-panel-text" style={{ margin: '2px 0 0', color: 'var(--gw-sub)' }}>{weekLabel}</p>
      </div>

      {monthBoard.lenses.length > 0 && (
        <Panel>
          <Stack gap={12}>
            {monthBoard.lenses.map((lens) => (
              <div key={lens.key}>
                <SubHeading as="h3">{lens.heading}</SubHeading>
                <p className="gwui-panel-text" style={{ color: 'var(--gw-sub)' }}>{lens.question}</p>
                <p className="gwui-panel-text">{lens.reading}</p>
              </div>
            ))}
          </Stack>
        </Panel>
      )}

      {monthBoard.whatIsMoving.length > 0 && (
        <Section heading="What's moving">
          <Stack gap={6}>
            {monthBoard.whatIsMoving.map((s, i) => <Note key={i} tone="muted">{s}</Note>)}
          </Stack>
        </Section>
      )}

      {monthBoard.whatTheTeamIsContributing.length > 0 && (
        <Section heading="What the team is contributing">
          <Stack gap={6}>
            {monthBoard.whatTheTeamIsContributing.map((s, i) => <Note key={i} tone="muted">{s}</Note>)}
          </Stack>
        </Section>
      )}

      {monthBoard.peopleHelpingThingsMove.length > 0 && (
        <Section heading="People helping things move">
          <Stack gap={10}>
            {monthBoard.peopleHelpingThingsMove.map((p, i) => (
              <div key={i}>
                <SubHeading as="h3">{p.name}</SubHeading>
                <p className="gwui-panel-text">{p.sentence}</p>
              </div>
            ))}
          </Stack>
        </Section>
      )}

      {monthBoard.wherePerspectivesDiffer.length > 0 && (
        <Section heading="Where perspectives differ">
          <Stack gap={6}>
            {monthBoard.wherePerspectivesDiffer.map((s, i) => <Note key={i} tone="muted">{s}</Note>)}
          </Stack>
        </Section>
      )}

      {monthBoard.whatIsStillGettingInTheWay.length > 0 && (
        <Section heading="What's still getting in the way">
          <Stack gap={6}>
            {monthBoard.whatIsStillGettingInTheWay.map((s, i) => <Note key={i} tone="muted">{s}</Note>)}
          </Stack>
        </Section>
      )}

      {monthBoard.whatGroundworkIsWorkingOnNext.length > 0 && (
        <Section heading="What Groundwork is working on next">
          <Stack gap={6}>
            {monthBoard.whatGroundworkIsWorkingOnNext.map((s, i) => <Note key={i} tone="muted">{s}</Note>)}
          </Stack>
        </Section>
      )}
    </div>
  )
}
