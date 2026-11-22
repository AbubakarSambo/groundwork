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
import { Page, Greeting, Section, EdgeList, EdgeRow, Button, Note, Empty, ComingUp, Panel, Held } from '@/components/gw/ui'
import { whenItWas } from '@/lib/a-date-reads-the-same-everywhere'
import { AdminFirstRun } from '@/pages/grounds/an-admin-lands-on-a-check-in-list'
import { partOfTheDay, whenItComes } from './when-it-comes'
import { AppealsToDecide } from '@/components/gw/Suggestions'
import { groundsApi } from '@/api/grounds'
import { YouAreIn } from './YouAreIn'
import { NameYourOrganisation } from './NameYourOrganisation'
import { TheReasonYouMissed } from './TheReasonYouMissed'
import { firstWordOfAName } from '@/lib/the-first-word-of-a-name'
import { QueueLink, RequestLinks } from '@/pages/suites/QueuePage'
import { yourRequestsApi, reviewsApi } from '@/api/suites'
import { useSuitesOnForYou } from '@/hooks/useSuitesOnForYou'
import { useSuitesKnownOffStore } from '@/stores/suites-known-off'
import { useEffect, type ReactNode } from 'react'
import { todayGreetingLine } from '@/lib/the-greeting-line-does-not-claim-what-needs-you-does-not'
import { useAnUnfinishedSetup } from '@/pages/auth/entry-handover'
import { TheSetupNotSavedYet } from '@/components/gw/TheSetupNotSavedYet'
import { useTheDesignPass } from '@/lib/the-design-pass'
import { ShowAll } from '@/components/gw/ui/ShowAll'

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
  /*
   * THE DESIGN PASS (21 November 2026): Today answers "where are we, what needs me, who needs me" in a glance, as the prototype's
   * does. "What needs you" comes first, after the line under the greeting, and stops at three with "And N more". The first thing to
   * start is the one navy button; every other action is a quiet link. The admin's set-up stays as it was (Hafsah, 21 November).
   */
  const designPass = useTheDesignPass()
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

  /* The server's day, so a run on the test clock reads the same day on the screen (in production the two are the same). */
  const now = data?.now ? new Date(data.now) : new Date()
  /* Signup asks for "Your name" in one field, stored whole as `firstName` (AuthPage.tsx), so a real
     signup ("Rukia Otieno") used to greet "Morning, Rukia Otieno". The prototype's greeting is a
     first name alone ("Morning, Wairimu") - firstWordOfAName takes only the first word of it. */
  const name = firstWordOfAName(user?.firstName)
  const greeting = name ? `${partOfTheDay(now)}, ${name}` : partOfTheDay(now)
  const needs = data?.needs ?? []
  /* Screen fault 4 (final walk): never claim "You have not checked in yet." beside "Nothing needs
     you right now." - see the-greeting-line-does-not-claim-what-needs-you-does-not.ts. */
  const greetingLine = todayGreetingLine(data?.line, needs.length)
  /* Where each item goes is the server's `to` alone (waiting-for-you-to-approve.ts, what-needs-you.service.ts): an approval opens the
     queue filtered to this reader, and finance's item opens the requests for finance. */
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
  /* A row is said once: the same title is not added again. Rows are never dropped for sharing words with another (restored, 30 October
     2026: the word-overlap check dropped a different overdue item or risk, against "understand, don't match"). */
  const seen = new Set<string>()
  const once = (r: ARow) => {
    const t = r.title.trim().toLowerCase()
    if (seen.has(t)) return false
    seen.add(t)
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
  /*
   * A SETUP LEFT UNFINISHED IS THE FIRST THING THAT NEEDS YOU (Hafsah's blocker, 31 October 2026). Three leads in round 3 told the
   * setup about their team, left before saving, and came back here to "Nothing needs you right now". The lead's setup, kept on the
   * server and read by the one reader Check-ins also uses, is first, with the way back, on any device.
   */
  const unfinished = useAnUnfinishedSetup()
  const allNeeds = needs.length + moreRows.length + (unfinished ? 1 : 0)
  const lineNudge = data?.lineNudge ?? null
  /* "Send it to them again" (the approved journey, stage 8): the invitation's own resend, for each person the line says has not
     joined yet. The lead's own press, so nothing about when anything is sent changes. */
  const lineResend = data?.lineResend ?? null
  const resend = useMutation({
    mutationFn: async () => { for (const pid of lineResend!.participantIds) await groundsApi.resendParticipantInvite(lineResend!.groundId, pid) },
    onSuccess: () => toast.success(lineResend!.participantIds.length === 1 ? 'Invitation sent again.' : 'Invitations sent again.'),
    onError: () => toast.error('It did not send again. The first invitation still works. Try again in a moment.'),
  })
  const resendLabel = lineResend
    ? (lineResend.participantIds.length === 1 && lineResend.firstNames[0] ? `Send it to ${lineResend.firstNames[0]} again` : 'Send it to them again')
    : ''
  /* "Send N invitations" (Hafsah, 3 November 2026): the invitations the lead held ready while she checked in on her own first. */
  const lineReadyToSend = data?.lineReadyToSend ?? null
  const sendReady = useMutation({
    mutationFn: () => groundsApi.sendTheInvitationsReadyToSend(lineReadyToSend!.groundId),
    onSuccess: () => { toast.success(lineReadyToSend!.count === 1 ? 'The invitation has gone.' : 'The invitations have gone.'); refetch() },
    onError: () => toast.error('The invitations did not send. They are still ready, so try again in a moment.'),
  })
  const nudge = useMutation({
    mutationFn: () => boardApi.nudge(lineNudge!.groundId, lineNudge!.participantId),
    onSuccess: () => toast.success(`Sent to ${lineNudge!.firstName}.`),
    onError: () => toast.error('That didn’t send. Try again.'),
  })

  /* The rows of "What needs you", in order: drawn whole with the switch off, or the first three and "And N more" with it on. */
  const firstStart = needs.findIndex((m: Need) => m.action.label === 'Start it')
  const needRows: ReactNode[] = [
    ...(unfinished ? [<TheSetupNotSavedYet key="unfinished" unfinished={unfinished} primary />] : []),
    ...needs.map((n: Need, i: number) => (
      <EdgeRow
        key={n.key}
        kind={n.kind}
        /* One line of title: a second sentence goes to the detail line when there is none (Hafsah, 25 October). */
        title={aSentenceAsARow(n.title, n.detail).title}
        detail={aSentenceAsARow(n.title, n.detail).detail}
        to={n.action.to}
        actions={<>
          {/* ONE NAVY BUTTON (Hafsah, 30 September): only the first "Start it", the most important, is navy. With the design pass on,
              every other action is a quiet link. */}
          <Button kind={!unfinished && n.action.label === 'Start it' && i === firstStart ? 'primary' : designPass ? 'quiet' : 'secondary'} size="small" to={n.action.to}>{n.action.label}</Button>
          {n.missedReason && <TheReasonYouMissed checkInId={n.missedReason.checkInId} given={n.missedReason.given} />}
        </>}
      />
    )),
    ...moreRows.map((r) => (
      <EdgeRow key={r.key} kind={r.kind} title={r.title} detail={r.detail} to={r.action?.to}
        actions={r.action ? <Button kind={designPass ? 'quiet' : 'secondary'} size="small" to={r.action.to}>{r.action.label}</Button> : undefined} />
    )),
  ]

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
              {lineResend && <>{' '}<button type="button" className="btn quiet sm gw-inline-btn gwui-in-a-sentence" onClick={() => resend.mutate()} disabled={resend.isPending || resend.isSuccess}>{resend.isSuccess ? 'Sent again.' : resendLabel}</button></>}
              {lineReadyToSend && <>{' '}<button type="button" className={`btn ${designPass ? 'quiet' : 'primary'} sm gw-inline-btn gwui-in-a-sentence`} onClick={() => sendReady.mutate()} disabled={sendReady.isPending || sendReady.isSuccess}>{sendReady.isPending ? 'Sending…' : sendReady.isSuccess ? 'Sent.' : lineReadyToSend.label}</button></>}
            </>}
          />

          {/* Everything under the greeting is drawn whole once /today and the reads its parts make are in (page loads, 22 November 2026,
              cause C): the three-row placeholder inside "What needs you" was shorter than the list that replaced it, so everything
              under it jumped down. */}
          <Held waiting={isLoading} alsoFor={[['appeals']]} what="Getting what needs you" count={5}>
          {/* An organisation still called by the name Groundwork made up ("Hafsah's workspace") is named here, by an admin (26 October). */}
          <NameYourOrganisation />

          {/* The free trial, one line, for an admin while it runs (Hafsah, 12 October). The server decides who reads it. */}
          {/* With the way to Plan and billing beside it (fix list item 6). Only an admin is served the line. */}
          {data?.freeTrial && <Note>{data.freeTrial}{' '}<Link to="/settings/billing">Plan and billing</Link></Note>}

          {/* Appeals to decide (C3, U.13): an admin's only. The server refuses anybody else. */}
          {user?.role === 'ADMIN' && <AppealsToDecide />}

          {/* SINCE YESTERDAY (C1): what moved since the round before, for the check-in the line is about. It comes first, so the page opens with
              what has moved and then says what needs you (design playbook, rule 4: lead with what is going well, then what needs attention). */}
          {!designPass && data?.sinceYesterday && (
            <Section heading={data.sinceYesterday.heading}>
              <Panel>
                <p className="t-body">{data.sinceYesterday.says}</p>
                {data.sinceYesterday.also && <p className="t-small mut">{data.sinceYesterday.also}</p>}
              </Panel>
            </Section>
          )}

          {/* ONE LIST, AS THE PROTOTYPE: what the lead's nudge adds (needs you, overdue on the team, risks) are rows in
              "What needs you", most important first, never sections of their own. */}
          <Section heading="What needs you" note={allNeeds > 1 ? `${allNeeds} things, most important first` : undefined}
            action={designPass ? <RequestLinks userId={user?.id} requests={{ show: aSuiteIsOnForYou, label: requestsLinkLabel }} /> : undefined}>
            {data && allNeeds === 0 && <Empty>Nothing needs you right now.</Empty>}
            {allNeeds > 0 && (
              <EdgeList label="What needs you">
                {designPass ? <ShowAll items={needRows} render={(r) => r} /> : needRows}
              </EdgeList>
            )}
            {isError && (
              <div>
                <Note tone="error">What needs you didn’t load. Try again.</Note>
                <Button kind="secondary" size="small" onClick={() => refetch()} disabled={isFetching}>Try again</Button>
              </div>
            )}
            {/* Under what needs you, when one of those is a check-in to answer (fix list, item 5). The server decides. */}
            {data?.checkInOnWhatsApp && (
              <CheckInOnWhatsApp link={data.checkInOnWhatsApp.link} label={data.checkInOnWhatsApp.label} says={data.checkInOnWhatsApp.says} testId="today-check-in-on-whatsapp" />
            )}
            {designPass ? null : (
              <>
                {aSuiteIsOnForYou && <p className="gwui-panel-text"><Link className="gwui-plain-link" to="/suite/mine">{requestsLinkLabel}</Link></p>}
                <QueueLink userId={user?.id} />
              </>
            )}
          </Section>

          {designPass && data?.sinceYesterday && (
            <Section heading={data.sinceYesterday.heading}>
              <Panel>
                <p className="t-body">{data.sinceYesterday.says}</p>
                {data.sinceYesterday.also && <p className="t-small mut">{data.sinceYesterday.also}</p>}
              </Panel>
            </Section>
          )}

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

          {/*
            SCREEN FAULT 7: THE ADMIN CARD CAME FIRST ON A PHONE, NOT THE GREETING. On a single
            column (a phone, where this `Stack` is the whole page, not a side-by-side layout) the
            welcome card and "Get <organisation> going" used to sit above the greeting and "What
            needs you" - a new admin's first full screen was "You're an admin", with what actually
            needs her today two screens further down. Moved after "What needs you" so the thing
            that changes every day comes first, and the one-time welcome comes after it.
          */}
          <AdminFirstRun />
          </Held>
        </div>

        {comingUp.length > 0 && (
          <ComingUp first={designPass ? 3 : undefined} items={withComingUpTellingTwoApart(comingUp).map(c => ({
            when: whenItComes(c.at, now),
            what: c.apart ? `${c.what} (${c.apart})` : c.what,
            to: c.to,
          }))} />
        )}
      </div>
    </Page>
  )
}
