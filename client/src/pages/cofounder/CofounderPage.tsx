import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { participantsApi } from '@/api/participants'

const STEPS = ['Intent', 'Asks', 'Tolerance']

export function CofounderPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [intent, setIntent] = useState('')
  const [asks, setAsks] = useState('')
  const [tolerance, setTolerance] = useState('')

  // In practice checkInId comes from route state or query param
  const checkInId = new URLSearchParams(window.location.search).get('checkInId') ?? ''

  const save = useMutation({
    mutationFn: () => participantsApi.saveIntake(checkInId, { intent, asks, tolerance }),
    onSuccess: () => navigate('/grounds'),
  })

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--gw-bg)' }}>
      <div className="gw-hdr">
        <div className="gw-logo">Groundwork</div>
        <button className="gw-back" onClick={() => step > 0 ? setStep(s => s - 1) : navigate('/grounds')}>← Back</button>
      </div>

      <div className="gw-bd" style={{ maxWidth: 480, margin: '0 auto', width: '100%' }}>
        {/* Step indicator */}
        <div className="gw-steps" style={{ marginBottom: 24 }}>
          {STEPS.map((_, i) => (
            <div key={i} className={`gw-step ${i < step ? 'gw-step-done' : i === step ? 'gw-step-active' : ''}`} />
          ))}
        </div>

        {step === 0 && (
          <div>
            <div className="gw-ttl">What do you intend to build?</div>
            <div className="gw-sub-t">Your intent: what you are here to do, why you are the person to do it, what success looks like for you.</div>
            <div className="gw-fld">
              <textarea className="gw-ta" rows={6} value={intent} onChange={e => setIntent(e.target.value)} placeholder="Describe your intent for this partnership…" />
            </div>
            <button className="gw-btn" disabled={!intent.trim()} onClick={() => setStep(1)} style={{ margin: 0 }}>Continue →</button>
          </div>
        )}

        {step === 1 && (
          <div>
            <div className="gw-ttl">What do you need from this partnership?</div>
            <div className="gw-sub-t">Your asks: what you need the other party to bring. Be specific.</div>
            <div className="gw-fld">
              <textarea className="gw-ta" rows={6} value={asks} onChange={e => setAsks(e.target.value)} placeholder="Describe what you need from your cofounder…" />
            </div>
            <button className="gw-btn" disabled={!asks.trim()} onClick={() => setStep(2)} style={{ margin: 0 }}>Continue →</button>
          </div>
        )}

        {step === 2 && (
          <div>
            <div className="gw-ttl">What is your tolerance?</div>
            <div className="gw-sub-t">Where your limits are: pace, style, risk, workload. What you will not compromise on.</div>
            <div className="gw-fld">
              <textarea className="gw-ta" rows={6} value={tolerance} onChange={e => setTolerance(e.target.value)} placeholder="Describe your limits and what you will not compromise on…" />
            </div>
            <button className="gw-btn" disabled={!tolerance.trim() || save.isPending} onClick={() => save.mutate()} style={{ margin: 0 }}>
              {save.isPending ? 'Saving…' : 'Save and continue →'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
