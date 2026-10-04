import type { TheLeadsReveal as TheLeadsRevealShape } from '@/api/anchorShapes'
import { Section } from './ui/Section'
import { Panel } from './ui/Panel'
import { Stack } from './ui/Stack'
import { SubHeading } from './ui/SubHeading'

/**
 * PIECE 9: THE LEAD'S REVEAL, "Help my team understand" (plan section 5, row 3;
 * docs/anchor-scenario.md sections 11 and 12; docs/answers-from-engine.md, "Request 147").
 *
 * Shown after the anchor conversation, before people are added - the last step of the set-up
 * screen for an anchor draft (EntryChatPage.tsx, the savecard). Draws nothing at all when
 * `reveal` is undefined: the field is not served yet, so today every caller passes nothing and
 * this component is simply absent, the same as before it existed.
 *
 * `carrying` and `seeingToday` are the lead's alone and are never drawn for anybody but the lead
 * who is reading their own set-up screen - there is no other reader here, since nobody else has
 * joined yet at this point in the flow. `whatTheTeamNeedsToUnderstand` draws only once the engine
 * has marked it `sharedWithTheTeam`; otherwise this component says nothing about it rather than
 * drawing an empty heading (CLAUDE.md: no heading without content).
 */
export function TheLeadsReveal({ reveal }: { reveal: TheLeadsRevealShape | null | undefined }) {
  if (!reveal) return null

  return (
    <div className="gwui-stack-18">
      <div>
        <div className="gwui-section-title" style={{ fontSize: 22, fontWeight: 800 }}>{reveal.title}</div>
        <p className="gwui-panel-text" style={{ margin: '2px 0 0', color: 'var(--gw-sub)' }}>{reveal.subtitle}</p>
      </div>

      <Stack gap={12}>
        {reveal.carrying && (
          <Panel heading="What you're carrying">
            <p className="gwui-panel-text">{reveal.carrying}</p>
          </Panel>
        )}

        {reveal.sharedWithTheTeam && reveal.whatTheTeamNeedsToUnderstand && (
          <Panel heading="What you need the team to understand">
            <p className="gwui-panel-text">{reveal.whatTheTeamNeedsToUnderstand}</p>
          </Panel>
        )}

        {reveal.whoYouAreTryingToMove && (
          <Panel heading="Who you're trying to move with you">
            <p className="gwui-panel-text">{reveal.whoYouAreTryingToMove}</p>
          </Panel>
        )}

        {reveal.seeingToday && (
          <Panel heading="What you're seeing today">
            <p className="gwui-panel-text">{reveal.seeingToday}</p>
          </Panel>
        )}

        {reveal.whatMeaningfulChangeWouldLookLike.length > 0 && (
          <Panel heading="What meaningful change would look like">
            <Stack gap={6}>
              {reveal.whatMeaningfulChangeWouldLookLike.map((s, i) => (
                <p key={i} className="gwui-panel-text">{s}</p>
              ))}
            </Stack>
          </Panel>
        )}

        {reveal.whatGroundworkWillExplore.length > 0 && (
          <Panel heading="What Groundwork will explore">
            <Stack gap={6}>
              {reveal.whatGroundworkWillExplore.map((s, i) => (
                <p key={i} className="gwui-panel-text">{s}</p>
              ))}
            </Stack>
          </Panel>
        )}
      </Stack>

      {reveal.howIWillWorkWithYourTeam.length > 0 && (
        <Section heading="How I'll work with your team">
          <Stack gap={12}>
            {reveal.howIWillWorkWithYourTeam.map((item) => (
              <div key={item.key}>
                <SubHeading as="h3">{item.heading}</SubHeading>
                <p className="gwui-panel-text">{item.sentence}</p>
              </div>
            ))}
          </Stack>
        </Section>
      )}
    </div>
  )
}
