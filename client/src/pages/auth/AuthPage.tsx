import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { authApi } from '@/api/auth'

export function AuthPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isMember = searchParams.get('mode') === 'member'

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [orgName, setOrgName] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')

  const sendFounder = useMutation({
    mutationFn: () => {
      const body = { firstName: firstName.trim(), lastName: lastName.trim(), organizationName: orgName.trim(), email: email.trim() }
      sessionStorage.setItem('gw_magic_body', JSON.stringify(body))
      return authApi.requestMagicLink(body)
    },
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

  function submitFounder() {
    setError('')
    if (!firstName.trim()) { setError('Enter your first name.'); return }
    if (!lastName.trim()) { setError('Enter your last name.'); return }
    if (!orgName.trim()) { setError('Enter your organisation name.'); return }
    if (!email.trim() || !email.includes('@')) { setError('Enter a valid email address.'); return }
    sendFounder.mutate()
  }

  function submitMember() {
    setError('')
    if (!email.trim() || !email.includes('@')) { setError('Enter a valid email address.'); return }
    sendMember.mutate()
  }

  const bandColor = isMember ? '#085041' : 'var(--gw-navy)'

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--gw-bg)' }}>
      {/* Header band */}
      <div style={{ background: bandColor, padding: '20px 20px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <svg width="18" height="14" viewBox="0 0 22 17" fill="none">
            <rect x="5" y="0" width="12" height="3" rx="1.5" fill="white" opacity="0.45" />
            <rect x="2" y="6" width="18" height="3" rx="1.5" fill="white" opacity="0.72" />
            <rect x="0" y="12" width="22" height="3" rx="1.5" fill="white" />
          </svg>
          <span style={{ fontSize: 15, fontWeight: 700, color: 'white', letterSpacing: '-.02em' }}>Groundwork</span>
        </div>
        <span onClick={() => navigate('/')} style={{ fontSize: 13, color: 'rgba(255,255,255,.55)', cursor: 'pointer' }}>Back</span>
      </div>

      <div className="gw-bd" style={{ maxWidth: 480, margin: '0 auto', width: '100%', paddingTop: 28 }}>
        {isMember ? (
          <>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--gw-green-bg)', border: '0.5px solid var(--gw-green-b)', borderRadius: 20, padding: '4px 12px', fontSize: 11, fontWeight: 600, color: 'var(--gw-green-t)', marginBottom: 20, letterSpacing: '.02em' }}>
              Team member
            </div>

            <div className="gw-ttl">Open my check-in</div>
            <div className="gw-sub-t">Enter your email. We will send you a link to your contribution chat.</div>

            <div className="gw-fld">
              <label className="gw-label">Your email</label>
              <input
                className="gw-input"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submitMember()}
                autoFocus
              />
            </div>

            <button className="gw-btn" style={{ background: '#085041' }} onClick={submitMember} disabled={sendMember.isPending}>
              {sendMember.isPending ? 'Sending…' : 'Send link'}
            </button>
            {error && <div className="gw-er" style={{ marginTop: 8 }}>{error}</div>}

            <div style={{ fontSize: 12, color: 'var(--gw-sub)', textAlign: 'center', marginTop: 20 }}>
              Have an org code?{' '}
              <span style={{ color: 'var(--gw-navy)', textDecoration: 'underline', cursor: 'pointer' }} onClick={() => navigate('/enter')}>
                Enter it instead
              </span>
            </div>

            <div style={{ fontSize: 12, color: 'var(--gw-sub)', textAlign: 'center', marginTop: 10 }}>
              Opening a ground for your team?{' '}
              <span style={{ color: 'var(--gw-navy)', textDecoration: 'underline', cursor: 'pointer' }} onClick={() => navigate('/auth')}>
                Set up as admin
              </span>
            </div>
          </>
        ) : (
          <>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--gw-blue-bg)', border: '0.5px solid var(--gw-blue-b)', borderRadius: 20, padding: '4px 12px', fontSize: 11, fontWeight: 600, color: 'var(--gw-navy)', marginBottom: 20, letterSpacing: '.02em' }}>
              Founder / Admin
            </div>

            <div className="gw-ttl">Set up your org</div>
            <div className="gw-sub-t">We will send you a secure link to get started.</div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 0 }}>
              <div className="gw-fld" style={{ margin: 0 }}>
                <label className="gw-label">First name</label>
                <input
                  className="gw-input"
                  type="text"
                  placeholder="Amina"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="gw-fld" style={{ margin: 0 }}>
                <label className="gw-label">Last name</label>
                <input
                  className="gw-input"
                  type="text"
                  placeholder="Abdullahi"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                />
              </div>
            </div>

            <div className="gw-fld" style={{ marginTop: 10 }}>
              <label className="gw-label">Organisation name</label>
              <input
                className="gw-input"
                type="text"
                placeholder="e.g. CleanTex"
                value={orgName}
                onChange={e => setOrgName(e.target.value)}
              />
            </div>

            <div className="gw-fld">
              <label className="gw-label">Your email</label>
              <input
                className="gw-input"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submitFounder()}
              />
            </div>

            <button className="gw-btn" onClick={submitFounder} disabled={sendFounder.isPending}>
              {sendFounder.isPending ? 'Sending…' : 'Send link'}
            </button>
            {error && <div className="gw-er" style={{ marginTop: 8 }}>{error}</div>}

            <div style={{ fontSize: 11, color: 'var(--gw-sub)', textAlign: 'center', marginTop: 20, paddingTop: 16, borderTop: '0.5px solid var(--gw-border)', lineHeight: 1.6 }}>
              Your record belongs to you. We never share it without your explicit approval.
            </div>

            <div style={{ fontSize: 12, color: 'var(--gw-sub)', textAlign: 'center', marginTop: 12 }}>
              Team member?{' '}
              <span style={{ color: 'var(--gw-navy)', textDecoration: 'underline', cursor: 'pointer' }} onClick={() => navigate('/enter')}>
                Enter your org code instead
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
