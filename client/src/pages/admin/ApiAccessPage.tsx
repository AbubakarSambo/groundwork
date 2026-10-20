import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi, type ApiAccessRequest } from '@/api/admin'
import { whenItWas } from '@/lib/a-date-reads-the-same-everywhere'

/** "1 writes" was read daily by staff. */
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

/**
 * WHO HAS ASKED TO CONNECT, AND WHAT WE DECIDED.
 *
 * One request per organisation covers everything a machine can reach: the API, the panel on their
 * own pages, and a WhatsApp number of theirs. Somebody says what they intend to build, and somebody
 * here reads it and decides. Our own organisation is on this list like anybody else's.
 *
 * 10 Sep 2026, Hafsah on the first version: "this page is unclear and has no exit". So: a way back
 * at the top, the decision buttons say what they do, the why-box appears only for the decisions
 * that need one, and the decided pile is folded away under a count.
 */

const SAID: Record<ApiAccessRequest['status'], string> = {
  PENDING: 'waiting on us',
  APPROVED: 'connected',
  DECLINED: 'declined',
  WITHDRAWN: 'withdrawn',
}

function Row({ request }: { request: ApiAccessRequest }) {
  const qc = useQueryClient()
  const [note, setNote] = useState('')
  const [asking, setAsking] = useState<null | 'DECLINED' | 'WITHDRAWN'>(null)
  const [error, setError] = useState<string | null>(null)

  const clearFlag = useMutation({
    mutationFn: (flagId: string) => adminApi.clearApiFlag(flagId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'api-access'] }),
  })

  const decide = useMutation({
    mutationFn: (status: ApiAccessRequest['status']) =>
      adminApi.decideApiAccess(request.id, status, note || undefined),
    onSuccess: () => {
      setError(null)
      setNote('')
      setAsking(null)
      qc.invalidateQueries({ queryKey: ['admin', 'api-access'] })
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      setError(e?.response?.data?.message ?? 'That could not be recorded.'),
  })

  const small = { fontSize: 12.5, color: 'var(--gw-sub)' } as const

  return (
    <div style={{ border: '1px solid var(--gw-border)', borderRadius: 8, padding: 16, marginBottom: 12, background: 'var(--gw-card)' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'baseline' }}>
        <strong style={{ fontSize: 15 }}>{request.organization.name}</strong>
        <span style={small}>{SAID[request.status]}</span>
        <span style={small}>asked by {request.requestedBy} on {whenItWas(request.requestedAt, 'day')}</span>
      </div>

      {/* WHAT THEY SAID THEY WOULD BUILD, which is the whole basis for the decision. In full. */}
      <p style={{ fontSize: 14, margin: '10px 0 0', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{request.whatFor}</p>

      {(request.lastDay || request.flags.length > 0) && (
        <div style={{ marginTop: 10, fontSize: 12.5, lineHeight: 1.55 }}>
          {request.lastDay && (
            <div style={small}>Last 24 hours: {plural(request.lastDay.calls, 'call')}, {plural(request.lastDay.reads, 'read')}, {plural(request.lastDay.writes, 'write')}.</div>
          )}
          {request.flags.map((f) => (
            <div key={f.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginTop: 6, padding: '8px 10px', background: 'var(--gw-amber-bg)', border: '1px solid var(--gw-amber-bd)', borderRadius: 6 }}>
              <div style={{ flex: 1, color: 'var(--gw-amber-t)' }}>
                <strong>{f.kind.replace(/-/g, ' ')}</strong> · {whenItWas(f.raisedAt, 'dayAndTime')}
                <div style={{ color: 'var(--gw-text)' }}>{f.detail}</div>
              </div>
              <button type="button" onClick={() => clearFlag.mutate(f.id)} disabled={clearFlag.isPending} className="gwui-btn gwui-btn-secondary gwui-btn-small">Looked at</button>
            </div>
          ))}
        </div>
      )}

      <div style={{ ...small, marginTop: 8 }}>
        {request.acceptedTermsAt
          ? `Terms ${request.termsVersion} accepted ${whenItWas(request.acceptedTermsAt, 'day')}.${request.termsOutOfDate ? ' - terms have changed since.' : ''}`
          : 'Asked before the terms existed; no version accepted.'}
        {request.decidedAt && (
          <> {SAID[request.status]} by {request.decidedBy ?? 'somebody'} on {whenItWas(request.decidedAt, 'day')}{request.note ? ` - ${request.note}` : ''}.</>
        )}
      </div>

      <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        {request.status === 'PENDING' && !asking && (
          <>
            <button type="button" className="gwui-btn gwui-btn-primary gwui-btn-small" onClick={() => decide.mutate('APPROVED')} disabled={decide.isPending}>Let them in</button>
            <button type="button" className="gwui-btn gwui-btn-secondary gwui-btn-small" onClick={() => setAsking('DECLINED')}>Decline</button>
          </>
        )}
        {(request.status === 'DECLINED' || request.status === 'WITHDRAWN') && !asking && (
          <button type="button" className="gwui-btn gwui-btn-primary gwui-btn-small" onClick={() => decide.mutate('APPROVED')} disabled={decide.isPending}>Let them in</button>
        )}
        {request.status === 'APPROVED' && !asking && (
          <button type="button" className="gwui-btn gwui-btn-secondary gwui-btn-small" onClick={() => setAsking('WITHDRAWN')}>Withdraw access</button>
        )}
        {asking && (
          <>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={asking === 'DECLINED' ? 'Why it is declined. They will read this.' : 'Why it is withdrawn. They will read this.'}
              aria-label="Why"
              autoFocus
              style={{ flex: '1 1 260px', padding: '7px 10px', fontSize: 13, borderRadius: 6, border: '1px solid var(--gw-border)', fontFamily: 'inherit' }}
            />
            <button type="button" className="gwui-btn gwui-btn-primary gwui-btn-small" onClick={() => decide.mutate(asking)} disabled={decide.isPending || !note.trim()}>
              {asking === 'DECLINED' ? 'Decline' : 'Withdraw'}
            </button>
            <button type="button" className="gwui-btn gwui-btn-secondary gwui-btn-small" onClick={() => { setAsking(null); setNote('') }}>Cancel</button>
          </>
        )}
      </div>

      {error && <p style={{ fontSize: 12.5, color: 'var(--gw-red-t)', margin: '8px 0 0' }}>{error}</p>}
    </div>
  )
}

export function ApiAccessPage() {
  const navigate = useNavigate()
  const [showDecided, setShowDecided] = useState(false)
  const requests = useQuery({ queryKey: ['admin', 'api-access'], queryFn: adminApi.getApiAccessRequests, retry: false })

  const waiting = (requests.data ?? []).filter((r) => r.status === 'PENDING')
  const decided = (requests.data ?? []).filter((r) => r.status !== 'PENDING')
  const connected = decided.filter((r) => r.status === 'APPROVED').length
  const flagged = decided.filter((r) => r.flags.length > 0)

  return (
    <section className="gw-page" style={{ maxWidth: 820, margin: '0 auto', padding: '24px 20px 80px' }}>
      <button
        type="button"
        onClick={() => navigate('/admin/dashboard')}
        style={{ fontSize: 12.5, color: 'var(--gw-muted)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}
      >
        ← Admin dashboard
      </button>
      <h1 style={{ fontSize: 24, margin: '10px 0 0' }}>Who has asked to connect</h1>
      <p style={{ fontSize: 14, color: 'var(--gw-sub)', lineHeight: 1.6, marginTop: 8 }}>
        One request per organisation covers the API, the panel on their own pages and a WhatsApp number
        of theirs. They said what they intend to build and accepted the terms; you read it and let
        them in or say why not. Every machine call they make afterwards is counted and watched here.
      </p>

      <h2 style={{ fontSize: 15, marginTop: 28 }}>Waiting on you{waiting.length ? ` (${waiting.length})` : ''}</h2>
      {requests.isLoading && <p style={{ fontSize: 14, color: 'var(--gw-sub)' }}>Reading…</p>}
      {!requests.isLoading && waiting.length === 0 && <p style={{ fontSize: 14, color: 'var(--gw-sub)' }}>Nobody is waiting.</p>}
      {waiting.map((r) => <Row key={r.id} request={r} />)}

      {flagged.length > 0 && (
        <>
          <h2 style={{ fontSize: 15, marginTop: 28 }}>Worth a look ({flagged.length})</h2>
          {flagged.map((r) => <Row key={r.id} request={r} />)}
        </>
      )}

      <h2 style={{ fontSize: 15, marginTop: 28, display: 'flex', alignItems: 'baseline', gap: 12 }}>
        <span>Decided</span>
        <button
          type="button"
          onClick={() => setShowDecided((s) => !s)}
          style={{ fontSize: 12.5, fontWeight: 400, color: 'var(--gw-navy)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}
        >
          {showDecided ? 'Hide' : `Show ${decided.length} (${connected} connected)`}
        </button>
      </h2>
      {showDecided && decided.filter((r) => r.flags.length === 0).map((r) => <Row key={r.id} request={r} />)}
    </section>
  )
}
