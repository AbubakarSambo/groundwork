import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { authApi } from '@/api'
import { GroundworkLogo } from '@/components/gw/GroundworkLogo'

type Step = 1 | 2 | 3

const ORG_TYPES = [
  { value: 'pre-seed', label: 'Pre-seed startup' },
  { value: 'seed', label: 'Seed-stage startup' },
  { value: 'series-a-plus', label: 'Series A+' },
  { value: 'consultancy', label: 'Consultancy' },
  { value: 'other', label: 'Other' },
]

export function OrgSetupPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>(1)
  const [orgName, setOrgName] = useState('')
  const [orgType, setOrgType] = useState('')
  const [orgCode, setOrgCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const handleSubmit = async () => {
    if (!orgName.trim()) { setError('Org name is required'); return }
    if (!orgType) { setError('Please select an org type'); return }
    setError('')
    setLoading(true)
    try {
      const result = await authApi.createOrg({ name: orgName, type: orgType })
      setOrgCode(result.orgCode)
      setStep(2)
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(orgCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback: do nothing
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gw-bg)', display: 'flex', flexDirection: 'column' }}>
      <div className="gw-hdr">
        <GroundworkLogo />
        {step === 1 && <Link to="/" className="gw-back">← Back</Link>}
      </div>

      <div className="gw-bd" style={{ maxWidth: 480, margin: '0 auto', width: '100%', paddingTop: 32 }}>
        <div className="gw-steps">
          {[1, 2, 3].map(s => (
            <div key={s} className={`gw-step ${s < step ? 'gw-step-done' : s === step ? 'gw-step-active' : ''}`} />
          ))}
        </div>

        {/* Step 1: Org details */}
        {step === 1 && (
          <>
            <div className="gw-ttl">Set up your org</div>
            <div className="gw-sub-t">Tell us about your organisation so we can personalise Groundwork for you.</div>

            <div className="gw-fld">
              <label className="gw-label">Org name</label>
              <input
                className="gw-input"
                value={orgName}
                onChange={e => { setOrgName(e.target.value); setError('') }}
                placeholder="e.g. Acme Corp"
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                autoFocus
              />
            </div>

            <div className="gw-fld">
              <label className="gw-label">Org type</label>
              <select
                className="gw-input"
                value={orgType}
                onChange={e => { setOrgType(e.target.value); setError('') }}
                style={{ appearance: 'auto' }}
              >
                <option value="">Select a type…</option>
                {ORG_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            {error && <div className="gw-er">{error}</div>}

            <button className="gw-btn" onClick={handleSubmit} disabled={loading}>
              {loading ? 'Creating…' : 'Create org →'}
            </button>

            <div style={{ height: 1, background: '#E2E0DB', margin: '20px 0' }} />
            <div style={{ fontSize: 12, color: 'var(--gw-sub)', textAlign: 'center' }}>
              Joining an existing org?{' '}
              <Link to="/enter-org-code" style={{ color: '#0C447C', textDecoration: 'underline' }}>Enter your org code</Link>
            </div>
          </>
        )}

        {/* Step 2: Show org code */}
        {step === 2 && (
          <>
            <div className="gw-ttl">Your org is ready</div>
            <div className="gw-sub-t">Share this code with your team so they can join.</div>

            <div
              style={{
                background: '#fff',
                border: '1px solid #E2E0DB',
                borderRadius: 12,
                padding: '28px 24px',
                textAlign: 'center',
                margin: '24px 0',
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--gw-sub)', marginBottom: 12 }}>
                Org code
              </div>
              <div
                style={{
                  fontSize: 40,
                  fontWeight: 800,
                  letterSpacing: '0.2em',
                  color: 'var(--gw-primary, #0C447C)',
                  fontVariantNumeric: 'tabular-nums',
                  marginBottom: 20,
                }}
              >
                {orgCode}
              </div>
              <button
                className="gw-btn-sec"
                onClick={handleCopyCode}
                style={{ minWidth: 140 }}
              >
                {copied ? 'Copied!' : 'Copy code'}
              </button>
            </div>

            <button className="gw-btn" onClick={() => setStep(3)}>
              Continue →
            </button>
          </>
        )}

        {/* Step 3: Setup complete */}
        {step === 3 && (
          <>
            <div className="gw-ttl">Setup complete</div>
            <div className="gw-sub-t">
              Once your team members set up their accounts and choose PINs, you will see their status here.
            </div>

            <div
              style={{
                background: '#fff',
                border: '1px solid #E2E0DB',
                borderRadius: 12,
                padding: '20px 18px',
                margin: '24px 0',
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gw-sub)', marginBottom: 12 }}>
                Team members
              </div>
              <div style={{ fontSize: 13, color: 'var(--gw-sub)', fontStyle: 'italic' }}>
                PINs will be shown here after team members set up their accounts.
              </div>
            </div>

            <button className="gw-btn" onClick={() => navigate('/alignment-feed')}>
              Go to my alignment feed →
            </button>
          </>
        )}
      </div>
    </div>
  )
}
