import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { joinApi } from '@/api/entry'
import { useAuthStore } from '@/stores/auth'
import { toast } from 'sonner'

type Phase = 'loading' | 'start' | 'error'

/**
 * Broadcast join landing. ONE PATH: joining signs the person in against the
 * join link and lands them directly in the REAL conversation engine
 * (/checkin/:id), exactly like accepting an invite (#82/#83). The old inline
 * entry-pipeline chat + solo entry report are gone from this path - a cohort
 * member gets the full engine (probing, evidence, upload, the shared report).
 * Sign-in is required (an email): the real engine needs an owned check-in, so
 * there is no longer an anonymous join.
 */
export function JoinPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const joinToken = params.get('t') ?? ''
  const setAuth = useAuthStore(s => s.setAuth)

  const [phase, setPhase] = useState<Phase>('loading')
  const [ground, setGround] = useState<{ groundId: string; groundLabel: string; scenario: string; initiatorName: string } | null>(null)

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('')
  const [joining, setJoining] = useState(false)

  useEffect(() => {
    if (!joinToken) { setPhase('error'); return }
    joinApi.preview(joinToken)
      .then(g => { setGround(g); setPhase('start') })
      .catch(() => setPhase('error'))
  }, [joinToken])

  async function join() {
    if (!email.trim().includes('@') || joining) return
    setJoining(true)
    try {
      const res = await joinApi.accept({
        joinToken,
        email: email.trim(),
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
        roleAsDescribed: role.trim() || undefined,
      })
      setAuth(
        { id: res.userId, email: email.trim(), firstName: firstName.trim() || email.split('@')[0], lastName: lastName.trim(), role: 'MEMBER', organizationId: '' },
        res.accessToken,
      )
      if (res.existingAccount) toast.info(`Welcome back - continuing as ${email.trim()}`)
      navigate(`/checkin/${res.checkInId}`, {
        state: { groundId: res.groundId, sessionNumber: 1, groundLabel: ground?.groundLabel },
        replace: true,
      })
    } catch {
      toast.error('Could not start your session. Please try again.')
      setJoining(false)
    }
  }

  if (phase === 'loading') return <Shell><div style={{ textAlign: 'center', color: 'var(--gw-muted)', fontSize: 13 }}>Loading…</div></Shell>
  if (phase === 'error' || !ground) return <Shell><div style={{ textAlign: 'center' }}><div style={{ fontSize: 28, marginBottom: 12 }}>✕</div><div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Invalid link</div><div style={{ fontSize: 13, color: 'var(--gw-sub)' }}>This join link is invalid or has expired.</div></div></Shell>

  return (
    <Shell>
      <div className="gw-ttl">{ground.initiatorName} invited your check-in</div>
      <div className="gw-sub-t">A Groundwork session about: <strong>{ground.groundLabel}</strong>.</div>

      <div className="gw-box gw-box-blue" style={{ margin: '12px 0 16px' }}>
        Nobody ever reads what you write - not {ground.initiatorName}, not anyone. The shared report shows <strong>where accounts agree or differ</strong>, never your raw answers. Your account stays private.
      </div>

      <form onSubmit={e => { e.preventDefault(); join() }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8, marginBottom: 8 }}>
          <div className="gw-fld" style={{ margin: 0 }}><label className="gw-label">First name</label><input className="gw-input" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Optional" /></div>
          <div className="gw-fld" style={{ margin: 0 }}><label className="gw-label">Last name</label><input className="gw-input" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Optional" /></div>
        </div>
        <div className="gw-fld"><label className="gw-label">Email</label><input className="gw-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" /></div>
        <div className="gw-fld"><label className="gw-label">Your role <span style={{ fontWeight: 400, color: 'var(--gw-muted)' }}>(optional)</span></label><input className="gw-input" value={role} onChange={e => setRole(e.target.value)} placeholder="e.g. Engineering lead" /></div>
        <button className="gw-btn" type="submit" disabled={joining || !email.trim().includes('@')} style={{ marginTop: 8, opacity: (joining || !email.trim().includes('@')) ? 0.6 : 1 }}>
          {joining ? 'Setting up your session…' : 'Join and start my check-in →'}
        </button>
      </form>

      <div style={{ marginTop: 12, fontSize: 12, color: 'var(--gw-sub)', textAlign: 'center', lineHeight: 1.6 }}>
        This sets up your account so you can come back any time and see the shared report once everyone has checked in. We'll email you a link to set a password for returning later.
      </div>
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--gw-bg)', display: 'flex', flexDirection: 'column' }}>
      <div className="gw-bd" style={{ maxWidth: 480, margin: '0 auto', width: '100%', paddingTop: 40, paddingLeft: 16, paddingRight: 16, boxSizing: 'border-box' }}>
        {children}
      </div>
    </div>
  )
}
