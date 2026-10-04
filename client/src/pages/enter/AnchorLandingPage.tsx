import { Navigate } from 'react-router-dom'
import { Panel, PageTitle, Button, Stack } from '@/components/gw/ui'
import { THE_ANCHOR_HOOK } from './the-anchor-hook'
import { anchorScenarioIsOnForAStranger } from './anchor-scenario-is-on'

/*
 * THE ANCHOR SCENARIO'S LANDING PAGE (plan piece 2, docs/anchor-scenario-plan.md section 5 row 1;
 * docs/answers-from-engine.md, "The anchor scenario: which screens are yours").
 *
 * This is the front door a shared link ("Help your team see the bigger picture", sent on WhatsApp,
 * LinkedIn, email) lands on. There is no prototype screen for it; it borrows the shape of the two
 * nearest ones - docs/prototype/screens/F3-public-site/home.jpg (one hook, one question, one
 * button) and B1-starting-a-check-in/start.jpg (one panel, one box, entering the conversation
 * straight away) - and uses only the shared parts (`Panel`, `PageTitle`, `Button`, `Stack`), no new
 * one-off styling. Its words are Hafsah's own, from `the-anchor-hook.ts`.
 *
 * BEHIND THE SWITCH. `release.anchorScenario` is off at release, and the plan requires every place
 * that depends on it to read it, not assume it (section 3, item 1: "Off: the route answers 'not
 * available' and the client redirects to /start."). This page is the client half of that rule.
 * `anchorScenarioIsOnForAStranger()` is the one place that answers it; today it always returns
 * false, because the engine does not yet serve the setting to someone who is not signed in
 * (request 144, docs/requests-to-engine.md) - so this page redirects to /start and changes nothing
 * for anybody, which is the setting's only state so far. Once the engine serves a public signal,
 * only `anchor-scenario-is-on.ts` needs to change.
 *
 * THE BUTTON enters the conversation through the engine's anchor entry route (plan piece 1,
 * `entry.controller.ts`, "a route that starts an anchor draft with a source mark, no organisation
 * first", suggested address `/start/team` in the plan's section 1). That engine route does not
 * exist yet either (also request 144). Until it does, the button goes to the ordinary `/start`
 * entry chat, which is reachable only in the "on" state this page has no way to be in today.
 */
export function AnchorLandingPage() {
  if (!anchorScenarioIsOnForAStranger()) {
    return <Navigate to="/start" replace />
  }
  return (
    <div className="gwui-door">
      <PageTitle title={THE_ANCHOR_HOOK.heading} />
      <Panel>
        <Stack gap={10}>
          <p>{THE_ANCHOR_HOOK.youKnow}</p>
          <p>{THE_ANCHOR_HOOK.doesYourTeam}</p>
          <p>{THE_ANCHOR_HOOK.body}</p>
          {/* TODO (request 144): send this to the engine's anchor entry route once it exists. */}
          <Button to="/start">{THE_ANCHOR_HOOK.button}</Button>
        </Stack>
      </Panel>
    </div>
  )
}
