import { CheckInOnWhatsApp } from '@/components/gw/CheckInOnWhatsApp'
import { useMutation, useQuery } from '@tanstack/react-query'
import { aSentenceAsARow } from '@/lib/a-sentence-as-a-row'
import { boardApi } from '@/api/board'
import { toast } from 'sonner'
import { Link, useSearchParams } from 'react-router-dom'
import { todayApi, type Need } from '@/api/today'
import { outstandingNotAlreadyShown } from './outstanding-not-already-shown'
import { withComingUpTellingTwoApart } from './tell-apart-coming-up'
import { useAuthStore } from '@/stores/auth'
import { Page, Greeting, Section, EdgeList, EdgeRow, Button, Note, Empty, ComingUp, Panel } from '@/components/gw/ui'
import { whenItWas } from '@/lib/a-date-reads-the-same-everywhere'
import { AdminFirstRun } from '@/pages/grounds/an-admin-lands-on-a-check-in-list'
import { partOfTheDay, whenItComes } from './when-it-comes'
import { AppealsToDecide } from '@/components/gw/Suggestions'
import { groundsApi } from '@/api/grounds'
import { YouAreIn } from './YouAreIn'
import { TheReasonYouMissed } from './TheReasonYouMissed'
import { firstWordOfAName } from '@/lib/the-first-word-of-a-name'
import { QueueLink } from '@/pages/suites/QueuePage'
import { yourRequestsApi, reviewsApi } from '@/api/suites'
import { useSuitesOnForYou } from '@/hooks/useSuitesOnForYou'
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
  /* Journey walk row 5: ask a suite's own route only once GET /suites/mine says that suite is on. */
  const suitesOn = useSuitesOnForYou()
  const yourLeave = useQuery({ queryKey: ['your-leave'], queryFn: yourRequestsApi.leave, enabled: !!user && suitesOn.leave && !offByKey.leave, retry: false, staleTime: 60_000 })
  const yourSpending = useQuery({ queryKey: ['your-spending'], queryFn: yourRequestsApi.spending, enabled: !!user && suitesOn.spending && !offByKey.spending, retry: false, staleTime: 60_000 })
  const yourHours = useQuery({ queryKey: ['your-hours'], queryFn: yourRequestsApi.hours, enabled: !!user && suitesOn.hours && !offByKey.hours, retry: false, staleTime: 60_000 })
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

  /*
   * A PERSON'S OWN REVIEW APPEAL, ON TODAY (decision 113, engine workspace, 9 October: "the review
   * appeal is drawn" - "Not drawn yet: ... the person's card on Today (mayAppeal, appealSays)").
   * The generic review `Need` above (from `GET /today`) only ever carries the review's main
   * sentence; it says nothing about appealing a decision once it is made. `GET /suites/reviews/mine`
   * already carries that (the same call the reviews board makes for "Your reviews"), so it is read
   * again here, and only a review with something to say about an appeal is drawn.
   */
  const myReviews = useQuery({ queryKey: ['suite-reviews-mine-today'], queryFn: reviewsApi.mineQuietly, enabled: !!user && suitesOn.reviews, retry: false })
  const myReviewAppeals = (Array.isArray(myReviews.data) ? myReviews.data : []).filter(r => r.mayAppeal || r.appealSays)

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
  /*
   * ONE LIST, AS THE PROTOTYPE (C1): what needs you, what the lead's nudge adds, and what Groundwork would do, as rows of "What needs
   * you", most important first, each said once. A row the list already has (the same title) is not added again.
   */
  type ARow = { key: string; kind: Need['kind']; title: string; detail?: string; action?: { label: string; to: string } }
  /* The same thing said in other words is a repeat too: most of its longer words already said in a row above. */
  const COMMON = new Set(['about', 'after', 'again', 'their', 'there', 'these', 'those', 'which', 'while', 'would', 'could', 'should', 'since', 'today', 'until', 'waiting', 'answer', 'check', 'with', 'from', 'this', 'that', 'your', 'have', 'been', 'what'])
  const wordsOf = (t: string) => new Set(t.toLowerCase().replace(/[’']s\b/g, '').split(/[^a-z0-9]+/).filter((w) => w.length >= 4 && !COMMON.has(w)))
  const seen: Set<string>[] = []
  const once = (r: ARow) => {
    const w = wordsOf(r.title)
    if (seen.some((x) => { const both = [...w].filter((y) => x.has(y)).length; return both >= 4 && both / Math.min(w.size, x.size) >= 0.7 })) return false
    seen.push(w)
    return true
  }
  needs.forEach((n: Need) => once({ key: n.key, kind: n.kind, title: n.title }))
  const moreRows: ARow[] = [
    ...nobodyHasStarted.map((n) => ({ key: `started-${n.groundId}`, kind: 'look' as const, title: n.subject, detail: n.lines[0], action: { label: n.linkLabel, to: n.to } })),
    ...whatIWouldDo.map((w) => {
      const things = w.lines.slice(1)
      return { key: `week-${w.groundId}`, kind: 'look' as const, title: things[0] ?? w.lines[0], detail: things.length > 1 ? `In ${w.label}, and ${things.length - 1} more on its board.` : `In ${w.label}.`, action: { label: 'Open', to: `/grounds/${w.groundId}` } }
    }),
    ...[...outstandingNeedsYou, ...overdueOnYourTeam, ...risks].map((sentence) => ({ key: sentence, kind: 'look' as const, ...aSentenceAsARow(sentence) })),
  ].filter(once)
  const allNeeds = needs.length + moreRows.length
  const lineNudge = data?.lineNudge ?? null
  const nudge = useMutation({
    mutationFn: () => boardApi.nudge(lineNudge!.groundId, lineNudge!.participantId),
    onSuccess: () => toast.success(`Sent to ${lineNudge!.firstName}.`),
    onError: () => toast.error('That didn’t send. Try again.'),
  })

  return (
    <Page>
      <div className="gwui-side gw-today">
        <div className="gw-col-32">
          {params.get('welcome') === '1' && (
            <YouAreIn checkIns={grounds.isSuccess ? (grounds.data?.length ?? 0) : null} mayStart={user?.mayOpenCheckIns !== false} />
          )}

          <Greeting
            title={greeting}
            subtitle={<>
              {`${whenItWas(now, 'weekdayAndDay')}.${greetingLine ? ` ${greetingLine}` : ''}`}
              {/* "Send it to him on WhatsApp" (C1), said with their name: the board's own nudge, for the one person not checked in yet. */}
              {lineNudge && <>{' '}<button type="button" className="btn quiet sm gw-inline-btn gwui-in-a-sentence" onClick={() => nudge.mutate()} disabled={nudge.isPending || nudge.isSuccess}>{nudge.isSuccess ? 'Sent.' : `Remind ${lineNudge.firstName}`}</button></>}
            </>}
          />

          {/* The free trial, one line, for an admin while it runs (Hafsah, 12 October). The server decides who reads it. */}
          {/* With the way to Plan and billing beside it (fix list item 6). Only an admin is served the line. */}
          {data?.freeTrial && <Note>{data.freeTrial}{' '}<Link to="/settings/billing">Plan and billing</Link></Note>}

          {/* Appeals to decide (C3, U.13): an admin's only. The server refuses anybody else. */}
          {user?.role === 'ADMIN' && <AppealsToDecide />}

          {/* ONE LIST, AS THE PROTOTYPE: what the lead's nudge adds (needs you, overdue on the team, risks) are rows in
              "What needs you", most important first, never sections of their own. */}
          <Section heading="What needs you" note={allNeeds > 1 ? `${allNeeds} things, most important first` : undefined}>
            {isLoading && <Note>Loading…</Note>}
            {isError && (
              <div>
                <Note tone="error">What needs you didn’t load. Try again.</Note>
                <Button kind="secondary" size="small" onClick={() => refetch()} disabled={isFetching}>Try again</Button>
              </div>
            )}
            {data && allNeeds === 0 && <Empty>Nothing needs you right now.</Empty>}
            {allNeeds > 0 && (
              <EdgeList label="What needs you">
                {/* ONE NAVY BUTTON (Hafsah, 30 September): the prototype's own Today draws every "Start it"
                    navy, but with two check-ins open that is two navy buttons at once. Only the first,
                    the most important, is navy; the rest are white. */}
                {needs.map((n: Need, i: number) => (
                  <EdgeRow
                    key={n.key}
                    kind={n.kind}
                    /* One line of title: a second sentence goes to the detail line when there is none (Hafsah, 25 October). */
                    title={aSentenceAsARow(n.title, n.detail).title}
                    detail={aSentenceAsARow(n.title, n.detail).detail}
                    to={whereItGoes(n)}
                    actions={<>
                      <Button kind={n.action.label === 'Start it' && i === needs.findIndex((m: Need) => m.action.label === 'Start it') ? 'primary' : 'secondary'} size="small" to={whereItGoes(n)}>{n.action.label}</Button>
                      {n.missedReason && <TheReasonYouMissed checkInId={n.missedReason.checkInId} given={n.missedReason.given} />}
                    </>}
                  />
                ))}
                {moreRows.map((r) => (
                  <EdgeRow key={r.key} kind={r.kind} title={r.title} detail={r.detail} to={r.action?.to}
                    actions={r.action ? <Button kind="secondary" size="small" to={r.action.to}>{r.action.label}</Button> : undefined} />
                ))}
              </EdgeList>
            )}
            {/* Under what needs you, when one of those is a check-in to answer (fix list, item 5). The server decides. */}
            {data?.checkInOnWhatsApp && (
              <CheckInOnWhatsApp link={data.checkInOnWhatsApp.link} label={data.checkInOnWhatsApp.label} says={data.checkInOnWhatsApp.says} testId="today-check-in-on-whatsapp" />
            )}
            {aSuiteIsOnForYou && <p className="gwui-panel-text"><Link className="gwui-plain-link" to="/suite/mine">{requestsLinkLabel}</Link></p>}
            <QueueLink userId={user?.id} />
          </Section>

          {/*
            A PERSON'S OWN REVIEW APPEAL (decision 113, engine workspace, 9 October: "the review
            appeal is drawn" - "Not drawn yet: ... the person's card on Today"). Plain heading and
            sentence, since the prototype has none for this yet; the server's own sentence
            (`mayAppealSays` is read on the review itself, `appealSays` here) does the real talking.
            One row per review with something to say, each going to where the full appeal form
            already lives, so nothing here duplicates the form on `ReviewPage.tsx`.
          */}
          {myReviewAppeals.length > 0 && (
            <Section heading="Your review appeal">
              <EdgeList label="Your review appeal">
                {myReviewAppeals.map(r => (
                  <EdgeRow
                    key={r.id}
                    kind="look"
                    title={r.appealSays ?? 'You can appeal this decision.'}
                    actions={<Button kind="secondary" size="small" to="/suite/reviews">{r.appealSays ? 'Open your appeal' : 'Appeal this decision'}</Button>}
                  />
                ))}
              </EdgeList>
            </Section>
          )}

          {/* SINCE YESTERDAY (C1): what moved since the round before, for the check-in the line is about. */}
          {data?.sinceYesterday && (
            <Section heading={data.sinceYesterday.heading}>
              <Panel>
                <p className="t-body">{data.sinceYesterday.says}</p>
                {data.sinceYesterday.also && <p className="t-small mut">{data.sinceYesterday.also}</p>}
              </Panel>
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
        </div>

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
