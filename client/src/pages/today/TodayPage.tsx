import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { todayApi, type Need } from '@/api/today'
import { outstandingNotAlreadyShown } from './outstanding-not-already-shown'
import { withComingUpTellingTwoApart } from './tell-apart-coming-up'
import { useAuthStore } from '@/stores/auth'
import { Page, Stack, Greeting, Section, EdgeList, EdgeRow, Button, Note, Empty, ComingUp } from '@/components/gw/ui'
import { whenItWas } from '@/lib/a-date-reads-the-same-everywhere'
import { AdminFirstRun } from '@/pages/grounds/an-admin-lands-on-a-check-in-list'
import { partOfTheDay, whenItComes } from './when-it-comes'
import { AppealsToDecide } from '@/components/gw/Suggestions'
import { groundsApi } from '@/api/grounds'
import { YouAreIn } from './YouAreIn'
import { firstWordOfAName } from '@/lib/the-first-word-of-a-name'
import { QueueLink } from '@/pages/suites/QueuePage'
import { yourRequestsApi } from '@/api/suites'
import { useSuitesKnownOffStore } from '@/stores/suites-known-off'
import { useEffect } from 'react'
import { todayGreetingLine } from '@/lib/the-greeting-line-does-not-claim-what-needs-you-does-not'

/**
 * TODAY (C1, #/today). The wording is copied from docs/prototype/screens/C1-today-and-check-ins/
 * today-lead.txt, today-admin.txt and today-participant-with-groundwork-message.txt.
 *
 *   "Morning, Wairimu"
 *   "Wednesday 23 September. In the sales team, 5 of 6 have checked in today; Omar hasn't yet."
 *   "What needs you"          "5 things, most important first"
 *   "Coming up"
 *
 * WHAT IS ON IT IS DECIDED BY THE SERVER (GET /today), from what this reader may already see. The
 * page adds nothing to it; it only says the date and the times in the reader's own clock.
 *
 * A NEW ORGANISATION'S TODAY starts with the welcome card and "Get <organisation> going", as Hafsah
 * decided on 26 September (no tour). They are for admins, and each hides itself when it is done.
 *
 * NOT HERE YET, because nothing in the product holds it: the message Groundwork writes first, "Since
 * yesterday" with the deal ladder, "Your deals", and the chief executive's company priorities. Each
 * waits for the part of the product that holds it (see docs/morning-report-ui.md, U.5).
 *
 * THE LEAD'S DAILY NUDGE'S OWN LINK (decision 120, GET /today/outstanding): three more lists, "Needs
 * you", "Overdue on your team" and "Risks", every sentence already worded by the server. `null` for
 * anybody who is not a lead, or who has nothing outstanding, so a member sees nothing new here. A
 * heading whose list is empty is left out. A sentence "Needs you" shares with "What needs you" above
 * it (same wording, in whole or in part) is left out of "Needs you", so nothing is said twice
 * (outstanding-not-already-shown.ts).
 *
 * REBUILT FROM THE SHARED PARTS (group 2): `Greeting` for the big heading, in place of the old
 * `gw-t-greet`/`gw-today-line` classes; `Section` with its own `note` for "What needs you"; the
 * shared `EdgeList`/`EdgeRow` in place of `NeedsYouList`/`NeedsYouRow` (the same shape, one shared
 * part - `EdgeRow`'s own kinds, `ready`/`decide`/`look`, are exactly `Need`'s); `Note`/`Empty` for
 * the loading, error and nothing-needs-you states; and `ComingUp` for the sidebar list, in place of
 * the page's own `gw-coming-up`. The two-column layout is the prototype's own shared `.side` shape
 * (`gwui-side`, gw-ui.css), not a layout built just for this page.
 */
export function TodayPage() {
  const user = useAuthStore(s => s.user)
  const [params] = useSearchParams()
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['today'],
    queryFn: todayApi.get,
    enabled: !!user,
    staleTime: 30_000,
  })

  /* Only read after joining, for "You are in." (the same list the sidebar reads, so no extra request). */
  /* "Your own leave and spending requests" only where a suite is on for this person: with both off
     (almost every existing client), the link opened a page that only says the suite is off. The same
     queries as the page itself, so opening it costs nothing more.
     FAULT 1 OF THE LIVE WALK (6 October): hours gates the same link the same way, and the link's own
     words change once hours are part of what it opens - "Your own requests" reads true for leave,
     spending and hours together, where "Your own leave and spending requests" would leave hours out. */
  /*
   * B-002: THESE THREE 404'D ON EVERY /today LOAD FOR AN ORGANISATION WITH NO SUITE SWITCHED ON
   * (almost every brand-new one), a real failed request each, every time the 60-second cache went
   * stale - the same "screen fault 11" `stores/suites-known-off.ts` already exists to fix for the
   * queue read (AppShell.tsx). There is nowhere cheap to ask first, so the same remembered answer
   * is read and written here too: once this session already knows a suite is off, that one stops
   * asking until the page is reloaded.
   *
   * RESTORED (8 October, nothing-removed audit S2): PER SUITE, NOT ACROSS ALL THREE. B-002's first
   * fix shared one flag for all three reads, so a single 404 from a suite that really was off (say
   * time sheets) also silenced leave and spending for the rest of the session, once their own
   * cached "on" answers went stale - losing the link entirely for an organisation with leave on and
   * time sheets off. `offByKey` remembers each suite on its own, so a suite that has not 404'd
   * keeps asking normally, and the link still hides only once every suite has actually said no.
   */
  const offByKey = useSuitesKnownOffStore(s => s.offByKey)
  const setKeyOff = useSuitesKnownOffStore(s => s.setKeyOff)
  const yourLeave = useQuery({ queryKey: ['your-leave'], queryFn: yourRequestsApi.leave, enabled: !!user && !offByKey.leave, retry: false, staleTime: 60_000 })
  const yourSpending = useQuery({ queryKey: ['your-spending'], queryFn: yourRequestsApi.spending, enabled: !!user && !offByKey.spending, retry: false, staleTime: 60_000 })
  const yourHours = useQuery({ queryKey: ['your-hours'], queryFn: yourRequestsApi.hours, enabled: !!user && !offByKey.hours, retry: false, staleTime: 60_000 })
  useEffect(() => {
    const notFound = (q: { isError: boolean; error: unknown }) => q.isError && (q.error as any)?.response?.status === 404
    if (notFound(yourLeave)) setKeyOff('leave')
    if (notFound(yourSpending)) setKeyOff('spending')
    if (notFound(yourHours)) setKeyOff('hours')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yourLeave.isError, yourSpending.isError, yourHours.isError, setKeyOff])
  const aSuiteIsOnForYou = yourLeave.isSuccess || yourSpending.isSuccess || yourHours.isSuccess
  const requestsLinkLabel = yourHours.isSuccess ? 'Your own requests' : 'Your own leave and spending requests'
  const grounds = useQuery({ queryKey: ['grounds'], queryFn: groundsApi.list, enabled: !!user && params.get('welcome') === '1', staleTime: 30_000 })

  /* The lead's daily nudge's own link (decision 120): `null` for anybody who is not a lead, or who
     has nothing outstanding - a member's query simply resolves to nothing drawn. */
  const outstandingQuery = useQuery({ queryKey: ['today-outstanding'], queryFn: todayApi.outstanding, enabled: !!user, staleTime: 30_000 })

  const now = new Date()
  /* Signup asks for "Your name" in one field, stored whole as `firstName` (AuthPage.tsx), so a real
     signup ("Rukia Otieno") used to greet "Morning, Rukia Otieno". The prototype's greeting is a
     first name alone ("Morning, Wairimu") - firstWordOfAName takes only the first word of it. */
  const name = firstWordOfAName(user?.firstName)
  const greeting = name ? `${partOfTheDay(now)}, ${name}` : partOfTheDay(now)
  const needs = data?.needs ?? []
  /* Screen fault 4 (final walk): never claim "You have not checked in yet." beside "Nothing needs
     you right now." - see the-greeting-line-does-not-claim-what-needs-you-does-not.ts. */
  const greetingLine = todayGreetingLine(data?.line, needs.length)
  /* A SUITE ITEM GOES TO THE QUEUE, NOT STRAIGHT TO THE BOARD (live walk at a hundred people, fault
     2): with a hundred people waiting on one approver, the board behind "/suite/leave" or
     "/suite/spend" is the whole organisation's, not filtered to this one thing. The queue
     (`/suite/queue`) is filtered to what waits for this reader, so "Look at it"/"Look at them" on an
     approval item goes there instead, with `?suite=` set so the right tab opens. */
  const whereItGoes = (n: Need) =>
    n.action.to === '/suite/leave' ? '/suite/queue?suite=leave'
      : n.action.to === '/suite/spend' ? '/suite/queue?suite=spend'
        : n.action.to
  const comingUp = data?.comingUp ?? []

  /* The lead's daily nudge's own link (decision 120). Every sentence is already worded by the
     server; "Needs you" leaves out anything "What needs you" already says, in whole or in part, so
     nothing is said twice (outstanding-not-already-shown.ts). */
  const outstanding = outstandingQuery.data ?? null
  const outstandingNeedsYou = outstanding ? outstandingNotAlreadyShown(needs, outstanding.needsYou, outstanding.about?.needsYou) : []
  const overdueOnYourTeam = outstanding?.overdueOnYourTeam ?? []
  const risks = outstanding?.risks ?? []
  /* What the lead's mail also tells her (request 198, b): the server's own sentences and links, drawn once. Absent for everybody else. */
  const nobodyHasStarted = data?.forTheLead?.nobodyHasStarted ?? []
  const whatIWouldDo = data?.forTheLead?.whatIWouldDoThisWeek ?? []

  return (
    <Page>
      <div className="gwui-side">
        <Stack gap={30}>
          {params.get('welcome') === '1' && (
            <YouAreIn checkIns={grounds.isSuccess ? (grounds.data?.length ?? 0) : null} mayStart={user?.mayOpenCheckIns !== false} />
          )}

          <Greeting
            title={greeting}
            subtitle={`${whenItWas(now, 'weekdayAndDay')}.${greetingLine ? ` ${greetingLine}` : ''}`}
          />

          {/* Appeals to decide (C3, U.13): an admin's only. The server refuses anybody else. */}
          {user?.role === 'ADMIN' && <AppealsToDecide />}

          <Section heading="What needs you" note={needs.length > 1 ? `${needs.length} things, most important first` : undefined}>
            {isLoading && <Note>Loading…</Note>}
            {isError && (
              <div>
                <Note tone="error">What needs you did not load. Nothing you have written is affected.</Note>
                <Button kind="secondary" size="small" onClick={() => refetch()} disabled={isFetching}>Try again</Button>
              </div>
            )}
            {data && needs.length === 0 && <Empty>Nothing needs you right now.</Empty>}
            {needs.length > 0 && (
              <EdgeList label="What needs you">
                {/* ONE NAVY BUTTON (Hafsah, 30 September): the prototype's own Today draws every "Start it"
                    navy, but with two check-ins open that is two navy buttons at once. Only the first,
                    the most important, is navy; the rest are white. */}
                {needs.map((n: Need, i: number) => (
                  <EdgeRow
                    key={n.key}
                    kind={n.kind}
                    title={n.title}
                    detail={n.detail ?? undefined}
                    actions={<Button kind={n.action.label === 'Start it' && i === needs.findIndex((m: Need) => m.action.label === 'Start it') ? 'primary' : 'secondary'} size="small" to={whereItGoes(n)}>{n.action.label}</Button>}
                  />
                ))}
              </EdgeList>
            )}
            {aSuiteIsOnForYou && <p className="gwui-panel-text"><Link className="gwui-plain-link" to="/suite/mine">{requestsLinkLabel}</Link></p>}
            <QueueLink userId={user?.id} />
          </Section>

          {/* The lead's daily nudge's own link (decision 120): "Needs you", "Overdue on your team"
              and "Risks", each left out while its own list is empty. `null` for anybody who is not
              a lead, or who has nothing outstanding, so a member's Today is unaffected. */}
          {outstandingNeedsYou.length > 0 && (
            <Section heading="Needs you">
              <EdgeList label="Needs you">
                {outstandingNeedsYou.map((sentence) => (
                  <EdgeRow key={sentence} kind="look" title={sentence} />
                ))}
              </EdgeList>
            </Section>
          )}
          {overdueOnYourTeam.length > 0 && (
            <Section heading="Overdue on your team">
              <EdgeList label="Overdue on your team">
                {overdueOnYourTeam.map((sentence) => (
                  <EdgeRow key={sentence} kind="look" title={sentence} />
                ))}
              </EdgeList>
            </Section>
          )}
          {risks.length > 0 && (
            <Section heading="Risks">
              <EdgeList label="Risks">
                {risks.map((sentence) => (
                  <EdgeRow key={sentence} kind="look" title={sentence} />
                ))}
              </EdgeList>
            </Section>
          )}

          {(nobodyHasStarted.length > 0 || whatIWouldDo.length > 0) && (
            <Section heading="From Groundwork">
              <EdgeList label="From Groundwork">
                {nobodyHasStarted.map((n) => (
                  <EdgeRow
                    key={`started-${n.groundId}`}
                    kind="look"
                    title={n.subject}
                    detail={n.lines.map((line, i) => <p key={i} className="gwui-panel-text">{line}</p>)}
                    actions={<Button kind="secondary" size="small" to={n.to}>{n.linkLabel}</Button>}
                  />
                ))}
                {whatIWouldDo.map((w) => (
                  <EdgeRow
                    key={`week-${w.groundId}`}
                    kind="look"
                    title={w.lines[0]}
                    detail={[`This is for ${w.label}.`, ...w.lines.slice(1)].map((line, i) => <p key={i} className="gwui-panel-text">{line}</p>)}
                    actions={<Button kind="secondary" size="small" to={`/grounds/${w.groundId}`}>Open the check-in</Button>}
                  />
                ))}
              </EdgeList>
            </Section>
          )}

          {/*
            SCREEN FAULT 7: THE ADMIN CARD CAME FIRST ON A PHONE, NOT THE GREETING. On a single
            column (a phone, where this `Stack` is the whole page, not a side-by-side layout) the
            welcome card and "Get <organisation> going" used to sit above the greeting and "What
            needs you" - a new admin's first full screen was "You're an admin", with what actually
            needs her today two screens further down. Moved after "What needs you" so the thing
            that changes every day comes first, and the one-time welcome comes after it.
          */}
          <AdminFirstRun />
        </Stack>

        {comingUp.length > 0 && (
          <ComingUp items={withComingUpTellingTwoApart(comingUp).map(c => ({
            when: whenItComes(c.at, now),
            what: c.apart ? `${c.what} (${c.apart})` : c.what,
            to: c.to,
          }))} />
        )}
      </div>
    </Page>
  )
}
