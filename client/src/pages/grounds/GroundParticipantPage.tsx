import { plannedSessionsFor } from '@/lib/sessionCount'
import { useEffect, useRef, useState } from 'react'
import { GroundGone } from '@/components/gw/GroundGone'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { groundsApi } from '@/api/grounds'
import { billingApi } from '@/api/billing'
import { useAuthStore } from '@/stores/auth'
import { reportsApi } from '@/api/reports'
import { documentsApi } from '@/api/documents'
import { GroundChat } from '@/components/gw/GroundChat'
import { whatThisGroundCanTellYou } from '@/lib/contextStrength'
import { ContextStrength } from '@/components/gw/ContextStrength'
import { Sec } from '@/components/gw/kit'
import { apiClient } from '@/api/client'
import { participantLabel } from '@/lib/utils'
import { alignmentLabel } from '@/lib/alignment'
import { toast } from 'sonner'
import { ResolutionPanel } from '@/components/gw/ResolutionPanel'





/**
 * The card view's helpers - a relative-time formatter and the specificity quality
 * badge - went with it. The record tab carries the specificity read now, and the
 * conversation dates its own sessions on the dividers.
 */

type Tab = 'checkin' | 'record' | 'report' | 'docs' | 'board' | 'settings'

export function GroundParticipantPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [tab, setTab] = useState<Tab>('checkin')
  const [showPaywall, setShowPaywall] = useState(false)
  const [paywallFreeExtensionAvailable, setPaywallFreeExtensionAvailable] = useState(false)
  const [paywallCode, setPaywallCode] = useState('')
  const [paywallCodeMsg, setPaywallCodeMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [showShareConfirm, setShowShareConfirm] = useState(false)

  const user = useAuthStore(s => s.user)

  const { data: ground, isLoading } = useQuery({
    queryKey: ['ground', id],
    queryFn: () => groundsApi.get(id!),
    enabled: !!id,
  })

  const { data: report } = useQuery({
    queryKey: ['report', id],
    queryFn: () => reportsApi.get(id!),
    enabled: !!id,
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
    enabled: !!id && tab === 'report',
    retry: false,
  })

  const setSoloSharedMut = useMutation({
    mutationFn: (shared: boolean) => groundsApi.setMySoloReportShared(id!, shared),
    onSuccess: () => {
      refetchSoloReport()
      setShowShareConfirm(false)
    },
    onError: () => toast.error('Could not update. Try again.'),
  })

  // Explicit "my account is accurate" confirmation - the deadline for
  // corrections, in place of a timer. Does not block later corrections; it
  // just flags any that come after as "updated after sign-off" on the shared
  // report (see reportsApi.get()'s `updates` field / SoloArtifactBlock above).
  const signOffMut = useMutation({
    mutationFn: () => groundsApi.signOff(id!),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ground', id] }),
    onError: () => toast.error('Could not sign off. Try again.'),
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
    onError: () => toast.error('Could not start session. Try again.'),
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
    onError: () => toast.error('Could not claim free session. Try again.'),
  })

  const createSubscriptionMut = useMutation({
    mutationFn: (plan: string) => billingApi.createSubscription(plan as any),
    onSuccess: r => { if (r.checkoutUrl) window.location.href = r.checkoutUrl },
    onError: () => toast.error('Could not start checkout. Try again.'),
  })

  const activateMutation = useMutation({
    mutationFn: () => reportsApi.activate(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['report', id] })
      toast.success('Report revealed')
      setTab('report')
    },
    onError: () => toast.error('Could not activate. Try again.'),
  })

  const { data: docs = [] } = useQuery({
    queryKey: ['docs', id],
    queryFn: () => documentsApi.list(id!),
    enabled: !!id && tab === 'docs',
  })

  const uploadDoc = useMutation({
    mutationFn: (file: File) => documentsApi.upload(id!, file),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['docs', id] }),
    onError: () => toast.error('Upload failed.'),
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

  if (isLoading) return <div style={{ minHeight: '100vh', background: '#F5F3EF', padding: 24, fontSize: 13, color: '#9B9590' }}>Loading…</div>
  // Was the bare words "Ground not found." with nothing to press, in two hardcoded
  // colours of its own. W8-65.
  if (!ground) return <div style={{ minHeight: '100vh', background: 'var(--gw-bg)' }}><GroundGone /></div>

  const myParticipant = (ground.participants ?? []).find((p: any) => p.userId === user?.id)
  /** Whether this person runs the ground, and so has an admin view to switch to. */
  const isInitiator = myParticipant?.partyType === 'INITIATOR'

  if (!myParticipant) {
    return (
      <div style={{ minHeight: '100vh', background: '#F5F3EF', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ maxWidth: 400, textAlign: 'center' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#1A1916', marginBottom: 8 }}>Account not linked</div>
          <div style={{ fontSize: 13, color: '#6B6560', lineHeight: 1.65, marginBottom: 20 }}>
            Your account is not linked to this ground. Please contact the ground admin.
          </div>
          <button onClick={() => navigate('/grounds')} style={{ fontSize: 13, color: '#0C447C', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontFamily: 'inherit' }}>
            Back to grounds
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
  // the ground carries. Previously this fell back to a hardcoded 6, so a
  // 90-day monthly ground (really 3 sessions) displayed "of 6".
  // Same rule as everywhere else now - see lib/sessionCount, which the server's
  // totalSessionsFor is the authority for. This page already rounded down; the
  // admin page and sidebar rounded up, and a ground could never call itself
  // finished as a result.
  const totalSessions =
    plannedSessionsFor((ground as any).timelineDays, (ground as any).cadence, (ground as any).totalSessions) ?? 6

  /**
   * THE SAME CONTEXT READ THE LEAD SEES. G25 on this page, G26 as the reason.
   *
   * "One context page per ground, the same page for everyone, with the closed part
   * visibly absent rather than silently missing." It was on the admin page only, so
   * a participant opening Context got a file picker and no idea what the ground
   * could do with what they gave it. Same function, same inputs, same component.
   */
  const contextStrength = ground ? whatThisGroundCanTellYou({
    partyCount: (ground.participants ?? []).filter((p: any) => !p.managingOnly).length,
    hasSuccessDefinition: !!(ground as any).brief?.trim(),
    conditionCount: 0,
    hasBaseline: false,
    perPersonObjectiveCount: ((ground as any).objectives ?? []).length,
    openDocumentCount: (docs ?? []).filter((d: any) => d.visibility === 'OPEN').length,
    peopleWorkTogether: (ground as any).peopleWorkTogether !== false,
    plannedSessions: totalSessions ?? 1,
  }) : null

  /**
   * The signal feed, the alignment read, the last-completed shortcut and the
   * specificity scores all belonged to the card view. They went with it - see the
   * commit; the conversation carries the history now, and the record tab carries
   * the numbers.
   */

  const tabs: { key: Tab; label: string }[] = [
    { key: 'checkin', label: 'Check-in' },
    { key: 'record', label: 'My record' },
    { key: 'report', label: 'Report' },
    { key: 'docs', label: contextEnabled ? 'Context' : 'Documents' },
    { key: 'settings', label: 'Settings' },
  ]
  // The server decides whether a ground has a board (`boardRenders`); the client
  // does not keep a second copy of the routing table.
  if ((ground as any).boardRenders) {
    tabs.splice(tabs.length - 1, 0, { key: 'board', label: 'Team board' })
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F5F3EF', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: '#F5F3EF', borderBottom: '1px solid #E2E0DB' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px' }}>
          <span onClick={() => navigate('/grounds')} style={{ fontSize: 13, color: '#9B9590', cursor: 'pointer', flexShrink: 0 }}>← Grounds</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#1A1916', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ground.label}</div>
            <div style={{ fontSize: 11, color: '#9B9590' }}>Your contribution to this ground is yours until the report releases.</div>
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
          {isInitiator && (
            <button
              onClick={() => navigate(`/grounds/${id}`)}
              style={{ flexShrink: 0, fontSize: 11, fontWeight: 700, padding: '5px 11px', borderRadius: 20, background: 'white', color: '#0C447C', border: '1px solid #0C447C', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Admin view →
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
        <div style={{ display: 'flex', borderTop: '1px solid #E2E0DB', overflowX: 'auto' }}>
          {tabs.map(t => (
            <button key={t.key}
              // The board is its own page with its own data and its own writes, so
              // its tab navigates rather than switching a panel. Everything else is
              // a panel of this page.
              onClick={() => (t.key === 'board' ? navigate(`/grounds/${id}/board`) : setTab(t.key))}
              style={{
                flex: '0 0 auto', padding: '10px 16px', fontSize: 12, fontWeight: tab === t.key ? 700 : 500,
                color: tab === t.key ? '#0C447C' : '#6B6560', background: 'none', border: 'none',
                borderBottom: tab === t.key ? '2px solid #0C447C' : '2px solid transparent',
                cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
              }}
            >{t.label}</button>
          ))}
        </div>
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
            onOpenSession={() => dueNow && probeSession.mutate(openCheckIn)}
            openPending={probeSession.isPending}
            label={ground.label}
            scenario={(ground as any).scenario}
            brief={(ground as any).brief}
            alignment={alignmentLabel((ground as any).alignment)}
            sessionsDone={completedCheckIns.length}
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/*
              THE EXIT BELONGS AT THE EXIT, ON THIS PAGE TOO. W8-5, half-fixed.

              I gated this on the admin page and marked the item done. Here it
              stayed unconditional and first, so "My record" opened with "Each
              person picks the outcome they think the record supports. The ground
              closes only when everyone picks the same one, and nobody closes it
              alone" - above four buttons including one that stops the project - on
              a ground with one session done. Hafsah found it in the same words she
              used the first time.

              Same rule as the admin page: near the end, or already started.
            */}
            {id && ((totalSessions != null && completedCheckIns.length >= totalSessions - 1) || (ground as any).resolutionState) && (
              <ResolutionPanel groundId={id} />
            )}

            {/* The empty state, and NO price.
                `insightsLocked` does not mean "unpaid" - it means "no completed
                session yet", and the server says so: the first session of every
                ground is free, so there is no billing gate here at all. A
                monthly-subscription button had been attached to that empty
                state anyway, shown to the one person who has contributed
                nothing and is deciding whether to begin - and wired to a
                ONE-OFF purchase call, so the label was wrong twice over.
                Participants are never charged. The state is real; the price
                was scaffolding. */}
            {myRecord?.insightsLocked !== false && (
              <div style={{ background: '#0C447C', borderRadius: 10, padding: '18px 20px' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'white', marginBottom: 6 }}>Your record insights</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,.75)', lineHeight: 1.6 }}>
                  Complete your first check-in to start building your record. Your specificity trend,
                  confidence score, and observations across sessions appear here as you go.
                </div>
              </div>
            )}

            {/* Session history summary - always visible */}
            {(myRecord?.sessions ?? []).length > 0 && (
              <div style={{ background: 'white', border: '1px solid #E2E0DB', borderRadius: 10, padding: '14px 16px' }}>
                <Sec title="Sessions on record" />
                {(myRecord?.sessions ?? []).map(s => (
                  <div key={s.sessionNumber} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderTop: '1px solid #F0EEE9' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1916' }}>Session {s.sessionNumber}</div>
                    <div style={{ fontSize: 11, color: s.status === 'COMPLETED' ? '#085041' : '#9B9590', fontWeight: s.status === 'COMPLETED' ? 700 : 500 }}>
                      {s.status === 'COMPLETED' ? (s.completedAt ? new Date(s.completedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Complete') : 'In progress'}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Specificity trend - unlocked only */}
            {myRecord && !myRecord.insightsLocked && myRecord.specificity && (
              <div style={{ background: 'white', border: '1px solid #E2E0DB', borderRadius: 10, padding: '14px 16px' }}>
                <Sec title="Specificity across sessions" />
                <div style={{ display: 'flex', gap: 3, marginBottom: 8 }}>
                  {myRecord.specificity.scores.map((s, i) => (
                    <div key={i} title={`Session ${i + 1}`} style={{ flex: 1, height: 6, borderRadius: 3, background: s >= 0.65 ? '#5DCAA5' : s >= 0.35 ? '#E8A94A' : '#E2E0DB' }} />
                  ))}
                </div>
                <div style={{ fontSize: 12, color: '#6B6560', lineHeight: 1.5 }}>
                  {myRecord.specificity.label === 'high'
                    ? 'Your record is consistently specific and evidenced. It carries strong weight.'
                    : myRecord.specificity.label === 'moderate'
                      ? 'Good detail in places. Adding specific examples in your next session strengthens the picture.'
                      : 'Your record is building. Specificity grows with each check-in.'}
                </div>
              </div>
            )}

            {/* Confidence score - unlocked only */}
            {myRecord && !myRecord.insightsLocked && myRecord.confidence && (
              <div style={{ background: 'white', border: '1px solid #E2E0DB', borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Sec title="Record confidence" />
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#0C447C' }}>{myRecord.confidence.label}</div>
                </div>
                <div style={{ display: 'flex', gap: 3, marginBottom: 8 }}>
                  {[1,2,3,4,5].map(i => (
                    <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= myRecord.confidence!.score ? '#0C447C' : '#E2E0DB' }} />
                  ))}
                </div>
                <div style={{ fontSize: 12, color: '#6B6560', lineHeight: 1.5 }}>{myRecord.confidence.description}</div>
              </div>
            )}

            {/* Pattern observations - unlocked, diplomatic */}
            {myRecord && !myRecord.insightsLocked && myRecord.patterns && myRecord.patterns.length > 0 && (
              <div style={{ background: 'white', border: '1px solid #E2E0DB', borderRadius: 10, padding: '14px 16px' }}>
                <Sec title="Observations from your record" />
                <div style={{ fontSize: 12, color: '#9B9590', marginBottom: 10, lineHeight: 1.5 }}>
                  These are patterns Groundwork has noticed across your check-ins. They are observations, not verdicts. Worth being aware of as your record builds.
                </div>
                {myRecord.patterns.map((p, i) => (
                  <div key={i} style={{ padding: '10px 0', borderTop: i === 0 ? '1px solid #F0EEE9' : '1px solid #F0EEE9', fontSize: 13, color: '#3A3630', lineHeight: 1.6 }}>
                    {p.observation}
                    {p.sessionNumber && <span style={{ display: 'block', fontSize: 11, color: '#9B9590', marginTop: 3 }}>First noticed in Session {p.sessionNumber}</span>}
                  </div>
                ))}
              </div>
            )}

            {myRecord && !myRecord.insightsLocked && (!myRecord.patterns || myRecord.patterns.length === 0) && (
              <div style={{ background: '#F5F3EF', border: '1px solid #E2E0DB', borderRadius: 10, padding: '14px 16px', fontSize: 12, color: '#9B9590', lineHeight: 1.6 }}>
                No patterns have surfaced yet. Patterns appear after they have been observed across multiple sessions. This is intentional.
              </div>
            )}
          </div>
        )}

        {/* REPORT TAB */}
        {tab === 'report' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

            {/* Individual report section */}
            <div style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: '#9B9590', fontWeight: 700, marginBottom: 2 }}>Your private report</div>
            <div style={{ fontSize: 12, color: '#6B6560', lineHeight: 1.6, marginBottom: 4 }}>
              This is from your own check-in only. Only you can see it unless you choose to share it.
            </div>
            {mySoloReport?.report ? (
              <div style={{ background: '#0A1628', color: 'white', borderRadius: 10, padding: '16px 18px', marginBottom: 6 }}>
                {Object.entries(mySoloReport.report as Record<string, unknown>).map(([key, val]) => {
                  if (!val || (Array.isArray(val) && val.length === 0)) return null
                  const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())
                  return (
                    <div key={key} style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,.45)', fontWeight: 700, marginBottom: 4 }}>{label}</div>
                      {Array.isArray(val)
                        ? <ul style={{ margin: 0, paddingLeft: 16 }}>{(val as string[]).map((v, i) => <li key={i} style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 3 }}>{v}</li>)}</ul>
                        : <div style={{ fontSize: 13, lineHeight: 1.65 }}>{String(val)}</div>
                      }
                    </div>
                  )
                })}
                <div style={{ borderTop: '1px solid rgba(255,255,255,.1)', paddingTop: 12, marginTop: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,.4)' }}>
                    {mySoloReport.shared
                      ? 'Shared with all parties on this ground'
                      : 'Private - only you can see this'}
                  </div>
                  <button
                    onClick={() => mySoloReport.shared ? setSoloSharedMut.mutate(false) : setShowShareConfirm(true)}
                    disabled={setSoloSharedMut.isPending}
                    style={{ padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600, border: '1px solid rgba(255,255,255,.2)', background: 'rgba(255,255,255,.08)', color: 'white', cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    {mySoloReport.shared ? 'Stop sharing' : 'Share with all parties'}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ background: 'white', border: '1px solid #E2E0DB', borderRadius: 10, padding: 20, textAlign: 'center', marginBottom: 6 }}>
                <div style={{ fontSize: 13, color: '#9B9590' }}>Your private report is not ready yet.</div>
                <div style={{ fontSize: 12, color: '#9B9590', marginTop: 4 }}>It generates once you complete your check-in.</div>
              </div>
            )}

            {/* Sign-off: the deadline for corrections, in place of a timer.
                Does not block later corrections - it just flags any that come
                after as "updated after sign-off" on the shared report. */}
            {mySoloReport?.report && (
              <div style={{ background: '#F5F3EF', border: '1px solid #E2E0DB', borderRadius: 10, padding: '14px 16px', marginBottom: 6 }}>
                {myParticipant?.signedOffAt ? (
                  <div style={{ fontSize: 12, color: '#3A7A60', fontWeight: 600 }}>
                    You signed off on {new Date(myParticipant.signedOffAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.
                    {' '}You can still correct it, but it will show as updated after sign-off.
                  </div>
                ) : (
                  <>
                    <div style={{ fontSize: 12, color: '#6B6560', lineHeight: 1.55, marginBottom: 8 }}>
                      Confirm your account is accurate. This isn't a lock - you can still correct it later - but any correction after sign-off is flagged on the shared report.
                    </div>
                    <button
                      onClick={() => signOffMut.mutate()}
                      disabled={signOffMut.isPending}
                      style={{ padding: '8px 14px', borderRadius: 7, background: '#0C447C', color: 'white', fontSize: 12.5, fontWeight: 700, border: 'none', cursor: signOffMut.isPending ? 'wait' : 'pointer', fontFamily: 'inherit', opacity: signOffMut.isPending ? 0.6 : 1 }}
                    >
                      {signOffMut.isPending ? 'Signing off…' : "Sign off - this is accurate"}
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Divider */}
            <div style={{ borderTop: '1px solid #E2E0DB', margin: '6px 0' }} />
            <div style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: '#9B9590', fontWeight: 700, marginBottom: 2 }}>Shared report</div>
            <div style={{ fontSize: 12, color: '#9B9590', lineHeight: 1.6, marginBottom: 4 }}>
              Shows where your account and the other party's account agree or differ. It does not quote anyone.
            </div>

            {!report ? (
              <div style={{ background: 'white', border: '1px solid #E2E0DB', borderRadius: 10, padding: 24, textAlign: 'center' }}>
                <div style={{ fontSize: 13, color: '#9B9590', marginBottom: 4 }}>
                  {ground?.sessionProgress
                    ? `Report pending - ${ground.sessionProgress.completed} of ${ground.sessionProgress.total} checked in`
                    : 'No report yet.'}
                </div>
                <div style={{ fontSize: 12, color: '#9B9590' }}>
                  {ground?.sessionProgress?.requestingUserIsMissing
                    ? "You haven't completed this round yet - that's part of what's holding the report."
                    : 'The report generates once all parties have checked in.'}
                </div>
              </div>
            ) : !report.releasedAt ? (
              <div style={{ background: '#EEF4FB', border: '1px solid #BFDBFE', borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0C447C', marginBottom: 4 }}>
                  {(report as any)?.forming ? 'A picture is forming' : 'Report is being prepared'}
                </div>
                <div style={{ fontSize: 12, color: '#4A6A9A', lineHeight: 1.6, marginBottom: (report as any)?.forming ? 10 : 0 }}>
                  {(report as any)?.forming
                    ? 'Not everyone has checked in yet, so this is not final - but you can see what has emerged so far. It never fabricates agreement, only what is actually known.'
                    : 'Your report will be available once it is released.'}
                </div>
                {(report as any)?.forming && (
                  <button
                    onClick={() => navigate(`/grounds/${id}/report`)}
                    style={{ fontSize: 12, fontWeight: 700, color: '#0C447C', background: 'white', border: '1px solid #BFDBFE', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    View the forming picture →
                  </button>
                )}
              </div>
            ) : !report.activated ? (
              <div style={{ background: 'white', border: '1px solid #E2E0DB', borderRadius: 10, padding: '16px 18px', textAlign: 'center' }}>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>The shared report is ready</div>
                <div style={{ fontSize: 13, color: '#6B6560', lineHeight: 1.65, marginBottom: 8 }}>
                  All parties reveal it at the same time. Once unlocked, everyone can read it - this cannot be undone.
                </div>
                <div style={{ fontSize: 12, color: '#9B9590', lineHeight: 1.55, marginBottom: 16, background: '#F5F3EF', borderRadius: 8, padding: '8px 12px' }}>
                  The report shows where accounts agree and where they differ. It does not quote anyone.
                </div>
                <button
                  onClick={() => activateMutation.mutate()}
                  disabled={activateMutation.isPending}
                  style={{ padding: '11px 28px', borderRadius: 8, background: '#0C447C', color: 'white', fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit', opacity: activateMutation.isPending ? 0.6 : 1 }}
                >
                  {activateMutation.isPending ? 'Confirming…' : 'Reveal report'}
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={() => navigate(`/grounds/${id}/report`)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%',
                    background: '#0A1628', color: 'white', border: 'none', borderRadius: 10,
                    padding: '12px 16px', cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 700 }}>
                    {(report as any).forming ? 'View the forming report (Venn view)' : 'View the full shared report (Venn view)'}
                  </span>
                  <span style={{ fontSize: 13 }}>→</span>
                </button>

                {/* Participant report sections */}
                {report.pattern && (
                  <div style={{ background: '#0A1628', color: 'white', borderRadius: 10, padding: '14px 16px' }}>
                    <div style={{ fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,.45)', fontWeight: 700, marginBottom: 8 }}>What your record reveals</div>
                    <div style={{ fontSize: 13, lineHeight: 1.65 }}>{report.pattern}</div>
                  </div>
                )}
                {(report.assumptions ?? []).length > 0 && (
                  <div style={{ background: 'white', border: '1px solid #E2E0DB', borderRadius: 10, padding: '13px 16px' }}>
                    <div style={{ fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase', color: '#9B9590', fontWeight: 700, marginBottom: 8 }}>Assumptions you are carrying</div>
                    <ul style={{ listStyle: 'disc', paddingLeft: 18, margin: 0 }}>
                      {(report.assumptions ?? []).map((a: string, i: number) => <li key={i} style={{ fontSize: 13, lineHeight: 1.65, marginBottom: 5 }}>{a}</li>)}
                    </ul>
                  </div>
                )}
                {(report.clarity ?? []).length > 0 && (
                  <div style={{ background: '#EEF4FB', border: '1px solid #BFDBFE', borderRadius: 10, padding: '13px 16px' }}>
                    <div style={{ fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase', color: '#0C447C', fontWeight: 700, marginBottom: 8 }}>Where you have clarity</div>
                    <ul style={{ listStyle: 'disc', paddingLeft: 18, margin: 0 }}>
                      {(report.clarity ?? []).map((c: string, i: number) => <li key={i} style={{ fontSize: 13, lineHeight: 1.65, marginBottom: 5 }}>{c}</li>)}
                    </ul>
                  </div>
                )}

                {/* Cross-reference section (shared picture, after activation) */}
                {(report.alignmentReached ?? []).length > 0 && (
                  <div style={{ background: '#E7F6EF', border: '1px solid #B6E8D4', borderRadius: 10, padding: '13px 16px' }}>
                    <div style={{ fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase', color: '#085041', fontWeight: 700, marginBottom: 10 }}>Shared picture: where you are aligned</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {(report.alignmentReached ?? []).map((a: any, i: number) => (
                        <div key={i} style={{ borderLeft: '3px solid #5DCAA5', paddingLeft: 10 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#085041' }}>{a.title ?? a}</div>
                          {a.note && <div style={{ fontSize: 12, color: '#3A7A60', lineHeight: 1.5, marginTop: 2 }}>{a.note}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {(report.areasRequiringAlignment ?? []).length > 0 && (
                  <div style={{ background: 'white', border: '1px solid #E2E0DB', borderRadius: 10, padding: '13px 16px' }}>
                    <div style={{ fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase', color: '#9B9590', fontWeight: 700, marginBottom: 10 }}>Shared picture: still to resolve</div>
                    <div style={{ fontSize: 11, color: '#9B9590', marginBottom: 10, lineHeight: 1.5 }}>These gaps appear in the cross-reference. They show where your account and the other party's account differ. Neither side's raw words are shown here.</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {(report.areasRequiringAlignment ?? []).map((a: any, i: number) => (
                        <div key={i} style={{ borderLeft: '3px solid #E8A94A', paddingLeft: 10 }}>
                          <div style={{ fontSize: 13, fontWeight: 700 }}>{a.title ?? a}</div>
                          {a.observation && <div style={{ fontSize: 12, color: '#6B6560', lineHeight: 1.5, marginTop: 2 }}>{a.observation}</div>}
                          {a.recommendedMove && (
                            <div style={{ fontSize: 12, color: '#0C447C', fontWeight: 600, marginTop: 4 }}>Next: {a.recommendedMove}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ background: '#F5F3EF', border: '1px solid #E2E0DB', borderRadius: 8, padding: '10px 13px' }}>
                  <div style={{ fontSize: 11, color: '#9B9590', lineHeight: 1.6 }}>
                    This report shows where both accounts agree and where they differ. The other party's exact words are never visible to you, and yours are never visible to them.
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* DOCUMENTS TAB */}
        {tab === 'docs' && (
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1A1916', marginBottom: 10 }}>{contextEnabled ? 'Context' : 'Documents'}</div>

            {/* G25 + G26: what the ground can tell you, and an honest line about the
                part of context that is the lead's. */}
            {contextEnabled && contextStrength && (
              <ContextStrength read={contextStrength} closedNote={!isInitiator} />
            )}
            <div style={{ fontSize: 12, color: '#9B9590', lineHeight: 1.6, marginBottom: 14, background: 'white', borderRadius: 8, padding: '10px 12px', border: '1px solid #E2E0DB' }}>
              {contextEnabled
                ? "This is where the background lives. Anything the lead has opened to the ground appears here, and your check-in has read it. What you upload is yours until the report is released, and it shapes the questions you get asked."
                : "Documents the admin has shared appear here. Your uploads are part of your contribution to this ground's record until the report is released."}
            </div>

            <div style={{ fontSize: 11, color: '#9B9590', marginBottom: 10, lineHeight: 1.6 }}>
              Your uploads are private. Everyone's documents are cross-referenced when the report is released.
            </div>

            <div
              style={{ border: '1.5px dashed #E2E0DB', borderRadius: 8, padding: 16, textAlign: 'center', cursor: 'pointer', marginBottom: 12, background: 'white' }}
              onClick={() => document.getElementById('gp-doc-upload')?.click()}
            >
              <div style={{ fontSize: 13, fontWeight: 600, color: '#0C447C' }}>Upload a supporting document</div>
              <div style={{ fontSize: 12, color: '#9B9590', marginTop: 3 }}>PDF, DOCX, JPEG, PNG</div>
              <input type="file" id="gp-doc-upload" style={{ display: 'none' }} accept=".pdf,.docx,.jpeg,.jpg,.png"
                onChange={e => { const f = e.target.files?.[0]; if (f) uploadDoc.mutate(f); e.target.value = '' }} />
            </div>

            {docs.length === 0 ? (
              <div style={{ fontSize: 13, color: '#9B9590', textAlign: 'center', padding: 20, background: 'white', borderRadius: 8, border: '1px solid #E2E0DB' }}>
                No documents yet.
              </div>
            ) : (
              docs.map((doc: any) => (
                <div key={doc.id} style={{ background: 'white', border: '1px solid #E2E0DB', borderRadius: 8, padding: '11px 14px', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{doc.name}</div>
                    <div style={{ fontSize: 11, color: '#9B9590', marginTop: 2 }}>{new Date(doc.uploadedAt).toLocaleDateString()}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* SETTINGS TAB */}
        {tab === 'settings' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1A1916', marginBottom: 4 }}>Settings</div>

            {/* Profile summary */}
            <div style={{ background: 'white', border: '1px solid #E2E0DB', borderRadius: 10, padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#0C447C', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 16, fontWeight: 800, flexShrink: 0 }}>
                {(user?.firstName?.[0] ?? '?').toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#1A1916' }}>{user?.firstName} {user?.lastName}</div>
                <div style={{ fontSize: 12, color: '#9B9590' }}>{user?.email}</div>
              </div>
            </div>

            <div style={{ background: 'white', border: '1px solid #E2E0DB', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ padding: '13px 16px', borderBottom: '1px solid #F0EEE9' }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>Ground</div>
                <div style={{ fontSize: 12, color: '#9B9590' }}>{ground.label}</div>
              </div>
              <div style={{ padding: '13px 16px', borderBottom: '1px solid #F0EEE9' }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>Scenario</div>
                <div style={{ fontSize: 12, color: '#9B9590' }}>{ground.scenario?.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c: string) => c.toUpperCase())}</div>
              </div>
              <div style={{ padding: '13px 16px', borderBottom: '1px solid #F0EEE9' }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>Your role</div>
                <div style={{ fontSize: 12, color: '#9B9590' }}>{myParticipant?.roleAsDescribed ?? 'In this ground'}</div>
              </div>
              <div style={{ padding: '13px 16px', borderBottom: '1px solid #F0EEE9' }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>Status</div>
                <div style={{ fontSize: 12, color: '#9B9590' }}>{ground.status}</div>
              </div>
              <div style={{ padding: '13px 16px' }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>Sessions completed</div>
                <div style={{ fontSize: 12, color: '#9B9590' }}>{completedCheckIns.length} of {totalSessions}</div>
              </div>
            </div>

            {specificity && (
              <div style={{ background: 'white', border: '1px solid #E2E0DB', borderRadius: 10, padding: '13px 16px' }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Record quality</div>
                <div style={{ fontSize: 12, color: '#6B6560', lineHeight: 1.6 }}>
                  Overall quality label: <strong style={{ color: '#1A1916' }}>{specificity.label}</strong>.
                  This reflects how specific and evidenced your submissions have been across all sessions.
                  Specific, verifiable contributions strengthen the cross-reference and make the final report more useful to everybody in this ground.
                </div>
              </div>
            )}

            <div style={{ background: '#F8ECEA', border: '1px solid #EDD0CB', borderRadius: 10, padding: '13px 16px' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#B5675A', marginBottom: 4 }}>Privacy reminder</div>
              <div style={{ fontSize: 12, color: '#7A4A44', lineHeight: 1.6 }}>
                Your check-in answers are never visible to the other party. They are stored privately and only cross-referenced at the point of report generation. Neither party can read the other's raw account at any time.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Paywall overlay */}
      {showPaywall && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,22,40,0.55)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px' }}>
          <div style={{ background: 'white', borderRadius: 12, padding: 24, maxWidth: 400, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>

            {myParticipant?.partyType === 'INITIATOR' ? (
              <>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#0A1628', marginBottom: 4 }}>Your session is complete.</div>
                <div style={{ fontSize: 13, color: '#6B6560', marginBottom: 20, lineHeight: 1.6 }}>
                  Did Groundwork help your team move forward? Choose what works best for you.
                </div>

                {/* Tier 1: Free extension */}
                {paywallFreeExtensionAvailable && (
                  <div style={{ border: '1px solid #B6E8D4', borderRadius: 10, padding: '14px 16px', marginBottom: 12, background: '#F0FAF5' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#085041', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>Add one more free session</div>
                    <div style={{ fontSize: 13, color: '#1A1916', lineHeight: 1.6, marginBottom: 12 }}>
                      Not ready to pay yet? Keep using Groundwork until you are confident it is delivering value. Add another free session and continue your Ground.
                    </div>
                    <button
                      onClick={() => claimFreeExtensionMut.mutate()}
                      disabled={claimFreeExtensionMut.isPending}
                      style={{ width: '100%', padding: '10px', borderRadius: 7, background: '#085041', color: 'white', fontSize: 13, fontWeight: 700, border: 'none', cursor: claimFreeExtensionMut.isPending ? 'wait' : 'pointer', fontFamily: 'inherit', opacity: claimFreeExtensionMut.isPending ? 0.7 : 1 }}
                    >
                      {claimFreeExtensionMut.isPending ? 'Adding...' : 'Continue for free'}
                    </button>
                  </div>
                )}

                {/* Tier 2 was "Buy a session ($5)". Removed: there is no
                    per-session billing. What remains is the free extension
                    above and the org subscription below. */}

                {/* Tier 3: Upgrade org */}
                <div style={{ border: '1px solid #E2E0DB', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--gw-navy)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>Upgrade organization</div>
                  <div style={{ fontSize: 13, color: '#1A1916', lineHeight: 1.6, marginBottom: 12 }}>
                    Your team is getting value from Groundwork. Unlock unlimited Grounds and unlimited sessions for everyone in your organization with one simple monthly subscription.
                  </div>
                  <button
                    onClick={() => createSubscriptionMut.mutate('STARTER')}
                    disabled={createSubscriptionMut.isPending}
                    style={{ width: '100%', padding: '10px', borderRadius: 7, background: 'var(--gw-navy)', color: 'white', fontSize: 13, fontWeight: 700, border: 'none', cursor: createSubscriptionMut.isPending ? 'wait' : 'pointer', fontFamily: 'inherit', opacity: createSubscriptionMut.isPending ? 0.7 : 1, marginBottom: 8 }}
                  >
                    {createSubscriptionMut.isPending ? 'Redirecting...' : 'Upgrade organization'}
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
                <div style={{ fontSize: 16, fontWeight: 800, color: '#0A1628', marginBottom: 8 }}>Session needed to continue</div>
                <div style={{ background: '#F5F3EF', borderRadius: 8, padding: '12px 14px', marginBottom: 14, fontSize: 13, color: '#4A4540', lineHeight: 1.6 }}>
                  Your initiator has been notified. Once they add a session, you will be able to check in.
                </div>
              </>
            )}

            {/* Access code: an admin/lead instrument for bypassing a
                payment block. It used to render for everyone, sending plain
                participants hunting for a code they were never issued. */}
            {myParticipant?.partyType === 'INITIATOR' && (
            <div style={{ borderTop: '1px solid #E2E0DB', paddingTop: 14 }}>
              <div style={{ fontSize: 12, color: '#9B9590', marginBottom: 8 }}>Have an access code?</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  value={paywallCode}
                  onChange={e => { setPaywallCode(e.target.value); setPaywallCodeMsg(null) }}
                  placeholder="Enter code"
                  style={{ flex: 1, padding: '9px 11px', fontSize: 13, fontFamily: 'inherit', border: `1px solid ${paywallCodeMsg && !paywallCodeMsg.ok ? '#c0392b' : '#E2E0DB'}`, borderRadius: 7, background: '#F5F3EF', color: '#0A1628', outline: 'none' }}
                />
                <button
                  onClick={() => redeemPaywallCode.mutate()}
                  disabled={!paywallCode.trim() || redeemPaywallCode.isPending}
                  style={{ padding: '9px 14px', borderRadius: 7, background: '#0C447C', color: 'white', fontSize: 13, fontWeight: 600, border: 'none', cursor: !paywallCode.trim() ? 'not-allowed' : 'pointer', opacity: !paywallCode.trim() ? 0.45 : 1, fontFamily: 'inherit', whiteSpace: 'nowrap' }}
                >
                  {redeemPaywallCode.isPending ? 'Checking...' : 'Apply'}
                </button>
              </div>
              {paywallCodeMsg && (
                <div style={{ fontSize: 12, color: paywallCodeMsg.ok ? '#085041' : '#c0392b', marginTop: 6 }}>{paywallCodeMsg.text}</div>
              )}
            </div>
            )}

            <button
              onClick={() => setShowPaywall(false)}
              style={{ marginTop: 14, background: 'none', border: 'none', fontSize: 12, color: '#9B9590', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}
            >
              Not now
            </button>
          </div>
        </div>
      )}

      {/* Share solo report confirmation modal */}
      {showShareConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,22,40,0.55)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px' }}>
          <div style={{ background: 'white', borderRadius: 12, padding: 24, maxWidth: 380, width: '100%' }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#0A1628', marginBottom: 8 }}>Share your private report?</div>
            <div style={{ fontSize: 13, color: '#6B6560', lineHeight: 1.65, marginBottom: 6 }}>
              Your private report will become visible to all other parties on this ground:
            </div>
            <ul style={{ margin: '0 0 14px', paddingLeft: 18 }}>
              {(ground?.participants ?? []).filter((p: any) => p.userId !== user?.id).map((p: any) => (
                <li key={p.id} style={{ fontSize: 13, color: '#1A1916', marginBottom: 2 }}>
                  {participantLabel(p)}
                  {p.email ? <span style={{ color: '#9B9590' }}> · {p.email}</span> : null}
                </li>
              ))}
            </ul>
            <div style={{ fontSize: 12, color: '#9B9590', lineHeight: 1.55, marginBottom: 18, background: '#F5F3EF', borderRadius: 8, padding: '10px 12px' }}>
              This is all or nothing. All sections of your private report become visible at once. You can stop sharing at any time.
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setShowShareConfirm(false)}
                style={{ flex: 1, padding: '10px', borderRadius: 8, background: '#F5F3EF', color: '#6B6560', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Cancel
              </button>
              <button
                onClick={() => setSoloSharedMut.mutate(true)}
                disabled={setSoloSharedMut.isPending}
                style={{ flex: 1, padding: '10px', borderRadius: 8, background: '#0C447C', color: 'white', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', fontFamily: 'inherit', opacity: setSoloSharedMut.isPending ? 0.6 : 1 }}
              >
                {setSoloSharedMut.isPending ? 'Sharing…' : 'Yes, share it'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
