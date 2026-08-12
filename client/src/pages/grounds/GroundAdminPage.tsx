import { plannedSessionsFor, everySessionDone } from '@/lib/sessionCount'
import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { whatThisGroundCanTellYou } from '@/lib/contextStrength'
import { ContextStrength } from '@/components/gw/ContextStrength'
import { GroundChat } from '@/components/gw/GroundChat'
import { GroundGone } from '@/components/gw/GroundGone'
import { ContextChat } from '@/components/gw/ContextChat'
import { useAuthStore } from '@/stores/auth'
import { groundsApi, type GroundCadence } from '@/api/grounds'
import { TIMED_CADENCES, sessionsFor } from '@/lib/cadence'
import { participantLabel } from '@/lib/utils'
import { alignmentLabel } from '@/lib/alignment'
import { reportsApi } from '@/api/reports'
import { documentsApi } from '@/api/documents'
import { conversationApi } from '@/api/conversation'
import { participantRequestsApi } from '@/api/participantRequests'
import { participantsApi } from '@/api/participants'
import type { ParticipantRequest } from '@/api/participantRequests'
import { toast } from 'sonner'
import { CodeShareCard } from '@/components/CodeShareCard'
import { PostSessionPanel } from '@/components/PostSessionPanel'
import { ResolutionPanel } from '@/components/gw/ResolutionPanel'
import { Stat } from '@/components/gw/kit'
import { billingApi, PLAN_MEMBER_LIMITS, type SubscriptionPlan } from '@/api/billing'

const SCENARIO_LABELS: Record<string, string> = {
  BOARD_STRATEGY: 'Board strategy',
  COHORT_CHECK: 'Cohort check-in',
  NEW_HIRE: 'New hire',
  NEW_PROJECT: 'New project',
  NEW_ADVISOR: 'New board member',
  NEW_COFOUNDER: 'New partner',
  CONTRACT_RENEWAL: 'Contract renewal',
  PIP: 'PIP',
  OKR_ALIGNMENT: 'Goals & planning',
  PULSE_CHECK: 'Pulse check',
  DRIFT: 'New direction',
  REALIGN_TEAM: 'Other',
  WORKPLAN_BUDGET: 'Workplan & budget',
  NEW_MANAGER: 'New manager',
}

const MOMENT_LABELS: Record<string, string> = {
  STARTING: 'Starting',
  RECOGNITION: 'Recognition',
  RESOLUTION: 'Resolution',
}



/**
 * THE CHAT WENT MISSING FROM THIS VIEW, AND I DID NOT NOTICE. W8-67.
 *
 * Her words: "the chat like slack disappear again, what is happening".
 *
 * It never disappeared from the code - it disappeared from HALF THE PRODUCT. GroundChat
 * is mounted by `GroundParticipantPage` only. So a participant lands in the conversation
 * and a LEAD or an ORG ADMIN, opening the same ground, gets a list of session cards and no
 * chat anywhere. When the card view was retired (46321a0) the rail toggle and
 * `stores/view.ts` went with it, correctly - but the retirement was done on the
 * participant page and this one was left as it was.
 *
 * So 'chat' is the first tab here too, and the card list keeps its own tab rather than
 * being deleted: a lead scanning twelve sessions for who has not checked in wants the
 * list, and that is a genuinely different question from reading what was said.
 */
type Tab = 'chat' | 'overview' | 'checkins' | 'docs' | 'report' | 'settings'
type ReportSession = 's1' | 's2' | 'closing'

export function GroundAdminPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const user = useAuthStore(s => s.user)
  /**
   * CHECK-INS FIRST, because that is what a ground is for.
   *
   * The page opened on Overview, which is the summary and the admin furniture, so
   * the first thing anybody saw about a live ground was a description of it rather
   * than the state of the work. Hafsah: "the checkin board should be the first tab
   * on these."
   *
   * The participant view already opens on Check-in; this makes the two agree.
   */
  const [tab, setTab] = useState<Tab>('chat')
  const [reportSession, setReportSession] = useState<ReportSession>('s1')
  const [ctxNote, setCtxNote] = useState('')
  const [groundLabel, setGroundLabel] = useState('')
  const [timelineDaysDraft, setTimelineDaysDraft] = useState(90)
  const [cadenceDraft, setCadenceDraft] = useState<GroundCadence>('WEEKLY')
  const [groundScenario, setGroundScenario] = useState('')
  const [showReleaseConfirm, setShowReleaseConfirm] = useState(false)
  const [addingParticipant, setAddingParticipant] = useState(false)
  const [newParticipantEmail, setNewParticipantEmail] = useState('')
  const [newParticipantNote, setNewParticipantNote] = useState('')
  const [shareCodeModalOpen, setShareCodeModalOpen] = useState(false)
  const [shareCodeId, setShareCodeId] = useState<string | null>(null)
  const [lastInvitedEmail, setLastInvitedEmail] = useState<string | null>(null)
  // Fix-and-resend for bounced invites (participant must not have accepted)
  const [fixingEmailId, setFixingEmailId] = useState<string | null>(null)
  const [fixingEmailValue, setFixingEmailValue] = useState('')
  const [noteSaved, setNoteSaved] = useState(false)
  const [leadCtxText, setLeadCtxText] = useState('')
  const [leadCtxTarget, setLeadCtxTarget] = useState('') // '' = about the ground; else participantId
  const [leadCtxSaved, setLeadCtxSaved] = useState(false)
  const [postSessionDismissed, setPostSessionDismissed] = useState(false)
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null)
  const [editingRoleValue, setEditingRoleValue] = useState('')

  const { data: ground, isLoading } = useQuery({
    queryKey: ['ground', id],
    queryFn: () => groundsApi.get(id!),
    enabled: !!id,
  })

  const { data: report } = useQuery({
    queryKey: ['report', id],
    queryFn: () => reportsApi.get(id!),
    enabled: !!id && tab === 'report',
    retry: false,
  })

  const { data: activationStatus } = useQuery({
    queryKey: ['report-activation', id],
    queryFn: () => reportsApi.activationStatus(id!),
    enabled: !!id && tab === 'report' && !!report?.releasedAt,
    retry: false,
  })

  const { data: docs = [] } = useQuery({
    queryKey: ['docs', id],
    queryFn: () => documentsApi.list(id!),
    enabled: !!id && tab === 'docs',
  })

  const releaseReport = useMutation({
    mutationFn: () => reportsApi.release(id!),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['report', id] }),
    onError: () => toast.error('Could not release report.'),
  })

  const uploadDoc = useMutation({
    mutationFn: (file: File) => documentsApi.upload(id!, file),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['docs', id] }),
    onError: () => toast.error('Upload failed.'),
  })

  const setDocVisibility = useMutation({
    mutationFn: ({ docId, visibility }: { docId: string; visibility: 'OPEN' | 'OWN' }) =>
      documentsApi.setVisibility(id!, docId, visibility),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['docs', id] }),
    onError: () => toast.error('Could not change who can see that.'),
  })

  const deleteDoc = useMutation({
    mutationFn: (docId: string) => documentsApi.remove(id!, docId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['docs', id] }),
  })

  /**
   * WHO A CHECK-IN BELONGS TO.
   *
   * `CHECKIN_SELECT` returns `participantId` and nothing else about the person, so
   * anything that wants a name has to join through `ground.participants`. Both places
   * that needed one had guessed at `participantEmail` / `participantName`, fields the
   * payload has never carried, and both failed silently: one sorted by row id, the other
   * rendered "Nobody has checked in yet" over twelve completed sessions. W8-66.
   *
   * Falls back to the email's local part only when there is no linked user - which is a
   * participant who has not accepted yet, so there genuinely is no name to use.
   */
  /**
   * MY OWN OPEN CHECK-IN, if I am a party to this ground. W8-76.
   *
   * A check-in is per participant per session, so "the open one" only means anything once
   * it is narrowed to the person asking.
   */
  const myParticipantId = (ground?.participants ?? []).find((p: any) => p.userId === user?.id)?.id ?? null
  const myOpenCheckIn = myParticipantId
    ? ((ground?.checkIns ?? []) as any[])
        .filter((c) => c.participantId === myParticipantId && c.status !== 'COMPLETED')
        .sort((a, b) => (a.sessionNumber ?? 0) - (b.sessionNumber ?? 0))[0] ?? null
    : null
  const myOpenAvailableFrom = (myOpenCheckIn as any)?.availableFrom ?? null
  const myOpenOpensLater = !!myOpenAvailableFrom && new Date(myOpenAvailableFrom).getTime() > Date.now()

  const nameOfParticipant = (participantId: string | null | undefined): string | null => {
    if (!participantId) return null
    const p: any = (ground?.participants ?? []).find((x: any) => x.id === participantId)
    if (!p) return null
    const first = (p.user?.firstName ?? '').trim()
    if (first) return first
    return p.email ? String(p.email).split('@')[0] : null
  }

  const isInitiator = !!ground && user?.id === ground.initiatorId

  /**
   * WHO GETS THE ADMIN VIEW. Her decision: the lead of that ground, and org admins
   * for any ground. Nobody else, and refused out loud rather than half-working.
   *
   * It was open to EVERY org member, because the route is `RequireAuth` and
   * `grounds.get` resolves any ground in your organisation. So somebody who is not
   * in a ground at all could open its setup, its participant list and its nudges -
   * not by finding a hole, just by opening the URL. The controls inside were gated
   * on `isInitiator`; the page was not.
   *
   * This is the client half. The server still answers `grounds.get` for any org
   * member, which is right for the participant view and for the grounds list, so
   * the read itself is not the thing to close. What must not happen is this page
   * rendering for somebody it was not built for.
   */
  const isOrgAdmin = user?.role === 'ADMIN'
  const canRunThisGround = isInitiator || isOrgAdmin
  /**
   * ONE READING OF HOW MANY SESSIONS THIS GROUND HAS. W8-4.
   *
   * This page held two. The header derived it from the timeline and the rhythm
   * with `plannedSessionsFor`, and the context strength read
   * `sessionCounts.total ?? totalSessions ?? 1` off the payload - which is how a
   * ground could say "Session 2 of 6" at the top while the panel below planned
   * for one. Hafsah's call was that derived wins, so it is derived once, here,
   * and everything on the page reads this.
   */
  const plannedSessions = plannedSessionsFor(
    ground?.timelineDays,
    (ground as any)?.cadence,
    (ground as any)?.maxSessions ?? (ground as any)?.totalSessions,
  )
  // Sent with the ground, because the client cannot read an environment variable
  // and a screen that guesses whether a feature is on renders half of it.
  const contextEnabled = (ground as any)?.contextEnabled === true
  /**
   * Computed on the client from what the ground already carries, rather than
   * added as another endpoint. Every input is a count or a presence - nothing
   * here inspects a person, and no branch depends on who anybody is.
   */
  const contextStrength = ground ? whatThisGroundCanTellYou({
    partyCount: (ground.participants ?? []).filter((p: any) => !p.managingOnly).length,
    hasSuccessDefinition: !!(ground as any).brief?.trim(),
    conditionCount: 0,
    hasBaseline: false,
    perPersonObjectiveCount: ((ground as any).objectives ?? []).length,
    openDocumentCount: docs.filter((d: any) => d.visibility === 'OPEN').length,
    peopleWorkTogether: (ground as any).peopleWorkTogether !== false,
    plannedSessions: plannedSessions ?? 1,
  }) : null

  const { data: pendingRequests = [] } = useQuery({
    queryKey: ['participant-requests', id],
    queryFn: () => participantRequestsApi.list(id!),
    enabled: !!id && isInitiator,
    retry: false,
  })

  const { data: shareCardData, isLoading: shareCardLoading } = useQuery({
    queryKey: ['contributor-code-share-card', shareCodeId],
    queryFn: () => billingApi.getContributorCodeShareCard(shareCodeId!),
    enabled: !!shareCodeId && shareCodeModalOpen,
    retry: false,
  })

  const approveRequest = useMutation({
    // The server already invites the person as part of approving the request
    // (participant-requests.controller.ts's update() calls grounds.addParticipant
    // itself on APPROVED) - a second client-side addParticipant call here was
    // redundant and, since the participant row now exists, hit the "unaccepted
    // invite" branch and silently re-sent a second invite email for the same
    // approval.
    mutationFn: (req: ParticipantRequest) => participantRequestsApi.update(id!, req.id, 'APPROVED'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['participant-requests', id] })
      qc.invalidateQueries({ queryKey: ['ground', id] })
      toast.success('Participant added')
    },
    onError: () => toast.error('Could not add participant.'),
  })

  const dismissRequest = useMutation({
    mutationFn: (reqId: string) => participantRequestsApi.update(id!, reqId, 'DISMISSED'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['participant-requests', id] }),
  })

  const [confirmClosing, setConfirmClosing] = useState(false)
  const closingRound = useMutation({
    mutationFn: () => groundsApi.beginClosingRound(id!),
    onSuccess: (r) => {
      toast.success(`Closing round begun - ${r.participantsFlagged} ${r.participantsFlagged === 1 ? 'person' : 'people'} will do their final check-in.`)
      setConfirmClosing(false)
      qc.invalidateQueries({ queryKey: ['ground', id] })
    },
    onError: () => toast.error('Could not begin the closing round.'),
  })

  const remind = useMutation({
    mutationFn: (checkInId: string) => conversationApi.remind(checkInId),
    onSuccess: () => toast.success('Reminder sent'),
  })

  const fixEmail = useMutation({
    mutationFn: ({ participantId, email }: { participantId: string; email: string }) =>
      participantsApi.updateEmail(participantId, email),
    onSuccess: () => {
      toast.success('Invite resent to the corrected address')
      setFixingEmailId(null); setFixingEmailValue('')
      qc.invalidateQueries({ queryKey: ['ground', id] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Could not update the email.'),
  })

  /**
   * "I never got the email."
   *
   * The endpoint to answer that has always existed and nothing called it, so the
   * only recovery was resending to the same address that already failed, or a
   * support request. This fetches the live link and puts it on the clipboard, so
   * the lead can pass it on by any channel they like.
   *
   * It does NOT mint a new link. Reading it leaves the one already sitting in
   * their inbox working, so a person who finds the original email later is not
   * met with a dead link.
   */
  const copyInviteLink = useMutation({
    mutationFn: async (participantId: string) => {
      const { inviteUrl } = await groundsApi.getParticipantInviteUrl(id!, participantId)
      await navigator.clipboard.writeText(inviteUrl)
      return inviteUrl
    },
    onSuccess: () => toast.success('Invite link copied. It is the same link as their email - send it however you like.'),
    onError: (e: any) =>
      toast.error(e?.response?.data?.message ?? 'Could not get the invite link.'),
  })

  const updateRole = useMutation({
    mutationFn: ({ participantId, role }: { participantId: string; role: string }) =>
      participantsApi.updateRole(participantId, role),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ground', id] })
      setEditingRoleId(null)
      setEditingRoleValue('')
      toast.success('Role updated')
    },
    onError: () => toast.error('Could not update role.'),
  })

  // Contact visibility toggle. restrict=true hides peers' emails from each other (default).
  const setContactVisibility = useMutation({
    mutationFn: (restrict: boolean) => groundsApi.setExternalVisibility(id!, restrict),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ground', id] }),
    onError: () => toast.error('Could not update this setting.'),
  })

  const addNote = useMutation({
    mutationFn: (note: string) => groundsApi.update(id!, { contextNote: note }),
    onSuccess: () => { setCtxNote(''); qc.invalidateQueries({ queryKey: ['ground', id] }) },
    onError: () => toast.error('Could not save note.'),
  })

  const addLeadContextMut = useMutation({
    mutationFn: () => groundsApi.addLeadContext(id!, {
      participantId: leadCtxTarget || undefined,
      text: leadCtxText.trim(),
    }),
    onSuccess: () => { setLeadCtxText(''); setLeadCtxSaved(true); qc.invalidateQueries({ queryKey: ['ground', id] }) },
    onError: () => toast.error('Could not save context.'),
  })

  const addParticipantMut = useMutation({
    mutationFn: () => groundsApi.addParticipant(id!, { email: newParticipantEmail.trim(), note: newParticipantNote.trim() || undefined }),
    onSuccess: () => {
      setLastInvitedEmail(newParticipantEmail.trim())
      setAddingParticipant(false)
      setNewParticipantEmail('')
      setNewParticipantNote('')
      qc.invalidateQueries({ queryKey: ['ground', id] })
    },
    onError: () => toast.error('Could not add them.'),
  })

  useEffect(() => {
    if (ground?.label) setGroundLabel(prev => prev || ground.label)
    // Seed the timeframe controls from what the ground actually is, so the form
    // opens showing the truth rather than a default that would silently change it.
    if (ground?.timelineDays) setTimelineDaysDraft(ground.timelineDays)
    if (ground?.cadence) setCadenceDraft(ground.cadence as GroundCadence)
    if (ground?.scenario) setGroundScenario(prev => prev || ground.scenario)
  }, [ground?.label, ground?.scenario])

  if (isLoading) return <Shell><div style={{ padding: 24, fontSize: 13, color: 'var(--gw-muted)' }}>Loading…</div></Shell>
  // Was the bare words "Ground not found." with nothing to press. W8-65.
  if (!ground) return <Shell><GroundGone /></Shell>

  /**
   * REFUSED OUT LOUD, WITH SOMEWHERE TO GO.
   *
   * A blank page or a silent redirect both read as a bug. This says who the view is
   * for, and offers the view they DO have if they are a party to this ground -
   * because the most likely person to land here is a participant who followed a
   * link, and their own page is the one they wanted.
   */
  if (!canRunThisGround) {
    const amAParty = (ground.participants ?? []).some((p: any) => p.userId === user?.id)
    return (
      <Shell>
        <div style={{ maxWidth: 460, margin: '48px auto', padding: '0 20px' }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--gw-text)', marginBottom: 8 }}>
            This view is for whoever runs this ground.
          </div>
          <div style={{ fontSize: 13.5, color: 'var(--gw-sub)', lineHeight: 1.7, marginBottom: 18 }}>
            Setting up a ground, inviting people and releasing the report belong to its lead, or to
            an admin in your organisation. {amAParty
              ? 'Your own check-ins and your record are on your page.'
              : 'You are not a party to this ground, so there is nothing here for you.'}
          </div>
          <button
            onClick={() => navigate(amAParty ? `/grounds/${id}/p` : '/grounds')}
            style={{ padding: '11px 18px', borderRadius: 8, background: 'var(--gw-navy)', color: 'white', border: 'none', cursor: 'pointer', fontSize: 13.5, fontWeight: 700, fontFamily: 'inherit' }}
          >
            {amAParty ? 'Go to my check-ins →' : 'Back to grounds'}
          </button>
        </div>
      </Shell>
    )
  }

  /**
   * ONLY THE LEAD SEES THE LEAD'S CONFIRMATION.
   *
   * This used to be `status === 'AWAITING_LEAD'` alone, so anyone who opened the
   * ground got the lead's page - including the admin who had just handed it off.
   * She was shown "You lead this ground / An admin set this up and named you to
   * lead it" (she IS the admin), a live "Confirm and begin" button, and the
   * lead's own choice about whether to give an account. Those are the lead's
   * decisions about the lead's participation, and the hand-off exists precisely
   * so the lead makes them.
   *
   * The admin still needs to see the ground she set up - she is coordinating it -
   * so she gets the waiting state below rather than nothing.
   */
  if (ground.status === 'AWAITING_LEAD' && isInitiator) {
    return (
      <LeadConfirmView
        ground={ground}
        groundId={id!}
        onConfirmed={(checkInId) => {
          // managing only -> no check-in was created; land the lead on their
          // own admin view instead of trying to open a check-in that does
          // not exist. also-checking-in -> unchanged, straight into the
          // real engine.
          if (checkInId) navigate(`/checkin/${checkInId}`)
          else qc.invalidateQueries({ queryKey: ['ground', id] })
        }}
      />
    )
  }

  /**
   * The coordinating admin's view while the lead has not yet confirmed.
   *
   * She set this up and handed it over, so the honest thing to show her is the
   * state of the hand-off: who it went to, and that nothing starts until they
   * accept. Previously she was shown the lead's own confirmation screen (see
   * above); the opposite mistake would be to show her nothing at all, which
   * makes a ground she just created look like it failed to save.
   */
  if (ground.status === 'AWAITING_LEAD') {
    const lead = (ground.participants ?? []).find((p: any) => p.partyType === 'INITIATOR')
    return (
      <Shell>
        <div style={{ maxWidth: 560, margin: '0 auto', padding: '48px 20px' }}>
          <div style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--gw-sub)', fontWeight: 700, marginBottom: 8 }}>Waiting for your lead</div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--gw-navy)', margin: '0 0 6px', letterSpacing: '-.01em' }}>{ground.label}</h1>
          <p style={{ fontSize: 13.5, color: 'var(--gw-sub)', lineHeight: 1.6, marginBottom: 16 }}>
            You set this ground up and asked {lead?.email ?? "your lead"} to run it.
            They have been emailed a link. Nothing starts until they open it and confirm, and
            they choose their own start time.
          </p>
          <div className="gw-box gw-box-blue" style={{ marginBottom: 24 }}>
            You will see who has checked in, and the shared report once it releases. You will
            not see what anyone wrote - accounts stay private until the report is ready.
          </div>
          {/*
            A real control, not a promise. The first version of this waiting
            state said "you can add the other people now" and offered no way to
            do it - which is the same failure as GW-013 in a new coat: telling
            the admin she may do something the screen does not let her do.

            This is the write that GW-013 unblocked server-side, so it belongs
            here: she is the one holding the list of people to invite, and the
            lead may not open their mail for days.
          */}
          <div style={{ fontSize: 12.5, color: 'var(--gw-muted)', marginBottom: 10 }}>
            You can add the other people now, or leave it to your lead.
          </div>

          {/*
            Say that it worked.
            
            A Playwright run added a participant here successfully - the row was
            created and the invitation email went out - and the screen was
            unchanged afterwards: still just "+ Add someone", with the person
            nowhere on it. The admin has no way to tell the difference between
            "added" and "silently failed", and the obvious response is to add them
            again. The main ground view already confirms this way; the waiting view
            did not. GW-018.
          */}
          {lastInvitedEmail && (
            <div style={{ background: '#E7F6EF', border: '1px solid #B6E8D4', borderRadius: 8, padding: '10px 12px', marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#085041' }}>Invite sent to {lastInvitedEmail}</div>
              <div style={{ fontSize: 12, color: '#085041', marginTop: 2 }}>
                They check in on their own, and nothing is shown to them until the report is ready.
              </div>
            </div>
          )}

          {(ground.participants ?? []).filter((p: any) => p.partyType !== 'INITIATOR').length > 0 && (
            <div style={{ marginBottom: 12 }}>
              {(ground.participants ?? []).filter((p: any) => p.partyType !== 'INITIATOR').map((p: any) => (
                <div key={p.id} style={{ fontSize: 13, color: 'var(--gw-text)', padding: '6px 0', borderBottom: '1px solid var(--gw-border)' }}>
                  {p.email}{p.roleAsDescribed ? ` · ${p.roleAsDescribed}` : ''}
                </div>
              ))}
            </div>
          )}

          {addingParticipant ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <input
                autoFocus
                type="email"
                value={newParticipantEmail}
                onChange={e => setNewParticipantEmail(e.target.value)}
                placeholder="email@company.com"
                style={{ padding: '10px 12px', borderRadius: 7, border: '1px solid var(--gw-border)', fontSize: 13, fontFamily: 'inherit', outline: 'none' }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  disabled={!newParticipantEmail.includes('@') || addParticipantMut.isPending}
                  onClick={() => addParticipantMut.mutate()}
                  style={{ padding: '8px 16px', borderRadius: 7, background: 'var(--gw-navy)', color: 'white', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit', opacity: newParticipantEmail.includes('@') ? 1 : 0.5 }}
                >
                  {addParticipantMut.isPending ? 'Adding…' : 'Add'}
                </button>
                <button
                  onClick={() => { setAddingParticipant(false); setNewParticipantEmail('') }}
                  style={{ padding: '8px 14px', borderRadius: 7, background: 'none', color: 'var(--gw-sub)', border: '1px solid var(--gw-border)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAddingParticipant(true)}
              style={{ fontSize: 13, color: 'var(--gw-navy)', background: 'none', border: '1px solid var(--gw-border)', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              + Add someone
            </button>
          )}
        </div>
      </Shell>
    )
  }

  // The report's own read, or nothing at all. "{conf}/5 {band}" counted
  // completed check-ins and called the result "Aligned".
  const alignRead = alignmentLabel((ground as any).alignment)

  // Every party, every session - not "twelve distinct numbers are complete
  // somewhere". See everySessionDone: the short version closed a ground over a
  // missing closing account.
  const allSessionsDone = everySessionDone(ground.participants as any, ground.checkIns as any, plannedSessions)
  /**
   * The round EVERYONE has finished - the person furthest behind sets the pace.
   *
   * Counting the highest session anyone has done would say "Session 12 of 12"
   * while one party had only reached 4, which is the same optimism that let a
   * ground close over a missing account.
   */
  const perParticipantDone = (ground.participants ?? []).map((p: any) =>
    new Set(
      (ground.checkIns ?? [])
        .filter((c: any) => c.participantId === p.id && c.status === 'COMPLETED')
        .map((c: any) => c.sessionNumber),
    ).size,
  )
  const sessionsDone = perParticipantDone.length > 0 ? Math.min(...perParticipantDone) : 0
  /**
   * How many people have finished the round that is currently open. The round is
   * `sessionsDone + 1` - the one the header already names - so this and the
   * header cannot disagree about which round is being counted.
   */
  const openRound = sessionsDone + 1
  const roundDone = (ground.checkIns ?? []).filter(
    (c: any) => c.sessionNumber === openRound && c.status === 'COMPLETED',
  ).length
  /**
   * The report has three states worth telling apart, and only the last is good
   * news. "Waiting" is not a failure and does not get a warning colour - it is
   * the normal condition of a ground that is running.
   */
  const reportState: { value: string; caption: string; tone?: 'good' | 'warn' | 'bad' } =
    (ground as any).report?.releasedAt
      ? { value: 'Released', caption: 'Everybody can read it', tone: 'good' }
      : (ground as any).report
        ? { value: 'Ready', caption: 'Generated, not released yet', tone: 'warn' }
        : { value: 'Waiting', caption: 'Builds as accounts come in' }
  // contact-visibility toggle state (default: hidden). true = peers cannot see each other's email.
  const contactHidden = ground.restrictExternalVisibility !== false

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--gw-bg)' }}>
      {/* Sticky header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'var(--gw-bg)', borderBottom: '0.5px solid var(--gw-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span onClick={() => navigate('/grounds')} style={{ fontSize: 13, color: 'var(--gw-sub)', cursor: 'pointer' }}>← Grounds</span>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.2 }}>{ground.label}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                {/*
                  "STARTING", ON A GROUND WITH TWELVE OF TWELVE SESSIONS DONE. W8-66.

                  This pill is the ground's MOMENT - what it was opened for - and the
                  moment for a new hire is genuinely STARTING for the ground's whole life.
                  But a small pill under the title, next to a green live dot, is where
                  every product on earth puts a status, so it reads as one, and on a
                  finished ground it reads as a lie.

                  Same word, labelled, so it cannot be mistaken for the state of the
                  ground. The state is the green dot beside it and the line under the
                  title, which were both already right.
                */}
                <span
                  title="What this ground was opened for. Not its current state."
                  style={{ fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 20, background: 'var(--gw-blue-bg)', color: 'var(--gw-navy)' }}
                >
                  Opened for: {MOMENT_LABELS[ground.moment] ?? ground.moment}
                </span>
                {ground.status === 'ACTIVE' && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--gw-green-b)', display: 'inline-block' }} />}
              </div>
            </div>
          </div>
          {/*
            MY VIEW. The participant page at /grounds/:id/p was reachable by
            nothing at all - not a link, not a tab, not a menu - while being the
            page with Check-in, Session history, My record and Documents on it.
            The only way in was typing the URL.

            Shown only to somebody who is actually a party to this ground: an
            admin who is not in it has no record of their own to look at, and the
            page would be empty and confusing.
          */}
          {ground.participants?.some((p: any) => p.userId === user?.id) && (
            <button
              onClick={() => navigate(`/grounds/${id}/p`)}
              style={{ fontSize: 11, fontWeight: 700, padding: '4px 11px', borderRadius: 20, background: 'white', color: 'var(--gw-navy)', border: '1px solid var(--gw-navy)', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              My check-ins →
            </button>
          )}
          {/* Delivery board: only on shared-mode grounds whose scenario family has one.
              The server decides (boardRenders); the client does not duplicate the table. */}
          {(ground as any).boardRenders && (
            <button
              onClick={() => navigate(`/grounds/${id}/board`)}
              style={{ fontSize: 11, fontWeight: 700, padding: '4px 11px', borderRadius: 20, background: 'var(--gw-dark)', color: 'white', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Team board →
            </button>
          )}
          <div style={{ textAlign: 'right' }}>
            {alignRead
              ? <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gw-navy)', maxWidth: 160, lineHeight: 1.35 }}>{alignRead}</div>
              : <div style={{ fontSize: 11, color: 'var(--gw-sub)' }}>No read yet</div>}
          </div>
        </div>

        {/* Sessions are per-participant-per-session, so count DISTINCT session
            numbers, not check-in rows. */}
        <div style={{ display: 'flex', gap: 10, padding: '0 16px 10px', fontSize: 11, color: 'var(--gw-sub)', flexWrap: 'wrap', alignItems: 'center' }}>
          {ground.scenario && (
            <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: '#F0EEE9', color: '#4A4540' }}>
              {SCENARIO_LABELS[ground.scenario] ?? ground.scenario.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase())}
            </span>
          )}
          {ground.resolutionState && (
            <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: 'var(--gw-blue-bg)', color: 'var(--gw-navy)' }}>{ground.resolutionState}</span>
          )}
          {/* PROGRESS IS COUNTED IN SESSIONS, NOT DAYS.
              A ground eight sessions into twelve read "90 days remaining",
              which is arithmetically true - the calendar really had not moved -
              and useless, because the work is measured in check-ins. Sessions
              lead; the calendar follows in the quieter line, and only while it
              still has something to say. */}
          {allSessionsDone ? (
            <span>every session done</span>
          ) : (
            <>
              {plannedSessions != null && (
                <span style={{ fontWeight: 700 }}>Session {Math.min(sessionsDone + 1, plannedSessions)} of {plannedSessions}</span>
              )}
              {ground.daysLeft != null && ground.daysLeft <= 3 ? (
                <span style={{ fontWeight: 700, color: '#791F1F' }}>{ground.daysLeft === 0 ? 'Due today' : `${ground.daysLeft} day${ground.daysLeft === 1 ? '' : 's'} remaining`}</span>
              ) : ground.daysLeft != null ? (
                <span style={{ color: 'var(--gw-sub)' }}>{ground.daysLeft} days remaining</span>
              ) : null}
            </>
          )}
        </div>

        {/* Tabs.
            THE BOARD BELONGS HERE, WITH THE OTHER PLACES YOU GO.
            It was a small dark pill floating up beside the ground's status and
            nowhere else in the product, so someone who did not happen to notice
            it on that one row had no way of knowing the board existed at all.
            Board is per-ground, so a global nav entry would have to guess which
            ground someone meant; this row is where a person already looks for
            the parts of a ground. It only appears when the server says this
            ground has one (boardRenders), same as before. */}
        <div style={{ display: 'flex', borderTop: '0.5px solid var(--gw-border)', overflowX: 'auto' }}>
          {(['chat', 'checkins', 'overview', 'docs', 'report', 'settings'] as Tab[]).map(t => (
            <button key={t} className={`gw-tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
              {/* THE TAB IS CALLED CONTEXT ONCE THERE IS CONTEXT IN IT. (G38, G26)
                  With CONTEXT_ENABLED off it says Documents and behaves exactly as
                  it did, which is what makes the flag honest - off has to be the
                  old product rather than a renamed one. */}
              {/*
                ONE WORD FOR ONE SCREEN. W13-8.

                This tab was "Chat" and the participant's identical tab was "Check-in" - one
                component, two words, adjacent pages. Somebody being walked through the product
                by their manager saw two names for one screen.

                "Check-in" wins because it is the word everything else already uses: the email
                says your check-in is due, the header says My check-ins, the button says Check
                in. "Chat" was mine.

                The card list becomes "Sessions", which is what it is - one row per person per
                session - and it has to change, or the lead ends up with "Check-in" and
                "Check-ins" side by side, which is worse than the problem being fixed.
              */}
              {{ chat: 'Check-in', overview: 'Overview', checkins: 'Sessions', docs: contextEnabled ? 'Context' : 'Documents', report: 'Report', settings: 'Ground settings' }[t]}
            </button>
          ))}
          {(ground as any).boardRenders && (
            <button className="gw-tab" onClick={() => navigate(`/grounds/${id}/board`)}>
              Team board
            </button>
          )}
        </div>
      </div>

      <div className="gw-bd" style={{ paddingTop: 12, maxWidth: 600, margin: '0 auto', width: '100%' }}>

        {/* OVERVIEW */}
        {/*
          THE PERSON WHO SET IT UP HAS TO KNOW WHAT IT IS WAITING FOR. W9-7.
          
          Holding the invites is right, and silently holding them is not: without this
          the creator sees a ground that looks finished, adds somebody, and gets a
          refusal with no explanation of who has to act.
        */}
        {(ground as any).status === 'AWAITING_APPROVAL' && (
          <div style={{ background: '#FDF8E3', border: '1px solid #E8D9A0', borderRadius: 10, padding: '13px 15px', marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#8A5C1A', marginBottom: 4 }}>
              Waiting for an admin to accept this ground
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--gw-sub)', lineHeight: 1.6 }}>
              You can keep editing it, and nobody can be invited until it is accepted - so nobody
              has been contacted and nothing has been shared. An admin in your organisation sees it
              on their grounds page.
            </div>
          </div>
        )}

        {/*
          AN ORG ADMIN LOOKING AT SOMEBODY ELSE'S GROUND. W8-32.
          
          Her note: "the org admin view should differ, today it is subtraction." The
          gate now decides WHO gets in - the lead of the ground, or an org admin - and
          for an admin who is not the lead the view was still identical to the lead's,
          including the two actions that cannot be undone.
          
          This ADDS the frame rather than removing controls. Hiding them is the
          subtraction she was describing, and it also removes the only oversight an
          admin has: an admin who cannot see that a report is sitting unreleased for
          three weeks cannot do anything about it. So they see everything, and they are
          told plainly whose ground it is and which decisions belong to that person.
        */}
        {isOrgAdmin && !isInitiator && (
          <div style={{ background: 'var(--gw-blue-bg)', border: '1px solid var(--gw-blue-b)', borderRadius: 10, padding: '12px 15px', marginBottom: 16 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--gw-navy)', marginBottom: 3 }}>
              You are looking at this as an admin, not as its lead
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--gw-navy)', lineHeight: 1.6 }}>
              {(() => {
                /**
                 * IT SAID "its lead runs this ground." W8-66.
                 *
                 * Two bugs in one line, both visible the moment an org admin opened
                 * somebody else's ground:
                 *
                 * 1. It read `lead.email`, and `grounds.service.ts:872` NULLS the email
                 *    for a viewer who is neither the person nor the ground's lead - on
                 *    purpose. So for the only people who ever see this banner, the field
                 *    it depends on is always empty, and the fallback always fired.
                 * 2. The fallback was the lowercase fragment "its lead", which starts a
                 *    sentence, so the banner read "its lead runs this ground." - a broken
                 *    template, on an admin's first look at a colleague's ground.
                 *
                 * The name is in the payload the whole time: `SAFE_PARTICIPANT_SELECT`
                 * pulls `user.firstName` precisely so somebody can be named when their
                 * email is hidden. Using the address to make a name was the W10-2 mistake
                 * anyway - "hafsah@meridian.test" is not what that person is called.
                 */
                const lead = (ground.participants ?? []).find((p: any) => p.partyType === 'INITIATOR')
                const first = (lead?.user?.firstName ?? '').trim()
                const who = first || 'The lead of this ground'
                return `${who} runs this ground. You can see everything here, which is the point of being an admin - but releasing the report and closing the ground are theirs to decide, and nothing you do here is hidden from them.`
              })()}
            </div>
          </div>
        )}

        {tab === 'overview' && (
          <div>
            {/*
              WHAT STATE IS THIS GROUND IN, IN ONE LOOK. W8-24, W8-47.

              Every screen should answer three things in order: what is this,
              what is its state, what do I do next. This page answered the first
              in its header and then went straight to cards, so the state had to
              be assembled by reading them. The board already answers it with a
              stat row and is the best page in the product for exactly that
              reason; this is the same row, from the same kit, on the page people
              actually open.

              Nothing new is fetched. Every number here was already on screen
              somewhere further down.
            */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
              {/*
                BOTH CAPTIONS NAME THE SESSION THEY ARE COUNTING, AND THAT IS THE
                WHOLE POINT OF THEM.

                Found by rendering this rather than reading it. On a ground with
                session 1 done and session 2 open, the row read "SESSIONS 1 of 6"
                and "THIS ROUND 0 of 1 - still to check in" directly under a
                header saying "Session 2 of 6" and a tab saying 1 person had
                checked in. Every one of those numbers is correct and together
                they read as three contradictions, because nothing said which
                session each was about.
              */}
              <Stat
                label="Sessions done"
                value={plannedSessions != null ? `${sessionsDone} of ${plannedSessions}` : String(sessionsDone)}
                caption={allSessionsDone
                  ? 'Every session done'
                  : `Finished by everyone. Session ${openRound} is the open one.`}
                tone={allSessionsDone ? 'good' : undefined}
              />
              <Stat
                label={`Session ${openRound}`}
                value={`${roundDone} of ${(ground.participants ?? []).length}`}
                caption={roundDone < (ground.participants ?? []).length
                  ? 'Have checked in so far'
                  : 'Everybody is in'}
                tone={roundDone === (ground.participants ?? []).length && roundDone > 0 ? 'good' : undefined}
              />
              <Stat label="Report" value={reportState.value} caption={reportState.caption} tone={reportState.tone} />
            </div>
            {/* How this ground ends. Renders nothing for a non-party (the API
                403s them), so the setting-up admin sees the board and the
                record but does not get a vote on the outcome.

                NOT AT THE TOP, AND NOT AT SESSION 2 OF 6.

                This was the FIRST card on the page from the moment a ground
                existed. On a fresh ground it read "Each person picks the outcome
                they think the record supports. The ground closes only when
                everyone picks the same one" above four buttons including "Stop
                the project", with one participant and one session done, and
                nothing else on screen competing with it.

                Two problems in one. The first thing a person saw about their new
                ground was how to end it, and the copy described a group agreement
                in a ground that had a group of one.

                It now appears when the ground is actually near its end - every
                session done, or the last planned round reached - or when it has
                already been started, so a ground mid-decision never hides it. The
                product's own help says the OPPOSITE thing belongs at the start:
                "Set a resolution state before the ground starts... agreeing on the
                end state before you start changes the quality of every session."
                That is a different panel and it is W8-59; this one is the exit,
                and the exit belongs at the exit. */}
            {(allSessionsDone || (plannedSessions != null && sessionsDone >= plannedSessions - 1) || ground.resolutionState) && (
              <ResolutionPanel groundId={ground.id} />
            )}
            {/* Post-session decision panel: shown when session is complete, no balance, not subscribed */}
            {ground.status === 'REPORT_READY' && !postSessionDismissed &&
              !ground.isFreeGround &&
              !(ground.org?.subscriptionPlan && ground.org?.subscriptionStatus === 'active') &&
              (ground.sessionsBalance ?? 0) === 0 && (
                <PostSessionPanel
                  groundId={ground.id}
                  freeExtensionUsed={ground.org?.freeExtensionUsed ?? false}
                  onDismiss={() => setPostSessionDismissed(true)}
                />
              )
            }

            {/* Subscribed: unlimited sessions badge */}
            {ground.org?.subscriptionPlan && ground.org?.subscriptionStatus === 'active' && (
              <div style={{ background: '#F0FAF5', border: '1px solid #B6E8D4', borderRadius: 8, padding: '8px 14px', marginBottom: 12, fontSize: 12, color: '#085041', fontWeight: 600 }}>
                Subscribed. Unlimited sessions active for your organization.
              </div>
            )}

            {/* Fix 8: Cadence miss recovery */}
            {(ground.overdue ?? 0) > 0 && (
              <div style={{ fontSize: 12, color: '#0C447C', background: '#EEF4FB', border: '1px solid #C5D9EF', borderRadius: 8, padding: '10px 12px', marginBottom: 14, lineHeight: 1.5 }}>
                <strong>{ground.overdue} {ground.overdue === 1 ? 'participant is' : 'participants are'} overdue.</strong> A missed session is not a lost session. Use Remind - the most common reason is the email went to spam. Their next check-in picks up where they left off.
              </div>
            )}

            <div style={{ background: 'var(--gw-blue-bg)', border: '0.5px solid var(--gw-blue-b)', borderRadius: 10, padding: '14px 16px', marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gw-navy)', letterSpacing: '.04em', textTransform: 'uppercase', marginBottom: 8 }}>Ground summary</div>
              <div style={{ fontSize: 13, lineHeight: 1.65 }}>{ground.brief ?? 'Waiting for first session pair to complete.'}</div>
            </div>

            {(() => {
              const myParticipant = ground.participants.find((p: any) => p.userId === user?.id)
              const myOpenCheckIn = myParticipant
                ? ground.checkIns?.find((c: any) => c.participantId === myParticipant.id && c.status !== 'COMPLETED')
                : null
              if (!myOpenCheckIn) return null
              return (
                <div style={{ background: '#E7F6EF', border: '1px solid #B6E8D4', borderRadius: 10, padding: '13px 16px', marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#085041', marginBottom: 4 }}>
                    Session {myOpenCheckIn.sessionNumber} is ready for you
                  </div>
                  <div style={{ fontSize: 12, color: '#3A7A60', lineHeight: 1.6, marginBottom: 10 }}>
                    Your check-in is open. Start when you are ready.
                  </div>
                  <button
                    onClick={() => navigate(`/checkin/${myOpenCheckIn.id}`, {
                      state: { sessionNumber: myOpenCheckIn.sessionNumber, isFinal: (myOpenCheckIn as any).isFinal ?? false, groundLabel: ground.label, groundId: id, isInitiator: true }
                    })}
                    style={{ width: '100%', padding: '11px 16px', borderRadius: 8, background: '#5DCAA5', color: '#0A1628', fontSize: 14, fontWeight: 800, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    Start session {myOpenCheckIn.sessionNumber}
                  </button>
                </div>
              )
            })()}

            <div style={{ marginBottom: 16 }}>
              {(() => {
                const bounced = ground.participants.filter((p: any) => p.inviteDeliveryStatus === 'BOUNCED')
                if (bounced.length === 0) return null
                return (
                  <div style={{ background: '#FFF4F4', border: '1px solid #F5C6C6', borderRadius: 8, padding: '10px 14px', marginBottom: 10, fontSize: 12.5, color: '#8B1A1A', lineHeight: 1.5 }}>
                    <strong>{bounced.length === 1 ? '1 invite never arrived (bounced).' : `${bounced.length} invites never arrived (bounced).`}</strong> Fix the address below and resend - until then {bounced.length === 1 ? 'that person has' : 'those people have'} no way in.
                  </div>
                )
              })()}
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Participants</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {ground.participants.map((p: any, i: number) => {
                  const myCheckIn = ground.checkIns?.find(c => c.participantId === p.id)
                  const status = myCheckIn?.status ?? 'NOT_STARTED'
                  const statusColor = status === 'COMPLETED' ? 'var(--gw-green-b)' : status === 'IN_PROGRESS' ? 'var(--gw-amber-b)' : 'var(--gw-border)'
                  const statusLabel = status === 'COMPLETED' ? 'Completed' : status === 'IN_PROGRESS' ? 'In progress' : 'Not started'
                  const sharedReport = p.sharedSoloReport as Record<string, unknown> | null
                  return (
                    <div key={p.id}>
                      <div className="ga-participant-row">
                        <div className="ga-status-dot" style={{ background: statusColor }} title={statusLabel} />
                        <div className={`gw-av gw-av-${i % 6}`}>{(p.email || '?').charAt(0).toUpperCase()}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{participantLabel(p)}</div>
                          <div style={{ fontSize: 11, color: 'var(--gw-muted)' }}>{p.email}</div>
                          {editingRoleId === p.id ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3 }}>
                              <input
                                autoFocus
                                value={editingRoleValue}
                                onChange={e => setEditingRoleValue(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') updateRole.mutate({ participantId: p.id, role: editingRoleValue })
                                  if (e.key === 'Escape') { setEditingRoleId(null); setEditingRoleValue('') }
                                }}
                                style={{ fontSize: 11, padding: '2px 6px', borderRadius: 4, border: '1px solid var(--gw-border)', outline: 'none', fontFamily: 'inherit', width: 120 }}
                              />
                              <button onClick={() => updateRole.mutate({ participantId: p.id, role: editingRoleValue })} style={{ fontSize: 10, color: 'var(--gw-navy)', background: 'none', border: 'none', cursor: 'pointer' }}>Save</button>
                              <button onClick={() => { setEditingRoleId(null); setEditingRoleValue('') }} style={{ fontSize: 10, color: 'var(--gw-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>Cancel</button>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 1 }}>
                              {p.roleAsDescribed && <span style={{ fontSize: 11, color: 'var(--gw-sub)' }}>{p.roleAsDescribed}</span>}
                              {/* What someone is answerable for is the lead's to
                                  set, or their own. Every party could edit every
                                  other party's remit, on a ground that may be
                                  deciding whether they keep their job. */}
                              {(isInitiator || p.userId === user?.id) && (
                                <button
                                  onClick={() => { setEditingRoleId(p.id); setEditingRoleValue(p.roleAsDescribed ?? '') }}
                                  title="Edit role"
                                  style={{ fontSize: 10, color: 'var(--gw-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px', lineHeight: 1 }}
                                >✎</button>
                              )}
                            </div>
                          )}
                          <div style={{ fontSize: 11, color: 'var(--gw-muted)' }}>{status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase())}</div>
                        </div>
                        {/* Chasing people is the lead's job. A peer nudging a peer
                            on an evaluation ground is a different act entirely. */}
                        {isInitiator && myCheckIn?.id && status !== 'COMPLETED' && p.userId && (
                          <button onClick={() => remind.mutate(myCheckIn.id)} style={{ fontSize: 11, color: 'var(--gw-navy)', background: 'none', border: 'none', cursor: 'pointer' }}>Remind</button>
                        )}
                        {!p.userId && p.inviteDeliveryStatus === 'BOUNCED' ? (
                          <button
                            onClick={() => { setFixingEmailId(p.id); setFixingEmailValue(p.email) }}
                            style={{ fontSize: 11, fontWeight: 700, color: '#8B1A1A', background: '#FFF4F4', border: '1px solid #F5C6C6', borderRadius: 12, padding: '2px 10px', cursor: 'pointer', fontFamily: 'inherit' }}
                            title="The invite email bounced - it never reached this address"
                          >
                            Email bounced - fix &amp; resend
                          </button>
                        ) : !p.userId && p.inviteDeliveryStatus === 'COMPLAINED' ? (
                          <span style={{ fontSize: 11, fontWeight: 600, color: '#7A5200', background: '#FFF8EC', border: '1px solid #F5DFA0', borderRadius: 12, padding: '2px 10px' }} title="They marked the invite as spam">Marked as spam</span>
                        ) : !p.userId ? (
                          <span style={{ fontSize: 11, color: 'var(--gw-muted)' }} title={p.inviteDeliveryStatus === 'DELIVERED' ? 'Invite delivered to their inbox' : 'Invite sent'}>
                            {p.inviteDeliveryStatus === 'DELIVERED' ? 'Invite delivered' : 'Invite pending'}
                          </span>
                        ) : null}
                        {/* Available for anyone who has not joined yet, whatever
                            the delivery status says - "delivered" only means the
                            mail server accepted it, not that a person saw it. */}
                        {isInitiator && !p.userId && (
                          <button
                            disabled={copyInviteLink.isPending}
                            onClick={() => copyInviteLink.mutate(p.id)}
                            style={{ fontSize: 11, color: 'var(--gw-navy)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline' }}
                            title="Copy their invite link so you can send it yourself"
                          >
                            {copyInviteLink.isPending && copyInviteLink.variables === p.id ? 'Copying...' : 'Copy invite link'}
                          </button>
                        )}
                      </div>
                      {fixingEmailId === p.id && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, marginLeft: 40 }}>
                          <input
                            autoFocus
                            type="email"
                            value={fixingEmailValue}
                            onChange={e => setFixingEmailValue(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && fixingEmailValue.includes('@')) fixEmail.mutate({ participantId: p.id, email: fixingEmailValue }) }}
                            placeholder="corrected@email.com"
                            style={{ fontSize: 12, padding: '6px 10px', borderRadius: 6, border: '1px solid #F5C6C6', outline: 'none', fontFamily: 'inherit', width: 240 }}
                          />
                          <button
                            disabled={fixEmail.isPending || !fixingEmailValue.includes('@')}
                            onClick={() => fixEmail.mutate({ participantId: p.id, email: fixingEmailValue })}
                            style={{ fontSize: 12, fontWeight: 700, color: 'white', background: '#8B1A1A', border: 'none', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontFamily: 'inherit', opacity: fixEmail.isPending ? 0.6 : 1 }}
                          >
                            {fixEmail.isPending ? 'Resending...' : 'Resend invite'}
                          </button>
                          <button onClick={() => { setFixingEmailId(null); setFixingEmailValue('') }} style={{ fontSize: 12, color: 'var(--gw-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>Cancel</button>
                        </div>
                      )}
                      {sharedReport && (
                        <div style={{ background: '#0A1628', color: 'white', borderRadius: 8, padding: '12px 14px', marginTop: 4, marginLeft: 40 }}>
                          <div style={{ fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,.4)', fontWeight: 700, marginBottom: 8 }}>
                            {participantLabel(p)}'s private report (shared by them)
                          </div>
                          {Object.entries(sharedReport).map(([key, val]) => {
                            if (!val || (Array.isArray(val) && val.length === 0)) return null
                            const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, (s: string) => s.toUpperCase())
                            return (
                              <div key={key} style={{ marginBottom: 10 }}>
                                <div style={{ fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,.35)', fontWeight: 700, marginBottom: 3 }}>{label}</div>
                                {Array.isArray(val)
                                  ? <ul style={{ margin: 0, paddingLeft: 14 }}>{(val as string[]).map((v, idx) => <li key={idx} style={{ fontSize: 12, lineHeight: 1.6, marginBottom: 2 }}>{v}</li>)}</ul>
                                  : <div style={{ fontSize: 12, lineHeight: 1.6 }}>{String(val)}</div>
                                }
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {(() => {
              const pending = ground.participants.filter((p: any) => {
                const ci = ground.checkIns?.find((c: any) => c.participantId === p.id)
                return !ci || ci.status !== 'COMPLETED'
              })
              return pending.length > 0 ? (
                <div style={{ fontSize: 12, color: '#8A5C1A', background: '#FDF3E3', border: '1px solid #E8A94A', borderRadius: 8, padding: '8px 12px', marginBottom: 16, lineHeight: 1.5 }}>
                  {pending.length === 1
                    ? `1 participant has not yet checked in. The shared report generates once all accounts are in.`
                    : `${pending.length} participants have not yet checked in. The shared report generates once all accounts are in.`}
                  <span style={{ marginLeft: 6, fontWeight: 600 }}>Use Remind if they have not received the email - it may have gone to spam.</span>
                </div>
              ) : null
            })()}

            {pendingRequests.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#8A5C1A', background: '#FDF3E3', border: '1px solid #E8A94A', borderRadius: 8, padding: '8px 12px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#E8A94A', flexShrink: 0, display: 'inline-block' }} />
                  Pending participant requests ({pendingRequests.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {pendingRequests.map(req => (
                    <div key={req.id} style={{ background: 'white', border: '1px solid #E2E0DB', borderRadius: 10, padding: '13px 14px' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#1A1916', marginBottom: 2 }}>
                        {req.requestedName ? `${req.requestedName} (${req.requestedEmail})` : req.requestedEmail}
                      </div>
                      <div style={{ fontSize: 11, color: '#6B6560', marginBottom: 8 }}>Requested by {req.requestedByEmail}</div>
                      <div style={{ fontSize: 13, color: '#1A1916', lineHeight: 1.55, marginBottom: 12 }}>{req.reason}</div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => approveRequest.mutate(req)}
                          disabled={approveRequest.isPending}
                          style={{ flex: 1, padding: '8px 12px', borderRadius: 7, background: '#0A1628', color: 'white', fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit', opacity: approveRequest.isPending ? 0.6 : 1 }}
                        >
                          Add participant
                        </button>
                        <button
                          onClick={() => dismissRequest.mutate(req.id)}
                          disabled={dismissRequest.isPending}
                          style={{ padding: '8px 14px', borderRadius: 7, background: 'none', color: '#6B6560', fontSize: 12, fontWeight: 600, border: '1px solid #E2E0DB', cursor: 'pointer', fontFamily: 'inherit', opacity: dismissRequest.isPending ? 0.6 : 1 }}
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(ground.signals ?? []).length > 0 && (() => {
              const sigs = ground.signals ?? []
              const convergences = sigs.filter(s => s.type === 'Convergence').length
              const divergences = sigs.filter(s => s.type === 'Divergence').length
              const trendLabel = convergences > divergences ? 'Trending toward alignment' : divergences > convergences ? 'Active divergence - needs attention' : 'Mixed signals'
              const trendColor = convergences > divergences ? '#085041' : divergences > convergences ? '#791F1F' : '#8A5C1A'
              const trendBg = convergences > divergences ? '#E7F6EF' : divergences > convergences ? '#FCEBEB' : '#FDF3E3'
              return (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>Alignment feed</span>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: trendBg, color: trendColor }}>{trendLabel}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {sigs.map(sig => (
                      <div key={sig.id} style={{ background: 'var(--gw-bg)', border: '0.5px solid var(--gw-border)', borderRadius: 8, padding: '11px 13px' }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: sig.type === 'Convergence' ? 'var(--gw-green-bg)' : sig.type === 'Divergence' ? 'var(--gw-red-bg)' : 'var(--gw-amber-bg)', color: sig.type === 'Convergence' ? 'var(--gw-green-t)' : sig.type === 'Divergence' ? 'var(--gw-red-t)' : 'var(--gw-amber-t)' }}>{sig.type}</span>
                          <span style={{ fontSize: 11, color: 'var(--gw-muted)' }}>Session {sig.sessionNum}</span>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--gw-text)', lineHeight: 1.55 }}>{sig.text}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })()}

            {/* Add contributor */}
            <div style={{ marginTop: 20 }}>
              {lastInvitedEmail ? (
                <div style={{ background: '#E7F6EF', border: '1px solid #B6E8D4', borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#085041', marginBottom: 6 }}>Invite sent to {lastInvitedEmail}</div>
                  <div style={{ fontSize: 12, color: '#3A7A60', lineHeight: 1.6, marginBottom: 10 }}>
                    They will get an email and do their own private check-in - about 10 minutes. You cannot see what they write. Once everyone has checked in, the shared report releases to everyone at the same time.
                  </div>
                  <button onClick={() => { setLastInvitedEmail(null); setAddingParticipant(true) }}
                    style={{ padding: '7px 14px', borderRadius: 7, background: 'none', border: '1px solid #5DCAA5', color: '#085041', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                    Invite another
                  </button>
                </div>
              ) : !addingParticipant ? (
                <>
                  {(() => {
                    const plan = ground.org?.subscriptionPlan as SubscriptionPlan | null | undefined
                    const limit = plan ? PLAN_MEMBER_LIMITS[plan] : null
                    const memberCount = ground.participants?.length ?? 0
                    if (limit !== null && limit !== undefined && memberCount >= limit) {
                      return (
                        <div style={{ background: '#FFF3E0', border: '1px solid #F5C56A', borderRadius: 8, padding: '10px 14px', marginBottom: 10, fontSize: 12, color: '#7A4B00', lineHeight: 1.55 }}>
                          Your {plan?.replace('_', ' ').toLowerCase()} plan supports up to {limit} members. You have reached the limit. Upgrade your organization to add more people.
                          <button onClick={() => navigate('/billing')} style={{ display: 'inline', marginLeft: 8, background: 'none', border: 'none', fontSize: 12, color: '#7A4B00', textDecoration: 'underline', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
                            View plans
                          </button>
                        </div>
                      )
                    }
                    return null
                  })()}
                  {/* Running the ground is the lead's job. Every party was being
                      shown these, so someone being evaluated on this ground could
                      invite people to it or declare the closing round. */}
                  {isInitiator && (
                    <button onClick={() => setAddingParticipant(true)} style={{ width: '100%', padding: '11px 16px', borderRadius: 8, background: 'none', color: 'var(--gw-navy)', fontSize: 13, fontWeight: 600, border: '1px dashed var(--gw-blue-b)', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      <span style={{ fontSize: 16, fontWeight: 300 }}>+</span> Add a person
                    </button>
                  )}
                  {isInitiator && !['RESOLVED', 'CLOSED', 'STALLED', 'AWAITING_LEAD'].includes(ground.status) && (
                    confirmClosing ? (
                      <div style={{ border: '1px solid #E4C88A', background: '#FFF8EC', borderRadius: 8, padding: '12px 14px', marginTop: 8 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#7A4B00', marginBottom: 4 }}>Begin the closing round?</div>
                        <div style={{ fontSize: 12, color: '#7A4B00', lineHeight: 1.5, marginBottom: 10 }}>
                          Everyone's next check-in becomes their final account - same conversation, marked as closing. The final report reads the whole record, then you and the others agree the end state.
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={() => closingRound.mutate()} disabled={closingRound.isPending} style={{ padding: '8px 14px', borderRadius: 7, background: '#7A4B00', color: 'white', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Begin closing round</button>
                          <button onClick={() => setConfirmClosing(false)} style={{ padding: '8px 14px', borderRadius: 7, background: 'none', color: '#7A4B00', border: 'none', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmClosing(true)} style={{ width: '100%', padding: '11px 16px', borderRadius: 8, background: 'none', color: '#7A4B00', fontSize: 13, fontWeight: 600, border: '1px dashed #E4C88A', cursor: 'pointer', fontFamily: 'inherit', marginTop: 8 }}>
                        Begin the closing round →
                      </button>
                    )
                  )}
                </>
              ) : (
                <div style={{ border: '1px solid var(--gw-border)', borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Add a person</div>
                  <div style={{ fontSize: 12, color: 'var(--gw-sub)', marginBottom: 10, lineHeight: 1.5 }}>They will get an email invitation. You cannot see what they write in their check-in.</div>
                  <input type="email" placeholder="name@company.com" value={newParticipantEmail} onChange={e => setNewParticipantEmail(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--gw-border)', fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: 8, outline: 'none' }} />
                  <input type="text" placeholder="What do you want them to account for? (optional)" value={newParticipantNote} onChange={e => setNewParticipantNote(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--gw-border)', fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: 10, outline: 'none' }} />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => { setAddingParticipant(false); setNewParticipantEmail(''); setNewParticipantNote('') }}
                      style={{ padding: '9px 14px', borderRadius: 7, background: 'none', border: '1px solid var(--gw-border)', color: 'var(--gw-sub)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                    <button onClick={() => addParticipantMut.mutate()} disabled={!newParticipantEmail.includes('@') || addParticipantMut.isPending}
                      style={{ flex: 1, padding: '9px 14px', borderRadius: 7, background: 'var(--gw-navy)', color: 'white', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit', opacity: newParticipantEmail.includes('@') ? 1 : 0.4 }}>
                      {addParticipantMut.isPending ? 'Inviting…' : 'Send invite'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* The server withholds the token from non-initiators; this is the
                second lock, so a future change to either one alone cannot put a
                shareable link to someone's record back on a participant's page. */}
            {isInitiator && ground.joinToken && (
              <ShareSection joinToken={ground.joinToken} />
            )}
          </div>
        )}

        {/* CHECK-INS */}
        {tab === 'chat' && (
          // The same component the participant view mounts, so there is one chat in the
          // product rather than a lead's version of one. A lead is not checking in here -
          // this is the ground's history, which is what they came to read.
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <GroundChat
              groundId={id!}
              /**
               * THE WAY TO CHECK IN CAME OFF THE PAGE, AND THE GATE CAUGHT IT. W8-76.
               *
               * I made Chat the landing tab and passed `openCheckInId={null}`, so a lead who
               * is also a party - the commonest kind - opened their ground and had no way to
               * start their own check-in from the tab they land on. suite_m failed on exactly
               * that: "the next-check-in affordance EXISTS on the ground page (hard - absence
               * is a failure, not a shrug)". It was right.
               *
               * WHY THE BUTTON HANDS OFF INSTEAD OF OPENING. Starting a check-in goes through
               * `probeSession`, which carries the paywall: a 403 becomes the free-extension /
               * access-code / subscribe modal. That lives on the participant page, and
               * copying it here would be a second copy of the payment path - the thing this
               * plan already records nearly losing once. So the button hands off with
               * `?open=1` and that page fires its own probe immediately: one click, one
               * implementation of the paywall.
               */
              openCheckInId={myOpenCheckIn && !myOpenOpensLater ? myOpenCheckIn.id : null}
              openSessionNumber={myOpenCheckIn && !myOpenOpensLater ? myOpenCheckIn.sessionNumber : null}
              totalSessions={plannedSessions ?? null}
              nextOpensAt={myOpenOpensLater ? myOpenAvailableFrom : null}
              onOpenSession={() => navigate(`/grounds/${id}/p?open=1`)}
              openPending={false}
              /**
                * HER POINT, AND IT IS THE COMMON CASE: "what if sets themselves as
                * checkin in too, they need a chat".
                *
                * Step 6 of setup offers "I am a party. Let's begin." A lead who takes it
                * is a participant with their own check-ins, and they must get the real
                * conversation - not a read-only history of a ground they are in. So this
                * keys on whether they are actually a party, not on whether they are the
                * lead. Lead who is a party: the chat. Lead or org admin who is not: the
                * ground's history, because there is no transcript of theirs to show and
                * somebody else's is not theirs to read.
                */
              viewerIsParty={(ground.participants ?? []).some((p: any) => p.userId === user?.id)}
              /* The same roster the participant view now shows. W13-5. */
              parties={(ground.participants ?? [])
                .filter((p: any) => !p.managingOnly)
                .map((p: any) => {
                  const current = myOpenCheckIn?.sessionNumber ?? plannedSessions ?? 1
                  const theirs = ((ground.checkIns ?? []) as any[]).filter(
                    (c) => c.participantId === p.id && (c.sessionNumber ?? 0) >= current && c.status === 'COMPLETED',
                  )
                  return {
                    name: nameOfParticipant(p.id) ?? 'A participant',
                    done: theirs.length > 0,
                    isSelf: p.userId === user?.id,
                  }
                })}
              history={[...(ground.checkIns ?? [])]
                .reduce((acc: any[], ci: any) => {
                  const n = ci.sessionNumber ?? 1
                  const row = acc.find(r => r.sessionNumber === n)
                  const who = nameOfParticipant(ci.participantId)
                  const done = ci.status === 'COMPLETED'
                  if (row) {
                    if (done && who && !row.people.includes(who)) row.people.push(who)
                    if (ci.completedAt && ci.completedAt > row.date) row.date = ci.completedAt
                  } else {
                    acc.push({ sessionNumber: n, date: ci.completedAt ?? ci.createdAt ?? '', people: done && who ? [who] : [] })
                  }
                  return acc
                }, [])
                .sort((a: any, b: any) => a.sessionNumber - b.sessionNumber)}
              label={ground.label}
              scenario={(ground as any).scenario}
              brief={(ground as any).brief}
              /*
                "24 OF 12 SESSIONS DONE". W8-66.

                A check-in is per person per session, so counting completed check-ins
                counts ROWS: two parties through twelve sessions is twenty-four of them.
                The topic card then read "24 of 12 sessions done", which is not a number
                anybody can act on.

                A session is done when everybody's check-in for it is done, so this counts
                DISTINCT session numbers where nothing is still open.
              */
              sessionsDone={(() => {
                const all = (ground.checkIns ?? []) as any[]
                const numbers = [...new Set(all.map(c => c.sessionNumber ?? 1))]
                return numbers.filter(n =>
                  all.filter(c => (c.sessionNumber ?? 1) === n).every(c => c.status === 'COMPLETED'),
                ).length
              })()}
              signals={((ground as any).signals ?? [])
                .filter((sig: any) => sig.observationText)
                .map((sig: any) => ({
                  label: sig.code?.startsWith('D') ? 'Divergence' : 'Convergence',
                  text: sig.observationText,
                  session: sig.lastPeriodNumber ?? 1,
                }))}
            />
          </div>
        )}

        {tab === 'checkins' && (
          <div>
            {/*
              THE GLANCE ROW, from the board's own components.
              This tab is now the first thing anybody sees about a ground, and it
              was a bare list of session rows - true, but it answered "what
              happened" without answering "where does this stand". The board has
              solved that problem already, so this uses the same Stat tile rather
              than inventing a third way of showing a number.
            */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
              {/*
                THE CAPTION DESCRIBED A DIFFERENT NUMBER TO THE ONE ABOVE IT.
                It read "2 of 6" over "counting the session everyone has
                finished" - but everyone had finished ONE. The value is the round
                now OPEN, which is one past the last one everybody completed, and
                the caption was written for the other reading. Seen on screen,
                not in the source.
              */}
              <Stat
                label="This round"
                value={plannedSessions != null ? `${Math.min(sessionsDone + 1, plannedSessions)} of ${plannedSessions}` : String(sessionsDone + 1)}
                caption="the round now open, one past the last everyone finished"
              />
              <Stat
                label="Checked in"
                value={`${(ground.checkIns ?? []).filter((c: any) => c.status === 'COMPLETED').length}`}
                caption={`across ${(ground.participants ?? []).length} ${(ground.participants ?? []).length === 1 ? 'person' : 'people'}`}
              />
              <Stat
                label="Still to come"
                value={`${(ground.checkIns ?? []).filter((c: any) => c.status !== 'COMPLETED').length}`}
                caption="open check-ins on this ground"
                tone={(ground.checkIns ?? []).filter((c: any) => c.status !== 'COMPLETED').length > 0 ? 'warn' : undefined}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(ground.checkIns ?? []).length === 0 && (
                <div style={{ fontSize: 13, color: 'var(--gw-muted)', textAlign: 'center', padding: 24 }}>No check-ins yet.</div>
              )}
              {/*
                THE ROWS CAME OUT IN NO ORDER AT ALL. W8-66.

                Rendered straight from the payload, so a real twelve-session ground with
                two parties showed twenty-four cards reading "Session 4, Session 1,
                Session 1, Session 4, ..." - which is not a record anybody can read. The
                page never noticed because every ground anyone had looked at had one or
                two sessions, where arbitrary order and correct order look the same.

                Newest session first: the thing an admin opens this for is what just
                happened. Within a session, ordered by who, so the two parties' rows sit
                together and stay put between renders.
              */}
              {[...(ground.checkIns ?? [])]
                .sort((a: any, b: any) =>
                  (b.sessionNumber ?? 0) - (a.sessionNumber ?? 0) ||
                  // A check-in carries `participantId` and nothing else about the person -
                  // the name has to be looked up. My first version of this sorted on
                  // `participantEmail`, a field the payload has never had, so it silently
                  // fell through to the row id. W8-66.
                  String(nameOfParticipant(a.participantId) ?? a.id).localeCompare(
                    String(nameOfParticipant(b.participantId) ?? b.id),
                  ),
                )
                .map((ci: any) => {
                // Check-ins are per-participant-per-session, so a given session
                // number legitimately appears once per party. Label each row
                // with whose check-in it is, or two parties' session-1 rows read
                // as an accidental duplicate.
                const who = (ground.participants ?? []).find((p: any) => p.id === ci.participantId)
                // Name, THEN email. `email` is null for anyone who has an
                // account - their name lives on `user` - so reading email alone
                // made every row in a signed-up org say "Unknown participant",
                // and the admin's main view of who checked in could not name a
                // single person. Email still covers someone invited but not yet
                // registered.
                const whoName = [who?.user?.firstName, who?.user?.lastName].filter(Boolean).join(' ').trim()
                const whoLabel = whoName || who?.email || who?.roleAsDescribed?.trim() || 'Unknown participant'
                /**
                 * YOUR OWN ROWS OPEN. NOBODY ELSE'S EVER DOES.
                 *
                 * These were plain divs with cursor:auto, so a completed session
                 * was a dead card - the transcript renders fine at /checkin/:id and
                 * nothing in the product linked to it. That was most of "I have
                 * no way to see my chats".
                 *
                 * Only the viewer's own check-ins become clickable. An admin
                 * opening a participant's transcript would break the promise the
                 * product makes on every screen - "Nobody reads what you write" -
                 * so the guard is on identity, not on a permission flag.
                 */
                const isMine = !!user?.id && who?.userId === user.id
                const openMine = () => navigate(`/checkin/${ci.id}`)
                return (
                <div
                  key={ci.id}
                  onClick={isMine ? openMine : undefined}
                  onKeyDown={isMine ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openMine() } } : undefined}
                  role={isMine ? 'button' : undefined}
                  tabIndex={isMine ? 0 : undefined}
                  title={isMine ? 'Open your check-in' : undefined}
                  style={{ background: 'white', border: '0.5px solid var(--gw-border)', borderRadius: 8, padding: '12px 14px', cursor: isMine ? 'pointer' : 'default' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>Session {ci.sessionNumber}{isMine ? ' ·  yours' : ''}</div>
                      <div style={{ fontSize: 11, color: 'var(--gw-muted)', marginTop: 2 }}>{whoLabel}</div>
                    </div>
                    <span className={`gw-pill ${ci.status === 'COMPLETED' ? 'gw-pill-green' : ci.status === 'IN_PROGRESS' ? 'gw-pill-amber' : 'gw-pill-gray'}`}>
                      {ci.status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase())}
                    </span>
                  </div>
                  {ci.completedAt && <div style={{ fontSize: 11, color: 'var(--gw-muted)', marginTop: 4 }}>{new Date(ci.completedAt).toLocaleDateString()}</div>}
                </div>
                )
              })}
            </div>
          </div>
        )}

        {/* DOCUMENTS */}
        {tab === 'docs' && (
          <div>
            {/* WHAT THIS GROUND WILL AND WILL NOT BE ABLE TO TELL YOU. (G25)
                Above the upload, because it is the reason to bother with any of
                it. Not a score and not a completeness bar: a statement about the
                REPORT'S limits, given what the ground holds.

                "Your context is 40% complete" makes somebody feel marked at the
                exact moment they are deciding whether this product is on their
                side, and tells them nothing about what the effort buys. "It will
                not be able to tell you whether the conditions were met, because
                none have been named" carries the same information, names the
                missing thing, and is a fact about a tool rather than a judgement
                on a reader.

                Never mandatory and never graded. A ground with thin context is
                still a real ground; this exists so nobody is surprised in month
                three by a question the record was never able to answer. */}
            {contextEnabled && contextStrength && <ContextStrength read={contextStrength} />}

            {/* G37/G23, and the lead's only - it is about setting the ground up. */}
            {contextEnabled && isInitiator && <ContextChat groundId={id!} />}

            <div
              style={{ border: '1.5px dashed var(--gw-border)', borderRadius: 8, padding: 20, textAlign: 'center', cursor: 'pointer', marginBottom: 16, background: 'var(--gw-bg)' }}
              onClick={() => document.getElementById('ga-doc-upload')?.click()}
            >
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gw-navy)', marginBottom: 4 }}>Upload a document</div>
              <div style={{ fontSize: 12, color: 'var(--gw-sub)' }}>PDF, DOCX, JPEG, PNG, CSV, XLSX</div>
              <input type="file" id="ga-doc-upload" style={{ display: 'none' }} accept=".pdf,.docx,.jpeg,.jpg,.png,.csv,.xlsx"
                onChange={e => { const f = e.target.files?.[0]; if (f) uploadDoc.mutate(f); e.target.value = '' }} />
            </div>

            {/*
              AN EMPTY STATE THAT SAYS WHAT TO ADD, NOT THAT NOTHING IS THERE. W8-24.
              
              "No documents uploaded yet." is a sentence about absence, sitting directly
              under an upload control that already says PDF, DOCX, JPEG. It uses the one
              moment somebody is looking at an empty list to tell them it is empty.
            */}
            {docs.length === 0 && (
              <div style={{ fontSize: 13, color: 'var(--gw-sub)', lineHeight: 1.65, padding: '14px 16px', background: 'var(--gw-bg)', borderRadius: 8, border: '1px solid var(--gw-border)' }}>
                The brief, the plan, the scope, the grant terms, or the message that started
                this. Anything you open to the ground is read by every check-in before it asks
                a question, so it shapes what people are asked.
              </div>
            )}

            {/* OPEN AND CLOSED, NAMED AS SUCH. (G38)
                Nobody puts real context into a box whose readership they are
                guessing at, so the destinations are labelled rather than implied.
                Everything defaults to private (G24 rule 3) and moving something
                to open is a deliberate act: a performance plan dropped into
                shared context in a hurried first week cannot be undone, because
                the others have already read it. */}
            {contextEnabled && docs.length > 0 && (
              <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.6, background: 'var(--gw-bg)', borderRadius: 8, padding: '10px 12px', marginBottom: 10 }}>
                Everything you add starts private to you. <b>Open</b> means everyone in this ground can read it, which is what the brief and the plan are for. <b>Only me</b> keeps it yours.
              </div>
            )}
            {docs.map(doc => (
              <div key={doc.id} style={{ background: 'white', border: '0.5px solid var(--gw-border)', borderRadius: 8, padding: '11px 14px', marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{doc.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--gw-muted)' }}>{new Date(doc.uploadedAt).toLocaleDateString()}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {/* WHO CAN READ THIS, stated on the row rather than in a
                      settings screen. Somebody deciding whether to attach a
                      handover note needs the answer where they are, not two
                      clicks away.

                      Only shown with the flag on: with it off there is one
                      answer for every document and a control offering a choice
                      that does not exist would be a lie about the product. */}
                  {contextEnabled && (
                    <button
                      onClick={() => setDocVisibility.mutate({
                        docId: doc.id,
                        visibility: (doc as any).visibility === 'OPEN' ? 'OWN' : 'OPEN',
                      })}
                      disabled={setDocVisibility.isPending || (doc as any).visibility === 'CLOSED'}
                      title={(doc as any).visibility === 'CLOSED'
                        ? 'This is your own context and stays with you'
                        : (doc as any).visibility === 'OPEN'
                          ? 'Everyone in this ground can read this. Click to make it yours only.'
                          : 'Only you can read this. Click to share it with everyone in this ground.'}
                      style={{
                        fontSize: 11, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer',
                        padding: '3px 9px', borderRadius: 20,
                        border: `1px solid ${(doc as any).visibility === 'OPEN' ? '#A7D9CC' : 'var(--gw-border)'}`,
                        background: (doc as any).visibility === 'OPEN' ? '#DFF1EA' : 'var(--gw-bg)',
                        color: (doc as any).visibility === 'OPEN' ? '#085041' : 'var(--gw-sub)',
                      }}
                    >
                      {(doc as any).visibility === 'OPEN' ? 'Everyone' : (doc as any).visibility === 'CLOSED' ? 'Only me' : 'Only me'}
                    </button>
                  )}
                  <button onClick={() => deleteDoc.mutate(doc.id)} style={{ fontSize: 12, color: 'var(--gw-red-t)', background: 'none', border: 'none', cursor: 'pointer' }}>Delete</button>
                </div>
              </div>
            ))}

            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Context notes</div>
              <div className="gw-fld">
                <textarea className="gw-ta" rows={3} value={ctxNote} onChange={e => { setCtxNote(e.target.value.slice(0, 500)); setNoteSaved(false) }} placeholder="Add a context note: changed scope, revised goal, new constraint…" maxLength={500} />
                <div style={{ fontSize: 11, color: 'var(--gw-muted)', textAlign: 'right', marginTop: 2 }}>{ctxNote.length}/500</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <button onClick={() => { if (ctxNote.trim()) addNote.mutate(ctxNote.trim(), { onSuccess: () => setNoteSaved(true) }) }}
                  disabled={addNote.isPending || !ctxNote.trim()}
                  style={{ padding: '8px 16px', borderRadius: 6, background: 'var(--gw-navy)', color: 'white', fontSize: 13, fontWeight: 600, border: 'none', cursor: ctxNote.trim() ? 'pointer' : 'not-allowed', fontFamily: 'inherit', opacity: ctxNote.trim() ? 1 : 0.5 }}>
                  {addNote.isPending ? 'Saving…' : 'Add note'}
                </button>
                {noteSaved && <span style={{ fontSize: 12, color: 'var(--gw-green-t)' }}>Saved</span>}
              </div>
              {(ground.contextNotes ?? []).map((n, i) => (
                <div key={i} style={{ background: 'white', border: '0.5px solid var(--gw-border)', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: 'var(--gw-sub)', marginBottom: 8, lineHeight: 1.6 }}>{n}</div>
              ))}
            </div>

            {user?.id === ground.initiatorId && (
              <div style={{ marginTop: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Context for the AI (private)</div>
                <div style={{ fontSize: 12, color: 'var(--gw-muted)', marginBottom: 10, lineHeight: 1.5 }}>
                  Background only you can add, to steer the synthesis. Never shown to the person it is about, and never quoted as a claim in the report.
                </div>
                <div className="gw-fld">
                  <select className="gw-input" value={leadCtxTarget} onChange={e => { setLeadCtxTarget(e.target.value); setLeadCtxSaved(false) }} style={{ marginBottom: 8 }}>
                    <option value="">About the whole ground</option>
                    {ground.participants.map((p: any) => (
                      <option key={p.id} value={p.id}>About {p.roleAsDescribed || p.email}</option>
                    ))}
                  </select>
                  <textarea className="gw-ta" rows={3} value={leadCtxText} onChange={e => { setLeadCtxText(e.target.value.slice(0, 4000)); setLeadCtxSaved(false) }} placeholder="e.g. Ben has been carrying the on-call rotation solo since March." maxLength={4000} />
                  <div style={{ fontSize: 11, color: 'var(--gw-muted)', textAlign: 'right', marginTop: 2 }}>{leadCtxText.length}/4000</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <button onClick={() => { if (leadCtxText.trim()) addLeadContextMut.mutate() }}
                    disabled={addLeadContextMut.isPending || !leadCtxText.trim()}
                    style={{ padding: '8px 16px', borderRadius: 6, background: 'var(--gw-navy)', color: 'white', fontSize: 13, fontWeight: 600, border: 'none', cursor: leadCtxText.trim() ? 'pointer' : 'not-allowed', fontFamily: 'inherit', opacity: leadCtxText.trim() ? 1 : 0.5 }}>
                    {addLeadContextMut.isPending ? 'Saving…' : 'Add context'}
                  </button>
                  {leadCtxSaved && <span style={{ fontSize: 12, color: 'var(--gw-green-t)' }}>Saved</span>}
                </div>
                {(ground.leadContextNotes ?? []).map(n => {
                  const p = n.participantId ? ground.participants.find((x: any) => x.id === n.participantId) : null
                  const about = n.participantId ? (p?.roleAsDescribed || p?.email || 'a participant') : 'the ground'
                  return (
                    <div key={n.id} style={{ background: 'white', border: '0.5px solid var(--gw-border)', borderRadius: 8, padding: '10px 12px', marginBottom: 8 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gw-muted)', marginBottom: 2 }}>About {about}</div>
                      <div style={{ fontSize: 13, color: 'var(--gw-sub)', lineHeight: 1.6 }}>{n.text}</div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* REPORT */}
        {tab === 'report' && (
          <div>
            {/* What the accounts actually agree on. This was a big "4/5" over
                a band name over a canned description - all three derived from
                the number of completed check-ins. */}
            <div style={{ textAlign: 'center', padding: '20px 0 16px' }}>
              {alignRead ? (
                <>
                  <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--gw-navy)' }}>{alignRead}</div>
                  <div style={{ fontSize: 12, color: 'var(--gw-sub)', marginTop: 4 }}>
                    Counted from the areas this report names, not from how many check-ins have happened.
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--gw-sub)' }}>No read yet</div>
                  <div style={{ fontSize: 12, color: 'var(--gw-sub)', marginTop: 4 }}>
                    The report has not named an area the accounts agree or differ on.
                  </div>
                </>
              )}
            </div>

            {/* Session switcher */}
            {report?.releasedAt && (
              <div style={{ display: 'flex', gap: 6, marginBottom: 16, background: 'var(--gw-bg)', border: '0.5px solid var(--gw-border)', borderRadius: 8, padding: 4 }}>
                {(['s1', 's2', 'closing'] as ReportSession[]).map(s => (
                  <button
                    key={s}
                    onClick={() => setReportSession(s)}
                    style={{ flex: 1, padding: '7px 0', borderRadius: 6, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 600, background: reportSession === s ? 'white' : 'transparent', color: reportSession === s ? 'var(--gw-navy)' : 'var(--gw-sub)', boxShadow: reportSession === s ? '0 1px 3px rgba(0,0,0,.08)' : 'none', transition: 'all .15s' }}
                  >
                    {{ s1: 'Session 1', s2: 'Session 2', closing: 'Closing' }[s]}
                  </button>
                ))}
              </div>
            )}

            {report?.releasedAt && activationStatus && (
              <div style={{ background: 'var(--gw-bg)', border: '0.5px solid var(--gw-border)', borderRadius: 9, padding: '12px 14px', marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gw-sub)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 }}>
                  Report reveal status {activationStatus.allActivated ? '· Both activated' : '· Waiting'}
                </div>
                {!activationStatus.allActivated && (
                  <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.55, marginBottom: 10 }}>
                    Each person sees their own report privately until they choose to reveal it. When everybody activates, the reports become visible to each other. Each person can do this from their own ground page.
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8 }}>
                  {activationStatus.parties.map((p, i) => (
                    <div key={p.participantId} style={{ flex: 1, padding: '8px 10px', borderRadius: 7, background: p.activated ? 'rgba(8,80,65,0.07)' : 'white', border: `1px solid ${p.activated ? '#085041' : 'var(--gw-border)'}`, textAlign: 'center' }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: p.activated ? '#085041' : 'var(--gw-sub)' }}>
                        {p.activated ? 'Revealed' : 'Not yet'}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--gw-sub)', marginTop: 2 }}>Party {i + 1}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(report?.releasedAt || (report as any)?.forming) && (
              <button
                onClick={() => navigate(`/grounds/${id}/report`)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%',
                  background: 'var(--gw-navy)', color: 'white', border: 'none', borderRadius: 10,
                  padding: '14px 18px', marginBottom: 16, cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 700 }}>
                  {(report as any)?.forming ? 'View the forming report (Venn view)' : 'View the full shared report (Venn view)'}
                </span>
                <span style={{ fontSize: 13 }}>→</span>
              </button>
            )}

            {report?.releasedAt ? (
              <div>
                {/* Pattern */}
                {report.pattern && (
                  <div style={{ background: 'var(--gw-navy)', color: 'white', borderRadius: 10, padding: 16, marginBottom: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <svg width="18" height="11" viewBox="0 0 36 22" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0, opacity: 0.7 }}>
                        <circle cx="11" cy="11" r="9" stroke="white" strokeWidth="2.5" fill="none"/>
                        <circle cx="25" cy="11" r="9" stroke="white" strokeWidth="2.5" fill="none"/>
                        <path d="M18 3.2C20.6 5.2 22.2 7.9 22.2 11C22.2 14.1 20.6 16.8 18 18.8C15.4 16.8 13.8 14.1 13.8 11C13.8 7.9 15.4 5.2 18 3.2Z" fill="rgba(100,130,255,0.7)"/>
                      </svg>
                      <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,.55)' }}>What we heard</div>
                    </div>
                    <div style={{ fontSize: 14, lineHeight: 1.65 }}>{report.pattern}</div>
                  </div>
                )}

                {/* Reached */}
                {report.reached && report.reached.length > 0 && (
                  <ReportSection title="Reached" open>
                    {report.reached.map((r: any, i: number) => (
                      <div key={i} style={{ marginBottom: 10 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{r.title}</div>
                        <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.55 }}>{r.note}</div>
                      </div>
                    ))}
                  </ReportSection>
                )}

                {/* Areas */}
                {report.areas && report.areas.length > 0 && (
                  <ReportSection title="Areas">
                    {report.areas.map((a: any, i: number) => (
                      <div key={i} style={{ marginBottom: 14 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 3 }}>{a.title}</div>
                        <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.55, marginBottom: 4 }}>{a.observation}</div>
                        {a.recommendation && <div style={{ fontSize: 12, color: 'var(--gw-navy)', lineHeight: 1.55 }}>{a.recommendation}</div>}
                      </div>
                    ))}
                  </ReportSection>
                )}

                {/* Agreements (closing) */}
                {report.agreed && report.agreed.length > 0 && (
                  <ReportSection title="Agreed">
                    <ul style={{ listStyle: 'disc', paddingLeft: 18 }}>{report.agreed.map((a: string, i: number) => <li key={i} style={{ marginBottom: 4, fontSize: 13 }} dangerouslySetInnerHTML={{ __html: a }} />)}</ul>
                  </ReportSection>
                )}

                {/* Honest close */}
                {report.close && (
                  <ReportSection title="Honest close">
                    {[
                      { label: 'Aligned', text: report.close.aligned },
                      { label: 'Still open', text: report.close.open },
                      { label: 'To revisit', text: report.close.revisit },
                      { label: 'Risk', text: report.close.risk },
                    ].filter(r => r.text).map(r => (
                      <div key={r.label} style={{ marginBottom: 10 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gw-sub)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 3 }}>{r.label}</div>
                        <div style={{ fontSize: 13, lineHeight: 1.55 }}>{r.text}</div>
                      </div>
                    ))}
                  </ReportSection>
                )}

                {/* Legacy flat fields */}
                {!report.pattern && report.sharedPicture && (
                  <div style={{ background: 'var(--gw-navy)', color: 'white', borderRadius: 10, padding: 16, marginBottom: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <svg width="18" height="11" viewBox="0 0 36 22" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0, opacity: 0.7 }}>
                        <circle cx="11" cy="11" r="9" stroke="white" strokeWidth="2.5" fill="none"/>
                        <circle cx="25" cy="11" r="9" stroke="white" strokeWidth="2.5" fill="none"/>
                        <path d="M18 3.2C20.6 5.2 22.2 7.9 22.2 11C22.2 14.1 20.6 16.8 18 18.8C15.4 16.8 13.8 14.1 13.8 11C13.8 7.9 15.4 5.2 18 3.2Z" fill="rgba(100,130,255,0.7)"/>
                      </svg>
                      <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,.55)' }}>Resolution summary</div>
                    </div>
                    <div style={{ fontSize: 14, lineHeight: 1.65 }}>{report.sharedPicture}</div>
                    <button onClick={() => navigator.clipboard?.writeText(report.sharedPicture).then(() => toast.success('Copied'))}
                      style={{ marginTop: 12, fontSize: 12, fontWeight: 600, color: 'white', background: 'rgba(255,255,255,.15)', border: 'none', cursor: 'pointer', padding: '7px 12px', borderRadius: 6, fontFamily: 'inherit' }}>
                      Copy
                    </button>
                  </div>
                )}
                {!report.areas && report.divergences?.length > 0 && (
                  <ReportSection title="Divergences">
                    {report.divergences.map((d: any, i: number) => (
                      <div key={i} style={{ marginBottom: 12 }}>
                        <div style={{ fontWeight: 600, marginBottom: 6 }}>{d.topic}</div>
                        {d.positions.map((pos: any) => (
                          <div key={pos.participantLabel} style={{ fontSize: 12, color: 'var(--gw-sub)', marginBottom: 4 }}>
                            <strong>{pos.participantLabel}:</strong> {pos.view}
                          </div>
                        ))}
                      </div>
                    ))}
                  </ReportSection>
                )}

                {/* Visible Updates trail (Honest Corrections): a self-correction
                    session shows up here as a flagged, dated entry instead of
                    being silently blended into the synthesis above. No
                    correction TEXT is shown - only who, when, and whether it
                    happened after that party had already signed off. */}
                {Array.isArray((report as any).updates) && (report as any).updates.length > 0 && (
                  <ReportSection title="Updates" open>
                    {((report as any).updates as any[]).map((u, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, padding: '4px 0' }}>
                        <div style={{ fontSize: 12.5, color: 'var(--gw-text)' }}>
                          {u.email ?? 'A party'} updated their account
                          {u.completedAt ? ` on ${new Date(u.completedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}` : ''}
                        </div>
                        {u.isPostSignOff && (
                          <span style={{ fontSize: 10.5, fontWeight: 700, color: '#8A5C1A', background: '#FDF3E3', borderRadius: 6, padding: '2px 8px', flexShrink: 0 }}>
                            Updated after sign-off
                          </span>
                        )}
                      </div>
                    ))}
                  </ReportSection>
                )}

                {/* Fix 17: Post-report offboarding */}
                <div style={{ marginTop: 16, background: 'var(--gw-bg)', border: '0.5px solid var(--gw-border)', borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gw-sub)', marginBottom: 10 }}>What now?</div>
                  {[
                    { title: 'Share the report', body: 'Everybody can now read the full report. Use the report link or a shared doc to talk it through together.' },
                    { title: 'Act on the areas requiring alignment', body: 'Pick the highest-priority gap and set a concrete next step. Name who owns it and by when.' },
                    { title: 'Open a follow-up ground', body: 'If there is ongoing work to track, open a new ground to keep the record current as things develop.' },
                  ].map(s => (
                    <div key={s.title} style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{s.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.55 }}>{s.body}</div>
                    </div>
                  ))}
                  <button onClick={() => navigate('/grounds/new')} style={{ marginTop: 4, fontSize: 13, fontWeight: 700, color: 'var(--gw-navy)', background: 'none', border: '1px solid var(--gw-blue-b)', borderRadius: 7, padding: '8px 14px', cursor: 'pointer', fontFamily: 'inherit' }}>
                    Open a follow-up ground →
                  </button>
                </div>
              </div>
            ) : report?.createdAt ? (
              <div>
                <div style={{ background: 'var(--gw-bg)', border: '0.5px solid var(--gw-border)', borderRadius: 10, padding: 16, marginBottom: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Report is ready</div>
                  <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.6, marginBottom: 14 }}>Everybody has completed their sessions. When you release the report, everybody sees it at the same moment - nobody reads it before anybody else. Billing activates on release.</div>
                  {!showReleaseConfirm ? (
                    <button onClick={() => setShowReleaseConfirm(true)}
                      style={{ width: '100%', padding: 12, borderRadius: 7, background: 'var(--gw-navy)', color: 'white', fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                      {isOrgAdmin && !isInitiator ? 'Release on the lead\'s behalf' : 'Release report to everybody'}
                    </button>
                  ) : (
                    <div style={{ background: '#FDF3E3', border: '1px solid #E8A94A', borderRadius: 8, padding: '14px 16px' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#8A5C1A', marginBottom: 6 }}>Release report?</div>
                      <div style={{ fontSize: 12, color: '#6B6560', lineHeight: 1.6, marginBottom: 14 }}>Everybody will see the report at the same moment. This cannot be undone. Billing activates on release.</div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => setShowReleaseConfirm(false)}
                          style={{ flex: 1, padding: '9px 12px', borderRadius: 7, background: 'none', border: '1px solid #E2E0DB', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', color: 'var(--gw-sub)' }}>
                          Cancel
                        </button>
                        <button onClick={() => { releaseReport.mutate(); setShowReleaseConfirm(false) }} disabled={releaseReport.isPending}
                          style={{ flex: 1, padding: '9px 12px', borderRadius: 7, background: 'var(--gw-navy)', color: 'white', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                          {releaseReport.isPending ? 'Releasing…' : 'Confirm release'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ background: 'var(--gw-bg)', border: '0.5px solid var(--gw-border)', borderRadius: 10, padding: 16, marginBottom: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Waiting for sessions</div>
                <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.6, marginBottom: 12 }}>The report generates once everybody has completed their sessions.</div>
                <button onClick={() => setTab('checkins')} style={{ fontSize: 12, color: 'var(--gw-navy)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit', fontWeight: 600, textDecoration: 'underline' }}>
                  View check-in progress
                </button>
              </div>
            )}
          </div>
        )}

        {/* SETTINGS */}
        {tab === 'settings' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* HOW LONG THIS RUNS, AND HOW OFTEN.
                There was no way to change either after creation, anywhere in the
                product. A ground created at the wrong length - which the old
                admin creation form did silently, because it never asked - was
                stuck that way, and a three-month onboarding that thinks it is a
                thirty-day one stops asking people to check in two thirds of the
                way through. */}
            {/* WHETHER THESE PEOPLE ACTUALLY SEE EACH OTHER'S WORK.
                The scenario can only guess, and the guess decides whether the
                board's fairness reads have anything to stand on. Where nobody can
                corroborate anybody, a quiet account is just a quiet account - and
                treating it as work going missing is how a competent person gets
                reported as absent on a ground that decides their job. */}
            {isInitiator && (
              <div className="gw-fld">
                <label className="gw-label">Do these people work together?</label>
                <div style={{ fontSize: 12, color: 'var(--gw-sub)', marginBottom: 8, lineHeight: 1.5 }}>
                  Can they see each other's work day to day? If they cannot, nobody here is in a position
                  to confirm anyone else's account, and the board says so rather than reading a quiet
                  account as work going missing.
                </div>
                <div role="radiogroup" aria-label="Do these people work together?" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {[
                    { v: true, label: 'Yes, they work together', sub: 'They see each other\'s work, so they can corroborate each other.' },
                    { v: false, label: 'No, they work separately', sub: 'Same role or same programme, different places. Nobody sees anybody else\'s work.' },
                  ].map((o) => {
                    const current = ground.peopleWorkTogether
                    const selected = current === o.v
                    return (
                      <div key={String(o.v)} role="radio" aria-checked={selected}
                        tabIndex={selected || (current == null && o.v) ? 0 : -1}
                        aria-label={`${o.label}. ${o.sub}`}
                        onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); (e.currentTarget as HTMLElement).click() } }}
                        onClick={() => groundsApi.setPeopleWorkTogether(id!, o.v)
                          .then(() => { toast.success('Saved'); qc.invalidateQueries({ queryKey: ['ground', id] }) })
                          .catch(() => toast.error('Could not save that.'))}
                        className={`cg-sit-card${selected ? ' selected' : ''}`}
                        style={{ cursor: 'pointer' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ fontSize: 13, fontWeight: 700 }}>{o.label}</div>
                          <div style={{ width: 15, height: 15, borderRadius: '50%', flexShrink: 0, border: `2px solid ${selected ? 'var(--gw-navy)' : 'var(--gw-border)'}`, background: selected ? 'var(--gw-navy)' : 'transparent' }} />
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.45, marginTop: 2 }}>{o.sub}</div>
                      </div>
                    )
                  })}
                </div>
                {ground.peopleWorkTogether == null && (
                  <div style={{ fontSize: 11.5, color: 'var(--gw-muted)', marginTop: 6, lineHeight: 1.5 }}>
                    Not set. Until you answer, this is assumed from the kind of ground you chose.
                  </div>
                )}
              </div>
            )}

            {isInitiator && (
              <div className="gw-fld">
                <label className="gw-label">How long this runs</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <select className="gw-input" aria-label="Timeframe" value={timelineDaysDraft}
                    onChange={(e) => setTimelineDaysDraft(Number(e.target.value))} style={{ background: 'white' }}>
                    {[7, 14, 30, 60, 90, 180, 365].map((d) => (
                      <option key={d} value={d}>{d === 7 ? '1 week' : d === 14 ? '2 weeks' : d === 365 ? '12 months' : d === 180 ? '6 months' : `${d} days`}</option>
                    ))}
                  </select>
                  <select className="gw-input" aria-label="Check-in cadence" value={cadenceDraft}
                    onChange={(e) => setCadenceDraft(e.target.value as GroundCadence)} style={{ background: 'white' }}>
                    {TIMED_CADENCES.map((c) => <option key={c.cadence} value={c.cadence}>{c.label}</option>)}
                  </select>
                </div>
                <div style={{ fontSize: 12, color: 'var(--gw-sub)', marginTop: 6 }}>
                  {sessionsFor(timelineDaysDraft, cadenceDraft) ?? 1} sessions over {timelineDaysDraft} days.
                  {' '}Sessions already completed are never removed.
                </div>
                <button
                  disabled={timelineDaysDraft === ground.timelineDays && cadenceDraft === ground.cadence}
                  onClick={() => groundsApi.update(id!, { timelineWeeks: Math.max(1, Math.round(timelineDaysDraft / 7)), cadence: cadenceDraft })
                    .then(() => { toast.success('Updated'); qc.invalidateQueries({ queryKey: ['ground', id] }) })
                    .catch(() => toast.error('Could not update how long this runs.'))}
                  style={{ marginTop: 8, fontSize: 12, color: 'var(--gw-navy)', background: 'none', border: '0.5px solid var(--gw-blue-b)', borderRadius: 5, padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit', opacity: (timelineDaysDraft !== ground.timelineDays || cadenceDraft !== ground.cadence) ? 1 : 0.4 }}
                >
                  Save timeframe
                </button>
              </div>
            )}
            <div className="gw-fld">
              <label className="gw-label">Ground name</label>
              <input className="gw-input" value={groundLabel} onChange={e => setGroundLabel(e.target.value)} />
              <button
                disabled={!groundLabel.trim() || groundLabel === ground.label}
                onClick={() => { if (groundLabel.trim() && groundLabel !== ground.label) groundsApi.update(id!, { label: groundLabel.trim() }).then(() => qc.invalidateQueries({ queryKey: ['ground', id] })).catch(() => toast.error('Could not update name.')) }}
                style={{ marginTop: 6, fontSize: 12, color: 'var(--gw-navy)', background: 'none', border: '0.5px solid var(--gw-blue-b)', borderRadius: 5, padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit', opacity: (groundLabel.trim() && groundLabel !== ground.label) ? 1 : 0.4 }}
              >
                Save name
              </button>
            </div>
            <div className="gw-fld">
              <label className="gw-label">Scenario</label>
              <select
                className="gw-input"
                value={groundScenario}
                onChange={e => setGroundScenario(e.target.value)}
                style={{ background: 'white' }}
              >
                {([
                  ['NEW_HIRE', 'New hire'],
                  ['NEW_PROJECT', 'New project'],
                  ['NEW_ADVISOR', 'New board member'],
                  ['NEW_COFOUNDER', 'New partner'],
                  ['CONTRACT_RENEWAL', 'Contract renewal'],
                  ['PIP', 'PIP'],
                  ['OKR_ALIGNMENT', 'Goals & planning'],
                  ['PULSE_CHECK', 'Pulse check'],
                  ['DRIFT', 'New direction'],
                ] as [string, string][]).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
              <button
                disabled={!groundScenario || groundScenario === ground.scenario}
                onClick={() => { if (groundScenario && groundScenario !== ground.scenario) groundsApi.update(id!, { scenario: groundScenario } as any).then(() => qc.invalidateQueries({ queryKey: ['ground', id] })).catch(() => toast.error('Could not update scenario.')) }}
                style={{ marginTop: 6, fontSize: 12, color: 'var(--gw-navy)', background: 'none', border: '0.5px solid var(--gw-blue-b)', borderRadius: 5, padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit', opacity: (groundScenario && groundScenario !== ground.scenario) ? 1 : 0.4 }}
              >
                Save scenario
              </button>
            </div>
            <div className="gw-fld">
              <label className="gw-label">Participant contact details</label>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, padding: '12px 14px', border: '0.5px solid var(--gw-blue-b)', borderRadius: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gw-navy)', marginBottom: 4 }}>Hide email addresses between participants</div>
                  <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.6 }}>
                    {contactHidden
                      ? "Participants can see who's here (names, roles, and presence) but can't see each other's email addresses. Good for cohorts of individuals who don't need to contact each other."
                      : "Participants can see each other's email addresses. Only turn this off when everyone is meant to be in contact. Turning it off lets participants collect each other's contacts."}
                  </div>
                </div>
                <button
                  role="switch"
                  aria-checked={contactHidden}
                  aria-label="Hide email addresses between participants"
                  disabled={setContactVisibility.isPending}
                  onClick={() => setContactVisibility.mutate(!contactHidden)}
                  style={{ flexShrink: 0, width: 42, height: 24, borderRadius: 999, border: 'none', cursor: setContactVisibility.isPending ? 'wait' : 'pointer', background: contactHidden ? 'var(--gw-navy)' : '#CFD8E3', position: 'relative', transition: 'background 0.15s', opacity: setContactVisibility.isPending ? 0.5 : 1, padding: 0 }}
                >
                  <span style={{ position: 'absolute', top: 2, left: contactHidden ? 20 : 2, width: 20, height: 20, borderRadius: '50%', background: 'white', transition: 'left 0.15s', boxShadow: '0 1px 2px rgba(0,0,0,0.2)' }} />
                </button>
              </div>
            </div>
            <button onClick={() => navigate('/billing')}
              style={{ width: '100%', padding: 11, borderRadius: 7, background: 'none', color: 'var(--gw-navy)', fontSize: 13, fontWeight: 600, border: '1px solid var(--gw-blue-b)', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Billing and seats</span><span style={{ color: 'var(--gw-sub)' }}>→</span>
            </button>
            <button
              onClick={() => { setShareCodeId(id ?? null); setShareCodeModalOpen(true) }}
              style={{ width: '100%', padding: 11, borderRadius: 7, background: 'none', color: 'var(--gw-navy)', fontSize: 13, fontWeight: 600, border: '1px solid var(--gw-blue-b)', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
            >
              <span>Share code</span><span style={{ color: 'var(--gw-sub)' }}>↗</span>
            </button>
            <div style={{ padding: 14, background: 'var(--gw-red-bg)', border: '0.5px solid var(--gw-red-b)', borderRadius: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gw-red-t)', marginBottom: 6 }}>Close ground</div>
              <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.6, marginBottom: 10 }}>
                Closing a ground permanently archives it. All parties keep their records. This action cannot be undone.
                {isOrgAdmin && !isInitiator && ' You are not the lead of this ground - closing it ends something somebody else is running.'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--gw-muted)', marginBottom: 8 }}>
                Self-serve close is coming. For now, email{' '}
                <a href={`mailto:hello@myground.work?subject=Archive ground: ${encodeURIComponent(ground.label)}`} style={{ color: 'var(--gw-navy)', textDecoration: 'underline' }}>hello@myground.work</a>
                {' '}and we will archive it manually.
              </div>
              <button disabled style={{ fontSize: 13, fontWeight: 600, color: 'var(--gw-red-t)', background: 'none', border: '1px solid var(--gw-red-b)', padding: '8px 14px', borderRadius: 6, cursor: 'not-allowed', fontFamily: 'inherit', opacity: 0.4 }}>
                Close this ground
              </button>
            </div>
          </div>
        )}
      </div>
      {shareCodeModalOpen && (
        <div
          onClick={() => setShareCodeModalOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
        >
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 400 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>Share an access code</span>
              <button onClick={() => setShareCodeModalOpen(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.6)', fontSize: 18, cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>
            {shareCardLoading && (
              <div style={{ color: 'rgba(255,255,255,.5)', fontSize: 13, textAlign: 'center', padding: 24 }}>Loading…</div>
            )}
            {!shareCardLoading && shareCardData && (
              <CodeShareCard
                code={shareCardData.code}
                expiresAt={shareCardData.expiresAt}
                daysRemaining={shareCardData.daysRemaining}
                note={shareCardData.note}
                allowCodeCreation={shareCardData.allowCodeCreation}
                onCopy={() => toast.success('Code copied')}
              />
            )}
            {!shareCardLoading && !shareCardData && (
              <div style={{ color: 'rgba(255,255,255,.5)', fontSize: 13, textAlign: 'center', padding: 24 }}>No share code available for this ground.</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div style={{ minHeight: '100vh', background: 'var(--gw-bg)' }}>{children}</div>
}

/** Shown when a ground is AWAITING_LEAD - an admin set this up and named this
 * person to lead it. They review the admin's context, can edit it or add more
 * participants, and confirm when ready. Their own session 1 only opens once
 * they confirm - not synchronized with the admin in any way, deliberately
 * worded to avoid the false-simultaneity framing found elsewhere in this app. */
function LeadConfirmView({ ground, groundId, onConfirmed }: { ground: any; groundId: string; onConfirmed: (checkInId: string | null) => void }) {
  const [brief, setBrief] = useState(ground.brief ?? '')
  const [showAddParticipant, setShowAddParticipant] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [newRole, setNewRole] = useState('')
  const [participants, setParticipants] = useState<{ email: string; roleAsDescribed?: string | null }[]>(
    (ground.participants ?? []).filter((p: any) => p.partyType === 'PARTICIPANT'),
  )
  const [confirming, setConfirming] = useState(false)
  const [addingParticipant, setAddingParticipant] = useState(false)
  // Also-checking-in is the common case and the default; managing-only is a
  // deliberate opt-out from having your own account in the comparison.
  const [alsoCheckingIn, setAlsoCheckingIn] = useState(true)
  // The lead's own remit. If the admin did not state it, this is the last point
  // at which it can be captured - without it the lead is the only person the
  // board cannot read.
  const [myRemit, setMyRemit] = useState('')

  async function addParticipant() {
    if (!newEmail.includes('@')) return
    setAddingParticipant(true)
    try {
      await groundsApi.addParticipant(groundId, { email: newEmail.trim(), roleAsDescribed: newRole.trim() || undefined })
      setParticipants(v => [...v, { email: newEmail.trim(), roleAsDescribed: newRole.trim() || null }])
      setNewEmail(''); setNewRole(''); setShowAddParticipant(false)
      toast.success('Invited')
    } catch {
      toast.error('Could not add that participant. Try again.')
    } finally {
      setAddingParticipant(false)
    }
  }

  async function confirmAndBegin() {
    setConfirming(true)
    try {
      const res = await groundsApi.confirmLead(groundId, { brief: brief.trim() || undefined, managingOnly: !alsoCheckingIn, remit: myRemit.trim() || undefined })
      onConfirmed(res.checkInId)
    } catch {
      toast.error('Could not confirm. Try again.')
      setConfirming(false)
    }
  }

  return (
    <Shell>
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '48px 20px' }}>
        <div style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--gw-sub)', fontWeight: 700, marginBottom: 8 }}>You lead this ground</div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--gw-navy)', margin: '0 0 6px', letterSpacing: '-.01em' }}>{ground.label}</h1>
        <p style={{ fontSize: 13.5, color: 'var(--gw-sub)', lineHeight: 1.6, marginBottom: 16 }}>
          An admin set this up and named you to lead it. You decide when to begin - this is not a synchronized moment with anyone else.
        </p>

        <div className="gw-box gw-box-blue" style={{ marginBottom: 24 }}>
          Groundwork records each person's account of a situation independently, then shows where they agree and where they differ. As lead, you will see who has checked in and the shared report once it releases. You will not see what anyone wrote - accounts stay private until the report is ready.
        </div>

        <div style={{ marginBottom: 8, fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--gw-sub)' }}>Context (edit if needed)</div>
        <textarea value={brief} onChange={e => setBrief(e.target.value)} rows={4}
          placeholder="What is this ground about?"
          style={{ width: '100%', padding: '10px 12px', fontSize: 13.5, border: '1px solid var(--gw-border)', borderRadius: 8, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', resize: 'vertical', marginBottom: 20 }} />

        <div style={{ marginBottom: 8, fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--gw-sub)' }}>
          Participants {participants.length > 0 ? `(${participants.length})` : ''}
        </div>
        {participants.length > 0 && (
          <div style={{ border: '1px solid var(--gw-border)', borderRadius: 8, overflow: 'hidden', marginBottom: 10 }}>
            {participants.map((p, i) => (
              <div key={i} style={{ padding: '9px 12px', fontSize: 13, borderBottom: i < participants.length - 1 ? '1px solid var(--gw-border)' : 'none', display: 'flex', justifyContent: 'space-between' }}>
                <span>{p.email}</span>
                {p.roleAsDescribed && <span style={{ color: 'var(--gw-sub)' }}>{p.roleAsDescribed}</span>}
              </div>
            ))}
          </div>
        )}
        {!showAddParticipant ? (
          <button onClick={() => setShowAddParticipant(true)} style={{ fontSize: 13, color: 'var(--gw-navy)', background: 'none', border: '1px solid var(--gw-border)', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontFamily: 'inherit', marginBottom: 24 }}>
            + Add someone
          </button>
        ) : (
          <div style={{ border: '1px solid var(--gw-border)', borderRadius: 8, padding: 12, marginBottom: 24 }}>
            <input type="email" placeholder="email@company.com" value={newEmail} onChange={e => setNewEmail(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', fontSize: 13, border: '1px solid var(--gw-border)', borderRadius: 6, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', marginBottom: 6 }} />
            <input type="text" placeholder="Role (optional)" value={newRole} onChange={e => setNewRole(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', fontSize: 13, border: '1px solid var(--gw-border)', borderRadius: 6, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', marginBottom: 8 }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={addParticipant} disabled={addingParticipant || !newEmail.includes('@')} style={{ padding: '7px 14px', borderRadius: 6, background: 'var(--gw-navy)', color: 'white', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'inherit', opacity: addingParticipant || !newEmail.includes('@') ? 0.5 : 1 }}>
                {addingParticipant ? 'Adding…' : 'Add'}
              </button>
              <button onClick={() => setShowAddParticipant(false)} style={{ padding: '7px 14px', borderRadius: 6, background: 'none', color: 'var(--gw-sub)', border: '1px solid var(--gw-border)', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}>
                Cancel
              </button>
            </div>
          </div>
        )}

        <div style={{ marginBottom: 8, fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--gw-sub)' }}>Your part in this</div>
        {/* Only asked when the lead is giving their own account - a managing-only
            lead has no contribution to read, so no remit is needed. */}
        {alsoCheckingIn && (
          <div style={{ marginBottom: 8 }}>
            <input
              type="text"
              value={myRemit}
              onChange={(e) => setMyRemit(e.target.value)}
              placeholder="What are you responsible for on this ground?"
              style={{ width: '100%', padding: '9px 12px', fontSize: 13, border: '1px solid var(--gw-border)', borderRadius: 8, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
            />
            <div style={{ fontSize: 11.5, color: 'var(--gw-sub)', marginTop: 4, lineHeight: 1.5 }}>
              Without this you are the one person the board cannot read against a role, and the questions you get will be generic.
            </div>
          </div>
        )}
        <div style={{ border: '1px solid var(--gw-border)', borderRadius: 8, overflow: 'hidden', marginBottom: 8 }}>
          <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '11px 12px', borderBottom: '1px solid var(--gw-border)', cursor: 'pointer', background: alsoCheckingIn ? 'var(--gw-bg)' : 'transparent' }}>
            <input type="radio" checked={alsoCheckingIn} onChange={() => setAlsoCheckingIn(true)} style={{ marginTop: 3 }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gw-text)' }}>I'm also checking in</div>
              <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.5 }}>You give your own account, same as everyone else. Recommended - most leads are also a party to the situation.</div>
            </div>
          </label>
          <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '11px 12px', cursor: 'pointer', background: !alsoCheckingIn ? 'var(--gw-bg)' : 'transparent' }}>
            <input type="radio" checked={!alsoCheckingIn} onChange={() => setAlsoCheckingIn(false)} style={{ marginTop: 3 }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gw-text)' }}>Managing only</div>
              <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.5 }}>You oversee this ground but won't give your own account. You'll still see who has checked in and the shared report once it releases - you're just not one of the accounts being compared.</div>
            </div>
          </label>
        </div>

        <button onClick={confirmAndBegin} disabled={confirming} className="gw-btn" style={{ width: '100%', opacity: confirming ? 0.6 : 1 }}>
          {confirming ? 'Confirming…' : 'Confirm and begin →'}
        </button>
      </div>
    </Shell>
  )
}

function ReportSection({ title, children, open: initialOpen = false }: { title: string; children: React.ReactNode; open?: boolean }) {
  const [open, setOpen] = useState(initialOpen)
  return (
    <div className={`gw-report-section${open ? ' open' : ''}`} style={{ marginBottom: 10 }}>
      <div className="gw-report-section-hdr" onClick={() => setOpen(o => !o)}>
        <span>{title}</span>
        <span style={{ color: 'var(--gw-muted)', fontSize: 12 }}>{open ? '▲' : '▼'}</span>
      </div>
      <div className="gw-report-section-body">{children}</div>
    </div>
  )
}

function ShareSection({ joinToken }: { joinToken: string }) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const baseUrl = window.location.origin
  const joinUrl = `${baseUrl}/join?t=${joinToken}`

  useEffect(() => {
    import('qrcode').then(QRCode => {
      QRCode.toDataURL(joinUrl, { width: 180, margin: 1 }).then(setQrDataUrl).catch(() => {})
    }).catch(() => {})
  }, [joinUrl])

  function copyLink() {
    navigator.clipboard?.writeText(joinUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div style={{ background: 'white', border: '1px solid #E2E0DB', borderRadius: 10, padding: '16px', marginTop: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#9B9590', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 10 }}>Broadcast link</div>
      <div style={{ fontSize: 13, color: '#4A4540', lineHeight: 1.6, marginBottom: 14 }}>
        Share this link or QR code - anyone can check in without creating an account first. They'll be asked to save their details at the end.
      </div>
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {qrDataUrl && (
          <img src={qrDataUrl} alt="QR code" style={{ width: 100, height: 100, borderRadius: 6, border: '1px solid #E2E0DB', flexShrink: 0 }} />
        )}
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: 11, color: '#9B9590', marginBottom: 6, wordBreak: 'break-all', fontFamily: 'monospace' }}>{joinUrl}</div>
          <button
            onClick={copyLink}
            style={{ padding: '8px 14px', borderRadius: 7, background: copied ? '#E7F6EF' : '#F5F3EF', border: '1px solid #E2E0DB', color: copied ? '#085041' : '#0A1628', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            {copied ? 'Copied!' : 'Copy link'}
          </button>
        </div>
      </div>
    </div>
  )
}
