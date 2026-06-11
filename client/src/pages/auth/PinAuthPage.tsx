import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { authApi } from '@/api'
import { useAuthStore } from '@/stores/auth'

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫']

function PinDots({ filled }: { filled: number }) {
  return (
    <div style={{ display: 'flex', gap: 16, justifyContent: 'center', margin: '24px 0' }}>
      {[0, 1, 2, 3].map(i => (
        <div
          key={i}
          style={{
            width: 18,
            height: 18,
            borderRadius: '50%',
            background: i < filled ? 'var(--gw-primary, #0C447C)' : 'transparent',
            border: '2px solid var(--gw-primary, #0C447C)',
            transition: 'background 0.15s',
          }}
        />
      ))}
    </div>
  )
}

function Keypad({ onKey }: { onKey: (k: string) => void }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, maxWidth: 300, margin: '0 auto' }}>
      {KEYS.map((key, i) => (
        key === '' ? (
          <div key={i} />
        ) : (
          <button
            key={i}
            onClick={() => onKey(key)}
            style={{
              height: 64,
              fontSize: key === '⌫' ? 20 : 24,
              fontWeight: 600,
              borderRadius: 12,
              border: '1px solid #E2E0DB',
              background: '#fff',
              cursor: 'pointer',
              color: 'var(--gw-txt, #1A1A1A)',
              transition: 'background 0.1s',
            }}
            onMouseDown={e => (e.currentTarget.style.background = '#F3F1ED')}
            onMouseUp={e => (e.currentTarget.style.background = '#fff')}
            onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
          >
            {key}
          </button>
        )
      ))}
    </div>
  )
}

export function PinAuthPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const setAuth = useAuthStore((s) => s.setAuth)
  const orgCode = (location.state as any)?.orgCode ?? ''

  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleKey = async (key: string) => {
    setError('')
    if (key === '⌫') {
      setPin(p => p.slice(0, -1))
      return
    }
    const next = pin + key
    if (next.length > 4) return
    setPin(next)

    if (next.length === 4) {
      setLoading(true)
      try {
        const { accessToken, user } = await authApi.pinLogin({ pin: next, orgCode })
        setAuth(user, accessToken)
        navigate('/grounds')
      } catch (err: any) {
        setError(err?.response?.data?.message || 'Incorrect PIN. Please try again.')
        setTimeout(() => setPin(''), 400)
      } finally {
        setLoading(false)
      }
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gw-bg)', display: 'flex', flexDirection: 'column' }}>
      <div className="gw-hdr">
        <div className="gw-logo">Groundwork</div>
        <Link to="/enter-org-code" className="gw-back">← Back</Link>
      </div>

      <div className="gw-bd" style={{ maxWidth: 360, margin: '0 auto', width: '100%', paddingTop: 32, textAlign: 'center' }}>
        <div className="gw-ttl" style={{ textAlign: 'center' }}>Enter your PIN</div>
        <div className="gw-sub-t" style={{ textAlign: 'center' }}>Enter your 4-digit PIN to continue.</div>

        <PinDots filled={pin.length} />

        {error && <div className="gw-er" style={{ textAlign: 'center', marginBottom: 12 }}>{error}</div>}

        {loading
          ? <div style={{ color: 'var(--gw-sub)', fontSize: 14, marginTop: 24 }}>Checking…</div>
          : <Keypad onKey={handleKey} />
        }

        <div style={{ height: 1, background: '#E2E0DB', margin: '28px 0 16px' }} />
        <div style={{ fontSize: 12, color: 'var(--gw-sub)', textAlign: 'center' }}>
          Forgot PIN?{' '}
          <span style={{ color: '#0C447C' }}>Ask your founder</span>
        </div>
      </div>
    </div>
  )
}
