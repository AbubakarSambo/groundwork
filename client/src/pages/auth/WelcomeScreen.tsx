import { useNavigate } from 'react-router-dom'
import { GroundworkLogo } from '@/components/gw/GroundworkLogo'

const PRIVACY_CARDS = [
  {
    title: 'What stays private',
    body: 'Your exact words never leave your session. Nobody else reads your check-in.',
  },
  {
    title: 'What gets shared',
    body: 'After both parties complete a session, a shared picture is created — showing patterns, not words.',
  },
  {
    title: 'What your founder sees',
    body: 'Pattern signals only. Never your specific answers.',
  },
]

export function WelcomeScreen() {
  const navigate = useNavigate()

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gw-bg)', display: 'flex', flexDirection: 'column' }}>
      <div className="gw-hdr">
        <GroundworkLogo />
      </div>

      <div className="gw-bd" style={{ maxWidth: 680, margin: '0 auto', width: '100%', paddingTop: 40 }}>
        <div className="gw-ttl" style={{ textAlign: 'center' }}>Welcome to Groundwork</div>
        <div className="gw-sub-t" style={{ textAlign: 'center', marginBottom: 32 }}>
          Before your first check-in, here is how your privacy is protected.
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 16,
            marginBottom: 40,
          }}
        >
          {PRIVACY_CARDS.map(card => (
            <div
              key={card.title}
              style={{
                background: '#fff',
                border: '1px solid #E2E0DB',
                borderRadius: 12,
                padding: '20px 18px',
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: 'var(--gw-txt, #1A1A1A)',
                  marginBottom: 8,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                {card.title}
              </div>
              <div style={{ fontSize: 14, color: 'var(--gw-sub, #555)', lineHeight: 1.55 }}>
                {card.body}
              </div>
            </div>
          ))}
        </div>

        <button
          className="gw-btn"
          style={{ maxWidth: 340, margin: '0 auto', display: 'block' }}
          onClick={() => navigate('/grounds')}
        >
          Start my first check-in →
        </button>
      </div>
    </div>
  )
}
