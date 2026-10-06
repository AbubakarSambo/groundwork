import type { TheEndOfMonthRead as TheEndOfMonthReadShape, TheContinueOption } from '@/api/anchorShapes'
import { Section } from './ui/Section'
import { Panel } from './ui/Panel'
import { Stack } from './ui/Stack'
import { SubHeading } from './ui/SubHeading'
import { Note } from './ui/NoteEmpty'
import { Button } from './ui/Button'

/**
 * PIECE 33: THE END-OF-MONTH PAGE (plan section 5, row 13; docs/anchor-scenario.md sections 28
 * and 29; docs/answers-from-engine.md, "Request 149 (6 of 6)", `TheEndOfMonthRead`).
 *
 * Built once from the record on the engine side; opening this page never rebuilds it (CLAUDE.md:
 * "Reports and boards update only when something new comes in"). Draws nothing when `read` is
 * undefined - served only once the month has run and the lead has her own first words to begin
 * with. The reveal is drawn from the sentences the engine serves (`revealSaid`), never from a bare number.
 * The four continue options go to the existing plan choice, Stripe test mode only (decision 96,
 * item 4) - `onContinue` is given the key so the caller decides exactly where that leads, rather
 * than this component hard-coding a route.
 *
 * At most one navy button per page: only the first continue option
 * (`keepThisGroundRunning`) is drawn `kind="primary"`; the rest are quiet text links.
 */
export function TheEndOfMonthRead({ read, onContinue }: {
  read: TheEndOfMonthReadShape | null | undefined
  onContinue: (option: TheContinueOption) => void
}) {
  if (!read) return null

  return (
    <div className="gwui-stack-18">
      <div>
        <div className="gwui-section-title" style={{ fontSize: 22, fontWeight: 800 }}>You wanted your team to understand...</div>
        <p className="gwui-panel-text" style={{ margin: '6px 0 0', fontStyle: 'italic' }}>&ldquo;{read.yourOwnWords}&rdquo;</p>
      </div>

      <Stack gap={12}>
        {read.whatWeFound.length > 0 && (
          <Section heading="What we found">
            <Stack gap={6}>{read.whatWeFound.map((s, i) => <Note key={i} tone="muted">{s}</Note>)}</Stack>
          </Section>
        )}
        {read.whatTheyNowUnderstandDifferently.length > 0 && (
          <Section heading="What they now understand differently">
            <Stack gap={6}>{read.whatTheyNowUnderstandDifferently.map((s, i) => <Note key={i} tone="muted">{s}</Note>)}</Stack>
          </Section>
        )}
        {read.whatTheyAreDoingDifferently.length > 0 && (
          <Section heading="What they're doing differently">
            <Stack gap={6}>{read.whatTheyAreDoingDifferently.map((s, i) => <Note key={i} tone="muted">{s}</Note>)}</Stack>
          </Section>
        )}
        {read.whatYourTeamContributed.length > 0 && (
          <Section heading="What your team contributed">
            <Stack gap={6}>{read.whatYourTeamContributed.map((s, i) => <Note key={i} tone="muted">{s}</Note>)}</Stack>
          </Section>
        )}
        {read.peopleWhoHelpedMoveTheThinking.length > 0 && (
          <Section heading="People who helped move the thinking">
            <Stack gap={10}>
              {read.peopleWhoHelpedMoveTheThinking.map((p, i) => (
                <div key={i}>
                  <SubHeading as="h3">{p.name}</SubHeading>
                  <p className="gwui-panel-text">{p.sentence}</p>
                </div>
              ))}
            </Stack>
          </Section>
        )}
        {read.whatYouChangedAsALead.length > 0 && (
          <Section heading="What you changed as a lead">
            <Stack gap={6}>{read.whatYouChangedAsALead.map((s, i) => <Note key={i} tone="muted">{s}</Note>)}</Stack>
          </Section>
        )}
        {read.whatIsStillStuck.length > 0 && (
          <Section heading="What's still stuck">
            <Stack gap={6}>{read.whatIsStillStuck.map((s, i) => <Note key={i} tone="muted">{s}</Note>)}</Stack>
          </Section>
        )}
        {read.whatShouldHappenNext.length > 0 && (
          <Section heading="What should happen next">
            <Stack gap={6}>{read.whatShouldHappenNext.map((s, i) => <Note key={i} tone="muted">{s}</Note>)}</Stack>
          </Section>
        )}
      </Stack>

      <Panel heading={read.revealSaid.heading}>
        <Stack gap={6}>
          <p className="gwui-panel-text">{read.revealSaid.intro}</p>
          {read.revealSaid.lines.map((line, i) => <Note key={i} tone="muted">{line}</Note>)}
        </Stack>
        <p className="gwui-panel-text" style={{ marginTop: 12, fontWeight: 700 }}>{read.revealSaid.closing}</p>
      </Panel>

      {read.continueOptions.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-start' }}>
          {read.continueOptions.map((o, i) => (
            i === 0 ? (
              <Button key={o.key} kind="primary" onClick={() => onContinue(o)}>{o.label}</Button>
            ) : (
              <button key={o.key} type="button" className="gwui-plain-link" onClick={() => onContinue(o)}>{o.label}</button>
            )
          ))}
        </div>
      )}
    </div>
  )
}
