import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { createGroundWithExtras, uploadGroundBrief } from '@/api/grounds'
import type { GroundScenario, GroundMoment } from '@/types'

// ─── Trigger / scenario definitions ────────────────────────────────────────

type TriggerCategory = 'STARTING' | 'RECOGNITION' | 'DRIFTED'

interface TriggerCard {
  value: TriggerCategory
  symbol: string
  label: string
  purpose: string
}

const TRIGGER_CARDS: TriggerCard[] = [
  {
    value: 'STARTING',
    symbol: '+',
    label: 'Something new is starting',
    purpose: 'Build alignment from the beginning. Replace assumption with explicit record.',
  },
  {
    value: 'RECOGNITION',
    symbol: '↑',
    label: 'Someone wants recognition',
    purpose: 'Ground a reward decision in a historical record.',
  },
  {
    value: 'DRIFTED',
    symbol: '◉',
    label: 'Something has drifted',
    purpose: 'Create shared reality under pressure, drift, or conflict.',
  },
]

interface SubOption {
  scenario: GroundScenario
  moment: GroundMoment
  label: string
  desc: string
}

const SUB_OPTIONS: Record<TriggerCategory, SubOption[]> = {
  STARTING: [
    { scenario: 'NEW_HIRE',      moment: 'STARTING',    label: 'New hire',                   desc: 'Define 90-day success before day one sets in.' },
    { scenario: 'NEW_COFOUNDER', moment: 'STARTING',    label: 'New cofounder',               desc: 'Define contribution before the equity discussion.' },
    { scenario: 'NEW_ADVISOR',   moment: 'STARTING',    label: 'New advisor',                 desc: 'Define expected return vs cost from the start.' },
    { scenario: 'NEW_PROJECT',   moment: 'STARTING',    label: 'New project',                 desc: 'Scope, ownership, and success criteria defined upfront.' },
    { scenario: 'NEW_MANAGER',   moment: 'STARTING',    label: 'New manager',                 desc: 'Define scope and expectations before the engagement starts.' },
  ],
  RECOGNITION: [
    { scenario: 'RECOGNITION',   moment: 'RECOGNITION', label: 'Raise, equity, or promotion', desc: 'Both sides on record before the decision is made.' },
  ],
  DRIFTED: [
    { scenario: 'DRIFT',           moment: 'RESOLUTION', label: 'General drift',         desc: 'A relationship or dynamic that has been wrong for too long.' },
    { scenario: 'CONTRACT_RENEWAL', moment: 'RESOLUTION', label: 'Contract renewal',     desc: 'Record-based decisioning at the end of a period.' },
    { scenario: 'CRISIS_ALIGNMENT', moment: 'RESOLUTION', label: 'Crisis alignment',     desc: 'Cofounder tension, cash crunch, or a team not seeing the same thing.' },
  ],
}

// ─── Timeline helper ────────────────────────────────────────────────────────

function timelineDefault(scenario: GroundScenario): string {
  switch (scenario) {
    case 'NEW_HIRE':
    case 'NEW_MANAGER':
      return 'Default: 90-day window'
    case 'NEW_COFOUNDER':
      return 'Default: 3-month check-in'
    case 'NEW_ADVISOR':
      return 'Default: 12-month advisory period'
    case 'NEW_PROJECT':
      return 'Default: project length'
    default:
      return 'Duration: as needed'
  }
}

// ─── Need options ───────────────────────────────────────────────────────────

const NEED_OPTIONS = ['Compensation', 'Autonomy', 'Recognition', 'Growth', 'Relationship quality'] as const

// ─── Cadence options ────────────────────────────────────────────────────────

type Cadence = 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY'

const CADENCE_OPTIONS: { value: Cadence; label: string }[] = [
  { value: 'WEEKLY',      label: 'Weekly' },
  { value: 'FORTNIGHTLY', label: 'Fortnightly' },
  { value: 'MONTHLY',     label: 'Monthly' },
]

// ─── Step counting ──────────────────────────────────────────────────────────

function totalSteps(scenario: GroundScenario | null): number {
  if (scenario === 'NEW_COFOUNDER') return 3
  if (scenario === 'NEW_PROJECT') return 5
  return 2
}

// ─── Shared styles ──────────────────────────────────────────────────────────

const cardStyle = (selected: boolean): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'flex-start',
  gap: 14,
  padding: '14px 16px',
  borderRadius: 8,
  cursor: 'pointer',
  border: selected ? '1.5px solid #0C447C' : '1px solid #E2E0DB',
  background: selected ? '#EEF4FB' : 'white',
  textAlign: 'left',
  width: '100%',
})

// ─── Component ──────────────────────────────────────────────────────────────

export function CreateGroundPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()

  // wizard position
  const [step, setStep] = useState(1)

  // step 1
  const [trigger, setTrigger] = useState<TriggerCategory | null>(null)

  // step 2
  const [scenario, setScenario] = useState<GroundScenario | null>(null)
  const [moment, setMoment]     = useState<GroundMoment | null>(null)
  const [label, setLabel]       = useState('')
  const [timelineWeeks, setTimelineWeeks] = useState<string>('')

  // step 3 — cofounder intent questionnaire
  const [intent,       setIntent]       = useState('')
  const [needs,        setNeeds]        = useState<string[]>([])
  const [needsDetail,  setNeedsDetail]  = useState('')
  const [canAbsorb,    setCanAbsorb]    = useState('')

  // step 3-5 — project
  const [emailInput,   setEmailInput]   = useState('')
  const [emails,       setEmails]       = useState<string[]>([])
  const [emailError,   setEmailError]   = useState('')
  const [briefFile,    setBriefFile]    = useState<File | null>(null)
  const [cadence,      setCadence]      = useState<Cadence>('FORTNIGHTLY')

  const steps = totalSteps(scenario)

  // ── helpers ──────────────────────────────────────────────────────────────

  function selectSubOption(sub: SubOption) {
    setScenario(sub.scenario)
    setMoment(sub.moment)
    setStep(2)
  }

  function handleTriggerClick(t: TriggerCategory) {
    setTrigger(t)
    const opts = SUB_OPTIONS[t]
    if (opts.length === 1) {
      // RECOGNITION has exactly one sub-option — skip the sub-option step
      setScenario(opts[0].scenario)
      setMoment(opts[0].moment)
      setStep(2)
    }
    // else stay on step 1 and show sub-options (handled in render)
  }

  function addEmail() {
    const trimmed = emailInput.trim()
    if (!trimmed) return
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setEmailError('Please enter a valid email address.')
      return
    }
    if (emails.includes(trimmed)) {
      setEmailError('That email is already added.')
      return
    }
    setEmails((prev) => [...prev, trimmed])
    setEmailInput('')
    setEmailError('')
  }

  function removeEmail(email: string) {
    setEmails((prev) => prev.filter((e) => e !== email))
  }

  function toggleNeed(need: string) {
    setNeeds((prev) =>
      prev.includes(need) ? prev.filter((n) => n !== need) : [...prev, need]
    )
  }

  // ── mutation ─────────────────────────────────────────────────────────────

  const mutation = useMutation({
    mutationFn: async () => {
      if (!scenario || !moment) throw new Error('Scenario not selected')

      const body: Record<string, unknown> = {
        label: label.trim(),
        scenario,
        moment,
        ...(timelineWeeks ? { timelineDays: parseInt(timelineWeeks, 10) * 7 } : {}),
      }

      if (scenario === 'NEW_COFOUNDER') {
        body.intentQuestionnaire = {
          intent,
          needs,
          needsDetail: needsDetail.trim() || undefined,
          canAbsorb,
        }
      }

      if (scenario === 'NEW_PROJECT') {
        body.participants = emails
        body.cadence      = cadence
      }

      const ground = await createGroundWithExtras(body)

      // upload brief if provided
      if (scenario === 'NEW_PROJECT' && briefFile) {
        try {
          await uploadGroundBrief(ground.id, briefFile)
        } catch {
          toast.error('Ground created, but brief upload failed.')
        }
      }

      return ground
    },
    onSuccess: (ground) => {
      qc.invalidateQueries({ queryKey: ['grounds'] })
      toast.success('Ground opened')
      navigate(`/grounds/${ground.id}`)
    },
    onError: () => {
      toast.error('Something went wrong. Please try again.')
    },
  })

  // ── back navigation ───────────────────────────────────────────────────────

  function goBack() {
    if (step === 1) {
      navigate('/')
      return
    }
    if (step === 2) {
      // if RECOGNITION (no sub-option step), reset to clean step 1
      setTrigger(null)
      setScenario(null)
      setMoment(null)
      setStep(1)
      return
    }
    setStep((s) => s - 1)
  }

  // ── next from step 2 ──────────────────────────────────────────────────────

  function handleStep2Next() {
    if (!label.trim()) return
    if (scenario === 'NEW_COFOUNDER') { setStep(3); return }
    if (scenario === 'NEW_PROJECT')   { setStep(3); return }
    mutation.mutate()
  }

  // ── render ────────────────────────────────────────────────────────────────

  const subOptions = trigger ? SUB_OPTIONS[trigger] : []
  const showSubCards = trigger !== null && subOptions.length > 1 && scenario === null

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gw-bg)', display: 'flex', flexDirection: 'column' }}>
      <div className="gw-hdr">
        <div className="gw-logo">Groundwork</div>
        <button className="gw-back" onClick={goBack}>← Back</button>
      </div>

      <div className="gw-bd" style={{ maxWidth: 520, margin: '0 auto', width: '100%', paddingTop: 24 }}>

        {/* Step indicator */}
        {step > 1 && (
          <div style={{ fontSize: 11, color: 'var(--gw-sub)', marginBottom: 12, letterSpacing: '0.04em' }}>
            Step {step} of {steps}
          </div>
        )}

        {/* ── STEP 1: trigger / sub-option selection ─────────────────────── */}
        {step === 1 && !showSubCards && (
          <>
            <div className="gw-ttl">Open a ground</div>
            <div className="gw-sub-t">What is the situation?</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
              {TRIGGER_CARDS.map((t) => (
                <button
                  key={t.value}
                  onClick={() => handleTriggerClick(t.value)}
                  style={cardStyle(false)}
                >
                  <span style={{ fontSize: 18, lineHeight: 1.2, paddingTop: 1, color: '#0C447C', fontWeight: 700, minWidth: 20 }}>
                    {t.symbol}
                  </span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1916' }}>{t.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--gw-sub)', marginTop: 2 }}>{t.purpose}</div>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {/* ── STEP 1 sub-options ──────────────────────────────────────────── */}
        {step === 1 && showSubCards && trigger && (
          <>
            <div className="gw-ttl">
              {TRIGGER_CARDS.find((c) => c.value === trigger)!.label}
            </div>
            <div className="gw-sub-t">Which situation are you in?</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
              {subOptions.map((opt) => (
                <button
                  key={opt.scenario}
                  onClick={() => selectSubOption(opt)}
                  style={cardStyle(false)}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1916' }}>{opt.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--gw-sub)', marginTop: 2 }}>{opt.desc}</div>
                  </div>
                </button>
              ))}
            </div>
            <button
              type="button"
              className="gw-btn-sec"
              style={{ marginTop: 16 }}
              onClick={() => { setTrigger(null); setScenario(null) }}
            >
              ← Back
            </button>
          </>
        )}

        {/* ── STEP 2: name the ground ──────────────────────────────────────── */}
        {step === 2 && scenario && (
          <div>
            <div className="gw-ttl">Name this ground</div>
            <div className="gw-fld" style={{ marginTop: 16 }}>
              <label className="gw-label">Ground label</label>
              <input
                className="gw-input"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. 'Amir — first 90 days'"
                autoFocus
              />
              <div style={{ fontSize: 11, color: 'var(--gw-sub)', marginTop: 6 }}>
                {timelineDefault(scenario)}
              </div>
            </div>
            <div className="gw-fld" style={{ marginTop: 12 }}>
              <label className="gw-label" style={{ display: 'block', marginBottom: 4 }}>
                Override timeline (weeks):
                <span style={{ fontWeight: 400, color: 'var(--gw-sub)' }}> optional</span>
              </label>
              <input
                className="gw-input"
                type="number"
                min={1}
                value={timelineWeeks}
                onChange={(e) => setTimelineWeeks(e.target.value)}
                placeholder="e.g. 12"
                style={{ maxWidth: 120 }}
              />
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              <button type="button" className="gw-btn-sec" style={{ flex: 0 }} onClick={goBack}>← Back</button>
              <button
                type="button"
                className="gw-btn"
                style={{ flex: 1 }}
                disabled={!label.trim() || mutation.isPending}
                onClick={handleStep2Next}
              >
                {scenario === 'NEW_COFOUNDER' || scenario === 'NEW_PROJECT'
                  ? 'Next →'
                  : mutation.isPending ? 'Opening…' : 'Open ground →'}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: cofounder intent questionnaire ─────────────────────── */}
        {step === 3 && scenario === 'NEW_COFOUNDER' && (
          <div>
            <div className="gw-ttl">Intent check</div>
            <div className="gw-sub-t" style={{ marginBottom: 20 }}>
              Before the equity or role conversation, get this on record.
            </div>

            <div className="gw-fld">
              <label className="gw-label">What is your founding intent?</label>
              <textarea
                className="gw-input"
                rows={3}
                value={intent}
                onChange={(e) => setIntent(e.target.value)}
                placeholder="What you are building and why"
                style={{ resize: 'vertical' }}
              />
            </div>

            <div className="gw-fld" style={{ marginTop: 16 }}>
              <label className="gw-label">What do you need from this partnership?</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
                {NEED_OPTIONS.map((n) => (
                  <label
                    key={n}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '6px 12px', borderRadius: 6, cursor: 'pointer',
                      border: needs.includes(n) ? '1.5px solid #0C447C' : '1px solid #E2E0DB',
                      background: needs.includes(n) ? '#EEF4FB' : 'white',
                      fontSize: 13,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={needs.includes(n)}
                      onChange={() => toggleNeed(n)}
                      style={{ accentColor: '#0C447C' }}
                    />
                    {n}
                  </label>
                ))}
              </div>
              <div style={{ marginTop: 10 }}>
                <label className="gw-label" style={{ fontSize: 12, color: 'var(--gw-sub)' }}>
                  Say more (optional)
                </label>
                <textarea
                  className="gw-input"
                  rows={2}
                  value={needsDetail}
                  onChange={(e) => setNeedsDetail(e.target.value)}
                  style={{ resize: 'vertical', marginTop: 4 }}
                />
              </div>
            </div>

            <div className="gw-fld" style={{ marginTop: 16 }}>
              <label className="gw-label">What can you absorb?</label>
              <textarea
                className="gw-input"
                rows={3}
                value={canAbsorb}
                onChange={(e) => setCanAbsorb(e.target.value)}
                placeholder="Financial floor, how you handle pressure, what would make you walk away"
                style={{ resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              <button type="button" className="gw-btn-sec" style={{ flex: 0 }} onClick={goBack}>← Back</button>
              <button
                type="button"
                className="gw-btn"
                style={{ flex: 1 }}
                disabled={!intent.trim() || needs.length === 0 || !canAbsorb.trim() || mutation.isPending}
                onClick={() => mutation.mutate()}
              >
                {mutation.isPending ? 'Opening…' : 'Open ground →'}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3 (project): who is involved ───────────────────────────── */}
        {step === 3 && scenario === 'NEW_PROJECT' && (
          <div>
            <div className="gw-ttl">Who is involved?</div>
            <div className="gw-sub-t" style={{ marginBottom: 20 }}>Add the other party or parties by email.</div>

            <div className="gw-fld">
              <label className="gw-label">Email address</label>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <input
                  className="gw-input"
                  type="email"
                  value={emailInput}
                  onChange={(e) => { setEmailInput(e.target.value); setEmailError('') }}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addEmail() } }}
                  placeholder="colleague@company.com"
                  style={{ flex: 1 }}
                />
                <button type="button" className="gw-btn-sec" onClick={addEmail}>Add</button>
              </div>
              {emailError && (
                <div style={{ fontSize: 12, color: '#C0392B', marginTop: 4 }}>{emailError}</div>
              )}
            </div>

            {emails.length > 0 && (
              <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {emails.map((email) => (
                  <div
                    key={email}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '8px 12px', borderRadius: 6,
                      border: '1px solid #E2E0DB', background: 'white', fontSize: 13,
                    }}
                  >
                    <span style={{ color: '#1A1916' }}>{email}</span>
                    <button
                      type="button"
                      onClick={() => removeEmail(email)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gw-sub)', fontSize: 16, lineHeight: 1, padding: '0 2px' }}
                      aria-label={`Remove ${email}`}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              <button type="button" className="gw-btn-sec" style={{ flex: 0 }} onClick={goBack}>← Back</button>
              <button
                type="button"
                className="gw-btn"
                style={{ flex: 1 }}
                disabled={emails.length === 0}
                onClick={() => setStep(4)}
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 4 (project): attach brief ──────────────────────────────── */}
        {step === 4 && scenario === 'NEW_PROJECT' && (
          <div>
            <div className="gw-ttl">Attach a brief</div>
            <div className="gw-sub-t" style={{ marginBottom: 20 }}>
              Anything written down that captures what was agreed. We will read it.
            </div>

            <div className="gw-fld">
              <label className="gw-label">Upload document</label>
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                className="gw-input"
                style={{ paddingTop: 8, paddingBottom: 8 }}
                onChange={(e) => setBriefFile(e.target.files?.[0] ?? null)}
              />
              {briefFile && (
                <div style={{ fontSize: 12, color: 'var(--gw-sub)', marginTop: 4 }}>
                  Selected: {briefFile.name}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 20, alignItems: 'center' }}>
              <button type="button" className="gw-btn-sec" style={{ flex: 0 }} onClick={goBack}>← Back</button>
              <button
                type="button"
                className="gw-btn"
                style={{ flex: 1 }}
                disabled={!briefFile}
                onClick={() => setStep(5)}
              >
                Next →
              </button>
              <button
                type="button"
                onClick={() => setStep(5)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gw-sub)', fontSize: 13, padding: '0 4px', textDecoration: 'underline' }}
              >
                Skip
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 5 (project): check-in cadence ──────────────────────────── */}
        {step === 5 && scenario === 'NEW_PROJECT' && (
          <div>
            <div className="gw-ttl">Check-in cadence</div>
            <div className="gw-sub-t" style={{ marginBottom: 20 }}>
              How often should this ground surface for a check-in?
            </div>

            <div className="gw-fld">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                {CADENCE_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    style={cardStyle(cadence === opt.value)}
                  >
                    <input
                      type="radio"
                      name="cadence"
                      value={opt.value}
                      checked={cadence === opt.value}
                      onChange={() => setCadence(opt.value)}
                      style={{ marginTop: 2, accentColor: '#0C447C' }}
                    />
                    <span style={{ fontSize: 13, fontWeight: cadence === opt.value ? 600 : 400, color: '#1A1916' }}>
                      {opt.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              <button type="button" className="gw-btn-sec" style={{ flex: 0 }} onClick={goBack}>← Back</button>
              <button
                type="button"
                className="gw-btn"
                style={{ flex: 1 }}
                disabled={mutation.isPending}
                onClick={() => mutation.mutate()}
              >
                {mutation.isPending ? 'Opening…' : 'Open ground →'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
