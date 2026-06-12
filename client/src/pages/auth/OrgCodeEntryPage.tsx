import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { authApi } from '@/api'
import { GroundworkLogo } from '@/components/gw/GroundworkLogo'

export function OrgCodeEntryPage() {
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)
    setCode(val)
    setError('')
  }

  const handleContinue = async () => {
    if (code.length !== 6) {
      setError('Please enter a 6-character org code.')
      return
    }
    setLoading(true)
    setError('')
    try {
      await authApi.validateOrgCode(code)
      navigate('/set-pin', { state: { orgCode: code } })
    } catch {
      setError("That code doesn't match any org. Check with your founder.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gw-bg)', display: 'flex', flexDirection: 'column' }}>
      <div className="gw-hdr">
        <GroundworkLogo />
        <Link to="/" className="gw-back">← Back</Link>
      </div>

      <div className="gw-bd" style={{ maxWidth: 460, margin: '0 auto', width: '100%', paddingTop: 32 }}>
        <div className="gw-ttl">Enter your org code</div>
        <div className="gw-sub-t">Your founder shared a 6-character code with you.</div>

        <div className="gw-fld">
          <label className="gw-label">Org code</label>
          <input
            className="gw-input"
            value={code}
            onChange={handleChange}
            placeholder="e.g. ABC123"
            maxLength={6}
            onKeyDown={e => e.key === 'Enter' && handleContinue()}
            style={{ letterSpacing: '0.25em', textTransform: 'uppercase', fontWeight: 600, fontSize: 18 }}
            autoFocus
          />
        </div>

        {error && <div className="gw-er">{error}</div>}

        <button className="gw-btn" onClick={handleContinue} disabled={loading || code.length !== 6}>
          {loading ? 'Checking…' : 'Continue →'}
        </button>

        <div style={{ height: 1, background: '#E2E0DB', margin: '20px 0' }} />
        <div style={{ fontSize: 12, color: 'var(--gw-sub)', textAlign: 'center' }}>
          <Link to="/register" style={{ color: '#0C447C', textDecoration: 'underline' }}>Set up a new org instead</Link>
        </div>
      </div>
    </div>
  )
}
