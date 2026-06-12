import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { groundsApi, type GroundScenario, type GroundMoment, type GroundCadence } from '@/api/grounds'
import { toast } from 'sonner'

interface ScenarioCard {
  scenario: GroundScenario
  label: string
  desc: string
  tag: string
  tagBg: string
  tagColor: string
}

const SCENARIOS: ScenarioCard[] = [
  { scenario: 'NEW_HIRE',        label: 'New hire',          desc: 'Someone just joined. Set expectations on both sides before the work starts.',           tag: 'Starting',     tagBg: '#E8F8F5', tagColor: '#085041' },
  { scenario: 'NEW_COFOUNDER',   label: 'New co-founder',    desc: 'A partnership forming. Get the brief on record from both sides early.',                  tag: 'Starting',     tagBg: '#E8F8F5', tagColor: '#085041' },
  { scenario: 'NEW_ADVISOR',     label: 'New advisor',       desc: 'An advisor or board member joining. Alignment before the relationship starts.',          tag: 'Starting',     tagBg: '#E8F8F5', tagColor: '#085041' },
  { scenario: 'NEW_PROJECT',     label: 'New project',       desc: 'A project or initiative about to begin. Both sides on record before it does.',           tag: 'Starting',     tagBg: '#E8F8F5', tagColor: '#085041' },
  { scenario: 'NEW_MANAGER',     label: 'New manager',       desc: 'A new management relationship. Expectations on record from day one.',                    tag: 'Starting',     tagBg: '#E8F8F5', tagColor: '#085041' },
  { scenario: 'CONTRACT_RENEWAL',label: 'Contract renewal',  desc: 'Terms being renegotiated. Both versions of what was agreed, on record.',                 tag: 'Contract',     tagBg: '#F0EAF8', tagColor: '#5B2EA6' },
  { scenario: 'RECOGNITION',     label: 'Recognition',       desc: 'Contribution that has not been acknowledged. Evidence from both sides before the talk.',  tag: 'Recognition',  tagBg: '#FDF3E3', tagColor: '#8A5C1A' },
  { scenario: 'DRIFT',           label: 'Something not working', desc: 'A conversation that keeps being avoided. Both independent versions before it happens.', tag: 'Resolution', tagBg: '#EEF4FB', tagColor: '#0C447C' },
  { scenario: 'CRISIS_ALIGNMENT',label: 'Crisis alignment',  desc: 'Urgent. Both sides need to be heard quickly and clearly.',                               tag: 'Urgent',       tagBg: '#FCEBEB', tagColor: '#791F1F' },
]

interface MomentOption { moment: GroundMoment; label: string; sub: string }
const MOMENTS: MomentOption[] = [
  { moment: 'STARTING',    label: 'At the start',      sub: 'Set expectations before the work begins.' },
  { moment: 'RECOGNITION', label: 'Mid-way',           sub: 'Acknowledge progress. Name what has changed.' },
  { moment: 'RESOLUTION',  label: 'Reaching an end',   sub: 'Close a chapter. Agree on what happened.' },
]

interface CadenceOption { cadence: GroundCadence; label: string; days: number }
const CADENCES: CadenceOption[] = [
  { cadence: 'WEEKLY',      label: 'Weekly',       days: 7 },
  { cadence: 'FORTNIGHTLY', label: 'Fortnightly',  days: 14 },
  { cadence: 'MONTHLY',     label: 'Monthly',      days: 30 },
]

interface Participant { email: string; role: string }

export function CreateGroundPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)

  const [scenario, setScenario] = useState<GroundScenario | null>(null)
  const [moment, setMoment] = useState<GroundMoment | null>(null)
  const [timelineDays, setTimelineDays] = useState(90)
  const [cadence, setCadence] = useState<GroundCadence>('FORTNIGHTLY')
  const [participants, setParticipants] = useState<Participant[]>([])
  const [pEmail, setPEmail] = useState('')
  const [pRole, setPRole] = useState('')
  const [groundName, setGroundName] = useState('')

  const cadenceObj = CADENCES.find(c => c.cadence === cadence)!
  const sessionTotal = Math.floor(timelineDays / cadenceObj.days)
  const freeSessions = Math.min(4, sessionTotal)
  const paidSessions = sessionTotal - freeSessions

  const create = useMutation({
    mutationFn: async () => {
      const ground = await groundsApi.create({
        label: groundName.trim() || `${scenario?.replace(/_/g, ' ')} ground`,
        scenario: scenario!,
        moment: moment!,
        timelineDays,
        cadence,
      })
      await Promise.all(participants.map(p =>
        groundsApi.addParticipant(ground.id, { email: p.email, roleAsDescribed: p.role || undefined })
      ))
      return ground
    },
    onSuccess: g => { toast.success('Ground opened'); navigate(`/grounds/${g.id}`) },
    onError: () => toast.error('Could not open ground. Try again.'),
  })

  function addParticipant() {
    const email = pEmail.trim()
    if (!email || !email.includes('@')) return
    if (participants.find(p => p.email === email)) return
    setParticipants(v => [...v, { email, role: pRole.trim() }])
    setPEmail(''); setPRole('')
  }

  function back() {
    if (step > 1) setStep(s => s - 1)
    else navigate('/grounds')
  }

  const DOTS = [1,2,3,4,5]

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--gw-bg)' }}>
      <div className="gw-hdr">
        <div className="gw-logo">Groundwork</div>
        <button className="gw-back" onClick={back}>← Back</button>
      </div>

      <div className="gw-bd" style={{ maxWidth: 540, margin: '0 auto', width: '100%' }}>
        {/* Step dots */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
          {DOTS.map(n => (
            <div key={n} className={`cg-step-dot${step === n ? ' active' : step > n ? ' done' : ''}`} />
          ))}
        </div>

        {/* Step 1: Scenario */}
        {step === 1 && (
          <div>
            <div className="gw-ttl">What is this ground for?</div>
            <div className="gw-sub-t">Select the situation that fits best.</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
              {SCENARIOS.map(s => (
                <div key={s.scenario} className={`cg-sit-card${scenario === s.scenario ? ' selected' : ''}`} onClick={() => setScenario(s.scenario)}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: s.tagBg, color: s.tagColor }}>{s.tag}</span>
                    <div className="cg-sit-check" />
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 3 }}>{s.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.5 }}>{s.desc}</div>
                </div>
              ))}
            </div>
            <button className="gw-btn" disabled={!scenario} onClick={() => setStep(2)} style={{ margin: 0 }}>Continue</button>
          </div>
        )}

        {/* Step 2: Moment */}
        {step === 2 && (
          <div>
            <div className="gw-ttl">Where are you in the relationship?</div>
            <div className="gw-sub-t">This shapes the questions both parties answer.</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
              {MOMENTS.map(m => (
                <div key={m.moment} className={`cg-sit-card${moment === m.moment ? ' selected' : ''}`} onClick={() => setMoment(m.moment)}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{m.label}</div>
                    <div className="cg-sit-check" />
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--gw-sub)' }}>{m.sub}</div>
                </div>
              ))}
            </div>
            <button className="gw-btn" disabled={!moment} onClick={() => setStep(3)} style={{ margin: 0 }}>Continue</button>
          </div>
        )}

        {/* Step 3: Timeframe + cadence */}
        {step === 3 && (
          <div>
            <div className="gw-ttl">How long will this ground run?</div>
            <div className="gw-sub-t">Set the timeframe and how often each party checks in.</div>
            <div className="gw-fld">
              <label className="gw-label">Timeframe</label>
              <select className="gw-select" value={timelineDays} onChange={e => setTimelineDays(+e.target.value)}>
                <option value={30}>30 days</option>
                <option value={60}>60 days</option>
                <option value={90}>90 days</option>
                <option value={180}>6 months</option>
                <option value={365}>12 months</option>
              </select>
            </div>
            <div className="gw-fld">
              <label className="gw-label">Check-in cadence</label>
              <select className="gw-select" value={cadence} onChange={e => setCadence(e.target.value as GroundCadence)}>
                {CADENCES.map(c => <option key={c.cadence} value={c.cadence}>{c.label}</option>)}
              </select>
            </div>
            <div className="gw-box gw-box-blue" style={{ marginBottom: 24 }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{sessionTotal} sessions over {timelineDays} days</div>
              <div>Sessions 1–{freeSessions} are free for both parties.{paidSessions > 0 ? ` Sessions ${freeSessions + 1}–${sessionTotal} start billing.` : ' All sessions are free.'}</div>
              <div style={{ marginTop: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 600, background: 'var(--gw-green-bg)', color: 'var(--gw-green-t)', borderRadius: 20, padding: '2px 8px' }}>Sessions 1–{freeSessions} free</span>
              </div>
            </div>
            <button className="gw-btn" onClick={() => setStep(4)} style={{ margin: 0 }}>Continue</button>
          </div>
        )}

        {/* Step 4: Participants */}
        {step === 4 && (
          <div>
            <div className="gw-ttl">Who is in this ground?</div>
            <div className="gw-sub-t">Add the other party by email. They receive an invite link.</div>

            {participants.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 14 }}>
                {participants.map((p, i) => (
                  <div key={i} className="gw-prow gw-prow-static">
                    <div className={`gw-av gw-av-${i % 6}`}>{p.email.charAt(0).toUpperCase()}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{p.email}</div>
                      {p.role && <div style={{ fontSize: 11, color: 'var(--gw-muted)' }}>{p.role}</div>}
                    </div>
                    <button style={{ fontSize: 11, color: 'var(--gw-muted)', background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => setParticipants(v => v.filter((_, j) => j !== i))}>Remove</button>
                  </div>
                ))}
              </div>
            )}

            <div style={{ background: 'var(--gw-bg)', border: '0.5px solid var(--gw-border)', borderRadius: 8, padding: 12, marginBottom: 14 }}>
              <div className="gw-fld" style={{ margin: 0 }}>
                <label className="gw-label">Email address</label>
                <input className="gw-input" type="email" value={pEmail} onChange={e => setPEmail(e.target.value)} placeholder="participant@company.com" />
              </div>
              <div className="gw-fld" style={{ marginTop: 8, marginBottom: 8 }}>
                <label className="gw-label">Their role <span style={{ fontWeight: 400, color: 'var(--gw-muted)' }}>(optional, shown to them)</span></label>
                <input className="gw-input" value={pRole} onChange={e => setPRole(e.target.value)} placeholder="e.g. Head of Engineering" onKeyDown={e => e.key === 'Enter' && addParticipant()} />
              </div>
              <button onClick={addParticipant} style={{ width: '100%', padding: 9, borderRadius: 6, background: 'none', color: 'var(--gw-navy)', fontSize: 13, fontWeight: 600, border: '1.5px dashed var(--gw-blue-b)', cursor: 'pointer', fontFamily: 'inherit' }}>+ Add to this ground</button>
            </div>

            {participants.length > 0 && (
              <div style={{ fontSize: 12, color: 'var(--gw-sub)', background: 'var(--gw-bg)', borderRadius: 7, padding: '10px 12px', marginBottom: 14, lineHeight: 1.6 }}>
                Each person gets their own private check-in. Nobody can see what anyone else wrote until the report activates.
              </div>
            )}

            <button className="gw-btn" disabled={participants.length === 0} onClick={() => setStep(5)} style={{ margin: 0 }}>Continue</button>
            <div style={{ fontSize: 12, color: 'var(--gw-sub)', textAlign: 'center', marginTop: 10, cursor: 'pointer' }} onClick={() => setStep(5)}>
              Skip — add participants after
            </div>
          </div>
        )}

        {/* Step 5: Label */}
        {step === 5 && (
          <div>
            <div className="gw-ttl">Name this ground</div>
            <div className="gw-sub-t">Give it a name that makes sense to you. Both parties will see it.</div>
            <div className="gw-fld">
              <label className="gw-label">Ground name</label>
              <input
                className="gw-input"
                value={groundName}
                onChange={e => setGroundName(e.target.value)}
                placeholder={`${(scenario ?? '').replace(/_/g, ' ')} — ${new Date().getFullYear()}`}
                autoFocus
              />
            </div>

            <div className="gw-box gw-box-blue" style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Summary</div>
              <div style={{ fontSize: 12, lineHeight: 1.7 }}>
                <div>{(scenario ?? '').replace(/_/g, ' ')} · {moment}</div>
                <div>{sessionTotal} sessions · {cadence.toLowerCase()}</div>
                {participants.length > 0 && <div>{participants.length} participant{participants.length !== 1 ? 's' : ''} invited</div>}
              </div>
            </div>

            <button className="gw-btn" onClick={() => create.mutate()} disabled={create.isPending} style={{ margin: 0 }}>
              {create.isPending ? 'Opening…' : 'Open this ground →'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
