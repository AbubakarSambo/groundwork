import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { authApi, type MagicLinkBody } from '@/api/auth'
import { useAuthStore } from '@/stores/auth'
import { entryStorage, participantStorage } from '@/api/entry'

export function MagicSentPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const setAuth = useAuthStore(s => s.setAuth)
  const email = params.get('email') ?? ''
  const [countdown, setCountdown] = useState(30)
  const [canResend, setCanResend] = useState(false)

  useEffect(() => {
    if (countdown <= 0) { setCanResend(true); return }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  // Detect when the magic link is confirmed in another tab on the same device.
  // The auth store persists to localStorage; the storage event fires in every
  // tab except the one that wrote the data, so Tab A (this page) gets notified
  // when Tab B (the verify page) authenticates.
  useEffect(() => {
    function handleStorage(e: StorageEvent) {
      if (e.key !== 'token' || !e.newValue) return
      try {
        const raw = localStorage.getItem('auth-storage-v2')
        if (!raw) return
        const parsed = JSON.parse(raw)
        const { user, token } = parsed?.state ?? {}
        if (user && token) {
          setAuth(user, token)
          entryStorage.clear()
          participantStorage.clear()
          navigate('/grounds', { replace: true })
        }
      } catch {}
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  // Resend re-uses whatever body was cached in sessionStorage from the sign-up form
  const resend = useMutation({
    mutationFn: () => {
      const cached = sessionStorage.getItem('gw_magic_body')
      const body: MagicLinkBody = cached ? JSON.parse(cached) : { email, firstName: '', lastName: '', organizationName: '' }
      return authApi.requestMagicLink(body)
    },
    onSuccess: () => { setCountdown(30); setCanResend(false) },
  })

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--gw-bg)' }}>
      <div className="gw-hdr">
        <a href="https://myground.work" target="_blank" rel="noopener noreferrer" className="gw-logo" style={{ textDecoration: 'none', color: 'inherit' }}>Groundwork</a>
      </div>
      <div className="gw-bd" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '70vh', textAlign: 'center' }}>
        <div style={{ width: 52, height: 52, background: 'var(--gw-blue-bg)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <svg width="22" height="18" viewBox="0 0 22 18" fill="none">
            <rect x="1" y="1" width="20" height="16" rx="2" stroke="#0C447C" strokeWidth="1.5" />
            <path d="M1 4l10 7 10-7" stroke="#0C447C" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>

        <div className="gw-ttl" style={{ textAlign: 'center' }}>Check your email</div>
        <div className="gw-sub-t" style={{ textAlign: 'center', maxWidth: 300, margin: '8px auto 6px' }}>
          We sent a secure link to <strong>{email}</strong>.
        </div>
        <div style={{ fontSize: 13, color: 'var(--gw-sub)', textAlign: 'center', maxWidth: 300, margin: '0 auto 24px' }}>
          Click it to open Groundwork.
        </div>

        <div style={{ fontSize: 12, color: 'var(--gw-sub)', textAlign: 'center' }}>No email? Check your spam folder.</div>

        {!canResend && (
          <div style={{ fontSize: 12, color: 'var(--gw-sub)', textAlign: 'center', marginTop: 8 }}>
            Resend available in {countdown}s
          </div>
        )}
        {canResend && (
          <div style={{ textAlign: 'center', marginTop: 8 }}>
            <span
              style={{ color: 'var(--gw-navy)', cursor: 'pointer', textDecoration: 'underline', fontSize: 12 }}
              onClick={() => resend.mutate()}
            >
              {resend.isPending ? 'Sending…' : 'Send another link'}
            </span>
          </div>
        )}

        <div style={{ marginTop: 28, paddingTop: 20, borderTop: '0.5px solid var(--gw-border)' }}>
          <span onClick={() => navigate('/')} style={{ fontSize: 12, color: 'var(--gw-sub)', cursor: 'pointer' }}>Back to Groundwork</span>
        </div>
      </div>
    </div>
  )
}
