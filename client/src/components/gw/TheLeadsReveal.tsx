import type { TheLeadsReveal as TheLeadsRevealShape } from '@/api/anchorShapes'
import { Section } from './ui/Section'
import { Panel } from './ui/Panel'
import { Stack } from './ui/Stack'
import { SubHeading } from './ui/SubHeading'

/**
 * PIECE 9: THE LEAD'S REVEAL, "Help my team understand" (plan section 5, row 3;
 * docs/anchor-scenario.md sections 11 and 12; docs/answers-from-engine.md, "Request 149 (1 of 6)").
 *
 * Shown after the anchor conversation, before people are added - the last step of the set-up
 * screen for an anchor draft (EntryChatPage.tsx, the savecard). Served now, on `/entry/report`,
 * only for an anchor draft's own report. Draws nothing at all when `reveal` is undefined: every
 * other situation's report carries no `leadsReveal` key at all, so this component is simply absent.
 *
 * `carrying` and `seeingToday` are the lead's alone and are never drawn for anybody but the lead
 * who is reading their own set-up screen - there is no other reader here, since nobody else has
 * joined yet at this point in the flow. `whatTheTeamNeedsToUnderstand` is the lead's own reveal
 * too: `sharedWithTheTeam` limits what the TEAM is shown elsewhere, not what the lead reads here,
 * so it is always drawn for the lead when the engine serves it. When it has not yet been shared,
 * a plain note says so, rather than withholding the content from the one person it belongs to.
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

        {reveal.whatTheTeamNeedsToUnderstand && (
          <Panel heading="What you need the team to understand">
            <p className="gwui-panel-text">{reveal.whatTheTeamNeedsToUnderstand}</p>
            {!reveal.sharedWithTheTeam && (
              <p className="gwui-panel-text" style={{ marginTop: 6, color: 'var(--gw-sub)' }}>Only you can see this for now.</p>
            )}
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
