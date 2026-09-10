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
  /* Optional, beside their part. Never inferred; blank means blank. */
  const [department, setDepartment] = useState('')
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
    if (!email.trim().includes('@') || !role.trim() || joining) return
    setJoining(true)
    try {
      const res = await joinApi.accept({
        joinToken,
        email: email.trim(),
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
        roleAsDescribed: role.trim(),
        department: department.trim() || undefined,
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
      {/* `gw-btn-ghost` is not defined anywhere, so this rendered as a raw browser button on a page
          somebody reaches from a broadcast link - the first Groundwork screen they ever see. Same
          silent typo as the fields on the set-up wizard. */}
      <button
        type="button"
        className="gw-btn-sm"
        style={{ marginTop: 18 }}
        onClick={() => setPhase('start')}
      >
        Use a different address
      </button>
    </Shell>
  )

  return (
    <Shell>
      {/* "invited your check-in" is not a sentence. It is an invitation to a person, so say that. */}
      <h1 className="gw-ttl">{ground.initiatorName} has asked for your side of this</h1>
      <div className="gw-sub-t">A Groundwork session about: <strong>{ground.groundLabel}</strong>.</div>

      {/* The same false promise as InvitePage carried, kept in step with it deliberately: these are
          the two doors an invited person can arrive through and they must say the same true thing. */}
      <div className="gw-box gw-box-blue" style={{ margin: '12px 0 16px' }}>
        What you write is used to build the shared report and nothing else. It shows{' '}
        <strong>where people agree and where they differ</strong>. Your own words about your own
        work can appear in it. Anything you say about somebody else never does, and it never says
        who said what about whom.
      </div>

      <form onSubmit={e => { e.preventDefault(); join() }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8, marginBottom: 8 }}>
          <div className="gw-fld" style={{ margin: 0 }}><label className="gw-label" htmlFor="join-first">First name</label><input id="join-first" className="gw-input" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Optional" /></div>
          <div className="gw-fld" style={{ margin: 0 }}><label className="gw-label" htmlFor="join-last">Last name</label><input id="join-last" className="gw-input" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Optional" /></div>
        </div>
        <div className="gw-fld"><label className="gw-label" htmlFor="join-email">Email</label><input id="join-email" className="gw-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" /></div>
        {/*
          ONE LINE ON THEIR PART IN THIS, AND IT IS NOT OPTIONAL ANY MORE.
          205 of 223 people skipped it while it said "(optional)", and that one line is what the
          questions get shaped by: the role map, the coaching read and the lead's probe list all key
          on it. No asterisk; the copy says why it is asked and the button waits for it.
        */}
        <div className="gw-fld">
          <label className="gw-label" htmlFor="join-role">Your part in this</label>
          <input id="join-role" className="gw-input" value={role} onChange={e => setRole(e.target.value)} placeholder="e.g. I run the clinic that St Mary's refers into" />
          <div style={{ fontSize: 12, color: 'var(--gw-sub)', marginTop: 5, lineHeight: 1.5 }}>One line on what you do here. The questions you get asked are shaped by it.</div>
        </div>
        <div className="gw-fld"><label className="gw-label" htmlFor="join-department">Department</label><input id="join-department" className="gw-input" value={department} onChange={e => setDepartment(e.target.value)} placeholder="Optional" /></div>
        <button className="gw-btn" type="submit" disabled={joining || !email.trim().includes('@') || !role.trim()} style={{ marginTop: 8, opacity: (joining || !email.trim().includes('@') || !role.trim()) ? 0.6 : 1 }}>
          {joining ? 'Setting up your session…' : 'Join and start my check-in →'}
        </button>
      </form>

      <div style={{ marginTop: 12, fontSize: 12, color: 'var(--gw-sub)', textAlign: 'center', lineHeight: 1.6 }}>
        This saves your place so you can come back any time and see the shared report once everyone has checked in. We'll email you a link to set a password for returning later.
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
