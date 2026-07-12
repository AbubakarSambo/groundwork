import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { groundsApi } from '@/api/grounds'
import { reportsApi } from '@/api/reports'
import { apiClient } from '@/api/client'
import { useAuthStore } from '@/stores/auth'
import { InferenceReviewPanel } from '@/components/InferenceReviewPanel'
import { VennIcon } from '@/components/gw/VennIcon'

type ViewTab = 'shared' | 'own'

interface ResolutionStatus {
  resolution: { id: string; endState: string; closedAt: string | null } | null
  confirmations: { participantId: string; label: string; endState: string | null; confirmed: boolean }[]
  confirmedCount: number
  totalActive: number
  groundStatus: string
}

function ResolutionSection({ groundId, resolutionState }: { groundId: string; resolutionState?: string | null }) {
  const { data } = useQuery({
    queryKey: ['resolution', groundId],
    queryFn: () => apiClient.get<ResolutionStatus>(`/grounds/${groundId}/resolution`).then(r => r.data),
    retry: false,
  })
  const isClosed = data?.groundStatus === 'RESOLVED' || data?.groundStatus === 'CLOSED'

  return (
    <div style={{ background: 'white', border: '1px solid #E2E0DB', borderRadius: 12, padding: '16px 18px', marginBottom: 18 }}>
      <div style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: '#9B9590', fontWeight: 700, marginBottom: 10 }}>Resolution</div>
      {resolutionState && (
        <div style={{ marginBottom: data ? 12 : 0 }}>
          <span style={{ fontSize: 9.5, letterSpacing: '.07em', textTransform: 'uppercase', fontWeight: 700, color: '#9B9590', display: 'block', marginBottom: 2 }}>Agreed at the start</span>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{resolutionState}</div>
        </div>
      )}
      {data && (
        <div>
          <span style={{ fontSize: 9.5, letterSpacing: '.07em', textTransform: 'uppercase', fontWeight: 700, color: '#9B9590', display: 'block', marginBottom: 6 }}>Current status</span>
          {isClosed && data.resolution ? (
            <div style={{ background: '#E7F6EF', borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#085041' }}>Closed: {data.resolution.endState}</div>
              <div style={{ fontSize: 12, color: '#3A7A60', marginTop: 2 }}>All {data.totalActive} parties confirmed the same end state.</div>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 13, marginBottom: 8 }}>{data.confirmedCount} of {data.totalActive} parties have confirmed an end state.</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {data.confirmations.map((c) => (
                  <div key={c.participantId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, padding: '6px 10px', background: '#F7F6F3', borderRadius: 6 }}>
                    <span>{c.label}</span>
                    <span style={{ color: c.confirmed ? '#085041' : '#9B9590', fontWeight: 600 }}>{c.confirmed ? c.endState : 'Not yet'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      {!resolutionState && !data?.resolution && (
        <div style={{ fontSize: 13, color: '#9B9590' }}>No resolution state set for this ground yet.</div>
      )}
    </div>
  )
}

const LADDER_STEPS = ['Unresolved', 'Mixed', 'Emerging', 'Clear', 'Aligned'] as const

function deriveStatus(agreements: string[], divergences: any[], contributedParties = 2): { label: string; steps: number } {
  const a = agreements.length
  const d = divergences.length
  // Alignment is two-sided. With fewer than 2 parties on record, the ceiling is
  // "Clear" (one side is clearly stated) - never "Aligned".
  if (contributedParties < 2) {
    if (a > 0 && d <= 1) return { label: 'Clear', steps: 4 }
    if (a > 0 && d <= 2) return { label: 'Emerging', steps: 3 }
    if (a > 0 || d > 0) return { label: 'Mixed', steps: 2 }
    return { label: 'Unresolved', steps: 1 }
  }
  if (a > 0 && d === 0) return { label: 'Aligned', steps: 5 }
  if (a > 0 && d <= 1) return { label: 'Clear', steps: 4 }
  if (a > 0 && d <= 2) return { label: 'Emerging', steps: 3 }
  if (a > 0 || d > 0) return { label: 'Mixed', steps: 2 }
  return { label: 'Unresolved', steps: 1 }
}

function StatusLadder({ steps, label }: { steps: number; label: string }) {
  const isAligned = label === 'Aligned'
  return (
    <div style={{ display: 'flex', gap: 4, marginTop: 10 }}>
      {LADDER_STEPS.map((step, i) => {
        const filled = i < steps
        return (
          <div key={step} style={{
            flex: 1, textAlign: 'center', fontSize: 9, letterSpacing: '.03em',
            textTransform: 'uppercase', padding: '5px 2px', borderRadius: 5, fontWeight: 700,
            background: filled ? (isAligned ? '#085041' : '#0C447C') : '#EFEDE8',
            color: filled ? '#fff' : '#9B9590',
          }}>
            {step}
          </div>
        )
      })}
    </div>
  )
}

function PatternBlock({ label, content, dark }: { label: string; content: string; dark?: boolean }) {
  return (
    <div style={{ background: dark ? '#0E3A30' : '#0A1628', color: '#fff', borderRadius: 11, padding: '15px 17px', marginBottom: 16 }}>
      <div style={{ fontSize: 10.5, letterSpacing: '.1em', textTransform: 'uppercase', color: '#5DCAA5', fontWeight: 700, marginBottom: 8 }}>
        {label}
      </div>
      <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: 'rgba(255,255,255,.93)' }}>{content}</p>
    </div>
  )
}

function AreaBlock({ title, observation, whyItMatters, recommendedMove, reached, note }: {
  title: string
  observation?: string
  whyItMatters?: string
  recommendedMove?: string
  reached?: boolean
  note?: string
}) {
  return (
    <div style={{
      border: '1px solid #E2E0DB', borderRadius: 10, padding: '12px 14px', marginBottom: 10,
      borderLeft: `3px solid ${reached ? '#5DCAA5' : '#E8A94A'}`,
    }}>
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>{title}</div>
      {note && <div style={{ fontSize: 12.5, color: '#6B6560' }}>{note}</div>}
      {observation && (
        <div style={{ fontSize: 13, lineHeight: 1.5, marginBottom: 7 }}>
          <span style={{ fontSize: 9.5, letterSpacing: '.07em', textTransform: 'uppercase', fontWeight: 700, color: '#9B9590', display: 'block', marginBottom: 1 }}>Observation</span>
          {observation}
        </div>
      )}
      {whyItMatters && (
        <div style={{ fontSize: 13, lineHeight: 1.5, marginBottom: 7 }}>
          <span style={{ fontSize: 9.5, letterSpacing: '.07em', textTransform: 'uppercase', fontWeight: 700, color: '#9B9590', display: 'block', marginBottom: 1 }}>Why it matters</span>
          {whyItMatters}
        </div>
      )}
      {recommendedMove && (
        <div style={{ background: '#E7F6EF', borderRadius: 7, padding: '8px 10px', fontSize: 13, color: '#085041', lineHeight: 1.5 }}>
          <span style={{ fontSize: 9.5, letterSpacing: '.07em', textTransform: 'uppercase', fontWeight: 700, color: '#085041', opacity: 0.75, display: 'block', marginBottom: 2 }}>Recommended move</span>
          {recommendedMove}
        </div>
      )}
    </div>
  )
}

function HonestClose({ aligned, open, revisit, risk }: {
  aligned?: string; open?: string; revisit?: string; risk?: string
}) {
  const cells = [
    { label: 'Aligned', value: aligned, bg: '#E7F6EF', color: '#085041' },
    { label: 'Open',    value: open,    bg: '#FDF3E3', color: '#8A5C1A' },
    { label: 'Revisit', value: revisit, bg: '#EEF4FB', color: '#0C447C' },
    { label: 'Risk',    value: risk,    bg: '#F8ECEA', color: '#B5675A' },
  ]
  const visible = cells.filter(c => c.value)
  if (visible.length === 0) return null
  return (
    <div>
      <div style={{ fontSize: 10.5, letterSpacing: '.09em', textTransform: 'uppercase', color: '#9B9590', fontWeight: 700, margin: '0 0 9px' }}>An honest close</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {cells.map(cell => cell.value ? (
          <div key={cell.label} style={{ borderRadius: 8, padding: '10px 12px', fontSize: 12.5, lineHeight: 1.5, color: '#1A1916', background: cell.bg }}>
            <span style={{ fontSize: 9.5, letterSpacing: '.07em', textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: 3, color: cell.color }}>{cell.label}</span>
            {cell.value}
          </div>
        ) : null)}
      </div>
    </div>
  )
}

function Bullet({ text }: { text: string }) {
  return (
    <div style={{ display: 'flex', gap: 9, fontSize: 13, lineHeight: 1.55, marginBottom: 7 }}>
      <span style={{ flexShrink: 0, marginTop: '.55em', width: 5, height: 5, borderRadius: '50%', background: '#5DCAA5', display: 'inline-block' }} />
      <span>{text}</span>
    </div>
  )
}

function SecH({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 10.5, letterSpacing: '.09em', textTransform: 'uppercase', color: '#9B9590', fontWeight: 700, margin: '0 0 9px' }}>
      {children}
    </div>
  )
}

export function ReportPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)
  const [tab, setTab] = useState<ViewTab>('shared')

  const { data: ground, isLoading: gl } = useQuery({
    queryKey: ['ground', id],
    queryFn: () => groundsApi.get(id!),
    enabled: !!id,
  })

  const { data: report, isLoading: rl } = useQuery({
    queryKey: ['report', id],
    queryFn: () => reportsApi.get(id!),
    enabled: !!id,
    retry: false,
  })

  const PAGE_STYLE: React.CSSProperties = {
    minHeight: '100vh',
    background: '#EDECEA',
    color: '#1A1916',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    lineHeight: 1.55,
    WebkitFontSmoothing: 'antialiased',
  }

  if (gl || rl) {
    return (
      <div style={{ ...PAGE_STYLE, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: 13, color: '#9B9590' }}>Loading report…</div>
      </div>
    )
  }

  if (!ground) {
    return (
      <div style={{ ...PAGE_STYLE, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <div style={{ fontSize: 13, color: '#6B6560' }}>Report not found.</div>
        <button onClick={() => navigate(-1)} style={{ fontSize: 12, color: '#0C447C', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Go back</button>
      </div>
    )
  }

  if (!report || (!(report as any).sharedPicture && !(report as any).forming)) {
    return (
      <div style={{ ...PAGE_STYLE, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <div style={{ fontSize: 13, color: '#9B9590' }}>Your report will appear here once at least one person has checked in.</div>
        <button onClick={() => navigate(-1)} style={{ fontSize: 12, color: '#0C447C', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Go back</button>
      </div>
    )
  }

  const isForming = !report.releasedAt
  const progress = (report as any).sessionProgress as
    | { sessionNumber: number; total: number; completed: number; requestingUserIsMissing: boolean }
    | null
    | undefined

  const myParticipant = (ground.participants ?? []).find((p: any) => p.userId === user?.id)
  const isAdmin = myParticipant?.partyType === 'INITIATOR'
  const backUrl = isAdmin ? `/grounds/${id}` : `/grounds/${id}/p`

  const adminParty = (ground.participants ?? []).find((p: any) => p.partyType === 'INITIATOR')
  const partParty = (ground.participants ?? []).find((p: any) => p.partyType !== 'INITIATOR')
  const adminHandle = adminParty?.email?.split('@')[0] ?? 'Admin'
  const partHandle = partParty?.email?.split('@')[0] ?? 'Participant'

  const agreements = report.agreements ?? []
  const divergences = report.divergences ?? []
  const contributedParties = ((report.engagement ?? {}) as any).parties?.filter((p: any) => p.contributed).length ?? 2
  const { label: statusLabel, steps: statusSteps } = deriveStatus(agreements, divergences, contributedParties)

  const eng = (report.engagement ?? {}) as any
  const areas: any[] = eng.areas ?? []
  const hasAreas = areas.length > 0

  const honestClose = eng.honestClose ?? {
    aligned: agreements.length > 0 ? agreements.slice(0, 2).join('. ') : undefined,
    open: divergences.length > 0 ? divergences.map((d: any) => d.topic).join('. ') : undefined,
    revisit: report.centralQuestion || undefined,
    risk: undefined,
  }

  const solo = report.soloArtifact
  const releasedDate = report.releasedAt
    ? new Date(report.releasedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null

  const sessionPhrase =
    statusLabel === 'Aligned' ? 'Aligned, and honest about what to watch.' :
    statusLabel === 'Clear'   ? 'The substance is settled.' :
    statusLabel === 'Emerging' ? 'A pattern is forming.' :
    statusLabel === 'Mixed'   ? 'Some gaps remain.' :
    'Getting started.'

  return (
    <div style={PAGE_STYLE}>

      {/* HEADER */}
      <header style={{ background: '#0A1628', color: '#fff', padding: '40px 0 34px' }}>
        <div style={{ maxWidth: 1040, margin: '0 auto', padding: '0 20px' }}>
          <button
            onClick={() => navigate(backUrl)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,.55)', fontSize: 13, fontFamily: 'inherit', padding: 0, marginBottom: 22, display: 'block' }}
          >
            ← Back
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ background: 'white', borderRadius: 4, padding: '3px 4px', display: 'inline-flex' }}><VennIcon size={24} /></span>
            <span style={{ fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: '#5DCAA5', fontWeight: 700 }}>Shared report</span>
          </div>
          <h1 style={{ fontSize: 30, lineHeight: 1.1, letterSpacing: '-.02em', margin: '0 0 12px', fontWeight: 800 }}>
            Where everyone's accounts agree or differ.
          </h1>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,.72)', maxWidth: 640, margin: 0 }}>
            {report.sharedPicture}
          </p>
          <div style={{ marginTop: 20, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {[
              ground.label,
              adminHandle,
              partParty ? partHandle : null,
              releasedDate ? `Released ${releasedDate}` : 'Still forming',
            ].filter(Boolean).map(pill => (
              <span key={pill as string} style={{ fontSize: 12, background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.16)', borderRadius: 20, padding: '5px 12px', color: 'rgba(255,255,255,.9)' }}>
                {pill}
              </span>
            ))}
          </div>

          {/* OWN / SHARED TOGGLE - always visible so it's clear these are two
              distinct reports, not one merged document. */}
          {solo && (
            <div style={{ marginTop: 24, display: 'inline-flex', background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.16)', borderRadius: 10, padding: 3, gap: 2 }}>
              {(['shared', 'own'] as ViewTab[]).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  style={{
                    fontSize: 13, fontWeight: 700, padding: '7px 16px', borderRadius: 7, border: 'none', cursor: 'pointer',
                    background: tab === t ? '#fff' : 'transparent',
                    color: tab === t ? '#0A1628' : 'rgba(255,255,255,.75)',
                  }}
                >
                  {t === 'shared' ? 'Shared report' : 'Your report'}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* FORMING BANNER - the picture updates as people check in; this isn't
          the final, mutually-revealed report yet. */}
      {isForming && progress && (
        <div style={{ background: '#FDF3E3', borderBottom: '1px solid #F0DDB0' }}>
          <div style={{ maxWidth: 1040, margin: '0 auto', padding: '12px 20px', fontSize: 13, color: '#8A5C1A' }}>
            <strong>Picture forming</strong> - {progress.completed} of {progress.total} checked in.
            {progress.requestingUserIsMissing ? ' You haven\'t checked in yet for this round - that\'s part of what\'s still missing.' : ' This updates as more people check in.'}
          </div>
        </div>
      )}

      {/* LEGEND */}
      <section style={{ background: 'white', borderBottom: '1px solid #E2E0DB' }}>
        <div style={{ maxWidth: 1040, margin: '0 auto', padding: '0 20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)' }}>
            {[
              { h: 'What Groundwork saw', p: 'Every report opens with the pattern across the accounts - the thing no single person could see on their own.' },
              { h: 'A move for every area', p: 'Each area carries an observation, why it matters, and a recommended move. The status is auditable, not a grade.' },
              { h: 'Honest closes', p: 'Decisions rarely finish clean. Each report names what is aligned, what is open, what to revisit, and what risk remains.' },
            ].map((cell, i) => (
              <div key={i} style={{ padding: '18px 22px', borderRight: i < 2 ? '1px solid #E2E0DB' : 'none' }}>
                <div style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: '#9B9590', fontWeight: 700, marginBottom: 7 }}>{cell.h}</div>
                <div style={{ fontSize: 12.5, color: '#6B6560', lineHeight: 1.5 }}>{cell.p}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BODY */}
      <div style={{ maxWidth: 1040, margin: '0 auto', padding: '34px 20px 60px' }}>

        {/* Session header */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', fontWeight: 700, color: '#0C447C' }}>
            {ground.label}
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-.01em', margin: '4px 0 2px' }}>
            {sessionPhrase}
          </div>
          <div style={{ fontSize: 13, color: '#6B6560' }}>{releasedDate ? `Released ${releasedDate}` : 'Still forming - not yet released'}</div>
        </div>

        <ResolutionSection groundId={id!} resolutionState={(ground as any).resolutionState} />

        {/* Cards - the toggle above picks which one shows; without a solo
            report to toggle to, the shared report is the only thing here. */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 18 }}>

          {/* SHARED / GROUND REPORT CARD */}
          {(!solo || tab === 'shared') && (
          <div style={{ background: 'white', border: '1px solid #E2E0DB', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '13px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0C447C', color: '#fff' }}>
              <span style={{ fontSize: 13, fontWeight: 800 }}>Ground report</span>
              <span style={{ fontSize: 11, opacity: 0.82 }}>for {adminHandle}</span>
            </div>
            <div style={{ padding: '16px 18px 18px' }}>

              <PatternBlock label="What Groundwork saw" content={report.sharedPicture} />

              {/* Alignment status */}
              <div style={{ marginBottom: 16 }}>
                <SecH>Alignment status</SecH>
                <div style={{ fontSize: 18, fontWeight: 800 }}>{statusLabel}</div>
                <div style={{ fontSize: 12.5, color: '#6B6560', marginTop: 2, lineHeight: 1.5 }}>
                  {agreements.length > 0 && divergences.length > 0
                    ? `${agreements.length} area${agreements.length !== 1 ? 's' : ''} aligned, ${divergences.length} requiring attention.`
                    : agreements.length > 0
                    ? `${agreements.length} area${agreements.length !== 1 ? 's' : ''} aligned.`
                    : divergences.length > 0
                    ? `${divergences.length} area${divergences.length !== 1 ? 's' : ''} require attention.`
                    : 'Building the picture.'}
                </div>
                <StatusLadder steps={statusSteps} label={statusLabel} />
              </div>

              {/* Areas requiring alignment */}
              {divergences.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <SecH>Areas requiring alignment</SecH>
                  {hasAreas
                    ? areas.filter((a: any) => !a.reached).map((area: any, i: number) => (
                        <AreaBlock key={i} title={area.title} observation={area.observation} whyItMatters={area.whyItMatters} recommendedMove={area.recommendedMove} />
                      ))
                    : divergences.map((d: any, i: number) => (
                        <AreaBlock key={i} title={d.topic} observation={d.positions.map((p: any) => p.view).join(' ')} />
                      ))
                  }
                </div>
              )}

              {/* Alignment reached */}
              {agreements.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <SecH>Alignment reached</SecH>
                  {hasAreas
                    ? areas.filter((a: any) => a.reached).map((area: any, i: number) => (
                        <AreaBlock key={i} title={area.title} note={area.note} reached />
                      ))
                    : agreements.map((a: string, i: number) => (
                        <div key={i} style={{ border: '1px solid #E2E0DB', borderRadius: 10, padding: '12px 14px', marginBottom: 10, borderLeft: '3px solid #5DCAA5' }}>
                          <div style={{ fontSize: 12.5, color: '#6B6560' }}>{a}</div>
                        </div>
                      ))
                  }
                </div>
              )}

              <HonestClose aligned={honestClose.aligned} open={honestClose.open} revisit={honestClose.revisit} risk={honestClose.risk} />

              {report.centralQuestion && (
                <div style={{ marginTop: 16, background: '#EEF4FB', borderRadius: 8, padding: '10px 12px' }}>
                  <SecH>What comes next</SecH>
                  <div style={{ fontSize: 13, color: '#1A1916', lineHeight: 1.6 }}>{report.centralQuestion}</div>
                </div>
              )}
            </div>
          </div>
          )}

          {/* PARTICIPANT / OWN REPORT CARD */}
          {solo && tab === 'own' && (
            <div style={{ background: 'white', border: '1px solid #E2E0DB', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '13px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#085041', color: '#fff' }}>
                <span style={{ fontSize: 13, fontWeight: 800 }}>Contributor report</span>
                <span style={{ fontSize: 11, opacity: 0.82 }}>for {partHandle}</span>
              </div>
              <div style={{ padding: '16px 18px 18px' }}>

                <PatternBlock label="What your contribution reveals" content={solo.summary} dark />

                {solo.whatToCarry && (
                  <div style={{ marginBottom: 16 }}>
                    <SecH>What to carry forward</SecH>
                    <Bullet text={solo.whatToCarry} />
                  </div>
                )}

                {divergences.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <SecH>Questions worth resolving</SecH>
                    {divergences.map((d: any, i: number) => (
                      <Bullet key={i} text={`What would alignment on ${d.topic.toLowerCase()} look like to you?`} />
                    ))}
                  </div>
                )}

                <div style={{ marginBottom: 16 }}>
                  <SecH>Your account, so far</SecH>
                  <div style={{ fontSize: 18, fontWeight: 800 }}>{statusLabel}</div>
                  <div style={{ fontSize: 12.5, color: '#6B6560', marginTop: 2, lineHeight: 1.5 }}>
                    {agreements.length > 0
                      ? `Clear on ${agreements.length} area${agreements.length !== 1 ? 's' : ''}${divergences.length > 0 ? `. ${divergences.length} still open.` : '.'}`
                      : 'Building the picture.'}
                  </div>
                </div>

                <div style={{ fontSize: 12, color: '#6B6560', background: '#F4F1EA', border: '1px solid #E5DFD2', borderRadius: 8, padding: '10px 12px', lineHeight: 1.55 }}>
                  This record is yours. It is portable and permanent. You can add this ground to your Groundwork profile.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Who is on record + how specific each account was (#33). */}
        {Array.isArray(eng.parties) && eng.parties.length > 0 && (
          <div style={{ marginTop: 32 }}>
            <div style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: '#9B9590', fontWeight: 700, marginBottom: 10 }}>On record</div>
            <div style={{ border: '1px solid #E2E0DB', borderRadius: 10, overflow: 'hidden' }}>
              {eng.parties.map((p: any, i: number) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 14px', borderBottom: i < eng.parties.length - 1 ? '1px solid #EFEDE8' : 'none', background: 'white' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1916' }}>{p.label}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                    <span style={{ fontSize: 11, color: '#9B9590' }}>
                      {!p.contributed
                        ? 'not yet checked in'
                        : p.recordEntries > 0
                        ? `${p.sessions ?? 0} session${(p.sessions ?? 0) !== 1 ? 's' : ''}`
                        : 'checked in, no record'}
                    </span>
                    {p.contributed && p.recordEntries > 0 && p.specificityLabel && (
                      <span title="How concrete their account was" style={{ fontSize: 11, fontWeight: 700, borderRadius: 6, padding: '2px 8px',
                        background: p.specificityLabel === 'high' ? '#E7F6EF' : p.specificityLabel === 'moderate' ? '#EEF4FB' : '#FDF3E3',
                        color: p.specificityLabel === 'high' ? '#085041' : p.specificityLabel === 'moderate' ? '#0C447C' : '#8A5C1A' }}>
                        {p.specificityLabel} specificity
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {report.inferences && report.inferences.length > 0 && (
          <InferenceReviewPanel groundId={id!} inferences={report.inferences} />
        )}

        {/* Always-visible correction affordance (#21): the per-claim "Correct this"
            only appears when there are inferred claims, so make correction discoverable. */}
        <div style={{ marginTop: 24, background: '#F7F6F3', border: '1px solid #E2E0DB', borderRadius: 10, padding: '14px 16px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1A1916', marginBottom: 4 }}>Something not right in this report?</div>
          <div style={{ fontSize: 12.5, color: '#6B6560', lineHeight: 1.6 }}>
            {report.inferences && report.inferences.length > 0
              ? 'Inferred claims above have a "Correct this" button that opens a short follow-up to fix the record. '
              : ''}
            For anything else, start a new session on this ground to add to or correct the record. Reports are built from what is on record, so adding a session updates the picture.
          </div>
        </div>

        <div style={{ marginTop: 40, paddingTop: 24, borderTop: '1px solid #E2E0DB', fontSize: 12, color: '#9B9590', lineHeight: 1.6 }}>
          This report is permanent. Both parties keep it, and it is portable to each of your profiles.
        </div>
      </div>
    </div>
  )
}
