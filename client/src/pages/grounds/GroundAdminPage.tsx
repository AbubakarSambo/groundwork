import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth'
import { groundsApi } from '@/api/grounds'
import { reportsApi } from '@/api/reports'
import { documentsApi } from '@/api/documents'
import { conversationApi } from '@/api/conversation'
import { participantRequestsApi } from '@/api/participantRequests'
import { participantsApi } from '@/api/participants'
import type { ParticipantRequest } from '@/api/participantRequests'
import { toast } from 'sonner'
import { CodeShareCard } from '@/components/CodeShareCard'
import { PostSessionPanel } from '@/components/PostSessionPanel'
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

const BANDS = ['', 'Unresolved', 'Mixed', 'Emerging', 'Clear', 'Aligned']
function bandLabel(score?: number) { return BANDS[score ?? 1] ?? 'Unresolved' }

const CONF_DESC: Record<number, string> = {
  1: 'One account only. The other party is needed.',
  2: 'Two accounts. Picture is forming.',
  3: 'Three sessions. Pattern visible but not confirmed.',
  4: 'Four sessions. Evidence strong. Recommendation defensible.',
  5: 'Five sessions. Full picture. High confidence.',
}

type Tab = 'overview' | 'checkins' | 'docs' | 'report' | 'settings'
type ReportSession = 's1' | 's2' | 'closing'

export function GroundAdminPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const user = useAuthStore(s => s.user)
  const [tab, setTab] = useState<Tab>('overview')
  const [reportSession, setReportSession] = useState<ReportSession>('s1')
  const [ctxNote, setCtxNote] = useState('')
  const [groundLabel, setGroundLabel] = useState('')
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

  const deleteDoc = useMutation({
    mutationFn: (docId: string) => documentsApi.remove(id!, docId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['docs', id] }),
  })

  const isInitiator = !!ground && user?.id === ground.initiatorId

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
    mutationFn: async (req: ParticipantRequest) => {
      await participantRequestsApi.update(id!, req.id, 'APPROVED')
      await groundsApi.addParticipant(id!, { email: req.requestedEmail })
    },
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
    onError: () => toast.error('Could not add contributor.'),
  })

  useEffect(() => {
    if (ground?.label) setGroundLabel(prev => prev || ground.label)
    if (ground?.scenario) setGroundScenario(prev => prev || ground.scenario)
  }, [ground?.label, ground?.scenario])

  if (isLoading) return <Shell><div style={{ padding: 24, fontSize: 13, color: 'var(--gw-muted)' }}>Loading…</div></Shell>
  if (!ground) return <Shell><div style={{ padding: 24, fontSize: 13, color: 'var(--gw-muted)' }}>Ground not found.</div></Shell>

  if (ground.status === 'AWAITING_LEAD') {
    return (
      <LeadConfirmView
        ground={ground}
        groundId={id!}
        onConfirmed={(checkInId) => {
          // managing only -> no check-in was created; land the lead on their
          // own admin view instead of trying to open a check-in that does
          // not exist. also-checking-in -> unchanged, straight into the
          // real engine.
          if (checkInId) navigate(`/chat/${checkInId}`)
          else qc.invalidateQueries({ queryKey: ['ground', id] })
        }}
      />
    )
  }

  const conf = ground.confidence ?? 1
  const bl = bandLabel(conf)
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
                <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 20, background: 'var(--gw-blue-bg)', color: 'var(--gw-navy)' }}>{MOMENT_LABELS[ground.moment] ?? ground.moment}</span>
                {ground.status === 'ACTIVE' && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--gw-green-b)', display: 'inline-block' }} />}
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--gw-navy)' }}>{conf}/5</div>
            <div style={{ fontSize: 11, color: 'var(--gw-sub)' }}>{bl}</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, padding: '0 16px 10px', fontSize: 11, color: 'var(--gw-sub)', flexWrap: 'wrap', alignItems: 'center' }}>
          {ground.scenario && (
            <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: '#F0EEE9', color: '#4A4540' }}>
              {SCENARIO_LABELS[ground.scenario] ?? ground.scenario.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase())}
            </span>
          )}
          {ground.resolutionState && (
            <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: 'var(--gw-blue-bg)', color: 'var(--gw-navy)' }}>{ground.resolutionState}</span>
          )}
          {ground.daysLeft != null && ground.daysLeft <= 3 ? (
            <span style={{ fontWeight: 700, color: '#791F1F' }}>{ground.daysLeft === 0 ? 'Due today' : `${ground.daysLeft} day${ground.daysLeft === 1 ? '' : 's'} remaining`}</span>
          ) : ground.daysLeft != null ? (
            <span>{ground.daysLeft} days remaining</span>
          ) : null}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderTop: '0.5px solid var(--gw-border)', overflowX: 'auto' }}>
          {(['overview', 'checkins', 'docs', 'report', 'settings'] as Tab[]).map(t => (
            <button key={t} className={`gw-tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
              {{ overview: 'Overview', checkins: 'Check-ins', docs: 'Documents', report: 'Report', settings: 'Settings' }[t]}
            </button>
          ))}
        </div>
      </div>

      <div className="gw-bd" style={{ paddingTop: 12, maxWidth: 600, margin: '0 auto', width: '100%' }}>

        {/* OVERVIEW */}
        {tab === 'overview' && (
          <div>
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
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{p.email}</div>
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
                              <button
                                onClick={() => { setEditingRoleId(p.id); setEditingRoleValue(p.roleAsDescribed ?? '') }}
                                title="Edit role"
                                style={{ fontSize: 10, color: 'var(--gw-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px', lineHeight: 1 }}
                              >✎</button>
                            </div>
                          )}
                          <div style={{ fontSize: 11, color: 'var(--gw-muted)' }}>{status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase())}</div>
                        </div>
                        {myCheckIn?.id && status !== 'COMPLETED' && p.userId && (
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
                            {p.email.split('@')[0]}'s private report (shared by them)
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
                    They will get an email and do their own private check-in - about 10 minutes. You cannot see what they write. Once all contributors have checked in, the shared report releases to everyone at the same time.
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
                          Your {plan?.replace('_', ' ').toLowerCase()} plan supports up to {limit} members. You have reached the limit. Upgrade your organization to add more contributors.
                          <button onClick={() => navigate('/billing')} style={{ display: 'inline', marginLeft: 8, background: 'none', border: 'none', fontSize: 12, color: '#7A4B00', textDecoration: 'underline', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
                            View plans
                          </button>
                        </div>
                      )
                    }
                    return null
                  })()}
                  <button onClick={() => setAddingParticipant(true)} style={{ width: '100%', padding: '11px 16px', borderRadius: 8, background: 'none', color: 'var(--gw-navy)', fontSize: 13, fontWeight: 600, border: '1px dashed var(--gw-blue-b)', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <span style={{ fontSize: 16, fontWeight: 300 }}>+</span> Add a contributor
                  </button>
                  {!['RESOLVED', 'CLOSED', 'STALLED', 'AWAITING_LEAD'].includes(ground.status) && (
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
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Add a contributor</div>
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

            {ground.joinToken && (
              <ShareSection joinToken={ground.joinToken} />
            )}
          </div>
        )}

        {/* CHECK-INS */}
        {tab === 'checkins' && (
          <div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(ground.checkIns ?? []).length === 0 && (
                <div style={{ fontSize: 13, color: 'var(--gw-muted)', textAlign: 'center', padding: 24 }}>No check-ins yet.</div>
              )}
              {ground.checkIns?.map((ci: any) => {
                // Check-ins are per-participant-per-session, so a given session
                // number legitimately appears once per party. Label each row
                // with whose check-in it is, or two parties' session-1 rows read
                // as an accidental duplicate.
                const who = (ground.participants ?? []).find((p: any) => p.id === ci.participantId)
                const whoLabel = who?.email ?? 'Unknown participant'
                return (
                <div key={ci.id} style={{ background: 'white', border: '0.5px solid var(--gw-border)', borderRadius: 8, padding: '12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>Session {ci.sessionNumber}</div>
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
            <div
              style={{ border: '1.5px dashed var(--gw-border)', borderRadius: 8, padding: 20, textAlign: 'center', cursor: 'pointer', marginBottom: 16, background: 'var(--gw-bg)' }}
              onClick={() => document.getElementById('ga-doc-upload')?.click()}
            >
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gw-navy)', marginBottom: 4 }}>Upload a document</div>
              <div style={{ fontSize: 12, color: 'var(--gw-sub)' }}>PDF, DOCX, JPEG, PNG, CSV, XLSX</div>
              <input type="file" id="ga-doc-upload" style={{ display: 'none' }} accept=".pdf,.docx,.jpeg,.jpg,.png,.csv,.xlsx"
                onChange={e => { const f = e.target.files?.[0]; if (f) uploadDoc.mutate(f); e.target.value = '' }} />
            </div>

            {docs.length === 0 && <div style={{ fontSize: 13, color: 'var(--gw-muted)', textAlign: 'center', padding: 16 }}>No documents uploaded yet.</div>}
            {docs.map(doc => (
              <div key={doc.id} style={{ background: 'white', border: '0.5px solid var(--gw-border)', borderRadius: 8, padding: '11px 14px', marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{doc.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--gw-muted)' }}>{new Date(doc.uploadedAt).toLocaleDateString()}</div>
                </div>
                <button onClick={() => deleteDoc.mutate(doc.id)} style={{ fontSize: 12, color: 'var(--gw-red-t)', background: 'none', border: 'none', cursor: 'pointer' }}>Delete</button>
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
            {/* Confidence band header */}
            <div style={{ textAlign: 'center', padding: '20px 0 16px' }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--gw-navy)' }}>{conf}/5</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--gw-sub)', marginTop: 2 }}>{bl}</div>
              <div style={{ fontSize: 12, color: 'var(--gw-sub)', marginTop: 4 }}>{CONF_DESC[conf] ?? ''}</div>
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
                    Each party sees their own report privately until they choose to reveal it. When both parties activate, the reports become visible to each other. Each person can do this from their own ground page.
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

                {/* Fix 17: Post-report offboarding */}
                <div style={{ marginTop: 16, background: 'var(--gw-bg)', border: '0.5px solid var(--gw-border)', borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gw-sub)', marginBottom: 10 }}>What now?</div>
                  {[
                    { title: 'Share the report', body: 'Both parties can now view the full report. Use the report link or a shared doc to talk through it together.' },
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
                  <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.6, marginBottom: 14 }}>Both parties have completed their sessions. When you release the report, both parties see it simultaneously - neither reads it before the other. Billing activates on release.</div>
                  {!showReleaseConfirm ? (
                    <button onClick={() => setShowReleaseConfirm(true)}
                      style={{ width: '100%', padding: 12, borderRadius: 7, background: 'var(--gw-navy)', color: 'white', fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                      Release report to both parties
                    </button>
                  ) : (
                    <div style={{ background: '#FDF3E3', border: '1px solid #E8A94A', borderRadius: 8, padding: '14px 16px' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#8A5C1A', marginBottom: 6 }}>Release report?</div>
                      <div style={{ fontSize: 12, color: '#6B6560', lineHeight: 1.6, marginBottom: 14 }}>Both parties will see the report simultaneously. This cannot be undone. Billing activates on release.</div>
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
                <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.6, marginBottom: 12 }}>The report generates after both parties complete their sessions.</div>
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
              <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.6, marginBottom: 10 }}>Closing a ground permanently archives it. All parties keep their records. This action cannot be undone.</div>
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
              <span style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>Share contributor code</span>
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
      const res = await groundsApi.confirmLead(groundId, { brief: brief.trim() || undefined, managingOnly: !alsoCheckingIn })
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
