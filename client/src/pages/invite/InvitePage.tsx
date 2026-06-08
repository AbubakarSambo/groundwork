import { useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { participantsApi } from '@/api'
import { useAuthStore } from '@/stores/auth'

export function InvitePage() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')

  const { data: preview, isLoading, isError } = useQuery({
    queryKey: ['invite', token],
    queryFn: () => participantsApi.preview(token),
    enabled: !!token,
    retry: false,
  })

  const accept = useMutation({
    mutationFn: () => participantsApi.accept(token, { firstName: firstName || undefined, lastName: lastName || undefined }),
    onSuccess: (res) => {
      setAuth(res.user, res.accessToken)
      navigate(res.checkInId ? `/checkin/${res.checkInId}` : `/grounds/${res.groundId}`)
    },
  })

  if (!token) return <InviteShell><ErrorCard msg="This invite link is missing its token." /></InviteShell>
  if (isLoading) return <InviteShell><LoadingCard /></InviteShell>
  if (isError || !preview) return <InviteShell><ErrorCard msg="This invite link is invalid or has already been used." /></InviteShell>

  if (preview.alreadyAccepted) {
    return (
      <InviteShell>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 28, marginBottom: 12 }}>👋</div>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>You've already joined</div>
          <div style={{ fontSize: 13, color: 'var(--gw-sub)', marginBottom: 20 }}>
            Sign in to continue your check-in for <strong>{preview.groundLabel}</strong>.
          </div>
          <button className="gw-btn" style={{ display: 'inline-block', width: 'auto', padding: '10px 20px' }} onClick={() => navigate('/login')}>
            Sign in →
          </button>
        </div>
      </InviteShell>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gw-bg)', display: 'flex', flexDirection: 'column' }}>
      <div className="gw-hdr">
        <div className="gw-logo">Groundwork</div>
      </div>

      <div className="gw-bd" style={{ maxWidth: 480, margin: '0 auto', width: '100%', paddingTop: 24 }}>
        <div className="gw-ttl">{preview.initiatorName} wants to hear your version</div>
        <div className="gw-sub-t">
          A Groundwork session about: <strong>{preview.groundLabel}</strong>.
        </div>

        {preview.roleAsDescribed && (
          <div style={{ fontSize: 13, color: 'var(--gw-sub)', marginBottom: 12 }}>
            Your role as described: <strong>{preview.roleAsDescribed}</strong>
          </div>
        )}

        <div className="gw-box gw-box-blue" style={{ marginBottom: 16 }}>
          Both sides check in separately and privately. Your version is yours —{' '}
          <strong>{preview.initiatorName} never sees what you write.</strong>{' '}
          A shared picture releases only after both of you complete two sessions.
        </div>

        <form onSubmit={(e) => { e.preventDefault(); accept.mutate() }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 4 }}>
            <div className="gw-fld" style={{ margin: 0 }}>
              <label className="gw-label">First name</label>
              <input className="gw-input" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Optional" />
            </div>
            <div className="gw-fld" style={{ margin: 0 }}>
              <label className="gw-label">Last name</label>
              <input className="gw-input" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Optional" />
            </div>
          </div>
          <button className="gw-btn" type="submit" style={{ marginTop: 12 }} disabled={accept.isPending}>
            {accept.isPending ? 'Joining…' : 'Add my version →'}
          </button>
        </form>

        <div style={{ marginTop: 14, fontSize: 12, color: 'var(--gw-muted)', textAlign: 'center' }}>
          By joining, you agree that your contribution record belongs to you.
        </div>
      </div>
    </div>
  )
}

function InviteShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--gw-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: 'white', border: '1px solid #E2E0DB', borderRadius: 8, padding: '40px 32px', maxWidth: 400, width: '100%' }}>
        {children}
      </div>
    </div>
  )
}

function ErrorCard({ msg }: { msg: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 28, marginBottom: 12 }}>✕</div>
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Invalid invite</div>
      <div style={{ fontSize: 13, color: 'var(--gw-sub)' }}>{msg}</div>
    </div>
  )
}

function LoadingCard() {
  return (
    <div style={{ textAlign: 'center', color: 'var(--gw-muted)', fontSize: 13 }}>Loading invite…</div>
  )
}
