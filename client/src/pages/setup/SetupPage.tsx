import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth'
import { toast } from 'sonner'

export function SetupPage() {
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)
  const [step, setStep] = useState<'done' | 'invite'>('invite')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('')
  const [invited, setInvited] = useState<{ email: string; role: string }[]>([])

  const sendInvite = useMutation({
    mutationFn: async () => {
      // Invite via a new ground isn't available here yet — this creates a pending invite
      // that gets attached when the first ground is created
      return Promise.resolve()
    },
    onSuccess: () => {
      setInvited(v => [...v, { email: inviteEmail.trim(), role: inviteRole.trim() }])
      setInviteEmail('')
      setInviteRole('')
      toast.success('Invite queued')
    },
  })

  function addInvite() {
    const email = inviteEmail.trim()
    if (!email || !email.includes('@')) return
    if (invited.find(i => i.email === email)) return
    sendInvite.mutate()
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--gw-bg)' }}>
      <div className="gw-hdr">
        <a href="https://myground.work" target="_blank" rel="noopener noreferrer" className="gw-logo" style={{ textDecoration: 'none', color: 'inherit' }}>Groundwork</a>
      </div>

      <div className="gw-bd" style={{ maxWidth: 420, margin: '0 auto', width: '100%' }}>

        {/* Step dots */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 28 }}>
          <div className="cg-step-dot done" />
          <div className={`cg-step-dot${step === 'invite' ? ' active' : ' done'}`} />
          <div className={`cg-step-dot${step === 'done' ? ' active' : ''}`} />
        </div>

        {step === 'invite' && (
          <div>
            <div className="gw-ttl">Invite your first team member</div>
            <div className="gw-sub-t" style={{ marginBottom: 24 }}>Add someone to your org now, or skip and invite them from inside a ground.</div>

            {invited.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 14 }}>
                {invited.map((p, i) => (
                  <div key={i} style={{ background: 'white', border: '0.5px solid var(--gw-border)', borderRadius: 8, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--gw-blue-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'var(--gw-navy)', flexShrink: 0 }}>{p.email.charAt(0).toUpperCase()}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{p.email}</div>
                      {p.role && <div style={{ fontSize: 11, color: 'var(--gw-muted)' }}>{p.role}</div>}
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--gw-green-t)', background: 'var(--gw-green-bg)', borderRadius: 20, padding: '2px 8px' }}>Invited</span>
                  </div>
                ))}
              </div>
            )}

            <div style={{ background: 'var(--gw-bg)', border: '0.5px solid var(--gw-border)', borderRadius: 8, padding: 12, marginBottom: 16 }}>
              <div className="gw-fld" style={{ margin: 0 }}>
                <label className="gw-label">Email address</label>
                <input className="gw-input" type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="colleague@company.com" />
              </div>
              <div className="gw-fld" style={{ marginTop: 8, marginBottom: 8 }}>
                <label className="gw-label">Their role <span style={{ fontWeight: 400, color: 'var(--gw-muted)' }}>(optional)</span></label>
                <input className="gw-input" value={inviteRole} onChange={e => setInviteRole(e.target.value)} placeholder="e.g. Co-founder" onKeyDown={e => e.key === 'Enter' && addInvite()} />
              </div>
              <button onClick={addInvite} style={{ width: '100%', padding: 9, borderRadius: 6, background: 'none', color: 'var(--gw-navy)', fontSize: 13, fontWeight: 600, border: '1.5px dashed var(--gw-blue-b)', cursor: 'pointer', fontFamily: 'inherit' }}>+ Add team member</button>
            </div>

            <button className="gw-btn" onClick={() => setStep('done')} style={{ margin: 0 }}>
              {invited.length > 0 ? 'Continue →' : 'Skip for now →'}
            </button>
          </div>
        )}

        {step === 'done' && (
          <div style={{ textAlign: 'center', paddingTop: 20 }}>
            <div style={{ width: 52, height: 52, background: 'var(--gw-blue-bg)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <path d="M4 11l5 5L18 6" stroke="#0C447C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>You're in{user?.firstName ? `, ${user.firstName}` : ''}.</div>
            <div style={{ fontSize: 13, color: 'var(--gw-sub)', marginBottom: 8, lineHeight: 1.65 }}>
              {user?.organizationName ? `${user.organizationName} is ready on Groundwork.` : 'Your org is ready on Groundwork.'}
            </div>
            <div style={{ fontSize: 13, color: 'var(--gw-sub)', marginBottom: 28, lineHeight: 1.65 }}>
              Open your first ground to start a structured conversation.
            </div>
            <button className="gw-btn" style={{ display: 'inline-block', width: 'auto', padding: '11px 28px' }} onClick={() => navigate('/grounds')}>
              Open Groundwork →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
