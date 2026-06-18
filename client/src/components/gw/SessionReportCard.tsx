import { useEffect, useState } from 'react'
import { reportsApi } from '@/api/reports'
import { conversationApi } from '@/api/conversation'
import type { Report } from '@/types'

// ---------------------------------------------------------------------------
// Alignment ladder labels + colours
// ---------------------------------------------------------------------------
const LADDER = ['Unresolved', 'Mixed', 'Emerging', 'Clear', 'Aligned'] as const
const LADDER_INDEX: Record<string, number> = {
  Unresolved: 0, Mixed: 1, Emerging: 2, Clear: 3, Aligned: 4,
  'Clear, trending to aligned': 3,
}

function AlignmentLadder({ status, closed }: { status: string; closed?: boolean }) {
  const idx = LADDER_INDEX[status] ?? 0
  return (
    <div style={{ display: 'flex', gap: 3, marginTop: 8 }}>
      {LADDER.map((l, i) => {
        const on = i <= idx
        const bg = on ? (closed ? 'var(--gw-green-b)' : 'var(--gw-navy)') : '#EFEDE8'
        const color = on ? '#fff' : 'var(--gw-muted)'
        return (
          <div key={l} style={{ flex: 1, textAlign: 'center', fontSize: 9, fontWeight: 700, letterSpacing: '.03em', textTransform: 'uppercase', padding: '4px 2px', borderRadius: 4, background: bg, color }}>
            {l}
          </div>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Honest close grid
// ---------------------------------------------------------------------------
interface CloseItem { label: string; text: string; bg: string; labelColor: string }

function HonestClose({ items }: { items: CloseItem[] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
      {items.map(c => (
        <div key={c.label} style={{ background: c.bg, borderRadius: 7, padding: '8px 10px', fontSize: 12, lineHeight: 1.5 }}>
          <span style={{ fontSize: 9, letterSpacing: '.07em', textTransform: 'uppercase', fontWeight: 700, color: c.labelColor, display: 'block', marginBottom: 2 }}>{c.label}</span>
          {c.text}
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Area block (observation / why / recommended move)
// ---------------------------------------------------------------------------
interface Area { title: string; observation: string; whyItMatters: string; move: string; reached?: boolean; reachedNote?: string }

function AreaBlock({ area }: { area: Area }) {
  if (area.reached) {
    return (
      <div style={{ border: '1px solid var(--gw-border)', borderRadius: 9, padding: '11px 13px', borderLeft: '3px solid var(--gw-green-b)', marginBottom: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 5 }}>{area.title}</div>
        <div style={{ fontSize: 12.5, color: 'var(--gw-sub)', lineHeight: 1.5 }}>{area.reachedNote}</div>
      </div>
    )
  }
  return (
    <div style={{ border: '1px solid var(--gw-border)', borderRadius: 9, padding: '11px 13px', borderLeft: '3px solid var(--gw-amber-b)', marginBottom: 8 }}>
      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>{area.title}</div>
      <div style={{ marginBottom: 6 }}>
        <span style={{ fontSize: 9.5, letterSpacing: '.07em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--gw-muted)', display: 'block', marginBottom: 1 }}>Observation</span>
        <span style={{ fontSize: 13, lineHeight: 1.5 }}>{area.observation}</span>
      </div>
      <div style={{ marginBottom: 6 }}>
        <span style={{ fontSize: 9.5, letterSpacing: '.07em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--gw-muted)', display: 'block', marginBottom: 1 }}>Why it matters</span>
        <span style={{ fontSize: 13, lineHeight: 1.5 }}>{area.whyItMatters}</span>
      </div>
      <div style={{ background: 'var(--gw-green-bg)', borderRadius: 7, padding: '8px 10px' }}>
        <span style={{ fontSize: 9.5, letterSpacing: '.07em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--gw-green-t)', opacity: .75, display: 'block', marginBottom: 2 }}>Recommended move</span>
        <span style={{ fontSize: 13, color: 'var(--gw-green-t)', lineHeight: 1.5 }}>{area.move}</span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Bullet list
// ---------------------------------------------------------------------------
function BulletList({ items }: { items: string[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {items.map((item, i) => (
        <div key={i} style={{ display: 'flex', gap: 9, fontSize: 13, lineHeight: 1.55 }}>
          <div style={{ flexShrink: 0, marginTop: '.55em', width: 5, height: 5, borderRadius: '50%', background: 'var(--gw-green-b)' }} />
          <span>{item}</span>
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Section label
// ---------------------------------------------------------------------------
function SecH({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 10.5, letterSpacing: '.09em', textTransform: 'uppercase', color: 'var(--gw-muted)', fontWeight: 700, marginBottom: 9 }}>{children}</div>
  )
}

// ---------------------------------------------------------------------------
// Admin cross-reference view — built from the shared report data
// ---------------------------------------------------------------------------
function AdminCrossRef({ report, closed }: { report: Report; closed: boolean }) {
  const engagement = report.engagement as any
  const status = closed ? 'Aligned' : engagement?.coverage === 'strong' ? 'Clear' : engagement?.coverage === 'moderate' ? 'Emerging' : 'Mixed'

  const openAreas: Area[] = (report.divergences ?? []).map(d => ({
    title: d.topic,
    observation: d.positions.map(p => `${p.participantLabel}: ${p.view}`).join(' — '),
    whyItMatters: d.evidence?.[0] ?? 'Diverging accounts on this topic can become harder to align the longer they stay implicit.',
    move: 'Surface this explicitly next session. Name what each of you expects and write it down.',
  }))

  const reachedAreas: Area[] = (report.agreements ?? []).map(a => ({
    title: a,
    reached: true,
    reachedNote: a,
    observation: '', whyItMatters: '', move: '',
  }))

  const closeItems: CloseItem[] = [
    { label: 'Aligned', text: report.agreements?.slice(0, 2).join('. ') || '—', bg: 'var(--gw-green-bg)', labelColor: 'var(--gw-green-t)' },
    { label: 'Open', text: report.divergences?.map(d => d.topic).join('. ') || '—', bg: 'var(--gw-amber-bg)', labelColor: 'var(--gw-amber-t)' },
    { label: 'Revisit', text: closed ? 'Review at next raise.' : 'Review next session.', bg: 'var(--gw-blue-bg)', labelColor: 'var(--gw-navy)' },
    { label: 'Risk', text: report.centralQuestion, bg: '#F8ECEA', labelColor: '#B5675A' },
  ]

  return (
    <div>
      {/* What Groundwork saw */}
      <div style={{ background: 'var(--gw-dark)', color: '#fff', borderRadius: 10, padding: '14px 16px', marginBottom: 14 }}>
        <div style={{ fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--gw-green-b)', fontWeight: 700, marginBottom: 7 }}>
          {closed ? 'What Groundwork learned across the ground' : 'What Groundwork saw'}
        </div>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: 'rgba(255,255,255,.93)' }}>{report.sharedPicture}</p>
      </div>

      {/* Alignment status */}
      <div style={{ marginBottom: 14 }}>
        <SecH>Alignment status</SecH>
        <div style={{ fontSize: 17, fontWeight: 800 }}>{status}</div>
        <div style={{ fontSize: 12.5, color: 'var(--gw-sub)', marginTop: 2, lineHeight: 1.5 }}>
          {report.agreements?.length ?? 0} area{report.agreements?.length !== 1 ? 's' : ''} aligned
          {report.divergences?.length ? `, ${report.divergences.length} still open` : ''}.
        </div>
        <AlignmentLadder status={status} closed={closed} />
      </div>

      {/* Open areas */}
      {openAreas.length > 0 && !closed && (
        <div style={{ marginBottom: 14 }}>
          <SecH>Areas requiring alignment</SecH>
          {openAreas.map((a, i) => <AreaBlock key={i} area={a} />)}
        </div>
      )}

      {/* Reached areas */}
      {reachedAreas.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <SecH>{closed ? 'What was agreed' : 'Alignment reached'}</SecH>
          {closed
            ? <BulletList items={report.agreements ?? []} />
            : reachedAreas.map((a, i) => <AreaBlock key={i} area={a} />)
          }
        </div>
      )}

      {/* Honest close */}
      <div style={{ marginBottom: 14 }}>
        <SecH>An honest close</SecH>
        <HonestClose items={closeItems} />
      </div>

      {/* Doc line */}
      {engagement?.documentBacked && (
        <div style={{ fontSize: 11.5, color: 'var(--gw-muted)', marginTop: 4 }}>Documents on record from this ground.</div>
      )}

      {closed && (
        <div style={{ fontSize: 12, color: 'var(--gw-sub)', background: '#F4F1EA', border: '1px solid #E5DFD2', borderRadius: 8, padding: '10px 12px', lineHeight: 1.55, marginTop: 8 }}>
          This record is permanent. It is yours and is portable to your profile.
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Participant cross-reference view
// ---------------------------------------------------------------------------
function ParticipantCrossRef({ report, closed }: { report: Report; closed: boolean }) {
  const engagement = report.engagement as any
  const status = closed ? 'Aligned' : engagement?.coverage === 'strong' ? 'Clear, trending to aligned' : engagement?.coverage === 'moderate' ? 'Emerging' : 'Mixed'

  const assumptions = (report.divergences ?? []).map(d =>
    `That ${d.topic.toLowerCase()} is settled — it may read differently from the other seat.`
  )

  const clarityItems = (report.divergences ?? []).map(d =>
    `Your account on ${d.topic.toLowerCase()} could be more specific. That is the area most open to being read another way.`
  )

  const questionsNext = (report.divergences ?? []).map(d =>
    `What does ${d.topic.toLowerCase()} look like concretely — what would you sign?`
  )

  return (
    <div>
      {/* What contribution reveals */}
      <div style={{ background: '#0E3A30', color: '#fff', borderRadius: 10, padding: '14px 16px', marginBottom: 14 }}>
        <div style={{ fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--gw-green-b)', fontWeight: 700, marginBottom: 7 }}>
          {closed ? 'What your contribution secured' : 'What your contribution reveals'}
        </div>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: 'rgba(255,255,255,.93)' }}>
          {closed
            ? `Over ${report.agreements?.length ?? 0} agreed area${(report.agreements?.length ?? 0) !== 1 ? 's' : ''}, your account turned assumptions into written agreements. That record is yours.`
            : report.sharedPicture}
        </p>
      </div>

      {closed ? (
        <>
          <div style={{ marginBottom: 14 }}>
            <SecH>What was agreed</SecH>
            <BulletList items={report.agreements ?? []} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <SecH>Worth keeping an eye on</SecH>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {report.divergences?.slice(0, 1).map((d, i) => (
                <div key={i} style={{ background: 'var(--gw-amber-bg)', borderRadius: 7, padding: '8px 10px', fontSize: 12, lineHeight: 1.5 }}>
                  <span style={{ fontSize: 9, letterSpacing: '.07em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--gw-amber-t)', display: 'block', marginBottom: 2 }}>Still to pin</span>
                  {d.topic}
                </div>
              ))}
            </div>
          </div>
          <div style={{ fontSize: 13, color: 'var(--gw-sub)', lineHeight: 1.6 }}>
            Documented and portable. You can add this ground to your profile. It survives the relationship, and it is yours as much as the organisation's.
          </div>
        </>
      ) : (
        <>
          {assumptions.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <SecH>The assumptions in your account</SecH>
              <BulletList items={assumptions} />
            </div>
          )}
          {clarityItems.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <SecH>Where more clarity would strengthen alignment</SecH>
              <BulletList items={clarityItems} />
            </div>
          )}
          {questionsNext.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <SecH>Questions worth resolving next</SecH>
              <BulletList items={questionsNext} />
            </div>
          )}
          <div style={{ marginBottom: 14 }}>
            <SecH>Your account, so far</SecH>
            <div style={{ fontSize: 17, fontWeight: 800 }}>{status}</div>
            <div style={{ fontSize: 12.5, color: 'var(--gw-sub)', marginTop: 2, lineHeight: 1.5 }}>
              {report.agreements?.length ?? 0} area{(report.agreements?.length ?? 0) !== 1 ? 's' : ''} settled.
              {report.divergences?.length ? ` ${report.divergences.length} still need your clearest account.` : ''}
            </div>
            <AlignmentLadder status={status} />
          </div>
          <div style={{ fontSize: 12, color: 'var(--gw-sub)', background: '#F4F1EA', border: '1px solid #E5DFD2', borderRadius: 8, padding: '10px 12px', lineHeight: 1.55 }}>
            {report.releasedAt
              ? 'The full comparison is now open — both parties read the same report at the same moment.'
              : 'You still see only your own account. The full comparison opens when you both activate the report.'}
          </div>
        </>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main SessionReportCard
// ---------------------------------------------------------------------------
interface Props {
  checkInId: string
  groundId: string
  sessionNumber: number
  isInitiator: boolean
}

type CardState = 'loading' | 'solo' | 'waiting' | 'cross_ref' | 'closed'

export function SessionReportCard({ checkInId, groundId, sessionNumber, isInitiator }: Props) {
  const [state, setState] = useState<CardState>('loading')
  const [soloArtifact, setSoloArtifact] = useState<{ summary: string; whatToCarry?: string } | null>(null)
  const [report, setReport] = useState<Report | null>(null)
  const [sessionTag, setSessionTag] = useState('')

  async function fetchState() {
    try {
      // Always try to get the report first
      const r = await reportsApi.get(groundId).catch(() => null)

      if (r?.releasedAt) {
        const closed = (r as any).status === 'CLOSED' || (r as any).groundStatus === 'CLOSED'
        setReport(r)
        setSessionTag(closed ? 'Closing session · resolution record' : `Session ${sessionNumber} · cross reference`)
        setState(closed ? 'closed' : 'cross_ref')
        return
      }

      if (r?.id) {
        // Report synthesised but not released — cross reference is available
        setReport(r)
        setSessionTag(`Session ${sessionNumber} · cross reference`)
        setState('cross_ref')
        return
      }

      // No report yet — try solo artifact
      const art = await conversationApi.artifact(checkInId).catch(() => null)
      if (art?.artifact) {
        setSoloArtifact(art.artifact)
        setState('solo')
        return
      }

      setState('waiting')
    } catch {
      setState('waiting')
    }
  }

  useEffect(() => {
    fetchState()
  }, [checkInId, groundId])

  // Poll every 30s when waiting for the other party or for synthesis
  useEffect(() => {
    if (state !== 'waiting' && state !== 'solo') return
    const t = setInterval(fetchState, 30_000)
    return () => clearInterval(t)
  }, [state])

  if (state === 'loading') return null

  const headerBg = isInitiator ? 'var(--gw-navy)' : '#085041'
  const headerLabel = isInitiator ? 'Admin report' : 'Participant report'
  const closingLabel = isInitiator ? 'Resolution record' : 'Resolution record'

  return (
    <div style={{ margin: '16px 0 8px', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--gw-border)', background: 'white' }}>
      {/* Card header */}
      <div style={{ background: headerBg, color: '#fff', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 13, fontWeight: 800 }}>
          {state === 'closed' ? closingLabel : headerLabel}
        </span>
        {sessionTag && (
          <span style={{ fontSize: 11, opacity: .82 }}>{sessionTag}</span>
        )}
      </div>

      <div style={{ padding: '16px 16px 18px' }}>

        {/* STATE: solo artifact */}
        {state === 'solo' && soloArtifact && (
          <div>
            <div style={{ fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--gw-muted)', fontWeight: 700, marginBottom: 9 }}>Your private record</div>
            <p style={{ fontSize: 14, lineHeight: 1.65, marginBottom: soloArtifact.whatToCarry ? 12 : 0 }}>{soloArtifact.summary}</p>
            {soloArtifact.whatToCarry && (
              <div style={{ background: 'var(--gw-blue-bg)', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: 'var(--gw-navy)', lineHeight: 1.55 }}>
                <span style={{ fontSize: 9.5, letterSpacing: '.07em', textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: 3, opacity: .7 }}>Carry forward</span>
                {soloArtifact.whatToCarry}
              </div>
            )}
            <div style={{ marginTop: 12, fontSize: 12, color: 'var(--gw-muted)', fontStyle: 'italic' }}>
              Waiting for the other party to complete their session. Your cross-reference will appear here.
            </div>
          </div>
        )}

        {/* STATE: waiting (no artifact yet) */}
        {state === 'waiting' && (
          <div style={{ fontSize: 13, color: 'var(--gw-sub)', lineHeight: 1.6 }}>
            Your session is recorded. The cross-reference appears once the other party has completed their check-in.
          </div>
        )}

        {/* STATE: cross reference or closed */}
        {(state === 'cross_ref' || state === 'closed') && report && (
          isInitiator
            ? <AdminCrossRef report={report} closed={state === 'closed'} />
            : <ParticipantCrossRef report={report} closed={state === 'closed'} />
        )}

      </div>
    </div>
  )
}
