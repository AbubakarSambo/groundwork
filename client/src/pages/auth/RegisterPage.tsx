import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { authApi } from '@/api'

type Step = 1 | 2 | 3

export function RegisterPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>(1)
  const [form, setForm] = useState({ organizationName: '', firstName: '', lastName: '', email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [er, setEr] = useState('')
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value })

  const step1Next = () => {
    if (!form.organizationName.trim()) { setEr('Organisation name is required'); return }
    setEr(''); setStep(2)
  }

  const step2Next = () => {
    if (!form.firstName.trim() || !form.email.trim()) { setEr('Name and email are required'); return }
    setEr(''); setStep(3)
  }

  const finish = async () => {
    if (!form.password) { setEr('Password is required'); return }
    setLoading(true)
    try {
      await authApi.register(form)
      navigate(`/check-email?email=${encodeURIComponent(form.email)}`)
    } catch (err: any) {
      setEr(err?.response?.data?.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gw-bg)', display: 'flex', flexDirection: 'column' }}>
      <div className="gw-hdr">
        <div className="gw-logo">Groundwork</div>
        <Link to="/" className="gw-back">← Back</Link>
      </div>

      <div className="gw-bd" style={{ maxWidth: 460, margin: '0 auto', width: '100%', paddingTop: 24 }}>
        <div className="gw-steps">
          {[1,2,3].map(s => (
            <div key={s} className={`gw-step ${s < step ? 'gw-step-done' : s === step ? 'gw-step-active' : ''}`} />
          ))}
        </div>

        {step === 1 && (
          <>
            <div className="gw-ttl">Create your org</div>
            <div className="gw-sub-t">Takes two minutes. Everyone gets their own contribution chat.</div>
            <div className="gw-fld">
              <label className="gw-label">Organisation name</label>
              <input className="gw-input" value={form.organizationName} onChange={set('organizationName')} placeholder="e.g. Acme Corp" onKeyDown={e => e.key === 'Enter' && step1Next()} />
            </div>
            {er && <div className="gw-er">{er}</div>}
            <button className="gw-btn" onClick={step1Next}>Continue →</button>
          </>
        )}

        {step === 2 && (
          <>
            <div className="gw-ttl">Your details</div>
            <div className="gw-sub-t">How should we address you?</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div className="gw-fld" style={{ margin: 0 }}>
                <label className="gw-label">First name</label>
                <input className="gw-input" value={form.firstName} onChange={set('firstName')} placeholder="Alex" />
              </div>
              <div className="gw-fld" style={{ margin: 0 }}>
                <label className="gw-label">Last name</label>
                <input className="gw-input" value={form.lastName} onChange={set('lastName')} placeholder="Smith" />
              </div>
            </div>
            <div className="gw-fld" style={{ marginTop: 8 }}>
              <label className="gw-label">Work email</label>
              <input className="gw-input" type="email" value={form.email} onChange={set('email')} placeholder="you@company.com" />
            </div>
            {er && <div className="gw-er">{er}</div>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="gw-btn-sec" style={{ flex: 0 }} onClick={() => setStep(1)}>← Back</button>
              <button className="gw-btn" style={{ flex: 1 }} onClick={step2Next}>Continue →</button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <div className="gw-ttl">Set a password</div>
            <div className="gw-sub-t">You will use this to sign in. We will email you a verification link.</div>
            <div className="gw-fld">
              <label className="gw-label">Password</label>
              <input className="gw-input" type="password" value={form.password} onChange={set('password')} placeholder="At least 8 characters" onKeyDown={e => e.key === 'Enter' && finish()} />
            </div>
            {er && <div className="gw-er">{er}</div>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="gw-btn-sec" style={{ flex: 0 }} onClick={() => setStep(2)}>← Back</button>
              <button className="gw-btn" style={{ flex: 1 }} onClick={finish} disabled={loading}>
                {loading ? 'Creating…' : 'Create org and verify email →'}
              </button>
            </div>
          </>
        )}

        <div style={{ height: 1, background: '#E2E0DB', margin: '20px 0' }} />
        <div style={{ fontSize: 12, color: 'var(--gw-sub)', textAlign: 'center' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: '#0C447C', textDecoration: 'underline' }}>Sign in</Link>
        </div>
      </div>
    </div>
  )
}
