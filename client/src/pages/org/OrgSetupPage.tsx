import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/stores/auth'
import { toast } from 'sonner'

const COMPANY_STAGE_OPTIONS: { value: string; label: string }[] = [
  { value: 'IDEA', label: 'Idea stage' },
  { value: 'PRE_REVENUE', label: 'Pre-revenue' },
  { value: 'EARLY_REVENUE', label: 'Early revenue' },
  { value: 'SCALING', label: 'Scaling' },
]

export function OrgSetupPage() {
  const navigate = useNavigate()
  const { user, updateUser } = useAuthStore()
  const org = user?.organization

  const [orgName, setOrgName] = useState(org?.name ?? user?.organizationName ?? '')
  const [orgEmail, setOrgEmail] = useState(org?.email ?? '')
  const [companyStage, setCompanyStage] = useState(org?.companyStage ?? '')

  const saveMut = useMutation({
    mutationFn: () => authApi.updateProfile({ orgName: orgName.trim(), orgEmail: orgEmail.trim(), companyStage }),
    onSuccess: (updated) => {
      updateUser(updated)
      toast.success('Organization details saved')
    },
    onError: () => toast.error('Could not save. Check the details and try again.'),
  })

  function handleSave() {
    if (!orgName.trim() || !orgEmail.includes('@') || !companyStage) return
    saveMut.mutate()
  }

  const needsBasics = !org?.email || !org?.companyStage
  const needsPlan = !needsBasics && !org?.subscriptionPlan

  if (!needsBasics && !needsPlan) {
    navigate('/grounds', { replace: true })
    return null
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', background: 'var(--gw-bg)' }}>
      <div style={{ width: '100%', maxWidth: 480 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--gw-navy)', marginBottom: 6, letterSpacing: '-.02em' }}>
          Set up your organization
        </h1>
        <p style={{ fontSize: 14, color: 'var(--gw-sub)', marginBottom: 28, lineHeight: 1.6 }}>
          A few details before your team can start check-ins.
        </p>

        {needsBasics ? (
          <div style={{ background: 'var(--gw-card)', border: '1px solid var(--gw-border)', borderRadius: 12, padding: '24px 22px' }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--gw-navy)', marginBottom: 6 }}>
              Organization name
            </label>
            <input
              type="text"
              value={orgName}
              onChange={e => setOrgName(e.target.value)}
              placeholder="Acme Inc."
              style={{
                width: '100%', padding: '10px 13px', fontSize: 14, border: '1px solid var(--gw-border)',
                borderRadius: 8, fontFamily: 'inherit', outline: 'none', background: 'white', marginBottom: 18,
                boxSizing: 'border-box',
              }}
            />

            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--gw-navy)', marginBottom: 6 }}>
              Organization contact email
            </label>
            <input
              type="email"
              value={orgEmail}
              onChange={e => setOrgEmail(e.target.value)}
              placeholder="hello@acme.com"
              style={{
                width: '100%', padding: '10px 13px', fontSize: 14, border: '1px solid var(--gw-border)',
                borderRadius: 8, fontFamily: 'inherit', outline: 'none', background: 'white', marginBottom: 18,
                boxSizing: 'border-box',
              }}
            />

            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--gw-navy)', marginBottom: 6 }}>
              Company stage
            </label>
            <select
              value={companyStage}
              onChange={e => setCompanyStage(e.target.value)}
              style={{
                width: '100%', padding: '10px 13px', fontSize: 14, border: '1px solid var(--gw-border)',
                borderRadius: 8, fontFamily: 'inherit', outline: 'none', background: 'white', marginBottom: 22,
                boxSizing: 'border-box',
              }}
            >
              <option value="" disabled>Select a stage…</option>
              {COMPANY_STAGE_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>

            <button
              onClick={handleSave}
              disabled={saveMut.isPending || !orgName.trim() || !orgEmail.includes('@') || !companyStage}
              style={{
                width: '100%', padding: '11px 20px', background: 'var(--gw-navy)', color: 'white', border: 'none',
                borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                opacity: saveMut.isPending || !orgName.trim() || !orgEmail.includes('@') || !companyStage ? 0.5 : 1,
              }}
            >
              {saveMut.isPending ? 'Saving…' : 'Continue'}
            </button>
          </div>
        ) : (
          <div style={{ background: 'var(--gw-blue-bg)', border: '1px solid var(--gw-blue-b)', borderRadius: 12, padding: '24px 22px' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--gw-navy)', marginBottom: 6 }}>
              Almost done
            </div>
            <div style={{ fontSize: 13, color: 'var(--gw-sub)', marginBottom: 18, lineHeight: 1.5 }}>
              Choose a plan to activate your organization.
            </div>
            <button
              onClick={() => navigate('/pricing')}
              style={{
                width: '100%', padding: '11px 20px', background: 'var(--gw-navy)', color: 'white', border: 'none',
                borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Choose a plan
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
