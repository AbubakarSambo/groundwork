import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth'
import { authApi } from '@/api/auth'
import { toast } from 'sonner'

const MARKETING_URL = import.meta.env.VITE_MARKETING_URL ?? 'https://myground.work'

type Step = 1 | 2 | 3

interface Invitee { firstName: string; lastName: string; email: string; role: string }

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 20)
}

export function SetupPage() {
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)
  const updateUser = useAuthStore(s => s.updateUser)

  const [step, setStep] = useState<Step>(1)

  // Step 1 fields
  const [fullName, setFullName] = useState(`${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim())
  const [orgName, setOrgName] = useState(user?.organizationName ?? '')
  const [orgCode, setOrgCode] = useState('')
  const [orgCodeEdited, setOrgCodeEdited] = useState(false)
  const [role, setRole] = useState(user?.jobTitle ?? '')
  const [step1Error, setStep1Error] = useState('')

  // Step 2 fields
  const [inviteName, setInviteName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('')
  const [inviteList, setInviteList] = useState<Invitee[]>([])
  const [step2Error, setStep2Error] = useState('')

  const updateProfile = useMutation({
    mutationFn: () => {
      const parts = fullName.trim().split(/\s+/)
      return authApi.updateProfile({
        firstName: parts[0] ?? '',
        lastName: parts.slice(1).join(' '),
        jobTitle: role,
        orgName,
        orgSlug: orgCode,
      })
    },
    onSuccess: (updated) => {
      updateUser(updated)
      setStep(2)
    },
    onError: (e: any) => {
      setStep1Error(e?.response?.data?.message ?? 'Could not save org details.')
    },
  })

  const inviteUser = useMutation({
    mutationFn: (invitee: Invitee) => authApi.inviteUser({
      firstName: invitee.firstName,
      lastName: invitee.lastName,
      email: invitee.email,
    }),
  })

  function handleOrgNameChange(val: string) {
    setOrgName(val)
    if (!orgCodeEdited) setOrgCode(slugify(val))
  }

  function handleStep1() {
    setStep1Error('')
    if (!fullName.trim()) { setStep1Error('Enter your name.'); return }
    if (!orgName.trim()) { setStep1Error('Enter your organisation name.'); return }
    if (!orgCode.trim()) { setStep1Error('Enter an org code.'); return }
    updateProfile.mutate()
  }

  function addInvitee() {
    const email = inviteEmail.trim()
    const name = inviteName.trim()
    if (!email || !email.includes('@')) { setStep2Error('Enter a valid email.'); return }
    if (!name) { setStep2Error('Enter a name.'); return }
    if (inviteList.find(i => i.email === email)) { setStep2Error('Already added.'); return }
    const parts = name.split(' ')
    setInviteList(v => [...v, { firstName: parts[0] ?? name, lastName: parts.slice(1).join(' '), email, role: inviteRole.trim() }])
    setInviteName('')
    setInviteEmail('')
    setInviteRole('')
    setStep2Error('')
  }

  async function handleStep2(skip = false) {
    setStep2Error('')
    if (!skip && inviteList.length > 0) {
      const results = await Promise.allSettled(inviteList.map(i => inviteUser.mutateAsync(i)))
      const failed = results.filter(r => r.status === 'rejected').length
      if (failed > 0) toast.error(`${failed} invite(s) failed. You can retry from inside a ground.`)
      else toast.success('Invites sent!')
    }
    setStep(3)
  }

  const stepDot = (n: Step) => {
    const cls = step > n ? 'done' : step === n ? 'active' : ''
    return <div className={`cg-step-dot${cls ? ' ' + cls : ''}`} />
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--gw-bg)' }}>
      <div className="gw-hdr">
        <a href={MARKETING_URL} className="gw-logo" style={{ textDecoration: 'none', color: 'inherit' }}>Groundwork</a>
        <div style={{ fontSize: 13, color: 'var(--gw-muted)', cursor: 'pointer' }} onClick={() => navigate('/auth')}>Sign out</div>
      </div>

      <div className="gw-bd" style={{ maxWidth: 460, margin: '0 auto', width: '100%' }}>
        <div className="gw-ttl">Set up your org</div>
        <div className="gw-sub-t" style={{ marginBottom: 6 }}>Groundwork runs structured check-ins across your team and surfaces alignment and gaps in a shared report. Set up your org to invite people and start your first session.</div>
        <div style={{ fontSize: 13, color: 'var(--gw-muted)', marginBottom: 24 }}>Takes two minutes. Your team gets invited automatically.</div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 28 }}>
          {stepDot(1)}
          {stepDot(2)}
          {stepDot(3)}
        </div>

        {/* STEP 1 */}
        {step === 1 && (
          <div>
            <div className="gw-fld">
              <label className="gw-label">Your name</label>
              <input className="gw-input" type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="e.g. Sarah Okonkwo" />
            </div>
            <div className="gw-fld">
              <label className="gw-label">Organisation name</label>
              <input className="gw-input" type="text" value={orgName} onChange={e => handleOrgNameChange(e.target.value)} placeholder="e.g. Acme Corp" />
            </div>
            <div className="gw-fld">
              <label className="gw-label">Org code <span style={{ fontWeight: 400, color: 'var(--gw-muted)' }}>(short, no spaces)</span></label>
              <input className="gw-input" type="text" value={orgCode} onChange={e => { setOrgCode(e.target.value.toLowerCase().replace(/\s/g, '')); setOrgCodeEdited(true) }} placeholder="e.g. acme" style={{ textTransform: 'lowercase' }} />
            </div>
            <div className="gw-fld">
              <label className="gw-label">Your role</label>
              <input className="gw-input" type="text" value={role} onChange={e => setRole(e.target.value)} placeholder="e.g. Founder / CEO" />
            </div>
            {step1Error && <div className="gw-er">{step1Error}</div>}
            <button className="gw-btn" onClick={handleStep1} disabled={updateProfile.isPending} style={{ margin: 0 }}>
              {updateProfile.isPending ? 'Saving…' : 'Continue →'}
            </button>
          </div>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <div>
            <div style={{ fontSize: 13, color: 'var(--gw-sub)', marginBottom: 16 }}>
              Invite your team. They will get a link to check in independently before the report is built.
            </div>

            {inviteList.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                {inviteList.map((p, i) => (
                  <div key={i} style={{ background: 'white', border: '0.5px solid var(--gw-border)', borderRadius: 8, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--gw-blue-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'var(--gw-navy)', flexShrink: 0 }}>
                      {p.email.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{p.firstName} {p.lastName}</div>
                      <div style={{ fontSize: 11, color: 'var(--gw-muted)' }}>{p.email}{p.role ? ` · ${p.role}` : ''}</div>
                    </div>
                    <button onClick={() => setInviteList(v => v.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gw-muted)', fontSize: 16, padding: 0 }}>×</button>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              <input className="gw-input" type="text" value={inviteName} onChange={e => setInviteName(e.target.value)} placeholder="Full name" style={{ flex: 1, minWidth: 120 }} />
              <input className="gw-input" type="email" value={inviteEmail}
                onChange={e => { setInviteEmail(e.target.value); if (step2Error === 'Enter a valid email.') setStep2Error('') }}
                placeholder="email@company.com" style={{ flex: 1, minWidth: 160 }}
                onKeyDown={e => e.key === 'Enter' && addInvitee()}
              />
              <input className="gw-input" type="text" value={inviteRole} onChange={e => setInviteRole(e.target.value)} placeholder="Role" style={{ flex: 1, minWidth: 100 }} />
              <button onClick={addInvitee} style={{ padding: '9px 14px', borderRadius: 6, background: 'var(--gw-slate)', color: 'var(--gw-text)', fontSize: 13, fontWeight: 600, border: '0.5px solid var(--gw-border)', cursor: 'pointer', fontFamily: 'inherit' }}>Add</button>
            </div>

            {step2Error && <div className="gw-er">{step2Error}</div>}

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setStep(1)} style={{ flex: '0 0 auto', padding: '11px 16px', borderRadius: 6, background: 'var(--gw-slate)', color: 'var(--gw-text)', fontSize: 13, fontWeight: 600, border: '0.5px solid var(--gw-border)', cursor: 'pointer', fontFamily: 'inherit' }}>← Back</button>
              <button className="gw-btn" onClick={() => handleStep2(false)} style={{ flex: 1, margin: 0 }}>Create org and invite team →</button>
            </div>
            <div style={{ fontSize: 12, color: 'var(--gw-sub)', textAlign: 'center', marginTop: 12, cursor: 'pointer' }} onClick={() => handleStep2(true)}>Skip inviting for now →</div>
          </div>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <div style={{ textAlign: 'center', paddingTop: 20 }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>✓</div>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Your org is ready</div>
            <div style={{ fontSize: 13, color: 'var(--gw-sub)', marginBottom: 24 }}>
              {inviteList.length > 0
                ? `${inviteList.length} team member${inviteList.length > 1 ? 's' : ''} invited. Open your first ground to start.`
                : 'Open your first ground to start a structured conversation.'}
            </div>
            <button className="gw-btn" style={{ display: 'inline-block', width: 'auto', padding: '11px 28px', margin: 0 }} onClick={() => navigate('/grounds')}>
              Open Groundwork →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
