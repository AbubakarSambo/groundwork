import { useState } from 'react'
import { toast } from 'sonner'
import { participantsApi } from '@/api'

interface CofounderIntakePageProps {
  onComplete: () => void
  groundLabel: string
  checkInId: string
}

const taStyle: React.CSSProperties = {
  width: '100%',
  minHeight: 80,
  border: '1px solid #E2E0DB',
  borderRadius: 6,
  padding: '0.5rem',
  fontSize: '0.9rem',
  resize: 'vertical',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
  lineHeight: 1.5,
  background: 'white',
  color: '#1A1916',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 600,
  color: '#1A1916',
  marginBottom: 6,
}

const fieldStyle: React.CSSProperties = {
  marginBottom: 20,
}

interface IntakeFields {
  // Step 1 — Intent
  foundingIntent: string
  roleIntent: string
  personalIntent: string
  exitIntent: string
  // Step 2 — What you need
  compensationAsk: string
  autonomyAsk: string
  recognitionAsk: string
  growthAsk: string
  relationshipAsk: string
  // Step 3 — Tolerance
  financialFloor: string
  stressTolerance: string
  relationalTolerance: string
}

export function CofounderIntakePage({ onComplete, groundLabel, checkInId }: CofounderIntakePageProps) {
  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)

  const [fields, setFields] = useState<IntakeFields>({
    foundingIntent: '',
    roleIntent: '',
    personalIntent: '',
    exitIntent: '',
    compensationAsk: '',
    autonomyAsk: '',
    recognitionAsk: '',
    growthAsk: '',
    relationshipAsk: '',
    financialFloor: '',
    stressTolerance: '',
    relationalTolerance: '',
  })

  function set(key: keyof IntakeFields) {
    return (e: React.ChangeEvent<HTMLTextAreaElement>) =>
      setFields((prev) => ({ ...prev, [key]: e.target.value }))
  }

  const canContinueStep1 =
    fields.foundingIntent.trim().length > 0 &&
    fields.roleIntent.trim().length > 0 &&
    fields.personalIntent.trim().length > 0 &&
    fields.exitIntent.trim().length > 0

  const canContinueStep2 =
    fields.compensationAsk.trim().length > 0 &&
    fields.autonomyAsk.trim().length > 0 &&
    fields.recognitionAsk.trim().length > 0 &&
    fields.growthAsk.trim().length > 0 &&
    fields.relationshipAsk.trim().length > 0

  const canSubmit =
    fields.financialFloor.trim().length > 0 &&
    fields.stressTolerance.trim().length > 0 &&
    fields.relationalTolerance.trim().length > 0

  async function handleSubmit() {
    setSubmitting(true)
    try {
      await participantsApi.saveIntake(checkInId, fields)
      toast.success('Your intent is on record.')
      onComplete()
    } catch {
      toast.error('Could not save your intake. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--gw-bg)' }}>
      {/* Header */}
      <div className="gw-hdr">
        <div>
          <div className="gw-logo">{groundLabel}</div>
          <div style={{ fontSize: 11, color: 'var(--gw-muted)', marginTop: 1 }}>Before your first session</div>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', padding: '2rem 1rem' }}>
        <div style={{ maxWidth: 560, width: '100%' }}>
          {/* Step indicator */}
          <div style={{ fontSize: 11, color: 'var(--gw-sub)', marginBottom: 8, letterSpacing: '0.04em' }}>
            Step {step} of 3
          </div>

          {/* Progress bar */}
          <div style={{ height: 3, background: '#E2E0DB', borderRadius: 4, marginBottom: 28 }}>
            <div
              style={{
                height: '100%',
                width: `${(step / 3) * 100}%`,
                background: '#0C447C',
                borderRadius: 4,
                transition: 'width 0.25s ease',
              }}
            />
          </div>

          {/* ── STEP 1: Intent ─────────────────────────────────────────── */}
          {step === 1 && (
            <>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1A1916', margin: '0 0 6px' }}>
                Intent
              </h2>
              <p style={{ fontSize: '0.9rem', color: 'var(--gw-sub)', margin: '0 0 24px', lineHeight: 1.5 }}>
                Before the check-in begins, put your intent on record. This belongs to you alone.
              </p>

              <div style={fieldStyle}>
                <label style={labelStyle}>
                  What is your founding intent?
                  <span style={{ fontWeight: 400, color: 'var(--gw-sub)', marginLeft: 4 }}>What are you here to build?</span>
                </label>
                <textarea style={taStyle} value={fields.foundingIntent} onChange={set('foundingIntent')} placeholder="Describe what you are building and why you are doing this." />
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>
                  What is your role intent?
                  <span style={{ fontWeight: 400, color: 'var(--gw-sub)', marginLeft: 4 }}>What specifically do you want to be responsible for?</span>
                </label>
                <textarea style={taStyle} value={fields.roleIntent} onChange={set('roleIntent')} placeholder="The domains, decisions, and work you want to own." />
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>
                  What is your personal intent?
                  <span style={{ fontWeight: 400, color: 'var(--gw-sub)', marginLeft: 4 }}>What does success look like for you personally?</span>
                </label>
                <textarea style={taStyle} value={fields.personalIntent} onChange={set('personalIntent')} placeholder="What winning looks like for you, not just the company." />
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>
                  What is your exit intent?
                  <span style={{ fontWeight: 400, color: 'var(--gw-sub)', marginLeft: 4 }}>If the relationship were to end, what would make that a good outcome?</span>
                </label>
                <textarea style={taStyle} value={fields.exitIntent} onChange={set('exitIntent')} placeholder="What would a good parting look like, if it came to that?" />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                <button
                  className="gw-btn-sm"
                  disabled={!canContinueStep1}
                  onClick={() => setStep(2)}
                  style={{ minWidth: 120 }}
                >
                  Continue →
                </button>
              </div>
            </>
          )}

          {/* ── STEP 2: What you need ───────────────────────────────────── */}
          {step === 2 && (
            <>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1A1916', margin: '0 0 6px' }}>
                What you need
              </h2>
              <p style={{ fontSize: '0.9rem', color: 'var(--gw-sub)', margin: '0 0 24px', lineHeight: 1.5 }}>
                Be honest about what you need to feel valued and to sustain this relationship.
              </p>

              <div style={fieldStyle}>
                <label style={labelStyle}>
                  What is your compensation ask?
                  <span style={{ fontWeight: 400, color: 'var(--gw-sub)', marginLeft: 4 }}>What do you need to sustain yourself?</span>
                </label>
                <textarea style={taStyle} value={fields.compensationAsk} onChange={set('compensationAsk')} placeholder="Salary, equity, or any other financial expectations." />
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>
                  How much autonomy do you need?
                  <span style={{ fontWeight: 400, color: 'var(--gw-sub)', marginLeft: 4 }}>What would feel like too much oversight?</span>
                </label>
                <textarea style={taStyle} value={fields.autonomyAsk} onChange={set('autonomyAsk')} placeholder="Describe the level of independence you need to work well." />
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>
                  What kind of recognition matters to you?
                </label>
                <textarea style={taStyle} value={fields.recognitionAsk} onChange={set('recognitionAsk')} placeholder="How do you want your contributions acknowledged?" />
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>
                  What growth are you expecting from this?
                </label>
                <textarea style={taStyle} value={fields.growthAsk} onChange={set('growthAsk')} placeholder="Skills, title, scope, or anything else you expect to grow into." />
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>
                  What does this relationship need to feel like?
                </label>
                <textarea style={taStyle} value={fields.relationshipAsk} onChange={set('relationshipAsk')} placeholder="The dynamic, the communication style, the tone." />
              </div>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', marginTop: 8 }}>
                <button className="gw-back" onClick={() => setStep(1)}>← Back</button>
                <button
                  className="gw-btn-sm"
                  disabled={!canContinueStep2}
                  onClick={() => setStep(3)}
                  style={{ minWidth: 120 }}
                >
                  Continue →
                </button>
              </div>
            </>
          )}

          {/* ── STEP 3: Tolerance ───────────────────────────────────────── */}
          {step === 3 && (
            <>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1A1916', margin: '0 0 6px' }}>
                Tolerance
              </h2>
              <p style={{ fontSize: '0.9rem', color: 'var(--gw-sub)', margin: '0 0 24px', lineHeight: 1.5 }}>
                Know your floor. These answers protect you and the relationship.
              </p>

              <div style={fieldStyle}>
                <label style={labelStyle}>
                  What is your financial floor?
                  <span style={{ fontWeight: 400, color: 'var(--gw-sub)', marginLeft: 4 }}>The minimum income that makes this viable for you.</span>
                </label>
                <textarea style={taStyle} value={fields.financialFloor} onChange={set('financialFloor')} placeholder="The number or condition below which you cannot continue." />
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>
                  What is your stress tolerance?
                  <span style={{ fontWeight: 400, color: 'var(--gw-sub)', marginLeft: 4 }}>What kind of pressure can you sustain, and for how long?</span>
                </label>
                <textarea style={taStyle} value={fields.stressTolerance} onChange={set('stressTolerance')} placeholder="Your honest limit — the pace, uncertainty, or pressure you can hold." />
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>
                  What is your relational tolerance?
                  <span style={{ fontWeight: 400, color: 'var(--gw-sub)', marginLeft: 4 }}>What kinds of tension can you hold, and what would break trust?</span>
                </label>
                <textarea style={taStyle} value={fields.relationalTolerance} onChange={set('relationalTolerance')} placeholder="Disagreements you can navigate, and lines you cannot cross." />
              </div>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', marginTop: 8 }}>
                <button className="gw-back" onClick={() => setStep(2)}>← Back</button>
                <button
                  className="gw-btn-sm"
                  disabled={!canSubmit || submitting}
                  onClick={handleSubmit}
                  style={{ minWidth: 140 }}
                >
                  {submitting ? 'Saving…' : 'Submit and begin →'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
