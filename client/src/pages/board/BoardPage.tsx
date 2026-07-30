import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { boardApi, type BoardPresent, type CoverageVariant } from '@/api/board'
import { toast } from 'sonner'

/**
 * The delivery board.
 *
 * A shared, standing view of where a team's work actually stands, assembled from
 * everyone's separate private accounts. It shows the record, never a verdict, and
 * it is generated - the only thing anyone adds here is the availability poll.
 *
 * The board is NOT a replacement for the report. On a shared ground both exist:
 * this board (team-facing, operational) and each person's own report (private
 * substance). The divergence section here is a pointer; the report holds detail.
 *
 * Which sections render is decided by the server from the ground's scenario
 * family, and a private or mood-sensing ground gets no board at all. This page
 * only renders what the server says it may.
 */

// ---------------------------------------------------------------- primitives

function Zone({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '30px 2px 2px' }}>
      <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.7px', fontWeight: 800, color: 'var(--gw-navy)' }}>{label}</span>
      <span style={{ flex: 1, height: 1, background: 'var(--gw-border)' }} />
    </div>
  )
}

function Sec({ title, src }: { title: string; src?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, margin: '16px 2px 8px' }}>
      <h2 style={{ fontSize: 12.5, letterSpacing: '.4px', textTransform: 'uppercase', color: 'var(--gw-sub)', fontWeight: 700 }}>{title}</h2>
      {src && <span style={{ fontSize: 10.5, color: 'var(--gw-muted)', marginLeft: 'auto', whiteSpace: 'nowrap' }}>{src}</span>}
    </div>
  )
}

function Card({ children, pad = true }: { children: React.ReactNode; pad?: boolean }) {
  return (
    <div style={{ background: 'white', border: '1px solid var(--gw-border)', borderRadius: 12, boxShadow: '0 1px 2px rgba(20,24,40,.05)', padding: pad ? '6px 16px' : 0 }}>
      {children}
    </div>
  )
}

function Row({ children, first }: { children: React.ReactNode; first?: boolean }) {
  return <div style={{ padding: '11px 0', borderTop: first ? 'none' : '1px solid var(--gw-border)' }}>{children}</div>
}

function Pill({ children, tone = 'flat' }: { children: React.ReactNode; tone?: 'good' | 'warn' | 'bad' | 'info' | 'flat' }) {
  const m: Record<string, { bg: string; fg: string }> = {
    good: { bg: 'var(--gw-green-bg)', fg: 'var(--gw-green-t)' },
    warn: { bg: 'var(--gw-amber-bg)', fg: 'var(--gw-amber-t)' },
    bad: { bg: 'var(--gw-red-bg)', fg: 'var(--gw-red-t)' },
    info: { bg: 'var(--gw-blue-bg)', fg: 'var(--gw-blue-t)' },
    flat: { bg: '#EEF0F4', fg: 'var(--gw-sub)' },
  }
  const c = m[tone] ?? m.flat
  return (
    <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 9px', borderRadius: 11, background: c.bg, color: c.fg, whiteSpace: 'nowrap' }}>
      {children}
    </span>
  )
}

const dshort = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : '—'

// ---------------------------------------------------------------- page

export function BoardPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [variant, setVariant] = useState<CoverageVariant | undefined>(undefined)

  const { data, isLoading, error } = useQuery({
    queryKey: ['board', id, variant],
    queryFn: () => boardApi.get(id!, variant),
    enabled: !!id,
    retry: false,
  })

  const togglePoll = useMutation({
    mutationFn: (optionId: string) => boardApi.togglePoll(id!, optionId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['board', id] }),
    onError: () => toast.error('Could not update your availability. Try again.'),
  })

  if (isLoading) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--gw-muted)' }}>Loading the board…</div>
  }
  if (error || !data) {
    return (
      <div style={{ maxWidth: 620, margin: '48px auto', padding: '0 20px', textAlign: 'center' }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>This board could not be loaded.</div>
        <div style={{ fontSize: 13, color: 'var(--gw-sub)', marginBottom: 16 }}>
          You may not be a party to this ground, or it may no longer exist.
        </div>
        <button onClick={() => navigate('/grounds')} style={btn}>Back to grounds</button>
      </div>
    )
  }

  // A private-mode or mood-sensing ground has NO board. Say so plainly and point
  // at the report, rather than showing an empty page that reads as broken.
  if (!data.renders) {
    return (
      <div style={{ maxWidth: 620, margin: '48px auto', padding: '0 20px' }}>
        <div style={{ background: 'white', border: '1px solid var(--gw-border)', borderRadius: 12, padding: '22px 24px' }}>
          <div style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--gw-muted)', fontWeight: 700, marginBottom: 8 }}>
            No shared board here
          </div>
          <div style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--gw-text)', marginBottom: 16 }}>{data.reason}</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Link to={`/grounds/${id}/report`} style={{ ...btn, textDecoration: 'none' }}>Read the report</Link>
            <button onClick={() => navigate(`/grounds/${id}`)} style={btnGhost}>Back to the ground</button>
          </div>
        </div>
      </div>
    )
  }

  const b = data as BoardPresent
  const has = (s: string) => b.sections.includes(s as any)
  // Only the caller's own availability is theirs to toggle.
  const myIds = new Set(b.myParticipantId ? [b.myParticipantId] : [])

  return (
    <div style={{ background: '#EEF0F6', minHeight: '100vh' }}>
      <div style={{ maxWidth: 1060, margin: '0 auto', padding: '20px 20px 80px' }}>

        {/* header + phase spine */}
        <header style={{ background: 'var(--gw-dark)', color: 'white', borderRadius: 16, padding: '18px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
            <div>
              <h1 style={{ fontSize: 19, fontWeight: 700, letterSpacing: '.2px' }}>{b.title}</h1>
              <div style={{ fontSize: 12, color: '#AEB6D6', marginTop: 4, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ background: '#2C2E52', border: '1px solid #3C3E66', color: '#C7CDF0', borderRadius: 20, padding: '2px 10px', fontSize: 10.5, fontWeight: 700 }}>
                  {b.family === 'DELIVERY' ? 'Team delivery ground'
                    : b.family === 'COHORT' ? 'Cohort ground'
                    : b.family === 'ONBOARDING' ? 'Onboarding ground'
                    : 'Evaluation ground'}
                </span>
                {b.phaseSpine && <span>{dshort(b.phaseSpine.startsAt)} to {dshort(b.phaseSpine.endsAt)} · session {b.phaseSpine.currentSession}</span>}
              </div>
            </div>
            <div style={{ fontSize: 10.5, color: '#8891BC', textAlign: 'right', lineHeight: 1.5 }}>
              {b.readOnlyNote.split('. ').map((l, i) => <div key={i}>{l}</div>)}
            </div>
          </div>

          {has('phaseSpine') && b.phaseSpine && (
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #2E3054' }}>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {b.phaseSpine.sessions.map((s) => (
                  <div key={s.n} style={{
                    fontSize: 11, padding: '4px 10px', borderRadius: 20,
                    background: s.state === 'current' ? 'rgba(139,224,174,.18)' : '#2C2E52',
                    color: s.state === 'current' ? '#8BE0AE' : '#8891BC',
                    fontWeight: s.state === 'current' ? 700 : 500,
                  }}>
                    Session {s.n}{s.date ? ` · ${dshort(s.date)}` : ''}{s.state === 'current' ? ' · now' : ''}
                  </div>
                ))}
              </div>
            </div>
          )}
        </header>

        {/* how to read this board - the framing that keeps it a mirror, not a weapon */}
        <div style={{ background: '#20233E', color: 'white', borderRadius: 14, padding: '14px 18px', marginTop: 14 }}>
          <span style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '.5px', color: '#8891BC', fontWeight: 700, display: 'block', marginBottom: 6 }}>
            How to read and use this board
          </span>
          <p style={{ fontSize: 12, lineHeight: 1.55, color: '#D6DAF0' }}>
            Built from each person's own account, given privately, on the record.{' '}
            <b style={{ color: '#8BE0AE', fontWeight: 600 }}>It is not decided by who speaks the loudest or argues best.</b>{' '}
            Use it as the basis of the conversation, not something to be talked down in the moment.
          </p>
          <p style={{ fontSize: 12, lineHeight: 1.55, color: '#D6DAF0', marginTop: 7 }}>
            If someone disagrees with what the record shows about them, they{' '}
            <b style={{ color: '#8BE0AE', fontWeight: 600 }}>put it in their next check-in</b>, not debate the board until it gives way.
            It shows the record, never a verdict. Each person is shown against their own role in its own terms, never on one shared scale.
          </p>
        </div>

        {/* ---------------------------------------------- at a glance */}
        {(has('quickRead') || has('decisions')) && <Zone label="At a glance" />}

        {has('quickRead') && b.quickRead && (
          <>
            <Sec title="The quick read" src="alignment and trust from the report" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 10 }}>
              {b.quickRead.map((q) => (
                <div key={q.label} style={{ background: 'white', border: '1px solid var(--gw-border)', borderRadius: 12, padding: '12px 14px' }}>
                  <div style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '.4px', color: 'var(--gw-muted)', fontWeight: 700 }}>{q.label}</div>
                  <div style={{
                    fontFamily: 'Georgia, serif', fontSize: 24, marginTop: 5, lineHeight: 1,
                    color: q.tone === 'bad' ? 'var(--gw-red-t)' : q.tone === 'warn' ? 'var(--gw-amber-t)' : q.tone === 'good' ? 'var(--gw-green-t)' : 'var(--gw-dark)',
                  }}>{q.value}</div>
                  <div style={{ fontSize: 12, color: 'var(--gw-sub)', marginTop: 4 }}>{q.sub}</div>
                </div>
              ))}
            </div>
          </>
        )}

        {has('decisions') && b.decisions && b.decisions.length > 0 && (
          <>
            <Sec title="Decisions needed" src="from divergences and blockers" />
            <Card>
              {b.decisions.map((d, i) => (
                <Row key={i} first={i === 0}>
                  <div style={{ display: 'flex', gap: 11, alignItems: 'baseline' }}>
                    <span style={{ fontFamily: 'Georgia, serif', fontSize: 17, color: 'var(--gw-navy)', minWidth: 18 }}>{i + 1}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, color: 'var(--gw-dark)', fontSize: 13 }}>{d.question}</div>
                      <div style={{ fontSize: 12, color: 'var(--gw-muted)', marginTop: 2 }}>{d.why}</div>
                    </div>
                    <Pill tone={d.source === 'blocker' ? 'bad' : 'warn'}>{d.owner}</Pill>
                  </div>
                </Row>
              ))}
            </Card>
          </>
        )}

        {/* ---------------------------------------------- against the plan */}
        {(has('objectives') || has('divergence')) && <Zone label="Against the plan" />}

        {has('objectives') && b.objectives && b.objectives.length > 0 && (
          <>
            <Sec title="What we are aiming for" src="the lead sets these" />
            <Card>
              {b.objectives.map((o, i) => {
                const pct = o.target && o.target > 0 ? Math.min(100, Math.round((o.count / o.target) * 100)) : 0
                return (
                  <Row key={o.id} first={i === 0}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, fontSize: 13, fontWeight: 600, minWidth: 160 }}>
                        {o.name}
                        {o.isNew && <span style={{ marginLeft: 7 }}><Pill tone="info">new</Pill></span>}
                      </div>
                      <div style={{ width: 140, height: 7, borderRadius: 6, background: '#EAEDF6', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: 'var(--gw-navy)', borderRadius: 6 }} />
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--gw-sub)', minWidth: 64, textAlign: 'right' }}>
                        <b style={{ color: 'var(--gw-dark)' }}>{o.count}</b>{o.target != null ? ` of ${o.target}` : ''}
                      </div>
                      <div style={{ fontSize: 10.5, fontWeight: 700, minWidth: 92, textAlign: 'right', color: o.delta > 0 ? 'var(--gw-green-t)' : 'var(--gw-muted)' }}>
                        {o.delta > 0 ? `+${o.delta} this session` : 'no change'}
                      </div>
                    </div>
                    {/* A new target means nothing until people have checked in against it. */}
                    {o.isNew && o.askedOf && (
                      <div style={{ fontSize: 11.5, color: 'var(--gw-sub)', marginTop: 6 }}>
                        Asked about this so far:{' '}
                        {o.askedOf.filter((a) => a.asked).map((a) => a.name).join(', ') || 'nobody yet'}
                        {o.askedOf.some((a) => !a.asked) && (
                          <> · still to be asked: {o.askedOf.filter((a) => !a.asked).map((a) => a.name).join(', ')}</>
                        )}
                      </div>
                    )}
                  </Row>
                )
              })}
            </Card>
          </>
        )}

        {has('divergence') && b.divergence && (
          <>
            <Sec title="Where accounts differ" src="cross-referenced" />
            <Card>
              {b.divergence.items.length === 0 && b.divergence.agreements.length === 0 ? (
                <Row first><div style={{ fontSize: 12.5, color: 'var(--gw-muted)' }}>Nothing cross-referenced yet. This fills in once more than one person has checked in.</div></Row>
              ) : (
                <>
                  {b.divergence.items.map((d: any, i: number) => (
                    <Row key={i} first={i === 0}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gw-dark)' }}>
                        {d.topic ?? d.tag ?? 'A difference between accounts'}
                        <span style={{ marginLeft: 8 }}><Pill tone="warn">differs</Pill></span>
                      </div>
                      {d.text && <div style={{ fontSize: 12, color: 'var(--gw-sub)', marginTop: 3 }}>{d.text}</div>}
                    </Row>
                  ))}
                  {b.divergence.agreements.map((a: any, i: number) => (
                    <Row key={`a${i}`}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gw-dark)' }}>
                        {typeof a === 'string' ? a : a.topic ?? 'Agreed'}
                        <span style={{ marginLeft: 8 }}><Pill tone="good">agreed</Pill></span>
                      </div>
                    </Row>
                  ))}
                  {b.divergence.centralQuestion && (
                    <Row>
                      <div style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '.3px', color: 'var(--gw-muted)', fontWeight: 700, marginBottom: 3 }}>The question this turns on</div>
                      <div style={{ fontSize: 13, color: 'var(--gw-text)' }}>{b.divergence.centralQuestion}</div>
                    </Row>
                  )}
                </>
              )}
              {/* The board shows the summary; the report holds the substance. */}
              <div style={{ fontSize: 11.5, color: 'var(--gw-muted)', fontStyle: 'italic', padding: '10px 0', borderTop: '1px dashed var(--gw-border)', marginTop: 4 }}>
                {b.divergence.pointer} <Link to={`/grounds/${id}/report`} style={{ color: 'var(--gw-navy)', fontWeight: 600 }}>Open your report →</Link>
              </div>
            </Card>
          </>
        )}

        {/* ---------------------------------------------- the work */}
        {(has('whoOwnsWhat') || has('dependencies') || has('checkInGrid')) && <Zone label="The work" />}

        {has('whoOwnsWhat') && b.whoOwnsWhat && (
          <>
            <Sec title="Who owns what" src="extracted from check-ins" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 14 }}>
              {b.whoOwnsWhat.map((p) => (
                <Card key={p.participantId} pad={false}>
                  <div style={{ padding: '13px 15px 10px', borderBottom: '1px solid var(--gw-border)' }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--gw-dark)' }}>{p.name}</div>
                    {p.role && <div style={{ fontSize: 12, color: 'var(--gw-sub)', marginTop: 1 }}>{p.role}</div>}
                  </div>
                  <div style={{ padding: '2px 15px 10px' }}>
                    {p.items.length === 0 ? (
                      <div style={{ fontSize: 12, color: 'var(--gw-muted)', padding: '10px 0' }}>Nothing on record yet.</div>
                    ) : p.items.map((it, i) => (
                      <div key={it.id} style={{ padding: '10px 0', borderTop: i === 0 ? 'none' : '1px solid var(--gw-border)' }}>
                        <div style={{ fontSize: 12.5, lineHeight: 1.45 }}>{it.text.replace(/^\[VERIFIABILITY:[A-Z]+\]\s*/, '')}</div>
                        <div style={{ marginTop: 4, display: 'flex', gap: 6, alignItems: 'center' }}>
                          <Pill>{it.type.toLowerCase().replace(/_/g, ' ')}</Pill>
                          {it.sessionNumber && <span style={{ fontSize: 10.5, color: 'var(--gw-muted)' }}>session {it.sessionNumber}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}

        {has('dependencies') && b.dependencies && (
          <>
            <Sec title="Waiting on" src="handoffs between people" />
            <Card>
              {b.dependencies.length === 0 ? (
                <Row first><div style={{ fontSize: 12.5, color: 'var(--gw-muted)' }}>Nobody has named a handoff yet.</div></Row>
              ) : b.dependencies.map((d, i) => (
                <Row key={d.id} first={i === 0}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, color: 'var(--gw-dark)', fontSize: 13 }}>{d.from}</span>
                    <span style={{ color: 'var(--gw-sub)', fontSize: 12 }}>needs</span>
                    <Pill tone={d.status === 'CLEARED' ? 'good' : 'warn'}>{d.what}</Pill>
                    <span style={{ color: 'var(--gw-sub)', fontSize: 12 }}>from</span>
                    <span style={{ fontWeight: 700, color: 'var(--gw-dark)', fontSize: 13 }}>{d.on ?? 'someone outside this ground'}</span>
                    <span style={{ marginLeft: 'auto' }}>
                      <Pill tone={d.status === 'BLOCKING' ? 'bad' : d.status === 'CLEARED' ? 'good' : 'warn'}>
                        {d.status === 'BLOCKING' ? 'Blocking' : d.status === 'CLEARED' ? 'Cleared' : 'Waiting'}
                      </Pill>
                    </span>
                  </div>
                  {d.then && <div style={{ fontSize: 12, color: 'var(--gw-sub)', marginTop: 4 }}>{d.then}</div>}
                </Row>
              ))}
            </Card>
          </>
        )}

        {has('checkInGrid') && b.checkInGrid && (
          <>
            <Sec title="Check-ins this phase" src="from sessions" />
            <Card>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 460 }}>
                  <thead>
                    <tr>
                      {['Person', 'Role', ...b.checkInGrid.sessions.map((s) => `Session ${s}`)].map((h) => (
                        <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '.4px', color: 'var(--gw-muted)', fontWeight: 700, borderBottom: '1px solid var(--gw-border)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {b.checkInGrid.rows.map((r) => (
                      <tr key={r.participantId}>
                        <td style={td}><span style={{ fontWeight: 700, color: 'var(--gw-dark)' }}>{r.name}</span></td>
                        <td style={{ ...td, color: 'var(--gw-sub)' }}>{r.role ?? (r.managingOnly ? 'Managing only' : '—')}</td>
                        {b.checkInGrid!.sessions.map((s) => {
                          const v = r.cells[String(s)] ?? 'na'
                          return (
                            <td key={s} style={td}>
                              {v === 'na' ? <span style={{ color: 'var(--gw-muted)' }}>—</span>
                                : <Pill tone={v === 'done' ? 'good' : v === 'in-progress' ? 'info' : v === 'declined' ? 'bad' : 'flat'}>
                                    {v === 'done' ? 'Checked in' : v === 'in-progress' ? 'In progress' : v === 'declined' ? 'Declined' : 'Not started'}
                                  </Pill>}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}

        {/* ---------------------------------------------- contribution and fairness */}
        {(has('contribution') || has('coverage')) && <Zone label="Contribution and fairness" />}

        {has('contribution') && b.contribution && (
          <>
            <Sec title="Contribution against role" src="each role, own terms" />
            <Card>
              <div style={{ fontSize: 12, color: 'var(--gw-sub)', padding: '6px 0 2px' }}>
                Is the role clear, where does each person sit against it, and is that read fair to what their job actually is.
              </div>
              {b.contribution.map((c) => (
                <div key={c.participantId} style={{ border: '1px solid var(--gw-border)', borderRadius: 12, padding: '12px 14px', marginTop: 9, background: 'var(--gw-bg)' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 9, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, color: 'var(--gw-dark)', fontSize: 14 }}>{c.name}</span>
                    {c.remitDefined
                      ? <span style={{ fontSize: 12, color: 'var(--gw-sub)' }}>{c.remit}</span>
                      : <span style={{ fontSize: 12, color: 'var(--gw-amber-t)', fontWeight: 600 }}>role not clearly defined</span>}
                    {c.position && (
                      <span style={{ marginLeft: 'auto' }}>
                        <Pill tone={c.position === 'beyond' ? 'good' : c.position === 'at' ? 'info' : 'warn'}>{c.positionLabel}</Pill>
                      </span>
                    )}
                  </div>

                  {/* An undefined remit shows NO position. You cannot measure someone
                      against a bar that was never set. */}
                  {!c.remitDefined ? (
                    <div style={{ fontSize: 12, color: 'var(--gw-navy)', background: 'var(--gw-blue-bg)', border: '1px solid var(--gw-blue-b)', borderRadius: 9, padding: '8px 10px', marginTop: 8, lineHeight: 1.45 }}>
                      {c.note}
                    </div>
                  ) : (
                    <>
                      {/* A position is never shown without its reason. */}
                      <div style={{ marginTop: 7, fontSize: 12, lineHeight: 1.45 }}>
                        <b style={{ color: 'var(--gw-dark)' }}>Why:</b> {c.reason}
                      </div>
                      {c.fnLabel && (
                        <div style={{ marginTop: 6, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                          <Pill tone="info">read as {c.fnLabel.toLowerCase()}</Pill>
                          {!c.fnConfident && <span style={{ fontSize: 10.5, color: 'var(--gw-muted)', fontStyle: 'italic' }}>still provisional</span>}
                          {c.isBlocked && <Pill tone="warn">part of this is blocked</Pill>}
                        </div>
                      )}
                      <div style={{ marginTop: 8, fontSize: 12, lineHeight: 1.4, background: c.ownVoice ? 'var(--gw-blue-bg)' : 'transparent', border: c.ownVoice ? '1px solid var(--gw-blue-b)' : '1px dashed var(--gw-border)', borderRadius: 9, padding: '6px 10px', color: c.ownVoice ? 'var(--gw-blue-t)' : 'var(--gw-muted)', fontStyle: c.ownVoice ? 'normal' : 'italic' }}>
                        {c.ownVoice ?? 'No note. This person can add their own context through their next check-in.'}
                      </div>
                    </>
                  )}
                </div>
              ))}
              {b.contribution[0]?.guard && (
                <div style={{ fontSize: 10.5, color: 'var(--gw-muted)', fontStyle: 'italic', marginTop: 11, paddingTop: 9, borderTop: '1px dashed var(--gw-border)', lineHeight: 1.5 }}>
                  {b.contribution[0].guard}
                </div>
              )}
            </Card>
          </>
        )}

        {has('coverage') && b.coverage && (
          <>
            <Sec title="Where work is landing" src="whose work is landing where" />
            <Card>
              <div style={{ fontSize: 12, color: 'var(--gw-sub)', padding: '6px 0 2px' }}>
                A drop in ownership shows up as your responsibilities landing more and more in other people's accounts.
                Rising is the early warning, often before targets are missed, because the work still gets done, by someone else.
              </div>

              {/* Both variants ship so the "does a bar read as a verdict" question
                  gets answered by real use rather than a guess. */}
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', margin: '8px 0 4px' }}>
                <span style={{ fontSize: 10.5, color: 'var(--gw-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.3px' }}>Showing</span>
                {(['text', 'bar'] as CoverageVariant[]).map((v) => (
                  <button key={v} onClick={() => setVariant(v)} style={{
                    fontSize: 10.5, fontWeight: 700, padding: '3px 10px', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit',
                    border: '1px solid ' + (b.coverageVariant === v ? 'var(--gw-dark)' : 'var(--gw-border)'),
                    background: b.coverageVariant === v ? 'var(--gw-dark)' : 'white',
                    color: b.coverageVariant === v ? 'white' : 'var(--gw-sub)',
                  }}>{v === 'text' ? 'words only' : 'with a bar'}</button>
                ))}
              </div>

              {b.coverage.reads.map((r) => (
                <div key={r.participantId} style={{ border: '1px solid var(--gw-border)', borderRadius: 12, padding: '12px 14px', marginTop: 9, background: 'var(--gw-bg)' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 9, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, color: 'var(--gw-dark)', fontSize: 14 }}>{r.name}</span>
                    <span style={{ fontSize: 10.5, color: 'var(--gw-muted)', textTransform: 'uppercase', letterSpacing: '.3px' }}>{r.scope} level</span>
                    <span style={{ marginLeft: 'auto' }}>
                      <Pill tone={r.kind === 'LEAKING' ? 'warn' : r.kind === 'ABSORBING' ? 'info' : 'flat'}>
                        {r.kind === 'LEAKING' ? 'Landing with others' : r.kind === 'ABSORBING' ? "Taking on others' work" : 'Staying with them'}
                      </Pill>
                    </span>
                  </div>

                  {b.coverageVariant === 'bar' && r.remitDefined && (
                    <div style={{ height: 7, borderRadius: 6, background: '#EAEDF6', overflow: 'hidden', marginTop: 9 }}>
                      <div style={{ height: '100%', width: `${r.pct}%`, borderRadius: 6, background: r.kind === 'LEAKING' ? 'var(--gw-amber-b)' : r.kind === 'ABSORBING' ? 'var(--gw-navy)' : 'var(--gw-muted)' }} />
                    </div>
                  )}

                  <div style={{ marginTop: 8, fontSize: 12, lineHeight: 1.45 }}>
                    <b style={{ color: 'var(--gw-dark)' }}>What the record shows:</b> {r.what}
                  </div>

                  {/* The signal is ALWAYS coupled to the reason it cannot self-determine. */}
                  <div style={{ marginTop: 7, fontSize: 12, lineHeight: 1.4, background: 'white', border: '1px solid var(--gw-border)', borderRadius: 9, padding: '7px 10px' }}>
                    <span style={{ fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '.3px', fontWeight: 700, color: 'var(--gw-muted)', display: 'block', marginBottom: 2 }}>
                      Which of the four this is
                    </span>
                    {r.reasonText}
                  </div>

                  <div style={{ marginTop: 7, fontSize: 12, lineHeight: 1.4, border: '1px dashed var(--gw-border)', borderRadius: 9, padding: '6px 10px', color: 'var(--gw-muted)', fontStyle: 'italic' }}>
                    {r.ownVoice ?? 'No note. This person can add context through their next check-in.'}
                  </div>
                </div>
              ))}

              <div style={{ fontSize: 10.5, color: 'var(--gw-muted)', fontStyle: 'italic', marginTop: 11, paddingTop: 9, borderTop: '1px dashed var(--gw-border)', lineHeight: 1.5 }}>
                Other people doing your work can mean four different things: an ownership drop (others covering a gap), healthy shared
                work by design, you being blocked or overloaded, or someone else over-reaching into your role. This shows the signal and
                the reason it cannot tell which on its own, two-sided, coupled to the waiting-on and role-clarity views, with your own
                voice. It never concludes you stopped contributing. It surfaces a question the team should discuss, not a verdict about a
                person. Only shown where the role is defined, an undefined boundary has no coverage to measure.
              </div>
            </Card>
          </>
        )}

        {/* ---------------------------------------------- the record over time */}
        {(has('patterns') || has('meetings')) && <Zone label="The record over time" />}

        {has('patterns') && b.patterns && (
          <>
            <Sec title="Patterns this phase" src="work patterns only" />
            <Card>
              {b.patterns.length === 0 ? (
                <Row first><div style={{ fontSize: 12.5, color: 'var(--gw-muted)' }}>No patterns have repeated often enough to show yet. A pattern needs three periods before it appears here.</div></Row>
              ) : b.patterns.map((p, i) => (
                <Row key={i} first={i === 0}>
                  <div style={{ display: 'flex', gap: 11, alignItems: 'baseline' }}>
                    <Pill tone="info">{p.code.toLowerCase().replace(/_/g, ' ')}</Pill>
                    <span style={{ flex: 1, fontSize: 12.5 }}>{p.text}</span>
                    <span style={{ fontSize: 10.5, color: 'var(--gw-muted)' }}>{p.periods} periods</span>
                  </div>
                </Row>
              ))}
              <div style={{ fontSize: 10.5, color: 'var(--gw-muted)', fontStyle: 'italic', padding: '10px 0', borderTop: '1px dashed var(--gw-border)', marginTop: 4, lineHeight: 1.5 }}>
                Patterns about the work only. Anything that would read as a judgement about a person stays in the lead's private report and never appears here.
              </div>
            </Card>
          </>
        )}

        {has('meetings') && b.meetings && (
          <>
            <Sec title="Meetings, shared record" src="captured after meetings" />
            <Card pad={false}>
              {b.meetings.length === 0 ? (
                <div style={{ padding: '14px 16px', fontSize: 12.5, color: 'var(--gw-muted)' }}>No meetings on record yet.</div>
              ) : b.meetings.map((m, i) => (
                <div key={m.id} style={{ padding: '12px 15px', borderTop: i === 0 ? 'none' : '1px solid var(--gw-border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, color: 'var(--gw-dark)', fontSize: 13 }}>{dshort(m.happenedAt)}</span>
                    <span style={{ fontSize: 10.5, color: 'var(--gw-sub)' }}>present: {m.present.join(', ') || '—'}</span>
                  </div>
                  <div style={{ marginTop: 7, fontSize: 12, lineHeight: 1.5 }}>{m.notes}</div>
                  {m.missed.length > 0 && (
                    <div style={{ fontSize: 10.5, color: 'var(--gw-amber-t)', marginTop: 6 }}>Missed, should read this: {m.missed.join(', ')}</div>
                  )}
                </div>
              ))}
            </Card>
          </>
        )}

        {/* ---------------------------------------------- logistics */}
        {has('poll') && (
          <>
            <Zone label="Logistics" />
            <Sec title="Find a time" src="the one thing you add" />
            <Card>
              {!b.poll ? (
                <Row first><div style={{ fontSize: 12.5, color: 'var(--gw-muted)' }}>No availability poll yet.</div></Row>
              ) : (
                <>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--gw-dark)', padding: '4px 0' }}>
                    {b.poll.question}
                    <span style={{ fontSize: 10.5, color: 'var(--gw-navy)', fontWeight: 600, marginLeft: 8 }}>tap your name to mark availability</span>
                  </div>
                  {b.poll.options.map((o, i) => {
                    const max = Math.max(...b.poll!.options.map((x) => x.count))
                    const win = o.count === max && max > 0
                    return (
                      <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 8px', borderTop: i === 0 ? 'none' : '1px solid var(--gw-border)', background: win ? 'var(--gw-green-bg)' : 'transparent', borderRadius: win ? 9 : 0, margin: win ? '2px -8px' : 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, minWidth: 110 }}>{o.label}</div>
                        {/* Only YOUR OWN availability is clickable. Everyone else is a
                            read-only indicator: the toggle endpoint acts on the caller,
                            so a clickable chip bearing someone else's name would set
                            your availability while appearing to set theirs. */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, flex: 1, alignItems: 'center' }}>
                          <button
                            onClick={() => togglePoll.mutate(o.id)}
                            disabled={togglePoll.isPending}
                            title="Toggle your own availability for this time"
                            style={{
                              fontSize: 10.5, fontWeight: 700, borderRadius: 13, padding: '3px 10px',
                              cursor: togglePoll.isPending ? 'wait' : 'pointer', fontFamily: 'inherit',
                              background: o.whoIds.some((w) => myIds.has(w)) ? 'var(--gw-blue-bg)' : '#F1F2F5',
                              color: o.whoIds.some((w) => myIds.has(w)) ? 'var(--gw-blue-t)' : 'var(--gw-sub)',
                              border: '1px solid ' + (o.whoIds.some((w) => myIds.has(w)) ? 'var(--gw-blue-b)' : 'var(--gw-border)'),
                            }}
                          >
                            {o.whoIds.some((w) => myIds.has(w)) ? '✓ you can make this' : 'I can make this'}
                          </button>
                          {o.who.filter(Boolean).length > 0 && (
                            <span style={{ fontSize: 10.5, color: 'var(--gw-muted)' }}>
                              also: {o.who.filter(Boolean).join(', ')}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 12, color: win ? 'var(--gw-green-t)' : 'var(--gw-sub)', minWidth: 42, textAlign: 'right', fontWeight: win ? 700 : 400 }}>{o.count} in</div>
                      </div>
                    )
                  })}
                </>
              )}
            </Card>
          </>
        )}

        <div style={{ color: 'var(--gw-muted)', fontSize: 10.5, textAlign: 'center', marginTop: 28, lineHeight: 1.6 }}>
          Groundwork board · confidential · generated from the ground.<br />
          Everyone on this ground sees the same board. It regenerates as people check in each session.<br />
          The mode is fixed at creation, so a private alignment ground can never be read this way.
        </div>
      </div>
    </div>
  )
}

const td: React.CSSProperties = { padding: '9px 12px', textAlign: 'left', fontSize: 12, borderBottom: '1px solid var(--gw-border)' }
const btn: React.CSSProperties = { padding: '9px 16px', borderRadius: 7, background: 'var(--gw-navy)', color: 'white', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit', display: 'inline-block' }
const btnGhost: React.CSSProperties = { padding: '9px 16px', borderRadius: 7, background: 'none', color: 'var(--gw-sub)', fontSize: 13, border: '1px solid var(--gw-border)', cursor: 'pointer', fontFamily: 'inherit' }
