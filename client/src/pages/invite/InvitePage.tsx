import { useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { participantsApi } from '@/api'
import { useAuthStore } from '@/stores/auth'
import { GroundworkLogo } from '@/components/gw/GroundworkLogo'
import { toast } from 'sonner'

/**
 * The participant invite landing. ONE PATH: accepting the invite signs the
 * participant in (the emailed invite link is the magic credential - accept()
 * verifies it server-side, links their account, and returns a session) and
 * lands them directly in the REAL check-in engine (/checkin/:id, ChatPage /
 * conversation.service) on the initiator's ground, session 1.
 *
 * The old inline entry-pipeline chat (participantApi.chat) and its solo
 * entry report (entryApi.report, the "not cross-referenced with any other
 * account yet" line) are deliberately GONE from this path - participants get
 * the full engine: intake context, versioned prompt, probing, doc upload
 * with assessment, record extraction, and the shared/forming report on their
 * ground page once everyone is in.
 */
export function InvitePage() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const qc = useQueryClient()

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
      if ((res as any).existingAccount) {
        toast.info(`Welcome back - continuing as ${res.user.email}`)
      }
      qc.invalidateQueries({ queryKey: ['grounds'] })
      // Seamless handoff: straight into their session-1 check-in on the
      // initiator's ground (the check-in row already exists - accept()
      // returns it, it never creates a second one). Fall back to the ground
      // page only if no open check-in was found.
      const checkInId = (res as any).checkInId as string | null
      const groundId = (res as any).groundId as string
      if (checkInId) {
        navigate(`/checkin/${checkInId}`, {
          state: { groundId, sessionNumber: 1, groundLabel: preview?.groundLabel },
          replace: true,
        })
      } else {
        navigate(`/grounds/${groundId}/p`, { replace: true })
      }
    },
    onError: () => {
      toast.error('Could not start your session. Please try again.')
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
          <button className="gw-btn" style={{ display: 'inline-block', width: 'auto', padding: '10px 20px' }} onClick={() => navigate('/grounds')}>
            Sign in to continue →
          </button>
        </div>
      </InviteShell>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gw-bg)', display: 'flex', flexDirection: 'column' }}>
      <div className="gw-hdr">
        <a href="https://myground.work" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex' }}><GroundworkLogo /></a>
      </div>

      <div className="gw-bd" style={{ maxWidth: 480, margin: '0 auto', width: '100%', paddingTop: 24, paddingLeft: 16, paddingRight: 16, boxSizing: 'border-box' }}>
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
          Nobody ever reads what you write - not {preview.initiatorName}, not anyone.{' '}
          The shared report shows <strong>where your account and theirs agree or differ</strong>. It does not quote you.
          Your account stays private. Always.
        </div>

        <form onSubmit={(e) => { e.preventDefault(); if (!accept.isPending) accept.mutate() }}>
          <div style={{ fontSize: 12, color: 'var(--gw-muted)', marginBottom: 8, lineHeight: 1.5 }}>
            Your name is optional - the other party will see it on the shared report if you add it.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8, marginBottom: 4 }}>
            <div className="gw-fld" style={{ margin: 0 }}>
              <label className="gw-label">First name</label>
              <input className="gw-input" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Optional" />
            </div>
            <div className="gw-fld" style={{ margin: 0 }}>
              <label className="gw-label">Last name</label>
              <input className="gw-input" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Optional" />
            </div>
          </div>
          <button className="gw-btn" type="submit" disabled={accept.isPending} style={{ marginTop: 12, opacity: accept.isPending ? 0.7 : 1 }}>
            {accept.isPending ? 'Setting up your session…' : 'Add my version →'}
          </button>
        </form>

        <div style={{ marginTop: 12, fontSize: 12, color: 'var(--gw-sub)', textAlign: 'center', lineHeight: 1.6 }}>
          This also sets up your account, so you can come back any time to add to
          your record - and see the shared report once everyone has checked in.
          We'll email you a link for returning later.
        </div>

        <div style={{ marginTop: 10, fontSize: 12, color: 'var(--gw-muted)', textAlign: 'center' }}>
          By joining, you agree that your contribution record belongs to you.
        </div>

        <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid #E2E0DB', textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: 'var(--gw-sub)', marginBottom: 8, lineHeight: 1.6 }}>
            You are never obligated to take part. If you would rather not, you can simply close this -
            nothing is shared, and declining is never shown as a negative.
          </div>
          <button
            className="gw-back"
            style={{ width: 'auto', padding: '6px 14px', fontSize: 12 }}
            onClick={() => navigate('/')}
          >
            Not right now
          </button>
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
