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
        <div className="t-h2" style={{ fontSize: 22, fontWeight: 800 }}>{reveal.title}</div>
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

        {/*
          BUG FOUND WHILE SCREENSHOTTING THE ANCHOR'S SET-UP SCREEN (decision 114 work, 8 October
          2026): `TheLeadsReveal` crashed the whole set-up screen - not just this panel - whenever
          a served `leadsReveal` carried neither of these two lists, which the type says is always
          an array but a real, partially-filled reveal (the seven items are pulled from the lead's
          words by a model step the engine has not finished, per the comment above) can still send
          without. `?? []` makes the two lists behave exactly like every other optional field this
          component already reads with its own `reveal.x &&` guard.
        */}
        {(reveal.whatMeaningfulChangeWouldLookLike ?? []).length > 0 && (
          <Panel heading="What meaningful change would look like">
            <Stack gap={6}>
              {reveal.whatMeaningfulChangeWouldLookLike.map((s, i) => (
                <p key={i} className="gwui-panel-text">{s}</p>
              ))}
            </Stack>
          </Panel>
        )}

        {(reveal.whatGroundworkWillExplore ?? []).length > 0 && (
          <Panel heading="What it will ask about">
            <Stack gap={6}>
              {reveal.whatGroundworkWillExplore.map((s, i) => (
                <p key={i} className="gwui-panel-text">{s}</p>
              ))}
            </Stack>
          </Panel>
        )}
      </Stack>

      {/*
        THE SAME BUG, A THIRD FIELD (decision 114 work, 8 October 2026): found re-taking the
        set-up screenshot after the first fix above - a served `leadsReveal` with no
        `howIWillWorkWithYourTeam` at all (the model step that fills the seven items and this list
        is still unfinished on the engine's side, per the file's own top comment) crashed this
        panel's own `.length` read the same way the two lists above did. Same `?? []` fix.
      */}
      {(reveal.howIWillWorkWithYourTeam ?? []).length > 0 && (
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
