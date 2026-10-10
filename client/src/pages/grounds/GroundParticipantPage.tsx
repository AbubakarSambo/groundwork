import { howItEnded, hasStalled } from '@/lib/a-ground-that-has-ended'
import { OutOfTime } from './OutOfTime'
import { plannedSessionsFor } from '@/lib/sessionCount'
import { useEffect, useRef, useState } from 'react'
import { GroundGone } from '@/components/gw/GroundGone'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { whichSessionIsThisCheckInOn, whichSessionAreWeOn, hasDoneThisSession } from '@/lib/which-session-are-we-on'
import { groundsApi } from '@/api/grounds'
import { useAuthStore } from '@/stores/auth'
import { reportsApi } from '@/api/reports'
import { CheckInHeader } from '@/components/gw/ui/CheckInHeader'
import { Page } from '@/components/gw/ui/Page'
import { Note, Empty, Button, Stack, SubHeading, Callout } from '@/components/gw/ui'
import { cadenceLabel } from '@/lib/cadence'
import { peopleLabels, atTheStart } from '@/lib/utils'
import { whoRunsThis, whenTheNextOneOpens } from '@/lib/what-the-end-of-a-check-in-can-say'
import { useOpenSession } from '@/hooks/useOpenSession'
import { SessionPaywallModal } from '@/components/gw/checkin/SessionPaywallModal'
import { YourWork } from '@/components/gw/checkin/YourWork'
import { WhoIsInThis } from '@/components/gw/WhoIsInThis'
import { BetweenCheckIns } from '@/components/gw/BetweenCheckIns'
import { MyParticipation } from '@/components/gw/MyParticipation'
import { SharedReportForAParty } from '@/components/gw/SharedReportForAParty'
import { ContextPage } from '@/components/gw/ContextPage'
import { whenItWas } from '@/lib/a-date-reads-the-same-everywhere'





/**
 * The card view's helpers - a relative-time formatter and the specificity quality
 * badge - went with it. The record tab carries the specificity read now, and the
 * conversation dates its own sessions on the dividers.
 */

type Tab = 'checkin' | 'record' | 'report' | 'docs' | 'settings'

/** The shared tab keys, and this page's own older names for the same tabs. Both directions. */
const FROM_TAB_KEY: Record<string, Tab> = {
  chat: 'checkin', report: 'report', record: 'record', context: 'docs', settings: 'settings',
}
const TO_TAB_KEY: Partial<Record<Tab, string>> = {
  checkin: 'chat', report: 'report', record: 'record', docs: 'context', settings: 'settings',
}

export function GroundParticipantPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  /**
   * THIS PAGE IGNORED ?tab= ALTOGETHER.
   *
   * The admin page read it; this one always opened on the conversation. So the same link behaved
   * differently depending on who followed it, and nobody could send anybody "look at the Context
   * tab" - which is a sentence people say constantly about a check-in.
   *
   * Keys are the shared ones from `ground-tabs.ts`, mapped to this page's own older names, and the
   * URL is kept in step so a tab can be linked to and come back to.
   */
  const [searchParams, setSearchParams] = useSearchParams()
  const [tab, setTab] = useState<Tab>(() => FROM_TAB_KEY[searchParams.get('tab') ?? ''] ?? 'checkin')
  const goTab = (t: Tab) => {
    setTab(t)
    const key = TO_TAB_KEY[t]
    const next = new URLSearchParams(searchParams)
    if (key) next.set('tab', key); else next.delete('tab')
    setSearchParams(next, { replace: true })
  }
  const [seenOutOfTime, setSeenOutOfTime] = useState(false)
  /* REVIEW ROUND 3, ITEM 2: THE OPENING FLOW (probe + paywall) MOVED TO A SHARED HOOK, so
     GroundAdminPage.tsx can open a session the same way without landing on this page. */
  const { open: openSession, opening: sessionOpening, openFailed: sessionOpenFailed, openError: sessionOpenError, retryOpen: retrySessionOpen, paywall } = useOpenSession(id)

  const user = useAuthStore(s => s.user)

  const { data: ground, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['ground', id],
    queryFn: () => groundsApi.get(id!),
    enabled: !!id,
  })

  /* A 404 or a 403 means gone, the same way (B-110, GW-PRI-04): the only other true sentence for
     a 403 would say this check-in exists and just isn't yours, which leaks exactly what the 404
     wording is written not to leak. Everything else is a failure to reach it - see the guard
     below. */
  const definitelyGone = isError && [404, 403].includes((error as any)?.response?.status)

  /*
   * "ASK TO JOIN" IS NOT DRAWN YET (U.20 review). The prototype offers it under "You’re not in this
   * check-in", but the server's participant-request route lets only somebody already in the
   * check-in ask, so the button could only ever answer "You are not a participant in this
   * check-in". The prototype's sentence, that the lead can add you, is true and stays; the button
   * comes back when the server lets a reader of the check-in ask (request 159).
   */

  const { data: report } = useQuery({
    queryKey: ['report', id],
    queryFn: () => reportsApi.get(id!),
    /**
     * ONLY WHEN THE CHECK-IN SAYS THERE IS ONE.
     *
     * `GET /grounds/:id/report` answers 404 for "no report yet" - deliberately, and it must keep
     * doing so: the same 404 covers a check-in that does not exist and one that is not yours, so a
     * caller cannot tell those apart. See GW-PRI-04, `missing report does not leak ground
     * existence`. Turning it into a 200 would make "this check-in exists and has no report" a
     * distinguishable answer, which is the leak that spec prevents.
     *
     * So the fix is here rather than there: the ground payload already carries `report`, so the
     * client knows before it asks. Asking anyway put a red 404 in the console on every check-in
     * that has not reported yet - noise that makes a real error harder to see.
     */
    enabled: !!id && !!(ground as any)?.report,
    retry: false,
  })

  /*
   * B-190: GATED ON THE GROUND HAVING ACTUALLY LOADED, NOT JUST ON HAVING AN ID.
   *
   * These three used to ask `enabled: !!id` (or `!!id && tab === 'record'`), so when `ground`
   * itself came back 403 (not yours to open) or 404 (gone), each of these fired anyway - and
   * unlike `groundsApi.get`, none of them is called with `skipForbiddenToast`/`skipNotFoundToast`.
   * The result was the generic "That one is not yours to open … whoever runs this check-in can
   * let you in" toast landing on top of the GroundGone panel: a second, contradictory message
   * that also leaks exactly what GW-PRI-04 and GroundGone's own wording are written not to say
   * (that a real check-in, with someone who runs it, sits behind the link). `GroundAdminPage`
   * already gates its matching three queries on `viewerIsAParty`, which is derived from `ground`
   * and so is naturally false while `ground` is undefined; gating on `!!ground` here does the same
   * job without needing a party flag this page does not otherwise compute up front.
   */
  const { data: specificity } = useQuery({
    queryKey: ['my-specificity', id],
    queryFn: () => groundsApi.getMySpecificity(id!),
    enabled: !!id && !!ground,
    retry: false,
  })

  const { data: myRecord } = useQuery({
    queryKey: ['my-record', id],
    queryFn: () => groundsApi.getMyRecord(id!),
    enabled: !!id && !!ground && tab === 'record',
    retry: false,
  })

  const { data: mySoloReport, refetch: refetchSoloReport } = useQuery({
    queryKey: ['my-solo-report', id],
    queryFn: () => groundsApi.getMySoloReport(id!),
    /* MY RECORD, NOT REPORT. `MyPrivateReport` renders this and lives on the record tab, so the
       carry-forward line only loaded for somebody who had happened to open Report first. */
    enabled: !!id && !!ground && tab === 'record',
    retry: false,
  })

  // REVIEW ROUND 3, ITEM 2: probeSession/redeemPaywallCode/claimFreeExtensionMut/createSubscriptionMut
  // all moved into useOpenSession (above), so GroundAdminPage.tsx can share them.


  /**
   * WHERE CONTEXT WENT: it was never on this page.
   *
   * The admin page labels its documents tab "Context" when CONTEXT_ENABLED is on,
   * and holds context notes there. This page called the same tab "Documents"
   * always and never read the flag - so a participant looking for the place to
   * put background found a file picker, and somebody moving between the two views
   * saw two names for one thing.
   *
   * The label matches now. What a participant can DO there is still narrower than
   * the lead by design: uploads are theirs, and `addLeadContext` is the lead's -
   * that is a product decision, not an oversight, and it stays until Hafsah says
   * otherwise.
   */
  const contextEnabled = (ground as any)?.contextEnabled === true


  /**
   * `?open=1`: THE HANDOFF FROM THE GROUND PAGE'S CHAT. W8-76.
   *
   * The lead's Chat tab shows "Check in for session N" but cannot open it there: opening goes
   * through `probeSession`, which carries the paywall, and that lives on this page. Rather
   * than a second copy of the payment path, that button sends them here with this flag and
   * this fires the probe once, so it is one click for the person.
   *
   * ABOVE THE EARLY RETURNS, and that is not a style choice. My first version sat next to
   * `dueNow` further down, below `if (isLoading) return` - so on the first render the hooks
   * ran and on the second they did not, and React reported "a change in the order of Hooks"
   * while three unrelated specs went red. That is the second time in this session; the rule
   * is that every hook goes above every conditional return, without exception.
   *
   * Guarded by a ref rather than by the query key, because `probeSession` navigates on
   * success and a re-render before the navigation lands would fire it twice - two sessions
   * opened from one click, one of them chargeable.
   */
  const autoOpenFired = useRef(false)
  const myOpenForAutoOpen = (() => {
    const mine = (ground?.participants ?? []).find((p: any) => p.userId === user?.id)
    const rows = ((mine as any)?.checkIns ?? []) as any[]
    const next = rows.filter((c) => c.status !== 'COMPLETED').sort((a, b) => (a.sessionNumber ?? 0) - (b.sessionNumber ?? 0))[0]
    if (!next) return null
    /*
     * REVIEW ROUND 3, ITEM 1: AN IN_PROGRESS SESSION IS ALREADY OPEN.
     *
     * `availableFrom` says when a session that has not started yet may be started - it says
     * nothing about a session that is already running. Aisha and Amani both had one open
     * (IN_PROGRESS) with an `availableFrom` in the future (set when the session was created,
     * before either of them had answered a single turn) and were told "No check-in open right
     * now" instead of being carried back into the conversation they had left. A session that is
     * IN_PROGRESS is open by definition; only a session that has not started is gated by its date.
     */
    if (next.status === 'IN_PROGRESS') return next
    const from = next.availableFrom ?? null
    if (from && new Date(from).getTime() > Date.now()) return null
    return next
  })()
  useEffect(() => {
    if (autoOpenFired.current) return
    if (new URLSearchParams(window.location.search).get('open') !== '1') return
    if (!myOpenForAutoOpen) return
    autoOpenFired.current = true
    openSession(myOpenForAutoOpen, {
      isFreeGround: ground?.isFreeGround,
      groundLabel: ground?.label,
      isInitiator: ((ground as any)?.participants ?? []).find((p: any) => p.userId === user?.id)?.partyType === 'INITIATOR',
    })
  }, [myOpenForAutoOpen, openSession])

  /**
   * ROUND 4, ITEM A STEP 3: THE CHECK-IN TAB IS THE FOCUSED CONVERSATION.
   *
   * `GroundChat`'s reading-and-hand-off experience is retired from this tab now that its two other
   * jobs (the session history, "who is in this") have somewhere to live (My work, People and
   * setup). This page is always somebody's own account (unlike the lead's page, there is no
   * non-party reader here to say something different to), so opening the Check-in tab with a
   * session ready goes straight through the unchanged `probeSession` - the paywall flow exactly as
   * before, just fired by opening the tab rather than by a button inside it.
   *
   * No `?open=1` needed here: that flag exists for the HAND-OFF from the other page, which already
   * lands here with the flag set; opening the tab directly on this page is the same action without
   * a round trip through the address bar.
   */
  /**
   * ONE ATTEMPT PER CHECK-IN, NOT ONE PER RENDER.
   *
   * This had no "already tried" guard at all - only `sessionOpening`, which is true for the few
   * seconds the request is actually in flight and false every other moment, including the instant
   * after it settles. `myOpenForAutoOpen` is rebuilt fresh on every render (a new object from
   * `.find()`), so it never equals its previous value by reference either - which means this fired
   * again on essentially every re-render of the page once the first attempt had settled: a
   * paywall shown, a toast dismissed, any unrelated state change. Request 174, item 2 is this
   * effect: a check-in that could not open yet (still waiting on approval) was probed again and
   * again a few seconds apart, each attempt racing the server's own idempotency check before the
   * previous one's reply had been written, which is how one session ended up with three different
   * opening questions and one of the `/open` calls back with a 400.
   *
   * Guarded by the check-in's own id, kept in a ref so it survives re-renders and (with no cleanup
   * to undo it) React StrictMode's double-invoked effects alike: once this check-in has been
   * probed, it is not probed again until `retryOpen` below explicitly clears it.
   */
  const checkinTabOpenAttempted = useRef<string | null>(null)
  function attemptCheckinTabOpen(checkIn: any) {
    checkinTabOpenAttempted.current = checkIn.id
    openSession(checkIn, {
      isFreeGround: ground?.isFreeGround,
      groundLabel: ground?.label,
      isInitiator: ((ground as any)?.participants ?? []).find((p: any) => p.userId === user?.id)?.partyType === 'INITIATOR',
    })
  }
  useEffect(() => {
    if (tab !== 'checkin') return
    if (!myOpenForAutoOpen) return
    if (sessionOpening) return
    if (checkinTabOpenAttempted.current === myOpenForAutoOpen.id) return
    /*
     * B-019: THE SAME FALSE "CLOSED" REFUSAL, ONE MORE WAY IN. A ground that ended early (the lead
     * stopped it with a session still IN_PROGRESS or not started) still had a row here that is not
     * COMPLETED, so this still tried to open it - the server's own "This check-in is closed."
     * error toasted on top of the "This check-in has ended" message this tab now shows instead.
     * Nothing can open once the ground itself has ended, whatever any one row still says.
     */
    if (howItEnded(ground as any)) return
    attemptCheckinTabOpen(myOpenForAutoOpen)
  }, [tab, myOpenForAutoOpen, sessionOpening, ground])

  if (isLoading) return <Page narrow><Note>Loading…</Note></Page>
  /*
   * A FAILED REQUEST WAS TELLING PEOPLE THEY HAD BEEN REMOVED.
   *
   * This was `if (!ground)`, which sends every failure to GroundGone - and GroundGone reads
   * "This check-in is not open to you ... it may have been closed, or you are no longer part of
   * it." Driven in the browser with the endpoint forced to 500, that is what a party saw: an
   * accusation that they had been taken out of a check-in, because a request failed.
   *
   * The admin page had already written the rule and this page had not been brought along with it:
   * a check-in that is genuinely gone answers 404, and anything else is a failure to load.
   */
  if (isError && !definitelyGone) return (
    <Page narrow>
      <Empty title="We could not load this check-in" action={<Button kind="secondary" onClick={() => refetch()} disabled={isFetching}>{isFetching ? 'Trying…' : 'Try again'}</Button>}>
        This is a connection problem, not a lost record. You are still part of it, and nothing you
        have written is affected.
      </Empty>
    </Page>
  )

  // Was the bare words "Ground not found." with nothing to press, in two hardcoded
  // colours of its own. W8-65.
  if (!ground) return <Shell><GroundGone /></Shell>

  /* "This check-in reached its end date" (A3, U.3): what a person taking part meets first on a check-in
     that ran out of time, with a way to ask the lead for more and a way on to their own work. */
  const isInitiatorHere = ((ground as any).participants ?? []).find((p: any) => p.userId === user?.id)?.partyType === 'INITIATOR'
  if (hasStalled((ground as any).status) && !isInitiatorHere && !seenOutOfTime && tab === 'checkin') {
    return <OutOfTime groundId={id!} onOpenMyWork={() => { setSeenOutOfTime(true); goTab('record') }} />
  }

  const myParticipant = (ground.participants ?? []).find((p: any) => p.userId === user?.id)
  /* Everybody this reader may know about, named once for the whole page (request 36): their name,
     never the lead's note about them; with no name "a colleague", or "one colleague" and "another
     colleague" when there are several; a lead with no name is "your lead". */
  const labelsForMe = peopleLabels(ground.participants ?? [], { readerId: myParticipant?.id ?? null, readerIsInIt: true })
  const participantLabel = (p: any): string => labelsForMe.get(p?.id) ?? 'a colleague'
  /**
   * MY OWN FINISHED SESSIONS, newest first, so each session's own report can be opened from the
   * record it belongs to. Yours only - somebody else's session is theirs until the shared report
   * releases.
   */
  const myFinishedSessions = (((ground as any)?.checkIns ?? []) as any[])
    .filter((c) => c.status === 'COMPLETED')
    .filter((c) => (((ground as any)?.participants ?? []) as any[]).some((p) => p.id === c.participantId && p.userId === user?.id))
    .sort((a, b) => (b.sessionNumber ?? 0) - (a.sessionNumber ?? 0))
  /**
   * EVERY SESSION OF MINE AS A DOT, done and still to come.
   *
   * Replaces the alignment ladder and the row of specificity bars: both were marks on a scale the
   * person could not see, and both cost a screen each. A dot per session and "3 of 6" is one row
   * and says the thing anybody actually wanted from them.
   */
  const mySessionDots = (((ground as any)?.checkIns ?? []) as any[])
    .filter((c) => (((ground as any)?.participants ?? []) as any[]).some((p) => p.id === c.participantId && p.userId === user?.id))
    .sort((a, b) => (a.sessionNumber ?? 0) - (b.sessionNumber ?? 0))
    .map((c) => ({
      sessionNumber: c.sessionNumber ?? 0,
      state: (c.status === 'COMPLETED'
        ? (c.isSelfCorrection ? 'corrected' : 'done')
        : 'todo') as 'done' | 'corrected' | 'todo',
      /* `specificityHistory` is one score per finished session, in order, so the nth score belongs
         to the nth session. The bar is what she asked for back - "simple and visual" - and the
         session number under it is the thing the old one was missing. */
      checkable: ((specificity?.scores ?? []) as number[])[(c.sessionNumber ?? 1) - 1] ?? null,
    }))
  /** Whether this person runs the ground, and so has an admin view to switch to. */
  const isInitiator = myParticipant?.partyType === 'INITIATOR'
  /**
   * AND THE WAY BACK, FOR EVERYBODY WHO HAS ONE.
   *
   * The return button asked `isInitiator`, and the button that sends people HERE asks only whether
   * they are a party. So an admin in this organisation who takes part in a check-in somebody else
   * leads could cross over and had no way back: no button existed for them, and the two pages look
   * identical, so the screen had simply changed and offered no way to undo it. The browser's back
   * arrow or the rail was the only exit.
   *
   * The same question the other page asks to decide whether somebody may run this.
   */
  const canRunThisCheckIn = isInitiator || user?.role === 'ADMIN'
  /*
   * WHO CAN PRESS THE BUTTONS ON THE PAYWALL. Both routes behind them - the free extension and the
   * subscription - are admin-only on the server. The overlay offered them to any initiator, and an
   * organisation where anyone may open a check-in makes non-admins initiators routinely, so a blocked
   * person was shown two buttons that could only 403. Same rule as the server, one const, used twice.
   */
  const canPayHere = isInitiator && user?.role === 'ADMIN'

  if (!myParticipant) {
    if (user?.role === 'ADMIN') {
      return (
        <Page narrow>
          <Empty
            title="You’re not in this check-in"
            action={(
              <Button kind="secondary" onClick={() => navigate(`/grounds/${id}`)}>Open the whole check-in</Button>
            )}
          >
            {(ground as any)?.initiatorId === user?.id
              ? 'You run it as an admin without giving a check-in yourself. Everything about it is on the whole check-in.'
              : `${whoRunsThis(ground as any) ?? 'Someone else'} runs it. You can read all of it as an admin, on the whole check-in.`}
          </Empty>
        </Page>
      )
    }
    /*
     * ONLY THE LEAD'S FIRST NAME IS SENT HERE (`ground.leadFirstName`, `whoRunsThis`), not the
     * full name the prototype's own sentence uses ("Wairimu Kamau runs it and can add you.") - the
     * closest true sentence is drawn with what the server actually sends, and the gap (a last
     * name too) is one the API could close.
     */
    const lead = whoRunsThis(ground)
    return (
      <Page narrow>
        <Empty title="You’re not in this check-in">
          {lead ? `${lead} runs it and can add you.` : 'Whoever runs it can add you.'}
        </Empty>
      </Page>
    )
  }
  const myCheckIns: any[] = (ground.checkIns ?? []).filter((ci: any) => ci.participantId === myParticipant?.id)
  const openCheckIn = myCheckIns.find((ci: any) => ci.status !== 'COMPLETED')
  const completedCheckIns = myCheckIns.filter((ci: any) => ci.status === 'COMPLETED').sort((a: any, b: any) => b.sessionNumber - a.sessionNumber)
  /**
   * WHICH SESSION THIS IS, THE SAME WAY THE SHARED RULE ANSWERS IT (fault 3b, Esther, live
   * re-walk): the header read "Session 1 of 6" while this reader's own line, right below it, read
   * "This is your session 2 of 6" - `completedCheckIns.length + 1` counts ROWS, and a corrected
   * session (`isSelfCorrection`) leaves two completed rows for the one session actually finished,
   * so a single self-correction inflated this count past the real next session. `whichSessionAreWeOn`
   * (lib/which-session-are-we-on.ts) is the one place this product already answers "which session
   * is a person on" - open if there is one, otherwise the highest session number actually
   * completed - and was written for exactly this drift between two screens, but was never called
   * from here. Used now, so this reads the same served session every other reader of the shared
   * rule does.
   */
  const mySessionNumber = whichSessionAreWeOn(
    (openCheckIn as any)?.sessionNumber ?? null,
    completedCheckIns.map((c: any) => c.sessionNumber),
  )

  /**
   * OPEN IS NOT THE SAME AS DUE.
   *
   * `openCheckIn` is any check-in that is not COMPLETED, which includes the next
   * one already created and scheduled for a fortnight's time. Offering "start
   * session 2" on the day session 1 finished would invite somebody to check in
   * against a period that has not happened.
   */
  const openAvailableFrom = (openCheckIn as any)?.availableFrom ?? null
  /*
   * NOTHING ABOUT "NEXT" WHILE THE CURRENT ONE IS STILL OPENING (U.8 third review).
   *
   * The auto-open handoff above (`?open=1`, from the ground page's own "Check in" button) calls
   * `probeSession.mutate()` the moment this page mounts, and that request can take up to a minute
   * (ConversationService.open). The lead landed here mid-open and read "Your next check-in opens
   * 12 October" while her FIRST one had not even finished opening - a promise about the session
   * after this one, before this one exists. Excluded here rather than only where it is shown, so
   * every reader of `opensLater` (the header line and the composer's own line) agrees.
   */
  /* REVIEW ROUND 3, ITEM 1: THE SAME RULE AS `myOpenForAutoOpen` ABOVE - IN_PROGRESS IS ALREADY
     OPEN, WHATEVER ITS `availableFrom` SAYS. Without this, "No check-in open right now" and a
     later "opens on such-and-such date" were both shown for a session the person had already
     started answering. */
  const opensLater = !!openAvailableFrom && new Date(openAvailableFrom).getTime() > Date.now() && !sessionOpening && (openCheckIn as any)?.status !== 'IN_PROGRESS'
  const dueNow = !!openCheckIn && !opensLater


  // Derive the session total the same way the create wizard does
  // (floor(timelineDays / cadence interval)), from the timelineDays + cadence
  // the ground carries - see lib/sessionCount, which the server's
  // totalSessionsFor is the authority for. This fell back to a hardcoded 6 for
  // years, directly under the comment naming the hardcoded 6 as the bug, so a
  // ground with no timeline displayed "of 6" AND was offered the way to end the
  // engagement at session 5 (MyRecord gates the resolution panel on this
  // number). Unknown is null: the header prints the session with no total, and
  // the gate stays closed rather than guessed open.
  const totalSessions: number | null =
    plannedSessionsFor((ground as any).timelineDays, (ground as any).cadence, (ground as any).totalSessions) ?? null


  /**
   * The signal feed, the alignment read, the last-completed shortcut and the
   * specificity scores all belonged to the card view. They went with it - see the
   * commit; the conversation carries the history now, and the record tab carries
   * the numbers.
   */

  /**
   * THE PROTOTYPE'S FIVE TABS, FOLDED FROM TODAY'S SIX (docs/tasks-ui.md, the check-in rebuild).
   *
   * This page used to hand `groundTabs()`'s own list (Check-in, Report, What I shared, Context,
   * Setup) straight to the tab row, with "Board" prepended - six entries. The prototype's five are
   * Board, Check-in, Context, My work, People and setup. `groundTabs()` itself is untouched (and
   * still tested on its own); what changed is only what draws the row. Report and What I shared
   * (this page's `record`) fold under one "My work" tab, as sub-tabs inside it; Setup is
   * relabelled "People and setup".
   *
   * ONE MOVE LIST:
   *   Report          -> My work (sub-tab "Report")
   *   What I shared    -> My work (sub-tab "What I shared")
   *   Setup            -> People and setup (unchanged content, new label)
   */
  const inMyWork = tab === 'report' || tab === 'record'
  const outerTabOf = (t: Tab): string => {
    if (t === 'checkin') return 'checkin'
    if (t === 'docs') return 'context'
    if (t === 'settings') return 'people'
    return 'mywork'
  }

  /**
   * ROUND 4, ITEM A STEP 2: "WHO IS IN THIS", COMPUTED ONCE, FOR People and setup.
   *
   * Exactly the values GroundChat used to compute inline for GroundTopic - moved up here,
   * unchanged. See the comments at each of these call sites (still there, below) for why each is
   * built the way it is.
   */
  const whoIsInThisNotOpenYet = !(dueNow ? openCheckIn.id : null) && !!(opensLater ? openAvailableFrom : null)
  const whoIsInThisParties = (ground.participants ?? [])
    .filter((p: any) => !p.managingOnly)
    .map((p: any) => {
      const currentSession = whichSessionIsThisCheckInOn(
        (ground.participants ?? [])
          .filter((q: any) => !q.managingOnly)
          .map((q: any) =>
            ((q.checkIns ?? []) as any[])
              .filter((c) => c.status === 'COMPLETED')
              .map((c) => c.sessionNumber ?? 0),
          ),
        totalSessions,
      )
      return {
        name: atTheStart(participantLabel(p)),
        done: hasDoneThisSession((p.checkIns ?? []) as any[], currentSession),
        isSelf: p.userId === user?.id,
        /* GROUP 3'S REVIEW, CONTRADICTION 4: held outside the organisation, by an admin - not by
           the session's own clock. See the matching note in WhoIsInThis.tsx. */
        waitingToBeLetIn: !!p.user?.awaitingOrgApproval,
      }
    })

  return (
    <div className="gwui-page-shell">

      {/*
        U.10 PICTURE-CHECK ROUND 7, ITEM 2 (CHECK-IN REBUILD): THE SAME HEADER PLACEMENT AS THE
        BOARD, NOT A STICKY BEIGE BAND. The admin page's header sits in a plain, non-sticky column
        on the page's own cream; this used to keep its own `position: sticky` wrapper on
        `var(--gw-paper-2)` (the beige the design audit flagged) - the one place round 7 never
        reached. Matched here now, so both views place their header the same way.

        ROUND 2, ITEM F: AND THE WHOLE PAGE BEHIND IT WAS THE SAME DARKER BEIGE
        (`var(--gw-paper-2)`, #FAF5EA - "the prototype's lighter cream, for a band above the page",
        never the page itself). The prototype's My work, the board and Context all sit on
        `#FDFBF6` for a participant exactly as they do for a lead - `var(--gw-page)`, the token the
        lead's page already used. Switched here too, on every state (loading, not-found, out of
        time, and the page itself), so the two pages share one background, not two.

        HAFSAH, 30 SEPTEMBER, THE SETTING ROW, ITEM 3: `Page` ITSELF, NOT A SECOND COPY OF ITS
        NUMBERS. This wrapped the header in its own `maxWidth: 1060, margin: '0 auto'` div - the
        same narrower, shifted frame GroundAdminPage.tsx had (see the matching note there) - rather
        than the real shared `Page` (components/gw/ui/Page.tsx) the board itself uses. Fixed the
        same way here.
      */}
      <Page>
        <CheckInHeader
          crumbs={[{ label: 'Check-ins', to: '/grounds' }, { label: ground.label }]}
          title={ground.label}
          subtitle={(ground as any).cadence ? `${cadenceLabel((ground as any).cadence)}.` : undefined}
          action={(
            <div className="gwui-button-row">
              {/*
                REVIEW ROUND 3, ITEM 1: THIS LINK WENT TO THE PAGE THE PERSON WAS ALREADY ON.
                `/grounds/${id}/p` IS this page - clicking it while standing on it reloads the
                same tab bar, not the conversation. It opens the person's own open session
                directly now (the same call the Check-in tab makes on mount), and does not show
                at all when there is none to open, rather than promise a check-in that is not
                there.
              */}
              {/*
                HAFSAH, 30 SEPTEMBER, ITEM 4: NOT ON PEOPLE AND SETUP.
                The prototype draws "Start my check-in" on Board (board-as-participant.txt), Context
                and My work (my-record.txt), but check-in-people-and-setup.txt has no such button
                before its tabs - only "Add people" is navy on that screen. Without this, the People
                and setup tab carried two navy buttons at once.
              */}
              {myOpenForAutoOpen && outerTabOf(tab) !== 'people' && (
                <Button
                  onClick={() => openSession(myOpenForAutoOpen, { isFreeGround: ground?.isFreeGround, groundLabel: ground?.label, isInitiator })}
                  disabled={sessionOpening}
                >
                  {sessionOpening ? 'Opening…' : 'Start my check-in'}
                </Button>
              )}
              {/*
                HAFSAH, 30 SEPTEMBER, ITEM 4: NOT HERE EITHER. "Ask" only sits in the header on the
                board (board-as-participant.txt) - context.txt, my-record.txt and check-in-people-
                and-setup.txt all carry the tabs with no "Ask" beside them. This page never renders
                the Board tab itself (BoardPage.tsx does, with its own "Ask", already in place), so
                its own header never needs one.
              */}
              {/* The way back for an admin who is a party elsewhere - not in the prototype, but a
                  real door this product needs (the-two-views-are-a-pair.spec.ts). The trailing arrow
                  the button's words used to carry ("The whole check-in →") is gone: a decorative
                  arrow on button text is a joined-on fragment, not a sentence (CLAUDE.md's wording
                  rule), the same reason GroundAdminPage.tsx dropped one from "Go to my check-ins". */}
              {canRunThisCheckIn && (
                <Button kind="secondary" size="small" onClick={() => navigate(`/grounds/${id}`)}>
                  The whole check-in
                </Button>
              )}
            </div>
          )}
          active={outerTabOf(tab)}
          tabs={[
            { key: 'board', label: 'Board', to: `/grounds/${id}/board` },
            { key: 'checkin', label: 'Check-in' },
            { key: 'context', label: contextEnabled ? 'Context and resources' : 'Documents' },
            { key: 'mywork', label: 'My work' },
            { key: 'people', label: 'People and setup' },
          ]}
          onSelectTab={(k) => {
            if (k === 'checkin') goTab('checkin')
            else if (k === 'context') goTab('docs')
            else if (k === 'mywork') goTab(inMyWork ? tab : 'record')
            else if (k === 'people') goTab('settings')
          }}
        />

        <div className="gwui-button-row gwui-status-row">
          {/*
            REVIEW ROUND 3, ITEM 2: ONE PAGE PER CHECK-IN NOW, NOT TWO.
            This used to say which of two pages you were on, for whoever runs the check-in AND
            gives their own account - a dash-joined fragment ("Everything about running it - the
            sessions, who has answered, the setup - is on the whole check-in.") that the wording
            rule rules out anywhere a person reads. It explained a problem that no longer exists:
            the lead's Check-in tab opens her own conversation directly now (GroundAdminPage.tsx),
            so she does not land here to be told apart from it. One sentence, for everyone.
          */}
          <span>Your own check-in. The report shows where you and the others agree, differ, and what to do next.</span>
          {/*
            WHOSE WORKSPACE THIS IS, WHEN IT IS NOT YOURS.

            Somebody added to a check-in in another organisation can open it and nothing said
            so. They are a guest in a workspace holding one check-in and nothing around it, and
            the first they knew was that the rest of the product looked empty. Reported as: "I
            was added to a check-in in one org and then didn't have a way to join the org."

            Null on a reader's own check-in, because "at your own company" is not information.
          */}
          {(ground as any).guestIn && (
            <span className="gwui-note-navy" style={{ fontWeight: 600 }}>
              A guest check-in at {(ground as any).guestIn}.
            </span>
          )}
          {/* Once it has ended, the clock is not the news. See lib/a-ground-that-has-ended. */}
          {howItEnded(ground as any) ? (
            <span className="gwui-note-green" style={{ fontWeight: 600 }}>{howItEnded(ground as any)}</span>
          ) : (
            <>
              {/* OPEN IS NOT DUE, in the header too. `opensLater` is derived above to tell the two
                  apart, and this line numbered the not-yet-due session as current anyway. When it
                  opens later, the date is the news; the total is printed only when it is known.
                  FULL SENTENCES, NOT A DOT-JOINED FRAGMENT (U.8 review): "· Session 1 of 12" and
                  "· Next session opens 4 October" are pieces of a sentence stuck onto the front of
                  a heading with a dot, which CLAUDE.md's wording rule rules out same as anywhere
                  else a person reads.

                  "YOUR", NOT "THIS" (U.4 re-review, item 8). `mySessionNumber` is this reader's
                  own position, staggered by when THEY personally started, never the team's shared
                  phase (that is `phaseSpine.currentSession`, on the board, counted from sessions
                  everybody has finished). Saying "your" makes plain which one this is, on every
                  reader's own page, lead included.

                  FAULT 3b (ESTHER, LIVE RE-WALK): THE NUMBER ITSELF WAS WRONG, NOT JUST ITS NAME.
                  This used to read `completedCheckIns.length + 1` - a count of ROWS, which a
                  self-correction (a second completed row for the same session) inflates past the
                  session she was actually on. `mySessionNumber`, computed above with the shared
                  `whichSessionAreWeOn` rule, reads the open session if there is one, else the
                  highest session number actually completed - immune to a duplicate row, and the
                  same rule the rest of this product already uses to answer "which session is a
                  person on". */}
              {/*
                GROUP 3'S REVIEW, CONTRADICTION 5: THE SAME DATE, SAID TWICE, ONE OF THEM LESS
                TRUE. On the Check-in tab, between sessions, this header's "Your next session opens
                on 7 October." sat right above BetweenCheckIns' own "Your next check-in opens on
                Wednesday 7 October at 3:30pm." - the same fact, but this one left out the weekday
                and the time BetweenCheckIns actually has. Said once is enough, so this header skips
                it exactly where BetweenCheckIns is about to say the fuller version; every other tab
                still reads the date here, since nothing else on those tabs says it at all.
              */}
              {opensLater ? (
                tab !== 'checkin' && <span>Your next session opens on {whenItWas(openAvailableFrom, 'dayAndMonthLong')}.</span>
              ) : totalSessions != null ? (
                <span>This is your session {Math.min(mySessionNumber, totalSessions)} of {totalSessions}.</span>
              ) : (
                <span>This is your session {mySessionNumber}.</span>
              )}
              {/* A finished run has nothing remaining. "0 days remaining" sat on a one-session check-in everybody
                  had done (21 Sep 2026); the count is for a run that is still going. */}
              {(ground as any).daysLeft != null && (totalSessions == null || completedCheckIns.length < totalSessions) && (ground as any).daysLeft > 0 && (
                <span>{(ground as any).daysLeft} day{(ground as any).daysLeft === 1 ? ' is' : 's are'} left.</span>
              )}
              {totalSessions != null && completedCheckIns.length >= totalSessions && (
                <span>Every session is done.</span>
              )}
            </>
          )}
        </div>
      </Page>

      {/*
        THE CHAT GETS THE WHOLE SPACE, LIKE A CHAT.

        Everything on this page sat in a 600px column with 48px of padding under
        it, which is right for cards and wrong for a conversation - it made the
        thing she asked to be an open space read as a small box in the middle of a
        grey page. The live check-in at /checkin/:id is `flex: 1` with the messages
        scrolling and the composer pinned; this is now the same shape.

        Only the chat. The card views keep the narrow column, because a column is
        what makes a stack of cards readable.
      */}
      {/**
        * ROUND 4, ITEM A STEP 3: THE CHECK-IN TAB IS THE FOCUSED CONVERSATION.
        *
        * `GroundChat`'s reading-and-hand-off experience is retired from this tab now that its two
        * other jobs (the session history, "who is in this") have somewhere to live (My work,
        * People and setup). The effect above (near `myOpenForAutoOpen`) has already sent a party
        * with a session ready to `/checkin/:id` (through the unchanged paywall-aware opening hook,
        * `useOpenSession`) by the time anybody would see this render; this is only ever seen for
        * the instant before that navigation lands, or for resting between sessions.
        *
        * BETWEEN SESSIONS, THE PROTOTYPE'S OWN CONVERSATION-STYLE CARD (round 5, item E1; rebuilt
        * as the prototype's card, review round 3, item 4): "<check-in name>" / "No check-in open
        * right now" / Groundwork's sentence in a bubble / the four chips, stacked, each answer
        * arriving as a further bubble in the same card. `BetweenCheckIns.tsx` builds it from the
        * parts (`ConversationCard`, `Bubble`, `QuickReplies`, `Composer`) - not GroundChat's bare
        * Composer, flush against the sidebar, which is what stood in for this before. The note box
        * (`Composer`, still GroundChat's own, exported) is reached from "Add a note for next time"
        * now, not shown unconditionally - notes are yours alone, not part of the record, and the
        * next check-in asks about them; "+ Document" stays reachable from it, and "Change how
        * often this runs" is its own quiet link under the card, reachable without opening the note
        * box first.
        */}
      {tab === 'checkin' && (
        <>
          {/*
           * B-19: AN ENDED CHECK-IN STILL PROMISED A NEXT ONE.
           *
           * `BetweenCheckIns` is written for a check-in still running - "Your next check-in opens
           * on Tuesday" - and said that, unchanged, once the ground had ended, with no outcome
           * shown anywhere on this tab. The board is where the full ending (who decided, when, and
           * why) is read, once it has one; this stops the false promise of a next session here.
           */}
          {howItEnded(ground as any) ? (
            <Callout tone="info" title={howItEnded(ground as any)!}>
              <Link to={`/grounds/${id}/board`}>Go to the board</Link> to read how it ended and why.
            </Callout>
          ) : dueNow ? (
            /* A FAILED OPEN SAYS SO, WITH A WAY BACK IN - not the same "Opening…" line left
               standing after the attempt it describes is already over. See
               attemptCheckinTabOpen above. */
            sessionOpenFailed ? (
              <Note>
                {sessionOpenError}{' '}
                <Button kind="quiet" size="small" onClick={() => { retrySessionOpen(); attemptCheckinTabOpen(myOpenForAutoOpen!) }}>
                  Try again
                </Button>
              </Note>
            ) : (
              <Note>Opening your check-in…</Note>
            )
          ) : (
            <BetweenCheckIns
              groundLabel={ground.label}
              nextOpensSaying={whenTheNextOneOpens(myCheckIns, null)}
              groundId={id!}
              canChangeTheRhythm={isInitiator}
              onGoToSetup={() => goTab('settings')}
            />
          )}
        </>
      )}

      {/* READING WIDTH, EXCEPT WHERE THE PAGE ISN'T PROSE (see the-dashboard-uses-the-screen.spec.ts).
          "Report" is read, so it keeps the 600px measure the conversation itself uses - own-report.jpg
          draws it exactly that narrow. "My work" and "Context and resources" are not: my-record.jpg
          draws "My work" as two columns side by side, and context.jpg draws "Context and resources"
          the page's own full width, the same shape GroundAdminPage.tsx already gives "People and
          setup" and its own "Context" tab for the same reason - a settings, overview or resource page,
          not a column of prose.
          GROUP 3 REVIEW, BATCH B: `docs` used to stay at the reading width here, with only `record`
          and `settings` widened - the one tab this page draws from the very same `ContextPage`
          GroundAdminPage.tsx now widens, left narrower by mistake. */}
      <div
        className={`gw-bd${(tab === 'settings' || tab === 'record' || tab === 'docs') ? '' : ' gwui-centered-column'}`}
        style={{ maxWidth: (tab === 'settings' || tab === 'record' || tab === 'docs') ? 1150 : 600, width: '100%' }}
      >

        {/**
          * "MY WORK" IS ONE FLAT PAGE NOW, NOT TWO SUB-TABS.
          *
          * REVIEW ROUND 3, "YOUR WORK" REBUILD: the prototype's my-record.txt has no sub-tabs at
          * all - "Report" and "What I shared" folded into "My work" as two clickable rows was
          * still two screens wearing one tab's name. `YourWork` (components/gw/checkin/YourWork.tsx)
          * is the single flat page now; `tab` still privately tracks 'record' vs 'report' (a
          * bookmark to `?tab=report` still works, and "the team's, Read" inside YourWork opens it),
          * but nothing on screen offers it as a second tab to click.
          */}

        {/* CHECK-IN TAB */}
        {/* MY RECORD TAB */}
        {tab === 'record' && (
          <YourWork
            groundId={id!}
            ground={ground}
            myRecord={myRecord}
            mySoloReport={mySoloReport}
            refetchSoloReport={refetchSoloReport}
            specificity={specificity}
            report={report}
            totalSessions={totalSessions ?? null}
            completedCount={completedCheckIns.length}
            myFinishedSessions={myFinishedSessions}
            sessionDots={mySessionDots}
            myParticipant={myParticipant}
            /*
              GROUP 3'S REVIEW, BATCH A FAULT 6: "AMANI WEKESA SAID, 'I AM AIMING...'" ABOUT
              HIMSELF. `WhatSuccessLooksLikeFor` (inside YourWork) matches each row's `who` against
              `yourName` to decide whether to say "You" - YourWork passed the literal string "You"
              as `yourName`, which never equals the server's own name for the row, so it always fell
              through to the real name. BoardPage already passes the reader's own real name
              (`myName`); the same real name, from the same labels map already built on this page,
              goes to YourWork now.
            */
            myName={myParticipant ? labelsForMe.get(myParticipant.id) ?? null : null}
            leadFirstName={(ground as any)?.leadFirstName}
            otherParties={(ground.participants ?? [])
              .filter((p: any) => p.userId !== user?.id)
              .map((p: any) => ({ id: p.id, name: atTheStart(participantLabel(p)), email: p.email }))}
            postReportGuide={(report as any)?.postReportGuide}
            aTeamReportComes={!!(ground as any)?.aTeamReportComes}
            /* A party's "the team's, Read" opens the fuller shared-report reading experience below,
               not a bare per-session link - see the note on `onReadTeamReport` in YourWork.tsx. */
            onReadTeamReport={() => goTab('report')}
          />
        )}

        {/* REPORT TAB */}
        {tab === 'report' && (
          <Stack gap={10}>
            {/*
              A SHARED REPORT NEEDS TWO PEOPLE, AND THE PAGE SAYS SO. A check-in with one person on it
              can never release one - the rule refuses outright below two - and the page said
              "forming" for ever. The truth, and who can change it (fix plan B17).
            */}
            {/*
              READ FROM `ground.atLeastTwoInThisRound`, NOT `whoIsInRound(ground.participants, ...)`
              (U.8 fifth review). `ground.participants` is reduced to this reader's own row alone on
              a check-in that hides peers from each other, so this always counted as one - a real
              team of four read "It will build once somebody is added" for ever. The server sends
              the same rule's answer, computed off the raw participants before that filter runs.
            */}
            {!(ground as any).atLeastTwoInThisRound && (
              <Callout tone="warning" role="status">
                The shared report compares two accounts. {isInitiator ? 'Add somebody and this will build.' : 'It will build once the person running this check-in adds somebody.'} Your own record is yours to read in the meantime.
              </Callout>
            )}

            <SharedReportForAParty
              groundId={id!}
              report={report}
              ground={ground}
              onOpenBoard={() => navigate(`/grounds/${id}/board`)}
              onOpenWeek={() => navigate(`/grounds/${id}/report/week`)}
              /*
                U.9 THIRD REVIEW, ITEM 6: THE SAME RATING THE SESSION'S OWN METER READS, NOT A
                SEPARATE NUMBER. This used to come from `specificity.scores`, a continuous 0-1
                figure banded with its own thresholds - which could disagree with the level
                `HowSpecificThisSessionWas` shows on the session page for that very session (walked
                live: "specific in places" here, "Mostly general" there, same person, same
                session). `ground.checkIns[].specificityLevel` is the field the meter itself reads,
                already filtered to this reader's own rows alone (`howCheckableIsYoursAlone`), so
                using it here means the two surfaces can no longer read two different ratings of
                one account.
              */
              specificityBySession={Object.fromEntries(
                (((ground as any)?.checkIns ?? []) as any[])
                  .filter((c) => (((ground as any)?.participants ?? []) as any[]).some((p) => p.id === c.participantId && p.userId === user?.id))
                  .map((c) => [c.sessionNumber, c.specificityLevel ?? null]),
              )}
              viewerUserId={user?.id}
            />
          </Stack>
        )}

        {/*
          THE SAME CONTEXT PAGE THE LEAD SEES. This was assembled separately here, in a different
          order, with a stray heading and buttons pointing at a chat this page does not have. One
          file now owns the bands and their order - see ContextPage.
        */}
        {tab === 'docs' && (
          <ContextPage ground={ground} role={isInitiator ? 'lead' : 'party'} viewerUserId={user?.id} />
        )}

        {/* SETTINGS TAB */}
        {/*
          SETTINGS TAB: STILL A FLEX COLUMN, NOT `Stack` (what-is-true-about-you-comes-first.spec.ts).
          `MyParticipation`'s own sections carry `order` values that only mean anything inside a
          flex or grid parent, so the person's own facts can sit before the lead-owned panels
          without changing where either is written in the source. `Stack` lays its children out
          with plain block margins, which would silently undo that reordering - so only `gap` (the
          one banned prop this div had) moves to a class; `display`/`flexDirection` are not banned
          and stay inline, keeping the flex context `order` needs.
        */}
        {tab === 'settings' && (
          <div className="gwui-gap-10" style={{ display: 'flex', flexDirection: 'column' }}>
            {/*
              ROUND 4, ITEM A STEP 2: "WHO IS IN THIS", MOVED HERE FROM THE CHECK-IN TAB.
              GroundChat.tsx's GroundTopic used to hold this beside "About this check-in" - which
              duplicates Context and so is not re-added here, per the prototype's own placement
              (People and setup).

              WHO IS IN THIS, for the person who could not see it before. W13-5. `ground.participants`
              already carries only the people this reader is allowed to know about - the service
              filters the others out when peers are hidden - so this is a read of the payload, not a
              new permission. NAMES, NOT ROLES (U.8 third review): `whoRunsThis` reads "Rukia knows
              who is here", true whenever there is a lead; `WhoIsInThis` shows the lead her own true
              sentence instead when `viewerIsTheLead` is set - exactly `isInitiatorHere`.
            */}
            <WhoIsInThis
              parties={whoIsInThisParties}
              peersHidden={(ground as any).peersVisibleEffective === false}
              notOpenYet={whoIsInThisNotOpenYet}
              viewerIsParty
              leadName={whoRunsThis(ground as any)}
              viewerIsTheLead={isInitiatorHere}
            />
            {/*
              THE SETUP TAB IS WHAT IS TRUE ABOUT YOU, AND NOTHING ELSE.

              It used to open with a paragraph saying nothing here was hers to change, then the two
              panels that paragraph was apologising for - the yardstick and the starting point - both
              of which said only that nothing had been set. Three statements about absence and
              permission before a single fact about her.

              The paragraph is gone, and so are the panels. Not because a party should not see what
              they are read against - that is exactly what this product is for - but because a
              settings tab was the wrong place for it. What the lead says success is now reaches her
              on My record, beside her own account of it, which is where it can be compared rather
              than merely disclosed. See `WhatSuccessLooksLike`.
            */}
            <SubHeading>Setup</SubHeading>

            {/* Profile summary */}
            <MyParticipation
              viewer={user}
              ground={ground}
              myParticipant={myParticipant}
              completedCount={completedCheckIns.length}
              totalSessions={totalSessions ?? null}
            />
          </div>
        )}
      </div>

      {/* REVIEW ROUND 3, ITEM 2: THE PAYWALL, PULLED OUT INTO A SHARED COMPONENT (see useOpenSession.ts) */}
      <SessionPaywallModal paywall={paywall} canPayHere={canPayHere} groundId={id} />


    </div>
  )
}

/* The same shell GroundAdminPage.tsx uses for a state that renders outside `Page` altogether
   (the ground is genuinely gone): full height, the page's own cream, nothing else. */
function Shell({ children }: { children: React.ReactNode }) {
  return <div className="gwui-page-shell">{children}</div>
}
