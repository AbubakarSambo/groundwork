import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/stores/auth'
import { toast } from 'sonner'

export function OrgSetupPage() {
  const navigate = useNavigate()
  const { user, updateUser } = useAuthStore()
  const org = user?.organization

  const [orgName, setOrgName] = useState(org?.name ?? user?.organizationName ?? '')
  const [orgEmail, setOrgEmail] = useState(org?.email ?? '')

  const saveMut = useMutation({
    mutationFn: () => authApi.updateProfile({ orgName: orgName.trim(), orgEmail: orgEmail.trim() }),
    onSuccess: (updated) => {
      updateUser(updated)
      toast.success('Organization details saved')
      navigate('/grounds', { replace: true })
    },
    onError: () => toast.error('Could not save. Check the details and try again.'),
  })

  function handleSave() {
    if (!orgName.trim() || !orgEmail.includes('@')) return
    saveMut.mutate()
  }

  if (org?.email) {
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
              borderRadius: 8, fontFamily: 'inherit', outline: 'none', background: 'white', marginBottom: 22,
              boxSizing: 'border-box',
            }}
          />

          <button
            onClick={handleSave}
            disabled={saveMut.isPending || !orgName.trim() || !orgEmail.includes('@')}
            style={{
              width: '100%', padding: '11px 20px', background: 'var(--gw-navy)', color: 'white', border: 'none',
              borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              opacity: saveMut.isPending || !orgName.trim() || !orgEmail.includes('@') ? 0.5 : 1,
            }}
          >
            {saveMut.isPending ? 'Saving…' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  )
}
