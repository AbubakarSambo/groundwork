import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi, type ApiAccessRequest } from '@/api/admin'

/**
 * WHO HAS ASKED FOR THE API, AND WHAT WE DECIDED.
 *
 * Access stopped being something an organisation buys and became something
 * somebody here reads and grants. A subscription opened this door until it
 * turned out we could not use our own API in our own back office without
 * paying ourselves — and that is the acceptance test for the product.
 *
 * OUR OWN ORGANISATION IS ON THIS LIST. Not as a special case at the top: a
 * rule we are exempt from is a rule we stop noticing is broken, and this one
 * guards the thing we most need to keep working.
 */

const SAID: Record<ApiAccessRequest['status'], string> = {
  PENDING: 'waiting on us',
  APPROVED: 'approved',
  DECLINED: 'declined',
  WITHDRAWN: 'withdrawn',
}

function Row({ request }: { request: ApiAccessRequest }) {
  const qc = useQueryClient()
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)

  const decide = useMutation({
    mutationFn: (status: ApiAccessRequest['status']) =>
      adminApi.decideApiAccess(request.id, status, note || undefined),
    onSuccess: () => {
      setError(null)
      setNote('')
      qc.invalidateQueries({ queryKey: ['admin', 'api-access'] })
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      setError(e?.response?.data?.message ?? 'That could not be recorded.'),
  })

  return (
    <div
      style={{
        border: '1px solid var(--gw-border)',
        borderRadius: 8,
        padding: 16,
        marginBottom: 12,
        background: 'var(--gw-card)',
      }}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'baseline' }}>
        <strong style={{ fontSize: 15 }}>{request.organization.name}</strong>
        <span style={{ fontSize: 12, color: 'var(--gw-sub)' }}>{SAID[request.status]}</span>
        <span style={{ fontSize: 12, color: 'var(--gw-sub)' }}>
          asked by {request.requestedBy} on {new Date(request.requestedAt).toLocaleDateString()}
        </span>
      </div>

      {/* WHAT THEY SAID THEY WOULD BUILD, which is the whole basis for the
          decision. Shown in full rather than truncated — a queue that hides the
          one thing you have to read is a queue that gets waved through. */}
      <p style={{ fontSize: 14, margin: '10px 0 0', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
        {request.whatFor}
      </p>

      {request.decidedAt && (
        <p style={{ fontSize: 12.5, color: 'var(--gw-sub)', margin: '8px 0 0', lineHeight: 1.55 }}>
          {SAID[request.status]} by {request.decidedBy ?? 'somebody'} on{' '}
          {new Date(request.decidedAt).toLocaleDateString()}
          {request.note ? ` — ${request.note}` : ''}
        </p>
      )}

      <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Why (required unless approving)"
          aria-label="Why"
          style={{
            flex: '1 1 260px',
            padding: '6px 8px',
            fontSize: 13,
            borderRadius: 6,
            border: '1px solid var(--gw-border)',
          }}
        />
        {request.status !== 'APPROVED' && (
          <button type="button" onClick={() => decide.mutate('APPROVED')} disabled={decide.isPending}>
            Approve
          </button>
        )}
        {request.status === 'PENDING' && (
          <button type="button" onClick={() => decide.mutate('DECLINED')} disabled={decide.isPending}>
            Decline
          </button>
        )}
        {request.status === 'APPROVED' && (
          <button type="button" onClick={() => decide.mutate('WITHDRAWN')} disabled={decide.isPending}>
            Withdraw
          </button>
        )}
      </div>

      {error && (
        <p style={{ fontSize: 12.5, color: 'var(--gw-red-t)', margin: '8px 0 0' }}>{error}</p>
      )}
    </div>
  )
}

export function ApiAccessPage() {
  const requests = useQuery({
    queryKey: ['admin', 'api-access'],
    queryFn: adminApi.getApiAccessRequests,
    retry: false,
  })

  const waiting = (requests.data ?? []).filter((r) => r.status === 'PENDING')
  const decided = (requests.data ?? []).filter((r) => r.status !== 'PENDING')

  return (
    <section className="gw-page" style={{ maxWidth: 820, margin: '0 auto', padding: '32px 20px 80px' }}>
      <h1 style={{ fontSize: 24, margin: 0 }}>API access</h1>
      <p style={{ fontSize: 14, color: 'var(--gw-sub)', lineHeight: 1.6, marginTop: 8 }}>
        Access to the integration API is asked for and granted, not bought. Somebody says what they
        intend to build, and somebody here reads it and decides.
      </p>

      <h2 style={{ fontSize: 15, marginTop: 28 }}>
        Waiting on us{waiting.length ? ` (${waiting.length})` : ''}
      </h2>
      {waiting.length === 0 && (
        <p style={{ fontSize: 14, color: 'var(--gw-sub)' }}>Nothing is waiting.</p>
      )}
      {waiting.map((r) => (
        <Row key={r.id} request={r} />
      ))}

      <h2 style={{ fontSize: 15, marginTop: 28 }}>Decided</h2>
      {decided.length === 0 && (
        <p style={{ fontSize: 14, color: 'var(--gw-sub)' }}>Nothing decided yet.</p>
      )}
      {decided.map((r) => (
        <Row key={r.id} request={r} />
      ))}
    </section>
  )
}
