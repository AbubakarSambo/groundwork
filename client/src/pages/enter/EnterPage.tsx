import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export function EnterPage() {
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')

  function proceed() {
    const trimmed = code.trim().toLowerCase()
    if (!trimmed) { setError('Enter your org code.'); return }
    navigate(`/pin?org=${encodeURIComponent(trimmed)}`)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--gw-bg)' }}>
      <div style={{ background: '#085041', padding: '20px 20px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <svg width="18" height="14" viewBox="0 0 22 17" fill="none">
            <rect x="5" y="0" width="12" height="3" rx="1.5" fill="white" opacity="0.45" />
            <rect x="2" y="6" width="18" height="3" rx="1.5" fill="white" opacity="0.72" />
            <rect x="0" y="12" width="22" height="3" rx="1.5" fill="white" />
          </svg>
          <a href="https://myground.work" target="_blank" rel="noopener noreferrer" style={{ fontSize: 15, fontWeight: 700, color: 'white', letterSpacing: '-.02em', textDecoration: 'none' }}>Groundwork</a>
        </div>
        <span onClick={() => navigate('/')} style={{ fontSize: 13, color: 'rgba(255,255,255,.55)', cursor: 'pointer' }}>Back</span>
      </div>

      <div className="gw-bd" style={{ maxWidth: 480, margin: '0 auto', width: '100%', paddingTop: 28 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--gw-green-bg)', border: '0.5px solid var(--gw-green-b)', borderRadius: 20, padding: '4px 12px', fontSize: 11, fontWeight: 600, color: 'var(--gw-green-t)', marginBottom: 20, letterSpacing: '.02em' }}>
          Contributor
        </div>

        <div className="gw-ttl">Check in</div>
        <div className="gw-sub-t">Enter your org code to open your ground.</div>

        <div className="gw-fld">
          <label className="gw-label">Org code</label>
          <input
            className="gw-input"
            type="text"
            placeholder="e.g. northgate"
            value={code}
            onChange={e => setCode(e.target.value.replace(/\s/g, '').toLowerCase())}
            onKeyDown={e => e.key === 'Enter' && proceed()}
            autoFocus
          />
        </div>

        <button className="gw-btn" onClick={proceed}>Continue</button>
        {error && <div className="gw-er" style={{ marginTop: 8 }}>{error}</div>}

        <div style={{ fontSize: 13, color: 'var(--gw-sub)', textAlign: 'center', marginTop: 16 }}>
          Have an account already?{' '}
          <span style={{ color: 'var(--gw-navy)', textDecoration: 'underline', cursor: 'pointer' }} onClick={() => navigate('/auth')}>Sign in</span>
        </div>

        <div style={{ fontSize: 11, color: 'var(--gw-sub)', textAlign: 'center', marginTop: 20, paddingTop: 16, borderTop: '0.5px solid var(--gw-border)' }}>
          Your full account stays private from other contributors. Alignment and gaps emerge as everyone checks in.
        </div>
      </div>
    </div>
  )
}
