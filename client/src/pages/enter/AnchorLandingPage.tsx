import { Navigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Panel, PageTitle, Button, Stack, Note } from '@/components/gw/ui'
import { THE_ANCHOR_HOOK } from './the-anchor-hook'
import { useAnchorScenarioIsOnForAStranger } from './anchor-scenario-is-on'
import { entryAnchorApi } from '@/api/entry'

/** The engine's own sentence for a visitor who reaches this page while the way in is closed (request 144 (2) and (3)). */
const THE_WAY_IN_IS_NOT_OPEN_YET = 'This way in is not open yet.'

/*
 * THE ANCHOR SCENARIO'S LANDING PAGE (plan piece 2, docs/anchor-scenario-plan.md section 5 row 1;
 * docs/answers-from-engine.md, "The anchor scenario: which screens are yours").
 *
 * This is the front door a shared link ("Help your team see the bigger picture", sent on WhatsApp,
 * LinkedIn, email) lands on. There is no prototype screen for it; it borrows the shape of the two
 * nearest ones - docs/prototype/screens/F3-public-site/home.jpg (one hook, one question, one
 * button) and B1-starting-a-check-in/start.jpg (one panel, one box, entering the conversation
 * straight away) - and uses only the shared parts (`Panel`, `PageTitle`, `Button`, `Stack`, `Note`),
 * no new one-off styling. Its words are Hafsah's own, from `the-anchor-hook.ts`.
 *
 * BEHIND THE SWITCH (item 1). `useAnchorScenarioIsOnForAStranger` asks the engine's public signal,
 * `GET /entry/anchor-available` (request 144 (1)). While it is off, or unreachable, this page
 * redirects to `/start`, same as before the engine served anything - a visitor is never shown half
 * of a page that is not really open. While the answer is still loading, the page draws nothing at
 * all rather than redirecting early and having to undo that the moment the real answer turns out to
 * be "on".
 *
 * THE BUTTON (item 2). On arrival, once the switch reads on, this page also calls
 * `GET /entry/anchor-start?source=<mark>` (the source mark is the page's own `?source=` query
 * param, kept as the visitor arrived with it) - once, the way the plan asks. That is the call which
 * actually marks the way in as an anchor one and logs the source; `anchor-available` above is only
 * the cheap public switch. Its answer is `scenario: "HELP_TEAM_UNDERSTAND"`, which the button carries
 * into the ordinary entry chat as `?scenario=HELP_TEAM_UNDERSTAND` - the same URL parameter
 * `EntryChatPage.tsx` already reads and falls back to on every entry call and on commit (see its
 * `scenario` variable), so nothing in that page needs to change to keep the scenario on every call.
 *
 * A 404 from `anchor-start` (the switch flipped off between the two calls, or a stale link) shows
 * the engine's own sentence, "This way in is not open yet.", and a link to `/start`, rather than the
 * ordinary silent redirect - the visitor followed a real link and deserves to be told why it did not
 * work, not sent on as though nothing happened.
 */
export function AnchorLandingPage() {
  const [params] = useSearchParams()
  const source = params.get('source')
  const on = useAnchorScenarioIsOnForAStranger()

  const { data: started, isError } = useQuery({
    queryKey: ['anchor-start', source],
    queryFn: () => entryAnchorApi.start(source),
    enabled: on === true,
    retry: false,
  })

  // While the public switch is still loading, nothing is drawn - never a half-answered page, and
  // never a redirect that would have to be undone the moment the real answer turns out to be "on".
  if (on === undefined) return null

  if (!on) {
    return <Navigate to="/start" replace />
  }

  if (isError) {
    return (
      <div className="gwui-door">
        <Panel>
          <Stack gap={10}>
            <Note>{THE_WAY_IN_IS_NOT_OPEN_YET}</Note>
            <Button to="/start">Go to Groundwork</Button>
          </Stack>
        </Panel>
      </div>
    )
  }

  const enterHref = started
    ? `/start?scenario=${encodeURIComponent(started.scenario)}`
    : '/start'

  return (
    <div className="gwui-door">
      <PageTitle title={THE_ANCHOR_HOOK.heading} />
      <Panel>
        <Stack gap={10}>
          <p>{THE_ANCHOR_HOOK.youKnow}</p>
          <p>{THE_ANCHOR_HOOK.doesYourTeam}</p>
          <p>{THE_ANCHOR_HOOK.body}</p>
          <Button to={enterHref}>{THE_ANCHOR_HOOK.button}</Button>
        </Stack>
      </Panel>
    </div>
  )
}
