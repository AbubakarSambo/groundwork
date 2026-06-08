import { useNavigate } from 'react-router-dom'

export function LandingPage() {
  const navigate = useNavigate()

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', minHeight: '100vh', background: '#fff' }}>
      <main style={{ maxWidth: 720, margin: '0 auto', padding: '80px 24px' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 700, lineHeight: 1.2, margin: 0 }}>
          Most people's best work never makes it into any record.
        </h1>
        <p style={{ fontSize: '1.25rem', color: '#475569', marginTop: 16, lineHeight: 1.6 }}>
          Groundwork is where that changes. Build an honest, two-sided record of a working relationship — before the hard conversation, not after.
        </p>
        <p style={{ marginTop: 32 }}>
          <button
            onClick={() => navigate('/register')}
            style={{ background: '#1d4ed8', color: '#fff', padding: '12px 24px', borderRadius: 8, border: 'none', fontSize: '1rem', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Open your first ground — free
          </button>
        </p>
      </main>
    </div>
  )
}
