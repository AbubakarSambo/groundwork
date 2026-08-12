import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { boardApi, type BoardPresent, type CoverageVariant } from '@/api/board'
import { toast } from 'sonner'
// The board's own vocabulary now lives in components/gw/kit so every other page
// can be rebuilt from it. Values unchanged: this is an extraction, not a redesign.
import { Zone, Sec, Card, Row, Pill, td, btn, miniBtn, btnGhost } from '@/components/gw/kit'

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

  const [newObjName, setNewObjName] = useState('')
  const [newObjTarget, setNewObjTarget] = useState('')
  const [pollQ, setPollQ] = useState('')
  const [pollOpts, setPollOpts] = useState('')
  const [showPollForm, setShowPollForm] = useState(false)

  const invalidate = () => qc.invalidateQueries({ queryKey: ['board', id] })

  const addObjective = useMutation({
    mutationFn: () => boardApi.createObjective(id!, {
      name: newObjName.trim(),
      target: newObjTarget.trim() ? Number(newObjTarget) : null,
    }),
    onSuccess: () => { setNewObjName(''); setNewObjTarget(''); invalidate() },
    onError: () => toast.error('Could not add that target. Try again.'),
  })

  const bumpObjective = useMutation({
    mutationFn: (v: { objectiveId: string; count: number }) =>
      boardApi.updateObjective(id!, v.objectiveId, { count: v.count }),
    onSuccess: invalidate,
    onError: () => toast.error('Could not update that count. Try again.'),
  })

  const removeObjective = useMutation({
    mutationFn: (objectiveId: string) => boardApi.deleteObjective(id!, objectiveId),
    onSuccess: invalidate,
    onError: () => toast.error('Could not remove that target. Try again.'),
  })

  const savePoll = useMutation({
    mutationFn: () => boardApi.upsertPoll(id!, {
      question: pollQ.trim(),
      options: pollOpts.split('\n').map((o) => o.trim()).filter(Boolean),
    }),
    onSuccess: () => { setShowPollForm(false); setPollQ(''); setPollOpts(''); invalidate() },
    onError: () => toast.error('Could not save the poll. Try again.'),
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
                  {/* Say what this is, in the words the person setting it up
                      would use. "Cohort ground" is our internal grouping name
                      leaking onto the page - nobody describes their own
                      situation that way. What actually distinguishes these is
                      whether the people see each other's work, which the lead
                      now sets directly, so that is what the badge says. */}
                  {b.peopleWorkTogether === false
                    ? 'Same work, separate places'
                    : b.family === 'DELIVERY' ? 'A team working together'
                    : b.family === 'COHORT' ? 'Same work, separate places'
                    : b.family === 'ONBOARDING' ? 'Settling into the role'
                    : 'A period being reviewed'}
                </span>
                {/*
                  A ground with no dates set rendered "— to — · session 1", which is
                  two em dashes standing in for information nobody entered, in the
                  header of the best page in the product - and em dashes are against
                  house style anyway. Say the session, and only mention dates when
                  there are dates.
                */}
                {b.phaseSpine && (
                  <span>
                    {b.phaseSpine.startsAt || b.phaseSpine.endsAt
                      ? `${dshort(b.phaseSpine.startsAt)} to ${dshort(b.phaseSpine.endsAt)} · `
                      : ''}
                    session {b.phaseSpine.currentSession}
                  </span>
                )}
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

        {/* What was agreed at the start, so the rest of the board has something
            to be read against. This section has been in the DELIVERY family's
            list since the board was built with nothing behind it - so a lead saw
            where the work had got to and not what it was meant to be for. It is
            the only block here that no check-in can revise. */}
        {has('startingState') && b.startingState && (
          <>
            <Sec title="What was agreed at the start" src="set when the ground was opened, before any check-in" />
            <Card>
              <Row first>
                <div style={{ fontSize: 13.5, color: 'var(--gw-dark)', lineHeight: 1.55 }}>{b.startingState}</div>
              </Row>
            </Card>
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
            {b.objectivesPrompt && (
              <div style={{ background: 'var(--gw-amber-bg)', border: '1px solid var(--gw-amber-b)', borderRadius: 10, padding: '10px 14px', marginBottom: 8, fontSize: 12.5, color: 'var(--gw-amber-t)', lineHeight: 1.5 }}>
                {b.objectivesPrompt}
              </div>
            )}
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
                      {b.canEditFrame && (
                        <span style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                          <button
                            onClick={() => bumpObjective.mutate({ objectiveId: o.id, count: Math.max(0, o.count - 1) })}
                            disabled={bumpObjective.isPending || o.count === 0}
                            title="Move this count down"
                            style={miniBtn}
                          >-</button>
                          <button
                            onClick={() => bumpObjective.mutate({ objectiveId: o.id, count: o.count + 1 })}
                            disabled={bumpObjective.isPending}
                            title="Move this count up"
                            style={miniBtn}
                          >+</button>
                          <button
                            onClick={() => removeObjective.mutate(o.id)}
                            disabled={removeObjective.isPending}
                            title="Remove this target"
                            style={{ ...miniBtn, color: 'var(--gw-clay)' }}
                          >x</button>
                        </span>
                      )}
                    {/* The record suggests, the lead decides. Never auto-applied:
                        a number a person set is theirs until they change it. */}
                    {o.suggestedCount != null && b.canEditFrame && (
                      <div style={{ fontSize: 11.5, color: 'var(--gw-navy)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span>
                          The record shows <b>{o.suggestedCount}</b> for this, not {o.count}.
                        </span>
                        <button
                          onClick={() => bumpObjective.mutate({ objectiveId: o.id, count: o.suggestedCount! })}
                          disabled={bumpObjective.isPending}
                          style={{ fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 11, border: '1px solid var(--gw-blue-b)', background: 'var(--gw-blue-bg)', color: 'var(--gw-blue-t)', cursor: 'pointer', fontFamily: 'inherit' }}
                        >
                          Use {o.suggestedCount}
                        </button>
                      </div>
                    )}
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
              {/* The lead sets the frame. A target, never an assessment of a person. */}
              {b.canEditFrame && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '11px 0', borderTop: '1px solid var(--gw-border)', flexWrap: 'wrap' }}>
                  <input
                    value={newObjName}
                    onChange={(e) => setNewObjName(e.target.value)}
                    placeholder="Add a target, e.g. Paying companies"
                    style={{ flex: 1, minWidth: 200, padding: '7px 10px', fontSize: 12.5, border: '1px solid var(--gw-border)', borderRadius: 7, fontFamily: 'inherit', outline: 'none' }}
                  />
                  <input
                    value={newObjTarget}
                    onChange={(e) => setNewObjTarget(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="how many"
                    style={{ width: 96, padding: '7px 10px', fontSize: 12.5, border: '1px solid var(--gw-border)', borderRadius: 7, fontFamily: 'inherit', outline: 'none' }}
                  />
                  <button
                    onClick={() => addObjective.mutate()}
                    disabled={!newObjName.trim() || addObjective.isPending}
                    style={{ ...btn, padding: '7px 14px', fontSize: 12.5, opacity: !newObjName.trim() || addObjective.isPending ? 0.5 : 1 }}
                  >
                    {addObjective.isPending ? 'Adding...' : 'Add target'}
                  </button>
                </div>
              )}
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
                        {d.topic ?? d.tag ?? 'Somewhere you see it differently'}
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
                Is the role clear, and what does the record actually hold for each person, read in their own function's terms.
              </div>
              {b.contribution.map((c) => (
                <div key={c.participantId} style={{ border: '1px solid var(--gw-border)', borderRadius: 12, padding: '12px 14px', marginTop: 9, background: 'var(--gw-bg)' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 9, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, color: 'var(--gw-dark)', fontSize: 14 }}>{c.name}</span>
                    {c.remitDefined
                      ? <span style={{ fontSize: 12, color: 'var(--gw-sub)' }}>{c.remit}</span>
                      : <span style={{ fontSize: 12, color: 'var(--gw-amber-t)', fontWeight: 600 }}>role not clearly defined</span>}

                  </div>

                  {/* An undefined remit shows NO position. You cannot measure someone
                      against a bar that was never set. */}
                  {c.shown === false && c.remitDefined ? (
                    /* Too little on record to say anything about a person yet. A
                       hedge still reads as a verdict, so nothing is shown at all. */
                    <div style={{ fontSize: 12, color: 'var(--gw-muted)', marginTop: 8, lineHeight: 1.45, fontStyle: 'italic' }}>
                      Not enough on record yet to say anything about this person's contribution. {c.basis}
                    </div>
                  ) : !c.remitDefined ? (
                    <div style={{ fontSize: 12, color: 'var(--gw-navy)', background: 'var(--gw-blue-bg)', border: '1px solid var(--gw-blue-b)', borderRadius: 9, padding: '8px 10px', marginTop: 8, lineHeight: 1.45 }}>
                      {c.note}
                    </div>
                  ) : (
                    <>
                      {/* A position is never shown without its reason. */}
                      <div style={{ marginTop: 7, fontSize: 12, lineHeight: 1.45 }}>
                        <b style={{ color: 'var(--gw-dark)' }}>Why:</b> {c.reason}
                      </div>
                      {c.basis && (
                        <div style={{ marginTop: 6, fontSize: 10.5, color: 'var(--gw-muted)', lineHeight: 1.45 }}>
                          {c.basis}
                        </div>
                      )}
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

              {b.coverage.reads.filter((r) => r.shown !== false).map((r) => (
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

                  {r.basis && (
                    <div style={{ marginTop: 6, fontSize: 10.5, color: 'var(--gw-muted)', lineHeight: 1.45 }}>{r.basis}</div>
                  )}

                  <div style={{ marginTop: 7, fontSize: 12, lineHeight: 1.4, border: '1px dashed var(--gw-border)', borderRadius: 9, padding: '6px 10px', color: 'var(--gw-muted)', fontStyle: 'italic' }}>
                    {r.ownVoice ?? 'No note. This person can add context through their next check-in.'}
                  </div>
                </div>
              ))}

              {b.coverage.reads.some((r) => r.shown === false) && (
                <div style={{ fontSize: 11, color: 'var(--gw-muted)', marginTop: 9, lineHeight: 1.45 }}>
                  {b.coverage.reads.filter((r) => r.shown === false).map((r) => r.name).join(', ')} {b.coverage.reads.filter((r) => r.shown === false).length === 1 ? 'is' : 'are'} not shown here yet. There is too little on record to say anything about where their work is landing, and a guess about that would be worse than a gap.
                </div>
              )}

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

        {b.managerAlignment && b.managerAlignment.length > 0 && (
          <>
            <Sec title="How the leading is landing" src="two accounts of the same leadership" />
            <Card>
              <div style={{ fontSize: 12, color: 'var(--gw-sub)', padding: '6px 0 2px' }}>
                Where one account of how this team is being led differs from another. Neither is called wrong.
              </div>
              {b.managerAlignment.map((m, i) => (
                <Row key={i}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--gw-dark)' }}>{m.label}</span>
                    {/* The pole matters more than the gap: holding on to everything
                        and holding nobody need opposite responses, and telling one
                        to do the other makes it worse. */}
                    {m.pole !== 'NEITHER' && (
                      <Pill tone="info">
                        {m.pole === 'CONTROL' ? 'nobody else gets to own it' : 'nobody is being held to it'}
                      </Pill>
                    )}
                    <span style={{ fontSize: 10.5, color: 'var(--gw-muted)', marginLeft: 'auto' }}>
                      seen across {m.periods} sessions
                    </span>
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--gw-text)', marginTop: 4, lineHeight: 1.45 }}>{m.gap}</div>
                  <div style={{ fontSize: 12, color: 'var(--gw-sub)', marginTop: 4, lineHeight: 1.45 }}>{m.note}</div>
                </Row>
              ))}
              <div style={{ fontSize: 10.5, color: 'var(--gw-muted)', fontStyle: 'italic', padding: '10px 0', borderTop: '1px dashed var(--gw-border)', marginTop: 4, lineHeight: 1.5 }}>
                Neither account is called wrong. Something can be set clearly and still not land, and both people can be describing
                their own experience honestly. This shows that two accounts of the same leadership differ, never who said what, and it
                is a prompt for a conversation rather than a finding about anyone.
              </div>
            </Card>
          </>
        )}

        {/* ---------------------------------------------- the record over time */}
        {has('patterns') && <Zone label="The record over time" />}

        {has('patterns') && b.patterns && (
          <>
            <Sec title="Patterns this phase" src="work patterns only" />
            <Card>
              {b.patterns.length === 0 ? (
                <Row first><div style={{ fontSize: 12.5, color: 'var(--gw-muted)' }}>No patterns have repeated often enough to show yet. A pattern needs three periods before it appears here.</div></Row>
              ) : b.patterns.map((p, i) => (
                <Row key={i} first={i === 0}>
                  <div style={{ display: 'flex', gap: 11, alignItems: 'baseline' }}>
                    {p.label && <Pill tone="info">{p.label}</Pill>}
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

        {/* ---------------------------------------------- logistics */}
        {has('poll') && (
          <>
            <Zone label="Logistics" />
            <Sec title="Find a time" src="the one thing you add" />
            <Card>
              {b.canEditFrame && (
                <div style={{ padding: '8px 0', borderBottom: b.poll ? '1px solid var(--gw-border)' : 'none' }}>
                  {!showPollForm ? (
                    <button onClick={() => { setShowPollForm(true); setPollQ(b.poll?.question ?? 'Weekly sync, best time'); setPollOpts((b.poll?.options ?? []).map((o) => o.label).join('\n')) }}
                      style={{ fontSize: 12, color: 'var(--gw-navy)', background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, textDecoration: 'underline' }}>
                      {b.poll ? 'Change the times' : 'Set up an availability poll'}
                    </button>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <input value={pollQ} onChange={(e) => setPollQ(e.target.value)} placeholder="What are you finding a time for?"
                        style={{ padding: '7px 10px', fontSize: 12.5, border: '1px solid var(--gw-border)', borderRadius: 7, fontFamily: 'inherit', outline: 'none' }} />
                      <textarea value={pollOpts} onChange={(e) => setPollOpts(e.target.value)} placeholder={'One time per line\nTue 16:00\nWed 09:00'}
                        style={{ minHeight: 68, padding: '7px 10px', fontSize: 12.5, border: '1px solid var(--gw-border)', borderRadius: 7, fontFamily: 'inherit', outline: 'none', resize: 'vertical' }} />
                      {b.poll && (
                        <div style={{ fontSize: 11, color: 'var(--gw-amber-t)' }}>
                          Changing the times clears everyone's availability, because an answer to a question that changed is not an answer.
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => savePoll.mutate()} disabled={!pollQ.trim() || !pollOpts.trim() || savePoll.isPending}
                          style={{ ...btn, padding: '7px 14px', fontSize: 12.5, opacity: !pollQ.trim() || !pollOpts.trim() || savePoll.isPending ? 0.5 : 1 }}>
                          {savePoll.isPending ? 'Saving...' : 'Save'}
                        </button>
                        <button onClick={() => setShowPollForm(false)} style={{ ...btnGhost, padding: '7px 12px', fontSize: 12.5 }}>Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
              )}
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

