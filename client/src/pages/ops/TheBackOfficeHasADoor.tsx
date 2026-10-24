import { useEffect, useState, type JSX } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth'
import { backOfficeApi } from '@/api/backOffice'

/**
 * THE BACK OFFICE HAS A DOOR. Signing in opens the product; /ops and /admin also want a code sent
 * to the signed-in email, once a week. A Google session walks through, because Google already asked
 * the second question. The server decides (the guard returns 403 with BACK_OFFICE_CODE_REQUIRED for
 * anything behind the door); this only asks where the session stands and draws the door when it is
 * shut. Both back offices, and the panel embedded in them, sit behind this one component.
 */
export function RequireBackOffice({ children }: { children: JSX.Element }) {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const door = useQuery({ queryKey: ['back-office', 'door'], queryFn: backOfficeApi.status, enabled: isAuthenticated, retry: false, staleTime: 60_000 })

  if (!isAuthenticated) {
    const dest = window.location.pathname + window.location.search
    return <Navigate to={`/auth?next=${encodeURIComponent(dest)}`} replace />
  }
  if (door.isLoading) return null
  if (door.data?.open) return children
  if (door.data && !door.data.staff) return <NotStaff />
  return <TheDoor />
}

/** The same refusal the platform console gives: no door, no code, nothing to try. */
function NotStaff() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--gw-paper-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ textAlign: 'center', maxWidth: 380 }}>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, letterSpacing: '-.01em', color: 'var(--gw-text)' }}>This part is for Groundwork staff</div>
        <div style={{ fontSize: 13, color: 'var(--gw-sub)', lineHeight: 1.65, marginBottom: 18 }}>
          It is not part of your organisation's admin, and there is nothing here that affects your check-ins.
        </div>
        <Link className="btn pri" to="/grounds" >Go to my check-ins</Link>
      </div>
    </div>
  )
}

function TheDoor() {
  const qc = useQueryClient()
  const email = useAuthStore(s => s.user?.email)
  const [code, setCode] = useState('')
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [problem, setProblem] = useState<string | null>(null)

  const send = useMutation({
    mutationFn: backOfficeApi.sendCode,
    onSuccess: r => { setSentTo(r.to); setProblem(null) },
    onError: (e: any) => setProblem(e?.response?.data?.message ?? 'The code could not be sent.'),
  })
  const verify = useMutation({
    mutationFn: () => backOfficeApi.verify(code),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['back-office', 'door'] }),
    onError: (e: any) => setProblem(e?.response?.data?.message ?? 'That is not the code we sent.'),
  })

  /* The code goes the moment the door is drawn: the person came here to get in, not to press Send. */
  useEffect(() => { send.mutate() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gw-paper-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <form
        onSubmit={e => { e.preventDefault(); if (code.trim().length === 6) verify.mutate() }}
        style={{ width: '100%', maxWidth: 380, background: 'var(--gw-card)', border: '1px solid var(--gw-border)', borderRadius: 12, padding: '26px 26px 22px' }}
      >
        <div style={{ fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--gw-muted)', fontWeight: 700 }}>Back office</div>
        <h1 style={{ fontSize: 20, margin: '6px 0 8px', letterSpacing: '-.01em', color: 'var(--gw-text)' }}>A code has gone to your email</h1>
        <p style={{ fontSize: 13.5, color: 'var(--gw-sub)', lineHeight: 1.6, margin: 0 }}>
          {sentTo ? <>Sent to <strong style={{ color: 'var(--gw-text)' }}>{sentTo}</strong>.</> : send.isPending ? 'Sending…' : `To ${email ?? 'your address'}.`}{' '}
          Enter it once and the back office stays open on this account for a week. Signing in with Google skips this.
        </p>
        <input
          value={code}
          onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          placeholder="6-digit code"
          aria-label="The code from your email"
          style={{ marginTop: 16, width: '100%', boxSizing: 'border-box', padding: '11px 12px', fontSize: 20, letterSpacing: '.25em', textAlign: 'center', borderRadius: 8, border: '1px solid var(--gw-border)', fontFamily: 'inherit', background: 'white' }}
        />
        {problem && <div style={{ fontSize: 12.5, color: 'var(--gw-red-t)', marginTop: 8 }}>{problem}</div>}
        <div style={{ display: 'flex', gap: 8, marginTop: 14, alignItems: 'center' }}>
          <button className="btn pri"
            type="submit"
            disabled={verify.isPending || code.length !== 6}
          >
            {verify.isPending ? 'Checking…' : 'Open'}
          </button>
          <button
            type="button"
            onClick={() => send.mutate()}
            disabled={send.isPending}
            style={{ fontSize: 12.5, color: 'var(--gw-sub)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}
          >
            Send it again
          </button>
          <Link to="/grounds" style={{ marginLeft: 'auto', fontSize: 12.5, color: 'var(--gw-sub)', textDecoration: 'none', whiteSpace: 'nowrap' }}>← Groundwork</Link>
        </div>
      </form>
    </div>
  )
}
