import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { useAuthStore } from '@/stores/auth'

export function PinPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const setAuth = useAuthStore(s => s.setAuth)
  const org = params.get('org') ?? ''
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')

  const auth = useMutation({
    mutationFn: () => apiClient.post<{ accessToken: string; user: any }>('/auth/login', { orgCode: org, pin }).then(r => r.data),
    onSuccess: res => {
      setAuth(res.user, res.accessToken)
      navigate('/grounds')
    },
    onError: () => setError('PIN not recognised. Check your org code and try again.'),
  })

  function submit() {
    setError('')
    if (!/^\d{4,8}$/.test(pin)) { setError('PIN must be 4 to 8 digits.'); return }
    auth.mutate()
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--gw-bg)' }}>
      <div className="gw-hdr">
        <div className="gw-logo">Groundwork</div>
        <button className="gw-back" onClick={() => navigate('/enter')}>← Back</button>
      </div>

      <div className="gw-bd" style={{ maxWidth: 360, margin: '0 auto', width: '100%', paddingTop: 40 }}>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Enter your PIN</div>
        {org && <div style={{ fontSize: 13, color: 'var(--gw-muted)', marginBottom: 24 }}>{org}</div>}

        <div className="gw-fld">
          <input
            className="gw-input"
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="Your PIN"
            maxLength={8}
            value={pin}
            onChange={e => setPin(e.target.value.replace(/[^0-9]/g, ''))}
            onKeyDown={e => e.key === 'Enter' && submit()}
            autoFocus
            style={{ fontSize: 20, letterSpacing: '.2em', textAlign: 'center', padding: 12 }}
          />
        </div>
        {error && <div className="gw-er" style={{ textAlign: 'center', marginTop: 6 }}>{error}</div>}

        <button className="gw-btn" onClick={submit} disabled={auth.isPending} style={{ marginTop: 16 }}>
          {auth.isPending ? 'Checking…' : 'Continue →'}
        </button>
      </div>
    </div>
  )
}
