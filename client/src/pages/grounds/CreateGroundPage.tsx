import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { groundsApi, type GroundScenario, type GroundMoment, type GroundCadence } from '@/api/grounds'
import { billingApi } from '@/api/billing'
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
  { scenario: 'NEW_HIRE',         label: 'New hire',              desc: 'Expectations from all sides before the work starts. Both accounts on record from day one.',              tag: 'Starting',     tagBg: '#E8F8F5', tagColor: '#085041' },
  { scenario: 'NEW_PROJECT',      label: 'New project',           desc: 'Scope, ownership, and success criteria agreed independently before the work begins.',                    tag: 'Starting',     tagBg: '#E8F8F5', tagColor: '#085041' },
  { scenario: 'NEW_ADVISOR',      label: 'New board member',      desc: 'Each side on record on what they expect from the relationship before it starts.',                         tag: 'Starting',     tagBg: '#E8F8F5', tagColor: '#085041' },
  { scenario: 'NEW_COFOUNDER',    label: 'New partner',           desc: 'Put both sides\' understanding of the partnership on record before anything is agreed.',                  tag: 'Starting',     tagBg: '#E8F8F5', tagColor: '#085041' },
  { scenario: 'CONTRACT_RENEWAL', label: 'Contract renewal',      desc: 'Independent accounts of how things have gone. What has worked, what has not, and what the next term looks like.', tag: 'Renewal', tagBg: '#EEF4FB', tagColor: '#0C447C' },
  { scenario: 'PIP',              label: 'PIP',              desc: 'Both accounts on record. The concern, the support available, and what success looks like.',              tag: 'Accountability', tagBg: '#FCEBEB', tagColor: '#791F1F' },
  { scenario: 'OKR_ALIGNMENT',    label: 'Goals & planning', desc: 'Check whether everyone is actually aligned on the goals and plan — not to set them.',                    tag: 'Planning',     tagBg: '#EEF4FB', tagColor: '#0C447C' },
  { scenario: 'PULSE_CHECK',      label: 'Pulse check',      desc: 'A quick independent read from each person. What is moving, what is stuck, what has changed.',             tag: 'Recurring',    tagBg: '#E8F8F5', tagColor: '#085041' },
  { scenario: 'DRIFT',            label: 'New direction',    desc: 'A strategy shift or pivot. Each person says what they understood before the group discussion.',            tag: 'Alignment',    tagBg: '#FDF3E3', tagColor: '#8A5C1A' },
  { scenario: 'REALIGN_TEAM',     label: 'Other',            desc: 'Describe the situation and Groundwork will set up the right ground for it.',                              tag: 'Other',        tagBg: '#F5F3EF', tagColor: '#6B6560' },
]

interface MomentOption { moment: GroundMoment; label: string; sub: string }
const MOMENTS: MomentOption[] = [
  { moment: 'STARTING',    label: 'At the start',    sub: 'Set expectations before the work begins.' },
  { moment: 'RECOGNITION', label: 'Mid-way',          sub: 'Acknowledge progress. Name what has changed.' },
  { moment: 'RESOLUTION',  label: 'Reaching an end',  sub: 'Close a chapter. Agree on what happened.' },

]

interface CadenceOption { cadence: GroundCadence; label: string; days: number }
const CADENCES: CadenceOption[] = [
  { cadence: 'WEEKLY',      label: 'Weekly',      days: 7 },
  { cadence: 'FORTNIGHTLY', label: 'Fortnightly', days: 14 },
  { cadence: 'MONTHLY',     label: 'Monthly',     days: 30 },
]

interface ResolutionGroup { label: string; color: string; states: { state: string; sub: string }[] }
const RESOLUTION_GROUPS: ResolutionGroup[] = [
  {
    label: 'Progress and alignment', color: '#085041',
    states: [
      { state: 'Alignment confirmed',          sub: 'Everyone agrees on goals, expectations, and the path forward.' },
      { state: 'Continue current course',       sub: 'Things are working. The record confirms it.' },
      { state: 'Realignment needed',            sub: 'A gap exists. Everyone wants to close it.' },
      { state: 'Gaps identified and addressed', sub: 'The brief or expectations are revised based on what the record shows.' },
      { state: 'Brief revised',                 sub: 'The original brief is updated based on what both sides have learned.' },
      { state: 'Scope adjustment required',     sub: 'What was agreed needs to change. The record explains why.' },
    ],
  },
  {
    label: 'Recognition', color: '#8A5C1A',
    states: [
      { state: 'Promotion recommended',              sub: 'The contribution record supports a role change or advancement.' },
      { state: 'Compensation review recommended',    sub: 'The record supports a salary or equity adjustment.' },
      { state: 'Equity discussion recommended',      sub: 'Contribution has been documented. The equity conversation has a foundation.' },
    ],
  },
  {
    label: 'Resolution', color: '#791F1F',
    states: [
      { state: 'Additional support required', sub: 'Capacity or resource constraints identified. Support agreed.' },
      { state: 'Escalation required',         sub: 'The situation needs to be raised to a higher level. The record supports the case.' },
      { state: 'Mutual exit agreed',          sub: 'Everyone agrees the relationship ends here. The record belongs to all parties.' },
    ],
  },
]

interface Participant { email: string; role: string; note: string }

const SCENARIO_FROM_LABEL: Record<string, GroundScenario> = {
  'new hire':           'NEW_HIRE',
  'new project':        'NEW_PROJECT',
  'new board member':   'NEW_ADVISOR',
  'new partner':        'NEW_COFOUNDER',
  'contract renewal':   'CONTRACT_RENEWAL',
  'new direction':      'DRIFT',
  'pip':                'PIP',
  'goals & planning':   'OKR_ALIGNMENT',
  'pulse check':        'PULSE_CHECK',
  'other':              'REALIGN_TEAM',
}

function scenarioFromParam(param: string | null): GroundScenario | null {
  if (!param) return null
  return SCENARIO_FROM_LABEL[param.toLowerCase().replace(/\+/g, ' ')] ?? null
}

// Step numbering: 1=scenario, 1.5=billing (stored as step=2 internally), 2=timeframe (step=3), 3=participants (step=4), 4=resolution (step=5), 5=brief (step=6)
// We use integer steps internally: 1,2,3,4,5,6
const TOTAL_STEPS = 6

export function CreateGroundPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [step, setStep] = useState(1)

  const [scenario, setScenario] = useState<GroundScenario | null>(
    () => scenarioFromParam(searchParams.get('scenario'))
  )
  const [moment, setMoment] = useState<GroundMoment | null>(null)
  const [timelineDays, setTimelineDays] = useState(90)
  const [cadence, setCadence] = useState<GroundCadence>('FORTNIGHTLY')
  const [participants, setParticipants] = useState<Participant[]>([])
  const [pEmail, setPEmail] = useState('')
  const [pRole, setPRole] = useState('')
  const [pNote, setPNote] = useState('')
  const [bulkMode, setBulkMode] = useState(false)
  const [bulkText, setBulkText] = useState('')
  const [resolutionState, setResolutionState] = useState<string | null>(null)
  const [brief, setBrief] = useState('')
  const [groundName, setGroundName] = useState('')

  // Billing step state
  const [billingChecked, setBillingChecked] = useState(false)
  const [billingFree, setBillingFree] = useState(false)
  const [billingFreeReason, setBillingFreeReason] = useState<string | null>(null)
  const [showCodeInput, setShowCodeInput] = useState(false)
  const [codeInput, setCodeInput] = useState('')
  const [codeApplied, setCodeApplied] = useState(false)
  const [codeError, setCodeError] = useState<string | null>(null)
  const [codeChecking, setCodeChecking] = useState(false)
  const [appliedAccessCode, setAppliedAccessCode] = useState<string | null>(null)
  const [billingLoading, setBillingLoading] = useState(false)

  const cadenceObj = CADENCES.find(c => c.cadence === cadence) ?? CADENCES[1]
  const sessionTotal = Math.max(1, Math.floor(timelineDays / cadenceObj.days))

  const briefWords = brief.trim() ? brief.trim().split(/\s+/).length : 0
  const briefShort = briefWords > 0 && briefWords < 20

  // When entering step 2 (billing), auto-check
  useEffect(() => {
    if (step === 2 && !billingChecked) {
      setBillingLoading(true)
      billingApi.checkCanCreateGround().then(res => {
        setBillingChecked(true)
        setBillingLoading(false)
        if (res.freeReason === 'FIRST_GROUND') {
          setBillingFree(true)
          setBillingFreeReason('FIRST_GROUND')
        } else {
          setBillingFree(false)
        }
      }).catch(() => {
        setBillingChecked(true)
        setBillingLoading(false)
        setBillingFree(false)
      })
    }
  }, [step, billingChecked])

  async function applyCode() {
    if (!codeInput.trim()) return
    setCodeChecking(true)
    setCodeError(null)
    try {
      const res = await billingApi.checkCanCreateGround(codeInput.trim())
      if (res.allowed && res.freeReason) {
        setCodeApplied(true)
        setAppliedAccessCode(codeInput.trim())
        setCodeError(null)
      } else {
        setCodeError('This code is not valid or has already been used.')
      }
    } catch {
      setCodeError('Could not validate the code. Try again.')
    } finally {
      setCodeChecking(false)
    }
  }

  async function startStripeCheckout() {
    try {
      // We use a placeholder groundId sentinel — the backend will create a pending checkout
      const res = await billingApi.purchaseSession('__new__')
      if (res.checkoutUrl) window.location.href = res.checkoutUrl
    } catch {
      toast.error('Could not start checkout. Try again.')
    }
  }

  const create = useMutation({
    mutationFn: async () => {
      const ground = await groundsApi.create({
        label: groundName.trim() || `${scenario?.replace(/_/g, ' ')} ground`,
        scenario: scenario!,
        moment: moment!,
        timelineDays,
        cadence,
        resolutionState: resolutionState ?? undefined,
        brief: brief.trim() || undefined,
        ...(appliedAccessCode ? { accessCode: appliedAccessCode } : {}),
      } as Parameters<typeof groundsApi.create>[0] & { accessCode?: string })
      await Promise.all(participants.map(p =>
        groundsApi.addParticipant(ground.id, { email: p.email, roleAsDescribed: p.role || undefined, note: p.note || undefined })
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
    setParticipants(v => [...v, { email, role: pRole.trim(), note: pNote.trim() }])
    setPEmail(''); setPRole(''); setPNote('')
  }

  function addBulk() {
    const emails = bulkText.split(/[\n,;]+/).map(e => e.trim()).filter(e => e.includes('@'))
    const fresh = emails.filter(e => !participants.find(p => p.email === e))
    setParticipants(v => [...v, ...fresh.map(e => ({ email: e, role: '', note: '' }))])
    setBulkText('')
    setBulkMode(false)
  }

  function back() {
    if (step > 1) setStep(s => s - 1)
    else navigate('/grounds')
  }

  // Display dot index: step 1 → dot 1, step 2 (billing) → dot 2, steps 3-6 → dots 3-6
  // We show TOTAL_STEPS dots (6), mapping internal step directly
  const displayStep = step

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--gw-bg)' }}>
      <div className="gw-hdr">
        <a href="https://myground.work" target="_blank" rel="noopener noreferrer" className="gw-logo" style={{ textDecoration: 'none', color: 'inherit' }}>Groundwork</a>
        <button className="gw-back" onClick={back}>← Back</button>
      </div>

      <div className="gw-bd" style={{ maxWidth: 540, margin: '0 auto', width: '100%' }}>
        {/* Step dots */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
          {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map(n => (
            <div key={n} className={`cg-step-dot${displayStep === n ? ' active' : displayStep > n ? ' done' : ''}`} />
          ))}
        </div>

        {/* Step 1: Scenario + Moment */}
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

            {scenario && (
              <>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Where are you in this situation?</div>
                <div style={{ fontSize: 12, color: 'var(--gw-sub)', marginBottom: 10 }}>Are you just starting, mid-way through, or wrapping up? This shapes the questions each contributor answers.</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                  {MOMENTS.map(m => (
                    <div key={m.moment} className={`cg-sit-card${moment === m.moment ? ' selected' : ''}`} onClick={() => setMoment(m.moment)}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                        <div style={{ fontSize: 13, fontWeight: 700 }}>{m.label}</div>
                        <div className="cg-sit-check" />
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--gw-sub)' }}>{m.sub}</div>
                    </div>
                  ))}
                </div>
              </>
            )}

            <button className="gw-btn" disabled={!scenario || !moment} onClick={() => setStep(2)} style={{ margin: 0 }}>Continue</button>
          </div>
        )}

        {/* Step 2 (1.5): Billing check */}
        {step === 2 && (
          <div>
            <div className="gw-ttl">Before you continue</div>

            {billingLoading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '32px 0', color: 'var(--gw-sub)', fontSize: 14 }}>
                <div style={{ width: 18, height: 18, border: '2px solid var(--gw-border)', borderTopColor: 'var(--gw-navy)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                Checking your account…
              </div>
            )}

            {!billingLoading && billingChecked && billingFreeReason === 'FIRST_GROUND' && (
              <div>
                <div style={{ background: 'var(--gw-green-bg, #E8F8F5)', border: '1px solid var(--gw-green-b, #A7D9CC)', borderRadius: 10, padding: '20px 18px', marginBottom: 20 }}>
                  <div style={{ fontSize: 22, marginBottom: 8 }}>🎉</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#085041', marginBottom: 6 }}>Your first Ground is free — no payment needed</div>
                  <div style={{ fontSize: 13, color: 'var(--gw-sub)', lineHeight: 1.6 }}>
                    No card required. Open your first ground and see how it works.
                  </div>
                </div>
                <button className="gw-btn" onClick={() => setStep(3)} style={{ margin: '12px 0 0' }}>Continue →</button>
              </div>
            )}

            {!billingLoading && billingChecked && !billingFree && billingFreeReason !== 'FIRST_GROUND' && (
              <div>
                <div className="gw-sub-t" style={{ marginBottom: 20 }}>
                  Sessions are $5 each. Your first session on this Ground is included. You can apply an access code if you have one.
                </div>

                {codeApplied ? (
                  <div style={{ background: 'var(--gw-green-bg, #E8F8F5)', border: '1px solid var(--gw-green-b, #A7D9CC)', borderRadius: 10, padding: '16px 18px', marginBottom: 20 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#085041', marginBottom: 4 }}>Code applied — this Ground is free</div>
                    <div style={{ fontSize: 12, color: 'var(--gw-sub)' }}>Your access code has been validated and will be used when the Ground is created.</div>
                  </div>
                ) : (
                  <>
                    <button
                      className="gw-btn"
                      onClick={startStripeCheckout}
                      style={{ margin: '0 0 12px', background: 'var(--gw-navy)', color: 'white' }}
                    >
                      Pay $5 to create this Ground
                    </button>

                    {!showCodeInput && (
                      <div style={{ textAlign: 'center' }}>
                        <button
                          onClick={() => setShowCodeInput(true)}
                          style={{ fontSize: 12, color: 'var(--gw-sub)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontFamily: 'inherit' }}
                        >
                          I have an access code
                        </button>
                      </div>
                    )}

                    {showCodeInput && (
                      <div style={{ background: 'var(--gw-bg)', border: '0.5px solid var(--gw-border)', borderRadius: 8, padding: 14, marginTop: 8 }}>
                        <label className="gw-label">Access code (optional)</label>
                        <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                          <input
                            className="gw-input"
                            value={codeInput}
                            onChange={e => { setCodeInput(e.target.value); setCodeError(null) }}
                            placeholder="Enter your code"
                            style={{ flex: 1 }}
                            onKeyDown={e => e.key === 'Enter' && applyCode()}
                          />
                          <button
                            onClick={applyCode}
                            disabled={codeChecking || !codeInput.trim()}
                            style={{ padding: '0 16px', borderRadius: 7, background: 'var(--gw-navy)', color: 'white', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: codeChecking || !codeInput.trim() ? 0.6 : 1 }}
                          >
                            {codeChecking ? 'Checking…' : 'Apply code'}
                          </button>
                        </div>
                        {codeError && (
                          <div style={{ fontSize: 12, color: '#791F1F', marginTop: 8 }}>{codeError}</div>
                        )}
                      </div>
                    )}
                  </>
                )}

                {codeApplied && (
                  <button className="gw-btn" onClick={() => setStep(3)} style={{ margin: '16px 0 0' }}>
                    Continue
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Step 3 (was 2): Timeframe + cadence */}
        {step === 3 && (
          <div>
            <div className="gw-ttl">How long will this ground run?</div>
            <div className="gw-sub-t">Set the timeframe and how often each party checks in.</div>
            <div className="gw-fld">
              <label className="gw-label">Timeframe</label>
              <select className="gw-select" value={timelineDays} onChange={e => setTimelineDays(+e.target.value)}>
                <option value={7}>1 week</option>
                <option value={14}>2 weeks</option>
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
              <div style={{ fontSize: 13, color: 'var(--gw-sub)', lineHeight: 1.6 }}>
                Your first session is free and includes a report. Add more sessions for $5 each any time.
              </div>
              <div style={{ marginTop: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 600, background: 'var(--gw-green-bg)', color: 'var(--gw-green-t)', borderRadius: 20, padding: '2px 8px' }}>First session free</span>
              </div>
            </div>
            <button className="gw-btn" onClick={() => setStep(4)} style={{ margin: 0 }}>Continue</button>
          </div>
        )}

        {/* Step 4 (was 3): Participants */}
        {step === 4 && (
          <div>
            <div className="gw-ttl">Who is in this ground?</div>
            <div className="gw-sub-t">Add everyone who will check in. Contributors can be from different organisations. You can add more at any time.</div>

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

            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <button onClick={() => { setBulkMode(false) }} style={{ fontSize: 12, fontWeight: bulkMode ? 400 : 700, color: bulkMode ? 'var(--gw-sub)' : 'var(--gw-navy)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>Add one by one</button>
              <span style={{ color: 'var(--gw-border)', fontSize: 12 }}>|</span>
              <button onClick={() => { setBulkMode(true) }} style={{ fontSize: 12, fontWeight: bulkMode ? 700 : 400, color: bulkMode ? 'var(--gw-navy)' : 'var(--gw-sub)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>Paste multiple emails</button>
            </div>

            {bulkMode ? (
              <div style={{ background: 'var(--gw-bg)', border: '0.5px solid var(--gw-border)', borderRadius: 8, padding: 12, marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gw-sub)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>Paste emails</div>
                <textarea
                  rows={4}
                  value={bulkText}
                  onChange={e => setBulkText(e.target.value)}
                  placeholder={'one@example.com\ntwo@example.com\nthree@example.com'}
                  style={{ width: '100%', padding: '10px 12px', border: '0.5px solid var(--gw-border)', borderRadius: 7, fontSize: 13, fontFamily: 'inherit', color: 'var(--gw-text)', background: 'white', resize: 'vertical', boxSizing: 'border-box', marginBottom: 8 }}
                />
                <div style={{ fontSize: 11, color: 'var(--gw-sub)', marginBottom: 8 }}>Separate by line, comma, or semicolon. Roles and notes can be added after.</div>
                <button onClick={addBulk} style={{ width: '100%', padding: 9, borderRadius: 6, background: 'none', color: 'var(--gw-navy)', fontSize: 13, fontWeight: 600, border: '1.5px dashed var(--gw-blue-b)', cursor: 'pointer', fontFamily: 'inherit' }}>Add all</button>
              </div>
            ) : (
            <div style={{ background: 'var(--gw-bg)', border: '0.5px solid var(--gw-border)', borderRadius: 8, padding: 12, marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gw-sub)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>Add someone new</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                <div className="gw-fld" style={{ margin: 0 }}>
                  <label className="gw-label">Email address</label>
                  <input className="gw-input" type="email" value={pEmail} onChange={e => setPEmail(e.target.value)} placeholder="their@email.com" />
                </div>
                <div className="gw-fld" style={{ margin: 0 }}>
                  <label className="gw-label">Their role <span style={{ fontWeight: 400, color: 'var(--gw-muted)' }}>(optional)</span></label>
                  <input className="gw-input" value={pRole} onChange={e => setPRole(e.target.value)} placeholder="e.g. Head of Engineering" />
                </div>
              </div>
              <div className="gw-fld" style={{ margin: '0 0 8px' }}>
                <label className="gw-label">Personal note in the invite email <span style={{ fontWeight: 400, color: 'var(--gw-muted)' }}>(optional)</span></label>
                <input className="gw-input" value={pNote} onChange={e => setPNote(e.target.value)} placeholder="e.g. Looking forward to building this together." onKeyDown={e => e.key === 'Enter' && addParticipant()} />
              </div>
              <button onClick={addParticipant} style={{ width: '100%', padding: 9, borderRadius: 6, background: 'none', color: 'var(--gw-navy)', fontSize: 13, fontWeight: 600, border: '1.5px dashed var(--gw-blue-b)', cursor: 'pointer', fontFamily: 'inherit' }}>+ Add to this ground</button>
            </div>
            )}

            {participants.length > 0 && (
              <div style={{ fontSize: 12, color: 'var(--gw-sub)', background: 'var(--gw-bg)', borderRadius: 7, padding: '10px 12px', marginBottom: 14, lineHeight: 1.6 }}>
                Each person gets their own private check-in. Nobody can see what anyone else wrote until the report is activated.
              </div>
            )}

            {participants.length > 0 && (
              <div style={{ fontSize: 12, color: 'var(--gw-sub)', marginBottom: 10 }}>
                {participants.length} {participants.length === 1 ? 'person' : 'people'} added. Up to 20 per ground.
              </div>
            )}

            {scenario === 'NEW_HIRE' && participants.length === 0 && (
              <div style={{ fontSize: 12, color: 'var(--gw-sub)', background: 'var(--gw-amber-bg)', border: '0.5px solid var(--gw-amber-b)', borderRadius: 7, padding: '10px 12px', marginBottom: 12, lineHeight: 1.6 }}>
                For coaching or mentoring, one ground per person works best. Each person keeps their own private record across sessions.
              </div>
            )}

            <button className="gw-btn" disabled={participants.length === 0} onClick={() => setStep(5)} style={{ margin: 0 }}>Continue</button>
            <div style={{ fontSize: 12, color: 'var(--gw-sub)', textAlign: 'center', marginTop: 10, cursor: 'pointer' }} onClick={() => setStep(5)}>
              Skip — add participants after
            </div>
            <div style={{ fontSize: 11, color: 'var(--gw-muted)', textAlign: 'center', marginTop: 4, lineHeight: 1.5 }}>
              The shared report cannot generate until at least one other person has checked in.
            </div>
          </div>
        )}

        {/* Step 5 (was 4): Resolution state */}
        {step === 5 && (
          <div>
            <div className="gw-ttl">What does a successful outcome look like?</div>
            <div className="gw-sub-t">Everyone involved sees this before the first session. You are not locked in — the state can be updated if the ground reveals something different.</div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
              {RESOLUTION_GROUPS.map(group => (
                <div key={group.label}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: group.color, textTransform: 'uppercase', letterSpacing: '.06em', margin: '12px 0 6px' }}>{group.label}</div>
                  {group.states.map(r => (
                    <div
                      key={r.state}
                      style={{ display: 'flex', alignItems: 'flex-start', gap: 12, background: 'white', border: `1.5px solid ${resolutionState === r.state ? 'var(--gw-navy)' : 'var(--gw-border)'}`, borderRadius: 8, padding: '12px 14px', cursor: 'pointer', marginBottom: 6, transition: 'border-color .15s' }}
                      onClick={() => setResolutionState(r.state)}
                    >
                      <div style={{ width: 16, height: 16, borderRadius: '50%', border: `1.5px solid ${resolutionState === r.state ? 'var(--gw-navy)' : 'var(--gw-border)'}`, background: resolutionState === r.state ? 'var(--gw-navy)' : 'transparent', flexShrink: 0, marginTop: 1, transition: 'all .15s' }} />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>{r.state}</div>
                        <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.5 }}>{r.sub}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            <button className="gw-btn" disabled={!resolutionState} onClick={() => setStep(6)} style={{ margin: 0 }}>Continue</button>
          </div>
        )}

        {/* Step 6 (was 5): Opening brief + ground name */}
        {step === 6 && (
          <div>
            <div className="gw-ttl">What is this ground about?</div>
            <div className="gw-sub-t">Your version of the brief. Each contributor writes their own in their first session. The report shows where accounts agree and where they differ.</div>

            <div style={{ position: 'relative', marginBottom: 6 }}>
              <textarea
                rows={6}
                value={brief}
                onChange={e => setBrief(e.target.value)}
                placeholder="What is this ground about? What needs to be true at the end?"
                style={{ width: '100%', padding: '12px 14px', border: '0.5px solid var(--gw-border)', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', color: 'var(--gw-text)', background: 'white', resize: 'vertical', lineHeight: 1.65, boxSizing: 'border-box' }}
              />
              <div style={{ position: 'absolute', bottom: 8, right: 10, fontSize: 11, color: 'var(--gw-sub)' }}>{briefWords} words</div>
            </div>

            {briefShort && (
              <div style={{ fontSize: 12, color: 'var(--gw-amber-t)', background: 'var(--gw-amber-bg)', border: '0.5px solid var(--gw-amber-b)', borderRadius: 7, padding: '10px 12px', marginBottom: 12, lineHeight: 1.6 }}>
                A brief this short will produce weaker first sessions. The questions are shaped by what you write here. Add more context.
              </div>
            )}

            <div className="gw-fld" style={{ marginTop: 16 }}>
              <label className="gw-label">Ground name <span style={{ fontWeight: 400, color: 'var(--gw-muted)' }}>(optional)</span></label>
              <input
                className="gw-input"
                value={groundName}
                onChange={e => setGroundName(e.target.value)}
                placeholder={`e.g. COO onboarding, Q3 2025`}
              />
            </div>

            <div className="gw-box gw-box-blue" style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Summary</div>
              <div style={{ fontSize: 12, lineHeight: 1.7 }}>
                <div>{SCENARIOS.find(s => s.scenario === scenario)?.label ?? (scenario ?? '').replace(/_/g, ' ')} · {MOMENTS.find(m => m.moment === moment)?.label ?? moment}</div>
                <div>{sessionTotal} sessions · {cadence.toLowerCase()}</div>
                {resolutionState && <div>Resolution: {resolutionState}</div>}
                {participants.length > 0 && <div>{participants.length} participant{participants.length !== 1 ? 's' : ''} invited</div>}
                {appliedAccessCode && <div style={{ color: '#085041', fontWeight: 600 }}>Access code applied</div>}
              </div>
            </div>

            <button className="gw-btn" onClick={() => create.mutate()} disabled={create.isPending || !brief.trim()} style={{ margin: 0 }}>
              {create.isPending ? 'Opening…' : 'Open the ground →'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
