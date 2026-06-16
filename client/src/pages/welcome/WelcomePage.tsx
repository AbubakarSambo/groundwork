import { useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/stores/auth'

export function WelcomePage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const user = useAuthStore(s => s.user)
  const nextUrl = params.get('next') ?? '/grounds'
  const isSecondSignin = params.has('next')

  const requestToken = useMutation({
    mutationFn: () => authApi.requestPasswordSetup(),
    onSuccess: res => {
      navigate(`/set-password?token=${res.token}&next=${encodeURIComponent(nextUrl)}`)
    },
    onError: () => navigate(nextUrl),
  })

  if (isSecondSignin) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--gw-bg)' }}>
        <div className="gw-hdr">
          <a href="/" className="gw-logo" style={{ textDecoration: 'none', color: 'inherit' }}>Groundwork</a>
        </div>
        <div className="gw-bd" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '70vh', maxWidth: 420, margin: '0 auto', width: '100%' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gw-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 12 }}>
            Welcome back{user?.firstName ? `, ${user.firstName}` : ''}
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 8, letterSpacing: '-.01em', lineHeight: 1.2 }}>
            Set a password to sign in directly next time.
          </div>
          <div style={{ fontSize: 13, color: 'var(--gw-sub)', marginBottom: 28, lineHeight: 1.65 }}>
            You have been signing in with email links. A password lets you sign in directly from any device without waiting for an email.
          </div>

          <button
            className="gw-btn"
            onClick={() => requestToken.mutate()}
            disabled={requestToken.isPending}
            style={{ margin: 0 }}
          >
            {requestToken.isPending ? 'Setting up…' : 'Set a password'}
          </button>

          <button
            onClick={() => navigate(nextUrl)}
            style={{ marginTop: 12, background: 'none', border: 'none', fontSize: 13, color: 'var(--gw-muted)', cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline', padding: 0, textAlign: 'center' }}
          >
            Skip for now
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--gw-bg)' }}>
      <div className="gw-hdr"><a href="https://myground.work" target="_blank" rel="noopener noreferrer" className="gw-logo" style={{ textDecoration: 'none', color: 'inherit' }}>Groundwork</a></div>
      <div className="gw-bd" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '80vh', maxWidth: 420, margin: '0 auto', width: '100%' }}>
        <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 8, letterSpacing: '-.01em' }}>
          Welcome{user?.firstName ? `, ${user.firstName}` : ''}
        </div>
        <button className="gw-btn" onClick={() => navigate('/grounds')} style={{ margin: 0 }}>
          Open Groundwork
        </button>
      </div>
    </div>
  )
}
