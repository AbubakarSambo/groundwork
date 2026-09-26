import { howItEnded } from '@/lib/a-ground-that-has-ended'
import { plannedSessionsFor } from '@/lib/sessionCount'
import { whoIsInRound } from '@/lib/who-is-in-this-round'
import { useEffect, useRef, useState } from 'react'
import { GroundGone } from '@/components/gw/GroundGone'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { whichSessionIsThisCheckInOn, hasDoneThisSession } from '@/lib/which-session-are-we-on'
import { groundsApi } from '@/api/grounds'
import { billingApi } from '@/api/billing'
import { useAuthStore } from '@/stores/auth'
import { reportsApi } from '@/api/reports'
import { GroundChat } from '@/components/gw/GroundChat'
import { groundTabs } from './ground-tabs'
import { GroundTabRow } from '@/components/gw/GroundTabRow'
import { apiClient } from '@/api/client'
import { participantLabel } from '@/lib/utils'
import { toast } from 'sonner'
import { MyRecord } from '@/components/gw/MyRecord'
import { WhatToWalkInWith } from '@/components/gw/WhatToWalkInWith'
import { WhatYourRecordCanSupport } from '@/components/gw/WhatYourRecordCanSupport'
import { WhatYouAreCarryingForward } from '@/components/gw/WhatYouAreCarryingForward'
import { TheFiveThingsThatMakeItCheckable } from '@/components/gw/TheFiveThingsThatMakeItCheckable'
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
  const qc = useQueryClient()
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
  const [showPaywall, setShowPaywall] = useState(false)
  /* Focus goes back to whatever opened it when it closes. */
  const paywallOpener = useRef<HTMLElement | null>(null)
  useEffect(() => {
    if (showPaywall) paywallOpener.current = document.activeElement as HTMLElement | null
    else paywallOpener.current?.focus?.()
  }, [showPaywall])
  const [paywallFreeExtensionAvailable, setPaywallFreeExtensionAvailable] = useState(false)
  const [paywallCode, setPaywallCode] = useState('')
  const [paywallCodeMsg, setPaywallCodeMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const user = useAuthStore(s => s.user)

  const { data: ground, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['ground', id],
    queryFn: () => groundsApi.get(id!),
    enabled: !!id,
  })

  /* Only a 404 means gone. Everything else is a failure to reach it - see the guard below. */
  const definitelyGone = isError && (error as any)?.response?.status === 404

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

  const { data: specificity } = useQuery({
    queryKey: ['my-specificity', id],
    queryFn: () => groundsApi.getMySpecificity(id!),
    enabled: !!id,
    retry: false,
  })

  const { data: myRecord } = useQuery({
    queryKey: ['my-record', id],
    queryFn: () => groundsApi.getMyRecord(id!),
    enabled: !!id && tab === 'record',
    retry: false,
  })

  const { data: mySoloReport, refetch: refetchSoloReport } = useQuery({
    queryKey: ['my-solo-report', id],
    queryFn: () => groundsApi.getMySoloReport(id!),
    /* MY RECORD, NOT REPORT. `MyPrivateReport` renders this and lives on the record tab, so the
       carry-forward line only loaded for somebody who had happened to open Report first. */
    enabled: !!id && tab === 'record',
    retry: false,
  })

  // The checkout mutation behind the deleted subscription CTA is gone with it.
  // `purchaseSessionMut` below is the initiator's, and stays.

  const probeSession = useMutation({
    mutationFn: async (checkIn: any) => {
      const res = await apiClient.post(
        `/check-ins/${checkIn.id}/open`,
        {},
        { validateStatus: () => true }
      )
      if (res.status === 403) return { blocked: true, checkIn, reason: res.data?.message as string | undefined, freeExtensionAvailable: res.data?.freeExtensionAvailable as boolean | undefined }
      if (res.status !== 200 && res.status !== 201) throw new Error(res.data?.message ?? 'Could not start session.')
      return { blocked: false, checkIn, reason: undefined, freeExtensionAvailable: undefined }
    },
    onSuccess: ({ blocked, checkIn, freeExtensionAvailable }) => {
      // Free-tier grounds have unlimited sessions and are never paywalled. Guard
      // explicitly so a stray 403 can never surface the payment modal for them -
      // intent, not reliance on the backend never 403-ing a free ground.
      if (blocked && !ground?.isFreeGround) {
        setPaywallFreeExtensionAvailable(freeExtensionAvailable ?? false)
        setShowPaywall(true)
      } else {
        navigate(`/checkin/${checkIn.id}`, {
          state: { sessionNumber: checkIn.sessionNumber, isFinal: (checkIn as any).isFinal ?? false, groundLabel: ground?.label, groundId: id, isInitiator: (ground?.participants ?? []).find((p: any) => p.userId === user?.id)?.partyType === 'INITIATOR' }
        })
      }
    },
    /* mutationFn extracts the server's sentence into the Error; this used to throw it away for four fixed words. */
    onError: (e: any) => toast.error(e?.message ?? 'Could not start session. Try again.'),
  })

  const redeemPaywallCode = useMutation({
    mutationFn: () => billingApi.redeemContributorCode(paywallCode.trim().toUpperCase(), id!),
    onSuccess: r => {
      qc.invalidateQueries({ queryKey: ['ground', id] })
      setPaywallCodeMsg({ ok: r.ok, text: r.message })
      if (r.ok) {
        setShowPaywall(false)
        setPaywallCode('')
      }
    },
    onError: () => setPaywallCodeMsg({ ok: false, text: 'Something went wrong. Try again.' }),
  })

  // purchaseSessionMut removed with the buy-a-session tier.

  const claimFreeExtensionMut = useMutation({
    mutationFn: () => billingApi.claimFreeExtension(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ground', id] })
      setShowPaywall(false)
      setPaywallFreeExtensionAvailable(false)
      toast.success('Free session added. You can now start your session.')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Could not add the free session. Try again.'),
  })

  const createSubscriptionMut = useMutation({
    mutationFn: (plan: string) => billingApi.createSubscription(plan as any),
    onSuccess: r => {
      if (r.checkoutUrl) window.location.href = r.checkoutUrl
      else toast.error('Checkout did not open. Try again, or email hello@myground.work.')
    },
    onError: () => toast.error('Could not start checkout. Try again.'),
  })



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
    const from = next.availableFrom ?? null
    if (from && new Date(from).getTime() > Date.now()) return null
    return next
  })()
  useEffect(() => {
    if (autoOpenFired.current) return
    if (new URLSearchParams(window.location.search).get('open') !== '1') return
    if (!myOpenForAutoOpen) return
    autoOpenFired.current = true
    probeSession.mutate(myOpenForAutoOpen)
  }, [myOpenForAutoOpen, probeSession])

  if (isLoading) return <div style={{ minHeight: '100vh', background: 'var(--gw-paper-2)', padding: 24, fontSize: 13, color: 'var(--gw-muted)' }}>Loading…</div>
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
    <div style={{ minHeight: '100vh', background: 'var(--gw-paper-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, letterSpacing: '-.01em', color: 'var(--gw-text)' }}>
          We could not load this check-in
        </div>
        <div style={{ fontSize: 13, color: 'var(--gw-sub)', lineHeight: 1.65, maxWidth: 340, margin: '0 auto 18px' }}>
          This is a connection problem, not a lost record. You are still part of it, and nothing you
          have written is affected.
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          style={{ padding: '9px 18px', borderRadius: 7, background: 'var(--gw-navy)', color: 'white', border: 'none', cursor: isFetching ? 'default' : 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'inherit' }}
        >{isFetching ? 'Trying…' : 'Try again'}</button>
      </div>
    </div>
  )

  // Was the bare words "Ground not found." with nothing to press, in two hardcoded
  // colours of its own. W8-65.
  if (!ground) return <div style={{ minHeight: '100vh', background: 'var(--gw-page)' }}><GroundGone /></div>

  const myParticipant = (ground.participants ?? []).find((p: any) => p.userId === user?.id)
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
    return (
      <div style={{ minHeight: '100vh', background: 'var(--gw-paper-2)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ maxWidth: 400, textAlign: 'center' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--gw-text)', marginBottom: 8 }}>You are not in this check-in</div>
          <div style={{ fontSize: 13, color: 'var(--gw-sub)', lineHeight: 1.65, marginBottom: 20 }}>
            {user?.role === 'ADMIN'
              ? 'You run it as an admin without giving a check-in yourself. Everything about it is on the whole check-in.'
              : 'Whoever runs it can add you.'}
          </div>
          <button onClick={() => navigate(user?.role === 'ADMIN' ? `/grounds/${id}` : '/grounds')} style={{ fontSize: 13, color: 'var(--gw-navy)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontFamily: 'inherit' }}>
            {user?.role === 'ADMIN' ? 'Open the whole check-in' : 'Back to check-ins'}
          </button>
        </div>
      </div>
    )
  }
  const myCheckIns: any[] = (ground.checkIns ?? []).filter((ci: any) => ci.participantId === myParticipant?.id)
  const openCheckIn = myCheckIns.find((ci: any) => ci.status !== 'COMPLETED')
  const completedCheckIns = myCheckIns.filter((ci: any) => ci.status === 'COMPLETED').sort((a: any, b: any) => b.sessionNumber - a.sessionNumber)

  /**
   * OPEN IS NOT THE SAME AS DUE.
   *
   * `openCheckIn` is any check-in that is not COMPLETED, which includes the next
   * one already created and scheduled for a fortnight's time. Offering "start
   * session 2" on the day session 1 finished would invite somebody to check in
   * against a period that has not happened.
   */
  const openAvailableFrom = (openCheckIn as any)?.availableFrom ?? null
  const opensLater = !!openAvailableFrom && new Date(openAvailableFrom).getTime() > Date.now()
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
   * ONE TAB ORDER, SHARED WITH THE LEAD'S VIEW. See `ground-tabs.ts`.
   *
   * This list used to be defined here in its own order - Check-in, My record, Report - while the
   * lead's page had Check-in, Sessions, Overview, Context, Report. Report third here, fifth there.
   * Both read the same function now.
   *
   * "My record" became "Record", the same word the lead sees, because it is one tab whose CONTENT
   * differs by role rather than two tabs about the same thing.
   */
  const tabs = groundTabs({
    contextEnabled,
    /* This page is somebody's own account of the check-in. Running it is the other view's job. */
    canRunThisCheckIn: false,
    isAParty: true,
  })


  return (
    <div style={{ minHeight: '100vh', background: 'var(--gw-paper-2)', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'var(--gw-paper-2)', borderBottom: '1px solid var(--gw-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px' }}>
          <button type="button" onClick={() => navigate('/grounds')} style={{ background: 'none', border: 'none', padding: 0, fontFamily: 'inherit', fontSize: 13, color: 'var(--gw-muted)', cursor: 'pointer', flexShrink: 0 }}>← Check-ins</button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--gw-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ground.label}</div>
            {/*
              WHICH OF THE TWO VIEWS YOU ARE ON, PERMANENTLY.
              
              The same check-in has two pages - the one that runs it and this one, your own account -
              and a person can move between them from a small button. Neither page said which it was,
              so somebody who had crossed over could not tell why what they were seeing had changed.
              The sentence stays on screen rather than announcing itself once and vanishing.
            */}
            {/*
              THE STATE LIVES IN THE HEADER ON THIS PAGE TOO.
              
              It was on the lead's page only, so the card below had to carry a session count for a
              participant - and then the same count sat on the lead's page twice, once in each place.
              The card is meant to hold two things: the brief, and who is in this. Everything about
              where the check-in has got to belongs up here, on both pages, once.
            */}
            <div style={{ fontSize: 11, color: 'var(--gw-muted)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {/*
                WHICH OF THE TWO VIEWS YOU ARE ON, SAID OUTRIGHT.

                "I think there may be some chaos happening based on lead, participant or admin",
                after landing here and reporting that the Sessions page had gone and the Context
                page had vanished. Neither had: this is the party view, which has never had a
                Sessions tab, and its Context tab is right there. But a lead who runs the check-in
                AND gives their own account has two pages with the same name at the top, one tab
                row that differs by two entries, and a line about privacy to tell them apart.

                So the line says which page this is. For somebody who only takes part it reads the
                same as it always did; for whoever runs it, it names the other page in the same
                breath as the button that goes there.
              */}
              <span>
                {canRunThisCheckIn
                  ? 'Your own account of this check-in. Everything about running it - the sessions, who has answered, the setup - is on the whole check-in.'
                  : 'Your own check-in. The report shows where you and the others agree, differ, and what to do next.'}
              </span>
              {/*
                WHOSE WORKSPACE THIS IS, WHEN IT IS NOT YOURS.

                Somebody added to a check-in in another organisation can open it and nothing said
                so. They are a guest in a workspace holding one check-in and nothing around it, and
                the first they knew was that the rest of the product looked empty. Reported as: "I
                was added to a check-in in one org and then didn't have a way to join the org."
                
                Null on a reader's own check-in, because "at your own company" is not information.
              */}
              {(ground as any).guestIn && (
                <span style={{ color: 'var(--gw-navy)', fontWeight: 600 }}>
                  · A guest check-in at {(ground as any).guestIn}
                </span>
              )}
              {/* Once it has ended, the clock is not the news. See lib/a-ground-that-has-ended. */}
              {howItEnded(ground as any) ? (
                <span style={{ color: 'var(--gw-green-t)', fontWeight: 600 }}>· {howItEnded(ground as any)}</span>
              ) : (
                <>
                  {/* OPEN IS NOT DUE, in the header too. `opensLater` is derived above to tell the two
                      apart, and this line numbered the not-yet-due session as current anyway. When it
                      opens later, the date is the news; the total is printed only when it is known. */}
                  {opensLater ? (
                    <span>· Next session opens {whenItWas(openAvailableFrom, 'dayAndMonthLong')}</span>
                  ) : totalSessions != null ? (
                    <span>· Session {Math.min(completedCheckIns.length + 1, totalSessions)} of {totalSessions}</span>
                  ) : (
                    <span>· Session {completedCheckIns.length + 1}</span>
                  )}
                  {/* A finished run has nothing remaining. "0 days remaining" sat on a one-session check-in everybody
                      had done (21 Sep 2026); the count is for a run that is still going. */}
                  {(ground as any).daysLeft != null && (totalSessions == null || completedCheckIns.length < totalSessions) && (ground as any).daysLeft > 0 && (
                    <span>· {(ground as any).daysLeft} day{(ground as any).daysLeft === 1 ? '' : 's'} remaining</span>
                  )}
                  {totalSessions != null && completedCheckIns.length >= totalSessions && (
                    <span>· every session done</span>
                  )}
                </>
              )}
            </div>
          </div>
          {/*
            THE OTHER HALF OF THE SWITCH.
            The ground page now links here ("My check-ins"), and this page had no
            way back - so the two views of one ground were a one-way trip. Her ask
            was "at the top you can click the buttons to take you to the admin view
            or checkin overview", which needs both directions.

            Only for somebody who runs the ground. A participant who is not the
            initiator has no admin view to switch to, and offering one would send
            them to a page that refuses them.
          */}
          {canRunThisCheckIn && (
            <button
              onClick={() => navigate(`/grounds/${id}`)}
              style={{ flexShrink: 0, fontSize: 11, fontWeight: 700, padding: '5px 11px', borderRadius: 20, background: 'white', color: 'var(--gw-navy)', border: '1px solid var(--gw-navy)', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              The whole check-in →
            </button>
          )}
          {/*
            THE TEAM BOARD BELONGS TO THE GROUND, so it is in the tab row below and
            not a dark pill floating up here beside the view switch. Hafsah's words.
            It was the only part of a ground reachable from the chrome rather than
            from the ground's own navigation, which is also how it stayed
            undiscovered.
          */}
        </div>

        {/* Tab bar */}
          <GroundTabRow
            tabs={tabs}
            active={TO_TAB_KEY[tab] ?? 'chat'}
            /*
              The `k === 'board'` branch that used to sit here was dead: `groundTabs()` stopped
              returning a board key when the board left the tab row, so nothing could ever take it.
              Dead, and worse than dead - it was the only navigate() to the board left in the app, so
              it kept a "does anything link here?" check green while the board was unreachable.
            */
            /*
              TRANSLATED ONCE, AND IN THE SAME PLACE THE LEAD'S VIEW TRANSLATES.

              This page used to translate TWICE: the list it handed the row was already mapped into
              this page's own keys, and then `onPick` ran those keys back through `FROM_TAB_KEY`,
              which takes the SHARED ones. `docs` and `checkin` are in neither direction of that
              map, so both fell through to the default. Three of the five keys spell the same in
              both vocabularies, which is why Report, My record and Setup worked and Context was the
              single tab that sent you back to the conversation. Reported as "her context page
              doesnt seem to exist" - it existed; the tab could not reach it.

              So the row is given the shared keys, exactly as the lead's view gives them, and the
              only translation on this page happens here and in `active`.
            */
            onPick={k => goTab(FROM_TAB_KEY[k] ?? 'checkin')}
          />
      </div>

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
      {tab === 'checkin' && (
        // GroundChat owns its own reading column and scroll, the same as the
        // entry chat. Wrapping it in a second centred column fought with that.
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <GroundChat
            groundId={id!}
            openCheckInId={dueNow ? openCheckIn.id : null}
            openSessionNumber={dueNow ? openCheckIn.sessionNumber : null}
            totalSessions={totalSessions ?? null}
            nextOpensAt={opensLater ? openAvailableFrom : null}
            /* Only the person who runs it can change the rhythm, so only they are told they can. */
            canChangeTheRhythm={isInitiator}
            onGoToSetup={() => goTab('settings')}
            onOpenSession={() => dueNow && probeSession.mutate(openCheckIn)}
            openPending={probeSession.isPending}
            brief={(ground as any).brief}
            /**
             * WHO IS IN THIS, for the person who could not see it. W13-5.
             *
             * `ground.participants` already carries only the people this reader is allowed
             * to know about - the service filters the others out when peers are hidden - and
             * each one carries their own check-ins. So this is a read of the payload, not a
             * new permission.
             *
             * "Done" means done for the session number this person is on, so a roster on
             * session 3 answers "is anybody else doing session 3", which is the question.
             */
            peersHidden={(ground as any).peersVisibleEffective === false}
            parties={(ground.participants ?? [])
              .filter((p: any) => !p.managingOnly)
              .map((p: any) => {
                /**
                 * THE SESSION THE CHECK-IN IS ON, NOT THE ONE I AM ON.
                 *
                 * `openCheckIn` and `completedCheckIns` are MY check-ins, so this judged everybody
                 * else's chip against my own progress: having finished session 2 before anyone else
                 * made the whole roster answer for session 1, and every chip read "checked in"
                 * beside a counter that said nobody had. Same defect as the other view, from the
                 * same cause. See lib/which-session-are-we-on.ts.
                 */
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
                  name: participantLabel(p),
                  done: hasDoneThisSession((p.checkIns ?? []) as any[], currentSession),
                  isSelf: p.userId === user?.id,
                }
              })}
            signals={((ground.signals ?? []) as any[])
              .filter((sig: any) => sig.observationText)
              .map((sig: any) => ({
                label: sig.code?.startsWith('D') ? 'Divergence' : 'Convergence',
                text: sig.observationText,
                session: sig.lastPeriodNumber ?? 1,
              }))}
          />
        </div>
      )}

      <div style={{ maxWidth: 600, margin: '0 auto', width: '100%', padding: '16px 16px 48px' }}>

        {/* CHECK-IN TAB */}
        {/* MY RECORD TAB */}
        {tab === 'record' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/*
              YOUR PRIVATE REPORT SITS WITH THE REST OF WHAT IS YOURS.
              
              It was on the Report tab, above the shared one, so that tab meant two things at once:
              the account you wrote and the picture everybody gets. Report is the whole thing now and
              My record is your part - the same whole-against-part split the two views' labels already
              use, rather than a second axis to learn.
            */}
            {/*
              THE SUMMARY IS THE FIRST THING ON THE PAGE. Her call.

              It is the one block that says, in prose, what this person's record actually contains -
              everything below it is a read OF that. It was fourth, under three cards assessing it,
              so a person met three judgements before meeting the thing being judged.

              It travels with "what to carry" and Share because they are one object: the summary is
              the first half of the card the next session opens from.
            */}
            <WhatYouAreCarryingForward
              groundId={id!}
              mySoloReport={mySoloReport}
              refetchSoloReport={refetchSoloReport}
              otherParties={(ground.participants ?? [])
                .filter((p: any) => p.userId !== user?.id)
                .map((p: any) => ({ id: p.id, name: participantLabel(p), email: p.email }))}
            />

            {/*
              THE TWO THINGS AT A GLANCE, ABOVE EVERYTHING THEY SUMMARISE.

              "What your record can support" was a five-segment bar with a one-word label, three
              screens down; "How your answers are going" was another card below that. Both were
              buried under the thing they were meant to introduce, and both were marks out of a
              scale nobody can see. One card now, at the top, in sentences.
            */}
            <WhatYourRecordCanSupport
              strength={(myRecord as any)?.insightsLocked ? null : (myRecord as any)?.confidence}
              trend={specificity?.trend}
              sessions={mySessionDots}
              totalSessions={totalSessions ?? null}
              coverage={{
                iHaveCheckedIn: completedCheckIns.length > 0,
                answered: (ground as any)?.sessionProgress?.completed ?? completedCheckIns.length,
                parties: (ground as any)?.sessionProgress?.total
                  ?? (ground.participants ?? []).filter((p: any) => !p.managingOnly).length,
                /* Empty where peers are hidden, and the component says "one person" instead. A page
                   being private to its reader does not make somebody else's name theirs to know. */
                waitingOn: (ground as any)?.peersVisibleEffective === false
                  ? []
                  : (ground.participants ?? [])
                      .filter((p: any) => !p.managingOnly && p.userId !== user?.id)
                      .filter((p: any) => !((p.checkIns ?? []) as any[]).some((c) => c.status === 'COMPLETED'))
                      .map((p: any) => participantLabel(p)),
                corroborated: (report as any)?.engagement?.whatCouldBeChecked ?? null,
                documentBackedPct: (report as any)?.engagement?.documentBackedPct ?? null,
                roundsFinished: completedCheckIns.length,
              }}
              alsoNoticed={(myRecord as any)?.insightsLocked
                ? []
                : (((myRecord as any)?.patterns ?? []) as any[]).map((p) => p.text ?? p.observationText).filter(Boolean)}
            />

            {/*
              AND SPECIFICITY AS THE FIVE THINGS IT IS MADE OF, WHICH THE ENGINE HAS ALWAYS STORED
              AND NO SCREEN HAS EVER SHOWN. `specificityDimensions` is written per check-in; the
              product was averaging it into one word and printing the word.
            */}
            <TheFiveThingsThatMakeItCheckable
              dimensions={(myFinishedSessions[0] as any)?.specificityDimensions ?? null}
              sessionNumber={(myFinishedSessions[0] as any)?.sessionNumber ?? null}
              mostUseful={(myRecord as any)?.insightsLocked ? null : specificity?.mostUseful}
              strongest={(myRecord as any)?.insightsLocked ? null : specificity?.strongest}
            />
            {/* MyPrivateReport is gone: the carry-forward moved to the top of the page, the session
                list to Report, and sign-off and the two signposts were removed - what was left was an
                empty grey box and a modal whose button had moved out from under it. */}
            <div style={{ borderTop: '1px solid var(--gw-border)', margin: '6px 0' }} />
            <MyRecord
            groundId={id}
            ground={ground}
            myRecord={myRecord}
            totalSessions={totalSessions ?? null}
            completedCount={completedCheckIns.length}
            />

            {/*
              LAST, WHICH IS WHERE SHE PUT IT.

              I had it third, on the argument that it is the only forward-looking thing here. Her
              order settles it differently and better: the page runs from where the record stands,
              to what to add next time, to what you are carrying, to signing off - and this is
              private prep for a conversation, which is a different job from reading your record.
              It is fine at the bottom, and putting it high pushed the reading down the page.
            */}
            {(report as any)?.postReportGuide && (
              <WhatToWalkInWith guide={(report as any).postReportGuide} />
            )}
          </div>
        )}

        {/* REPORT TAB */}
        {tab === 'report' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/*
              A SHARED REPORT NEEDS TWO PEOPLE, AND THE PAGE SAYS SO. A check-in with one person on it
              can never release one - the rule refuses outright below two - and the page said
              "forming" for ever. The truth, and who can change it (fix plan B17).
            */}
            {whoIsInRound((ground.participants ?? []) as any[], (ground as any).sessionProgress?.sessionNumber ?? 1, (ground as any).scenario).length < 2 && (
              <div role="status" style={{ background: 'var(--gw-amber-bg)', border: '1px solid var(--gw-amber-b)', borderRadius: 10, padding: '12px 14px', fontSize: 13, color: 'var(--gw-amber-t)', lineHeight: 1.6 }}>
                The shared report compares two accounts. {isInitiator ? 'Add somebody and this will build.' : 'It will build once the person running this check-in adds somebody.'} Your own record is yours to read in the meantime.
              </div>
            )}

            <SharedReportForAParty
              groundId={id!}
              report={report}
              ground={ground}
              onOpenBoard={() => navigate(`/grounds/${id}/board`)}
              /* Per-session specificity on the row it is about. Same read as the bars above it on
                 My record; here it is the words, because a row is a line of text. */
              specificityBySession={Object.fromEntries(((specificity?.scores ?? []) as number[]).map((v, i) => [i + 1, v]))}
              viewerUserId={user?.id}
            />
          </div>
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
        {tab === 'settings' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
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
            <div style={{ order: 0, fontSize: 13, fontWeight: 700, color: 'var(--gw-text)', marginBottom: 4 }}>Setup</div>

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

      {/* Paywall overlay */}
      {showPaywall && (
        <div
          role="dialog" aria-modal="true" aria-label="Your session is complete"
          onKeyDown={e => { if (e.key === 'Escape') setShowPaywall(false) }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(10,22,40,0.55)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px' }}
        >
          {/* Opened programmatically, so focus was left behind the scrim: a keyboard or screen-reader user was
              dropped into a modal they were never told about and could tab out of into an inert page. */}
          <div tabIndex={-1} ref={el => el?.focus()} style={{ background: 'white', borderRadius: 12, padding: 24, maxWidth: 400, width: '100%', maxHeight: '90vh', overflowY: 'auto', outline: 'none' }}>

            {canPayHere ? (
              <>
                <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--gw-dark)', marginBottom: 4 }}>Your session is complete.</div>
                <div style={{ fontSize: 13, color: 'var(--gw-sub)', marginBottom: 20, lineHeight: 1.6 }}>
                  Did Groundwork help your team move forward? Choose what works best for you.
                </div>

                {/* Tier 1: Free extension. */}
                {paywallFreeExtensionAvailable && (
                  <div style={{ border: '1px solid var(--gw-green-b-soft)', borderRadius: 10, padding: '14px 16px', marginBottom: 12, background: 'var(--gw-green-bg)' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--gw-green-t)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>Add one more free session</div>
                    <div style={{ fontSize: 13, color: 'var(--gw-text)', lineHeight: 1.6, marginBottom: 12 }}>
                      Not ready to pay yet? Keep using Groundwork until you are confident it is delivering value. Add another free session and continue your Check-in.
                    </div>
                    <button
                      onClick={() => claimFreeExtensionMut.mutate()}
                      disabled={claimFreeExtensionMut.isPending}
                      style={{ width: '100%', padding: '10px', borderRadius: 7, background: 'var(--gw-green-t)', color: 'white', fontSize: 13, fontWeight: 700, border: 'none', cursor: claimFreeExtensionMut.isPending ? 'wait' : 'pointer', fontFamily: 'inherit', opacity: claimFreeExtensionMut.isPending ? 0.7 : 1 }}
                    >
                      {claimFreeExtensionMut.isPending ? 'Adding...' : 'Continue for free'}
                    </button>
                  </div>
                )}

                {/* Tier 2 was "Buy a session ($5)". Removed: there is no
                    per-session billing. What remains is the free extension
                    above and the org subscription below. */}

                {/* Tier 3: Upgrade org */}
                <div style={{ border: '1px solid var(--gw-border)', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--gw-navy)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>Upgrade organisation</div>
                  <div style={{ fontSize: 13, color: 'var(--gw-text)', lineHeight: 1.6, marginBottom: 12 }}>
                    Your team is getting value from Groundwork. Unlock unlimited check-ins and unlimited sessions for everyone in your organisation with one simple monthly subscription.
                  </div>
                  <button
                    onClick={() => createSubscriptionMut.mutate('STARTER')}
                    disabled={createSubscriptionMut.isPending}
                    style={{ width: '100%', padding: '10px', borderRadius: 7, background: 'var(--gw-navy)', color: 'white', fontSize: 13, fontWeight: 700, border: 'none', cursor: createSubscriptionMut.isPending ? 'wait' : 'pointer', fontFamily: 'inherit', opacity: createSubscriptionMut.isPending ? 0.7 : 1, marginBottom: 8 }}
                  >
                    {createSubscriptionMut.isPending ? 'Redirecting...' : 'Upgrade organisation'}
                  </button>
                  <button
                    onClick={() => navigate('/pricing')}
                    style={{ width: '100%', padding: '8px', borderRadius: 7, background: 'none', color: 'var(--gw-navy)', fontSize: 12, fontWeight: 600, border: '1px solid var(--gw-border)', cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    View all plans
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* THE TRUE FACT AND NOTHING MORE. This said "Your initiator has been notified" - and nothing
                    notified the initiator; the sentence was the only occurrence of the idea in the repository.
                    The server does tell the organisation's admins when the gate refuses (tellAnAdminToAddACard),
                    and they are the people who can act, so that is what is said. */}
                <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--gw-dark)', marginBottom: 8 }}>Session needed to continue</div>
                <div style={{ background: 'var(--gw-paper-2)', borderRadius: 8, padding: '12px 14px', marginBottom: 14, fontSize: 13, color: 'var(--gw-sub-d)', lineHeight: 1.6 }}>
                  Only an organisation admin can add sessions. We have told them you are waiting.
                </div>
              </>
            )}

            {/* Access code: an admin/lead instrument for bypassing a
                payment block. It used to render for everyone, sending plain
                participants hunting for a code they were never issued. */}
            {canPayHere && (
            <div style={{ borderTop: '1px solid var(--gw-border)', paddingTop: 14 }}>
              <div style={{ fontSize: 12, color: 'var(--gw-muted)', marginBottom: 8 }}>Have an access code?</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  value={paywallCode}
                  onChange={e => { setPaywallCode(e.target.value); setPaywallCodeMsg(null) }}
                  placeholder="Enter code"
                  style={{ flex: 1, padding: '9px 11px', fontSize: 13, fontFamily: 'inherit', border: `1px solid ${paywallCodeMsg && !paywallCodeMsg.ok ? 'var(--gw-danger)' : 'var(--gw-border)'}`, borderRadius: 7, background: 'var(--gw-paper-2)', color: 'var(--gw-dark)', outline: 'none' }}
                />
                <button
                  onClick={() => redeemPaywallCode.mutate()}
                  disabled={!paywallCode.trim() || redeemPaywallCode.isPending}
                  style={{ padding: '9px 14px', borderRadius: 7, background: 'var(--gw-navy)', color: 'white', fontSize: 13, fontWeight: 600, border: 'none', cursor: !paywallCode.trim() ? 'not-allowed' : 'pointer', opacity: !paywallCode.trim() ? 0.45 : 1, fontFamily: 'inherit', whiteSpace: 'nowrap' }}
                >
                  {redeemPaywallCode.isPending ? 'Checking...' : 'Apply'}
                </button>
              </div>
              {paywallCodeMsg && (
                <div style={{ fontSize: 12, color: paywallCodeMsg.ok ? 'var(--gw-green-t)' : 'var(--gw-danger)', marginTop: 6 }}>{paywallCodeMsg.text}</div>
              )}
            </div>
            )}

            <button
              onClick={() => setShowPaywall(false)}
              style={{ marginTop: 14, background: 'none', border: 'none', fontSize: 12, color: 'var(--gw-muted)', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}
            >
              Not now
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
