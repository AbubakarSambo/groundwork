import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { joinApi } from '@/api/entry'
import { Arrival } from '@/components/gw/Arrival'
import { LinkProblem } from '@/components/gw/LinkProblem'
import { toast } from 'sonner'

type Phase = 'loading' | 'start' | 'sent' | 'error'

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
  const joinToken = params.get('t') ?? ''

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

  const [sentTo, setSentTo] = useState('')
  const [sentSays, setSentSays] = useState('')

  /**
   * ASKING TO JOIN, WHICH IS NOT THE SAME AS JOINING.
   *
   * This used to hand back a session and navigate straight into a check-in. What
   * it was really doing was signing the caller in as whoever the typed address
   * belonged to — a join link is shared with a whole cohort, so anybody with it
   * could type the admin's address. Now the address gets a link and the link does
   * the work.
   */
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
      setSentTo(res.to)
      setSentSays(res.says)
      setPhase('sent')
    } catch {
      toast.error('Could not send your link — nobody has been emailed and nothing was added. Try again.')
    } finally {
      setJoining(false)
    }
  }

  if (phase === 'loading') return <Shell><div style={{ textAlign: 'center', color: 'var(--gw-muted)', fontSize: 13 }}>Loading…</div></Shell>
  // Was a red tick, one sentence and nothing to press. W8-62.
  if (phase === 'error' || !ground) return <Shell><LinkProblem kind="join" /></Shell>

  if (phase === 'sent') return (
    <Shell>
      <h1 className="gw-ttl">Check your email</h1>
      {/* The same words whether or not that address has an account here — a
          different sentence for each would turn this form into a way of asking
          whether somebody is registered. */}
      <div className="gw-sub-t" style={{ marginTop: 10 }}>{sentSays}</div>
      <div style={{ marginTop: 18, fontSize: 13, color: 'var(--gw-muted)' }}>
        Sent to <strong>{sentTo}</strong>.
      </div>
      <button
        type="button"
        className="gw-btn-ghost"
        style={{ marginTop: 18 }}
        onClick={() => setPhase('start')}
      >
        Use a different address
      </button>
    </Shell>
  )

  return (
    <Shell>
      <h1 className="gw-ttl">{ground.initiatorName} invited your check-in</h1>
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

/**
 * The shared arrival chrome. This page had no header at all, so somebody joining a cohort met a
 * column of text with nothing above it while an invited participant met a header and a logo. Stage 4.
 */
function Shell({ children }: { children: React.ReactNode }) {
  return <Arrival wide>{children}</Arrival>
}
