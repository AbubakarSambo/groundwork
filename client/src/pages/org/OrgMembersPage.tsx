import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/stores/auth'
import { toast } from 'sonner'

interface OrgMember {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  role: string
  isActive: boolean
  isEmailVerified: boolean
  createdAt: string
}

function fetchMembers(): Promise<{ data: OrgMember[]; meta: { total: number } }> {
  return apiClient.get('/users?limit=100').then(r => r.data)
}

export function OrgMembersPage() {
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const [inviteEmail, setInviteEmail] = useState('')
  const isAdmin = user?.role === 'ADMIN'

  const { data, isLoading } = useQuery({
    queryKey: ['org-members'],
    queryFn: fetchMembers,
    enabled: isAdmin,
  })

  const inviteMut = useMutation({
    mutationFn: (email: string) => authApi.teamInvite(email),
    onSuccess: () => {
      toast.success('Invite sent')
      setInviteEmail('')
      qc.invalidateQueries({ queryKey: ['org-members'] })
    },
    onError: () => toast.error('Could not send invite. Try again.'),
  })

  function handleInvite() {
    const email = inviteEmail.trim()
    if (!email.includes('@')) return
    inviteMut.mutate(email)
  }

  if (!isAdmin) {
    return (
      <div style={{ padding: '48px 32px', maxWidth: 560 }}>
        <div style={{ fontSize: 15, color: 'var(--gw-sub)' }}>You need admin access to manage team members.</div>
      </div>
    )
  }

  const members = data?.data ?? []

  return (
    <div style={{ padding: '40px 32px', maxWidth: 720 }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--gw-navy)', marginBottom: 6, letterSpacing: '-.02em' }}>
        Team members
      </h1>
      <p style={{ fontSize: 14, color: 'var(--gw-sub)', marginBottom: 32, lineHeight: 1.6 }}>
        Everyone with a Groundwork account in your organization. Invite colleagues to give them access.
      </p>

      {/* Invite form */}
      <div style={{ background: 'var(--gw-blue-bg, #EEF4FB)', border: '1px solid var(--gw-blue-b, #B5D4F4)', borderRadius: 12, padding: '20px 22px', marginBottom: 32 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--gw-navy)', marginBottom: 4 }}>Invite a team member</div>
        <div style={{ fontSize: 13, color: 'var(--gw-sub)', marginBottom: 14, lineHeight: 1.5 }}>
          They will receive an email with a link to set up their Groundwork account.
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            type="email"
            placeholder="colleague@company.com"
            value={inviteEmail}
            onChange={e => setInviteEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleInvite()}
            style={{
              flex: 1, padding: '10px 13px', fontSize: 14, border: '1px solid var(--gw-blue-b, #B5D4F4)',
              borderRadius: 8, fontFamily: 'inherit', outline: 'none', background: 'white',
            }}
          />
          <button
            onClick={handleInvite}
            disabled={inviteMut.isPending || !inviteEmail.includes('@')}
            style={{
              padding: '10px 20px', background: 'var(--gw-navy)', color: 'white', border: 'none',
              borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              opacity: inviteMut.isPending || !inviteEmail.includes('@') ? 0.5 : 1,
              whiteSpace: 'nowrap',
            }}
          >
            {inviteMut.isPending ? 'Sending…' : 'Send invite'}
          </button>
        </div>
      </div>

      {/* Members list */}
      {isLoading ? (
        <div style={{ color: 'var(--gw-sub)', fontSize: 14 }}>Loading…</div>
      ) : (
        <div style={{ border: '1px solid var(--gw-border)', borderRadius: 12, overflow: 'hidden' }}>
          {members.length === 0 ? (
            <div style={{ padding: '24px 20px', color: 'var(--gw-sub)', fontSize: 14 }}>No members yet.</div>
          ) : (
            members.map((m, i) => (
              <div
                key={m.id}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 18px', background: 'var(--gw-card)',
                  borderBottom: i < members.length - 1 ? '1px solid var(--gw-border)' : 'none',
                  gap: 12,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--gw-navy)', marginBottom: 2 }}>
                    {m.firstName || m.lastName ? `${m.firstName ?? ''} ${m.lastName ?? ''}`.trim() : m.email}
                  </div>
                  {(m.firstName || m.lastName) && (
                    <div style={{ fontSize: 12, color: 'var(--gw-sub)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.email}</div>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                  {!m.isEmailVerified && (
                    <span style={{ fontSize: 11, background: '#FDF3E3', color: '#8A5C1A', border: '1px solid #F5D9A0', borderRadius: 6, padding: '2px 7px', fontWeight: 600 }}>
                      Pending
                    </span>
                  )}
                  <span style={{
                    fontSize: 11, borderRadius: 6, padding: '2px 7px', fontWeight: 600,
                    background: m.role === 'ADMIN' ? 'var(--gw-blue-bg, #EEF4FB)' : 'var(--gw-bg)',
                    color: m.role === 'ADMIN' ? 'var(--gw-navy)' : 'var(--gw-sub)',
                    border: `1px solid ${m.role === 'ADMIN' ? 'var(--gw-blue-b, #B5D4F4)' : 'var(--gw-border)'}`,
                  }}>
                    {m.role === 'ADMIN' ? 'Admin' : 'Member'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {data?.meta.total != null && data.meta.total > members.length && (
        <div style={{ fontSize: 12, color: 'var(--gw-sub)', marginTop: 12, textAlign: 'center' }}>
          Showing {members.length} of {data.meta.total} members
        </div>
      )}
    </div>
  )
}
