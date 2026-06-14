import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

export function BillingCallbackPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const status = params.get('status')
  const groundId = params.get('groundId')

  useEffect(() => {
    const timer = setTimeout(() => {
      if (groundId) navigate(`/grounds/${groundId}`)
      else navigate('/billing')
    }, 2500)
    return () => clearTimeout(timer)
  }, [groundId, navigate])

  const success = status === 'success'

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--gw-bg)', flexDirection: 'column', gap: 14, padding: 24 }}>
      {success ? (
        <>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--gw-green-bg)', border: '1.5px solid var(--gw-green-b)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>✓</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--gw-navy)', letterSpacing: '-.01em' }}>Billing activated</div>
          <div style={{ fontSize: 13, color: 'var(--gw-sub)', textAlign: 'center', maxWidth: 300, lineHeight: 1.6 }}>Session 5 and beyond are now unlocked. Redirecting you back…</div>
        </>
      ) : (
        <>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--gw-text)' }}>Payment cancelled</div>
          <div style={{ fontSize: 13, color: 'var(--gw-sub)' }}>No charge was made. Redirecting you back…</div>
        </>
      )}
    </div>
  )
}
