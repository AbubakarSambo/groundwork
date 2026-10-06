import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { todayApi, type Need } from '@/api/today'
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
     queries as the page itself, so opening it costs nothing more. */
  const yourLeave = useQuery({ queryKey: ['your-leave'], queryFn: yourRequestsApi.leave, enabled: !!user, retry: false, staleTime: 60_000 })
  const yourSpending = useQuery({ queryKey: ['your-spending'], queryFn: yourRequestsApi.spending, enabled: !!user, retry: false, staleTime: 60_000 })
  const aSuiteIsOnForYou = yourLeave.isSuccess || yourSpending.isSuccess
  const grounds = useQuery({ queryKey: ['grounds'], queryFn: groundsApi.list, enabled: !!user && params.get('welcome') === '1', staleTime: 30_000 })

  const now = new Date()
  /* Signup asks for "Your name" in one field, stored whole as `firstName` (AuthPage.tsx), so a real
     signup ("Rukia Otieno") used to greet "Morning, Rukia Otieno". The prototype's greeting is a
     first name alone ("Morning, Wairimu") - firstWordOfAName takes only the first word of it. */
  const name = firstWordOfAName(user?.firstName)
  const greeting = name ? `${partOfTheDay(now)}, ${name}` : partOfTheDay(now)
  const needs = data?.needs ?? []
  /* A SUITE ITEM GOES TO THE QUEUE, NOT STRAIGHT TO THE BOARD (live walk at a hundred people, fault
     2): with a hundred people waiting on one approver, the board behind "/suite/leave" or
     "/suite/spend" is the whole organisation's, not filtered to this one thing. The queue
     (`/suite/queue`) is filtered to what waits for this reader, so "Look at it"/"Look at them" on an
     approval item goes there instead, with `?suite=` set so the right tab opens. */
  const whereItGoes = (n: Need) =>
    n.action.to === '/suite/leave' ? '/suite/queue?suite=leave'
      : n.action.to === '/suite/spend' ? '/suite/queue?suite=spend'
        : n.action.to

  return (
    <Page>
      <div className="gwui-side">
        <Stack gap={30}>
          {params.get('welcome') === '1' && (
            <YouAreIn checkIns={grounds.isSuccess ? (grounds.data?.length ?? 0) : null} mayStart={user?.mayOpenCheckIns !== false} />
          )}

          <Greeting
            title={greeting}
            subtitle={`${whenItWas(now, 'weekdayAndDay')}.${data?.line ? ` ${data.line}` : ''}`}
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
            {aSuiteIsOnForYou && <p className="gwui-panel-text"><Link className="gwui-plain-link" to="/suite/mine">Your own leave and spending requests</Link></p>}
            <QueueLink userId={user?.id} />
          </Section>

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

        {data && data.comingUp.length > 0 && (
          <ComingUp items={data.comingUp.map(c => ({ when: whenItComes(c.at, now), what: c.what, to: c.to }))} />
        )}
      </div>
    </Page>
  )
}
