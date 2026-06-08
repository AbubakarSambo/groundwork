import { useSearchParams, useNavigate } from 'react-router-dom'

export function BillingCallbackPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const ok = params.get('status') === 'success'

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gw-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: 'white', border: '1px solid #E2E0DB', borderRadius: 8, padding: '40px 32px', maxWidth: 420, width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: 28, marginBottom: 14 }}>{ok ? '✓' : '✕'}</div>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
          {ok ? 'Billing is set up' : 'Billing setup cancelled'}
        </div>
        <div style={{ fontSize: 13, color: 'var(--gw-sub)', marginBottom: 24, lineHeight: 1.6 }}>
          {ok
            ? 'Your care fee is active. You can now activate grounds — the report unlocks and both parties read it at the same time.'
            : 'No card was saved. You can set up billing again whenever you are ready to activate a ground.'}
        </div>
        {ok && (
          <div className="gw-box gw-box-green" style={{ marginBottom: 20, textAlign: 'left' }}>
            $20/mo care fee active. Each ground costs $50/person/month when active.
          </div>
        )}
        <button className="gw-btn" onClick={() => navigate('/')}>
          Back to your grounds
        </button>
      </div>
    </div>
  )
}
