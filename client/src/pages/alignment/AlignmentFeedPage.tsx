import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts'
import { alignmentApi, type AlignmentNarrative } from '@/api'
import { useAuthStore } from '@/stores/auth'
import { StatusPill } from '@/components/gw'

// #25 — pattern code → forward risk mapping
const PATTERN_RISK: Record<string, string> = {
  D2: 'Misalignment compounding silently',
  B4: 'Commitments losing credibility',
  F1: 'Operational debt building unseen',
  K1: 'Relationship deteriorating without visible trigger',
}

// Derive a pattern code from the observation text (best-effort scan)
function extractCode(observation: string): string | null {
  const match = observation.match(/\b([A-Z]\d+)\b/)
  return match ? match[1] : null
}

function forwardRisk(observation: string): string | null {
  const code = extractCode(observation)
  return code ? PATTERN_RISK[code] ?? null : null
}

// #23 — conversation trigger sentence
function triggerSentence(observation: string): string {
  return `I've noticed that ${observation} — is that landing with you?`
}

// #49 — contribution quality badge colour
function badgeDot(specificityScore?: number): string {
  if (specificityScore == null) return '#9ca3af' // grey
  if (specificityScore >= 70) return '#16a34a'   // green
  if (specificityScore >= 40) return '#d97706'   // amber
  return '#9ca3af'                               // grey
}

// #90 — placeholder sparkline data (last 5 specificity scores, deterministic per name)
function placeholderSpark(name: string): { v: number }[] {
  const seed = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return Array.from({ length: 5 }, (_, i) => ({ v: ((seed * (i + 1) * 37) % 61) + 30 }))
}

// #24 — PrepCard component
function PrepCard({
  feed,
}: {
  feed: { patternSignals: { observation: string }[] }[]
}) {
  const allSignals = feed.flatMap(g => g.patternSignals ?? [])
  const positiveSignal = allSignals.find(
    s => /\+/.test(s.observation) || /good|strong|well|improv/i.test(s.observation),
  )
  const gapPattern = allSignals.find(s => s !== positiveSignal) ?? allSignals[0]
  const centralQuestion = 'What would need to be different for this to work?'

  if (allSignals.length === 0) return null

  return (
    <div
      style={{
        background: '#F0F4FF',
        border: '1px solid #C7D7F5',
        borderRadius: 8,
        padding: '14px 16px',
        marginBottom: 16,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '.07em',
          color: '#4F6FA8',
          marginBottom: 10,
        }}
      >
        Conversation prep
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontSize: 12 }}>
          <span style={{ fontWeight: 600, color: '#1A1916' }}>Start with: </span>
          <span style={{ color: 'var(--gw-sub)' }}>
            {positiveSignal
              ? positiveSignal.observation
              : '(no positive signal yet this period)'}
          </span>
        </div>
        <div style={{ fontSize: 12 }}>
          <span style={{ fontWeight: 600, color: '#1A1916' }}>Name this: </span>
          <span style={{ color: 'var(--gw-sub)' }}>
            {gapPattern ? gapPattern.observation : '(no gap pattern detected)'}
          </span>
        </div>
        <div style={{ fontSize: 12 }}>
          <span style={{ fontWeight: 600, color: '#1A1916' }}>Ask this: </span>
          <span style={{ color: 'var(--gw-sub)' }}>{centralQuestion}</span>
        </div>
      </div>
    </div>
  )
}

// #48 — Quick action buttons
function QuickActions({
  onNextConversation,
}: {
  feed: { patternSignals: { observation: string }[] }[]
  onNextConversation: () => void
}) {
  const handleBriefing = () => window.print()

  const actions = [
    { label: 'Briefing', onClick: handleBriefing },
    { label: 'Team report', onClick: () => {} },
    { label: 'Pattern summary', onClick: () => {} },
    { label: 'Next conversation', onClick: onNextConversation },
  ]

  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
      {actions.map(({ label, onClick }) => (
        <button
          key={label}
          onClick={onClick}
          style={{
            fontSize: 12,
            fontWeight: 500,
            padding: '6px 14px',
            background: 'transparent',
            border: '1px solid #C4C0BA',
            borderRadius: 5,
            color: 'var(--gw-text)',
            cursor: 'pointer',
          }}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

export function AlignmentFeedPage() {
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)
  const logout = useAuthStore(s => s.logout)
  const [teamOpen, setTeamOpen] = useState(false)
  const [expandedPatterns, setExpandedPatterns] = useState<Record<string, boolean>>({})
  const [nextConvOpen, setNextConvOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const { data: feed, isLoading } = useQuery({
    queryKey: ['alignment-feed'],
    queryFn: alignmentApi.feed,
  })
  const { data: narrative } = useQuery<AlignmentNarrative>({
    queryKey: ['alignment-narrative'],
    queryFn: alignmentApi.narrative,
    staleTime: 5 * 60 * 1000,
  })

  // #52 — org code
  const orgCode =
    (user as any)?.orgCode ?? (user as any)?.organizationCode ?? null

  const handleCopyOrgCode = () => {
    if (orgCode) {
      navigator.clipboard.writeText(orgCode).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
    }
  }

  const togglePattern = (key: string) => {
    setExpandedPatterns(prev => ({ ...prev, [key]: !prev[key] }))
  }

  // Top pattern used for "Next conversation" opener
  const topPattern = feed?.flatMap(g => g.patternSignals ?? []).find(Boolean)

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--gw-bg)',
      }}
    >
      {/* Header */}
      <div className="gw-hdr">
        <div>
          <div className="gw-logo">{user?.organizationName ?? 'Groundwork'}</div>
          <div style={{ fontSize: 11, color: 'var(--gw-muted)', marginTop: 1 }}>
            Alignment feed
          </div>
        </div>
        <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
          {/* #81 — Remove emoji from Team button */}
          <button className="gw-back" onClick={() => setTeamOpen(o => !o)}>
            Team
          </button>
          <Link to="/grounds/new">
            <button
              className="gw-back"
              style={{ color: '#0C447C', borderColor: '#B5D4F4' }}
            >
              + New ground
            </button>
          </Link>
          <button className="gw-back" onClick={() => navigate('/billing')}>
            Billing
          </button>
          <button className="gw-back" onClick={() => navigate('/')}>
            ← Grounds
          </button>
          <button
            className="gw-back"
            onClick={() => {
              logout()
              navigate('/')
            }}
          >
            Sign out
          </button>
        </div>
      </div>

      {/* Team panel */}
      {teamOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            right: 0,
            width: '100%',
            maxWidth: 340,
            height: '100%',
            background: 'white',
            borderLeft: '1px solid #E2E0DB',
            zIndex: 20,
            overflowY: 'auto',
            padding: 14,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 14,
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 700 }}>Team engagement</div>
            <button className="gw-back" onClick={() => setTeamOpen(false)}>
              Close
            </button>
          </div>
          <div className="gw-box gw-box-blue">
            You see engagement quality only. Reports require team member approval.
          </div>

          {feed?.map(g => (
            <div
              key={g.groundId}
              style={{
                marginBottom: 10,
                padding: '10px 12px',
                background: '#EDECEA',
                borderRadius: 6,
                border: '1px solid #E2E0DB',
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                {g.label}
              </div>
              <div style={{ fontSize: 12, color: 'var(--gw-sub)' }}>
                {g.completeness.checkedInCount} of {g.completeness.totalCount} checked in
              </div>

              {/* #49 — Contribution quality badges + #90 — Sparklines */}
              {g.completeness.checkedIn?.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  {g.completeness.checkedIn.map((name: string) => {
                    const score = (g as any).specificityScores?.[name] as
                      | number
                      | undefined
                    const sparkData = placeholderSpark(name)
                    return (
                      <div
                        key={name}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          marginBottom: 6,
                        }}
                      >
                        {/* Coloured dot badge */}
                        <span
                          style={{
                            display: 'inline-block',
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: badgeDot(score),
                            flexShrink: 0,
                          }}
                        />
                        <span
                          style={{
                            fontSize: 12,
                            color: 'var(--gw-text)',
                            minWidth: 80,
                          }}
                        >
                          {name}
                        </span>
                        {/* Sparkline */}
                        <div style={{ width: 60, height: 20 }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={sparkData}>
                              <Line
                                type="monotone"
                                dataKey="v"
                                stroke="#6B7280"
                                strokeWidth={1.5}
                                dot={false}
                              />
                              <Tooltip
                                contentStyle={{ fontSize: 10, padding: '2px 6px' }}
                                formatter={(v: any) => [v, 'score']}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {g.completeness.awaiting.length > 0 && (
                <div style={{ fontSize: 11, color: 'var(--gw-muted)', marginTop: 3 }}>
                  Awaiting: {g.completeness.awaiting.join(', ')}
                </div>
              )}
              {(g.completeness as any).documentBackedPct != null && (
                <div style={{ fontSize: 11, color: 'var(--gw-muted)', marginTop: 3 }}>
                  Document-backed: {(g.completeness as any).documentBackedPct}%
                </div>
              )}
              {(g as any).coverageBand && (
                <div style={{ marginTop: 3 }}>
                  <span
                    style={{
                      fontSize: 11,
                      color:
                        (g as any).coverageBand === 'strong'
                          ? '#16a34a'
                          : (g as any).coverageBand === 'thin'
                          ? '#dc2626'
                          : 'var(--gw-muted)',
                    }}
                  >
                    {(g as any).coverageBand}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Feed */}
      <div
        className="gw-bd"
        style={{ maxWidth: 640, margin: '0 auto', width: '100%' }}
      >
        <div className="gw-sec">Alignment feed · state and completeness only</div>

        {/* #52 — Org code display */}
        {orgCode && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 12,
              fontSize: 12,
              color: 'var(--gw-sub)',
            }}
          >
            <span>
              Org code:{' '}
              <strong style={{ color: 'var(--gw-text)', letterSpacing: '.05em' }}>
                {orgCode}
              </strong>
            </span>
            <button
              onClick={handleCopyOrgCode}
              style={{
                fontSize: 11,
                padding: '2px 8px',
                background: 'transparent',
                border: '1px solid #C4C0BA',
                borderRadius: 4,
                cursor: 'pointer',
                color: copied ? '#16a34a' : 'var(--gw-sub)',
              }}
            >
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        )}

        <div className="gw-box gw-box-blue" style={{ marginBottom: 16 }}>
          This view never shows what anyone said. You see ground status, session
          completeness, and observations from the record — not content.
        </div>

        {/* #48 — Quick action buttons */}
        {feed && feed.length > 0 && (
          <QuickActions
            feed={feed}
            onNextConversation={() => setNextConvOpen(o => !o)}
          />
        )}

        {/* #48 — Next conversation trigger sentence panel */}
        {nextConvOpen && topPattern && (
          <div
            style={{
              background: '#FFFBEB',
              border: '1px solid #FDE68A',
              borderRadius: 6,
              padding: '12px 14px',
              marginBottom: 14,
              fontSize: 13,
              color: '#92400E',
            }}
          >
            <div
              style={{
                fontWeight: 600,
                marginBottom: 4,
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: '.06em',
              }}
            >
              Next conversation opener
            </div>
            <div style={{ lineHeight: 1.55 }}>
              {triggerSentence(topPattern.observation)}
            </div>
          </div>
        )}

        {/* #24 — Conversation prep card */}
        {feed && feed.length > 0 && (
          <PrepCard feed={feed} />
        )}

        {narrative && (
          <div
            style={{
              background: '#F5F3EF',
              border: '1px solid #E2E0DB',
              borderRadius: 8,
              padding: '16px 18px',
              marginBottom: 16,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '.07em',
                color: 'var(--gw-muted)',
                marginBottom: 8,
              }}
            >
              Alignment summary
            </div>
            <div
              style={{
                fontSize: 13.5,
                lineHeight: 1.65,
                color: 'var(--gw-text)',
                whiteSpace: 'pre-wrap',
              }}
            >
              {narrative.summary}
            </div>
            {narrative.activeGrounds > 0 && (
              <div style={{ fontSize: 12, color: 'var(--gw-sub)', marginTop: 8 }}>
                {narrative.activeGrounds} active ground
                {narrative.activeGrounds !== 1 ? 's' : ''} ·{' '}
                {narrative.surfacedPatterns > 0
                  ? narrative.surfacedPatterns +
                    ' pattern' +
                    (narrative.surfacedPatterns !== 1 ? 's' : '') +
                    ' surfaced'
                  : 'No patterns surfaced this period'}
              </div>
            )}
          </div>
        )}

        {isLoading && (
          <div style={{ fontSize: 13, color: 'var(--gw-muted)', padding: '20px 0' }}>
            Loading…
          </div>
        )}

        {!isLoading && feed?.length === 0 && (
          <div
            style={{
              background: 'white',
              border: '1px solid #E2E0DB',
              borderRadius: 6,
              padding: '40px 24px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 13, color: 'var(--gw-muted)', marginBottom: 12 }}>
              No grounds open yet.
            </div>
            <Link to="/grounds/new">
              <button
                className="gw-btn"
                style={{ width: 'auto', display: 'inline-block', padding: '10px 20px' }}
              >
                Open your first ground
              </button>
            </Link>
          </div>
        )}

        {feed?.map(g => (
          <div
            key={g.groundId}
            style={{
              background: 'white',
              border: '1px solid #E2E0DB',
              borderRadius: 6,
              padding: '14px 16px',
              marginBottom: 8,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                marginBottom: 8,
              }}
            >
              <div>
                <Link
                  to={`/grounds/${g.groundId}`}
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: '#1A1916',
                    textDecoration: 'none',
                  }}
                >
                  {g.label}
                </Link>
                <div style={{ fontSize: 12, color: 'var(--gw-sub)', marginTop: 2 }}>
                  Period {g.currentPeriod} · {g.completeness.checkedInCount}/
                  {g.completeness.totalCount} checked in
                  {g.completeness.awaiting.length > 0 &&
                    ` · Awaiting: ${g.completeness.awaiting.join(', ')}`}
                </div>
              </div>
              <div
                style={{
                  display: 'flex',
                  gap: 6,
                  alignItems: 'center',
                  flexShrink: 0,
                  marginLeft: 12,
                }}
              >
                {g.stalled && <span className="gw-pill gw-pill-amber">Stalled</span>}
                <StatusPill status={g.status} />
              </div>
            </div>

            {g.patternSignals?.length > 0 && (
              <div
                style={{
                  borderTop: '1px solid #E2E0DB',
                  paddingTop: 10,
                  marginTop: 6,
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    color: 'var(--gw-muted)',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '.06em',
                    marginBottom: 6,
                  }}
                >
                  Patterns worth naming
                </div>

                {g.patternSignals.map((s: any, i: number) => {
                  const patternKey = `${g.groundId}-${i}`
                  const isExpanded = !!expandedPatterns[patternKey]
                  const risk = forwardRisk(s.observation)
                  const evidence: any[] =
                    s.evidence ?? (s as any).recordEntries ?? []

                  return (
                    // #54 — Clickable pattern card with inline evidence drawer
                    <div
                      key={i}
                      style={{
                        padding: '7px 0',
                        borderBottom:
                          i < g.patternSignals.length - 1
                            ? '1px solid #E2E0DB'
                            : 'none',
                        cursor: 'pointer',
                      }}
                      onClick={() => togglePattern(patternKey)}
                    >
                      {/* Observation text */}
                      <div style={{ fontSize: 12, color: 'var(--gw-text)' }}>
                        {s.observation}
                      </div>

                      {/* #23 — Conversation trigger sentence */}
                      <div
                        style={{
                          fontSize: 11,
                          color: 'var(--gw-muted)',
                          marginTop: 4,
                        }}
                      >
                        <span style={{ fontWeight: 600 }}>
                          Use this to open the conversation:{' '}
                        </span>
                        {triggerSentence(s.observation)}
                      </div>

                      {/* #25 — Forward-signal framing for negative patterns */}
                      {risk && (
                        <div
                          style={{
                            fontSize: 11,
                            color: '#92400E',
                            marginTop: 4,
                            fontStyle: 'italic',
                          }}
                        >
                          Left unaddressed, this risks: {risk}
                        </div>
                      )}

                      {/* #54 — Inline evidence drawer */}
                      {isExpanded && (
                        <div
                          style={{
                            marginTop: 8,
                            padding: '8px 10px',
                            background: '#F5F3EF',
                            borderRadius: 5,
                            border: '1px solid #E2E0DB',
                          }}
                        >
                          <div
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              color: 'var(--gw-muted)',
                              marginBottom: 5,
                              textTransform: 'uppercase',
                              letterSpacing: '.05em',
                            }}
                          >
                            Evidence
                          </div>
                          {evidence.length === 0 ? (
                            <div
                              style={{ fontSize: 11, color: 'var(--gw-muted)' }}
                            >
                              No source entries available.
                            </div>
                          ) : (
                            evidence.map((entry: any, ei: number) => (
                              <div
                                key={ei}
                                style={{
                                  fontSize: 11,
                                  color: 'var(--gw-sub)',
                                  marginBottom: 4,
                                  lineHeight: 1.5,
                                }}
                              >
                                Evidence:{' '}
                                {entry.content ??
                                  entry.text ??
                                  JSON.stringify(entry)}
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}

                <div style={{ fontSize: 11, color: 'var(--gw-muted)', marginTop: 6 }}>
                  Observations, not verdicts. What the record describes — not who
                  said what.
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
