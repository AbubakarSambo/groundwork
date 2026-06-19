import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { authApi } from '@/api/auth'

const MARKETING_URL = import.meta.env.VITE_MARKETING_URL ?? 'https://myground.work'

export function AuthPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isMember = searchParams.get('mode') === 'member'

  const [email, setEmail] = useState('')
  const [error, setError] = useState('')

  const sendFounder = useMutation({
    mutationFn: () => authApi.requestMagicLink({ email: email.trim() }),
    onSuccess: () => navigate(`/auth/sent?email=${encodeURIComponent(email.trim())}`),
    onError: (err: any) => {
      const msg = err?.response?.data?.message
      if (Array.isArray(msg)) setError(msg[0])
      else setError(msg ?? 'Could not send link. Please try again.')
    },
  })

  const sendMember = useMutation({
    mutationFn: () => authApi.memberSignin(email.trim()),
    onSuccess: () => navigate(`/auth/sent?email=${encodeURIComponent(email.trim())}`),
    onError: () => setError('Could not send link. Please try again.'),
  })

  function submit() {
    setError('')
    const e = email.trim()
    if (!e || !e.includes('@') || !e.split('@')[1]?.includes('.') || e.endsWith('.')) { setError('Enter a valid email address.'); return }
    isMember ? sendMember.mutate() : sendFounder.mutate()
  }

  const isPending = sendFounder.isPending || sendMember.isPending
  const bandColor = isMember ? '#085041' : 'var(--gw-navy)'

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--gw-bg)' }}>

      {/* Header band — navy for founder, teal for member */}
      <div style={{ background: bandColor, padding: '20px 20px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <svg width="18" height="14" viewBox="0 0 22 17" fill="none">
            <rect x="5" y="0" width="12" height="3" rx="1.5" fill="white" opacity="0.45" />
            <rect x="2" y="6" width="18" height="3" rx="1.5" fill="white" opacity="0.72" />
            <rect x="0" y="12" width="22" height="3" rx="1.5" fill="white" />
          </svg>
          <span style={{ fontSize: 15, fontWeight: 700, color: 'white', letterSpacing: '-.02em' }}>Groundwork</span>
        </div>
        <a href={MARKETING_URL} style={{ fontSize: 13, color: 'rgba(255,255,255,.55)', textDecoration: 'none' }}>Back</a>
      </div>

      <div className="gw-bd" style={{ maxWidth: 480, margin: '0 auto', width: '100%', paddingTop: 28 }}>

        {/* Mode pill */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: isMember ? 'var(--gw-green-bg)' : 'var(--gw-blue-bg)',
          border: `0.5px solid ${isMember ? 'var(--gw-green-b)' : 'var(--gw-blue-b)'}`,
          borderRadius: 20, padding: '4px 12px', fontSize: 11, fontWeight: 600,
          color: isMember ? 'var(--gw-green-t)' : 'var(--gw-navy)',
          marginBottom: 20, letterSpacing: '.02em',
        }}>
          {isMember ? 'Team member' : 'Founder / Admin'}
        </div>

        <div className="gw-ttl">{isMember ? 'Open my check-in' : 'Set up your org'}</div>
        <div className="gw-sub-t" style={{ marginBottom: 20 }}>
          {isMember
            ? 'Enter your email. We will send you a link to your contribution chat.'
            : 'Enter your email. We will send you a link to get started.'}
        </div>

        <div className="gw-fld">
          <label className="gw-label">Your email</label>
          <input
            className="gw-input"
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()}
            autoFocus
          />
        </div>

        <button
          className="gw-btn"
          style={isMember ? { background: '#085041' } : undefined}
          onClick={submit}
          disabled={isPending}
        >
          {isPending ? 'Sending…' : 'Send link'}
        </button>
        {error && <div className="gw-er" style={{ marginTop: 8 }}>{error}</div>}

        {/* Mode toggle */}
        <div style={{ fontSize: 13, color: 'var(--gw-sub)', textAlign: 'center', marginTop: 16, lineHeight: 1.6 }}>
          {isMember ? (
            <>
              Opening a ground?{' '}
              <span style={{ color: 'var(--gw-navy)', textDecoration: 'underline', cursor: 'pointer' }} onClick={() => navigate('/auth')}>
                Set it up as admin
              </span>
            </>
          ) : (
            <>
              Team member?{' '}
              <span style={{ color: 'var(--gw-navy)', textDecoration: 'underline', cursor: 'pointer' }} onClick={() => navigate('/enter')}>
                Enter your org code instead
              </span>
            </>
          )}
        </div>

        {/* Trust line */}
        <div style={{ fontSize: 11, color: 'var(--gw-sub)', textAlign: 'center', marginTop: 20, paddingTop: 16, borderTop: '0.5px solid var(--gw-border)', lineHeight: 1.6 }}>
          Your record belongs to you. We never share it without your explicit approval.
        </div>

      </div>
    </div>
  )
}
