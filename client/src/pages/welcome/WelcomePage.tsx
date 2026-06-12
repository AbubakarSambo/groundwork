import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth'

export function WelcomePage() {
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--gw-bg)' }}>
      <div className="gw-hdr"><div className="gw-logo">Groundwork</div></div>
      <div className="gw-bd" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '80vh', maxWidth: 420, margin: '0 auto', width: '100%' }}>
        <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 8, letterSpacing: '-.01em' }}>
          Welcome{user?.firstName ? `, ${user.firstName}` : ''}
        </div>
        <div style={{ fontSize: 13, color: 'var(--gw-sub)', marginBottom: 28, lineHeight: 1.65 }}>
          {user?.role === 'ADMIN' ? 'Founder / Admin' : 'Team member'}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
          {[
            {
              n: 1,
              title: 'Your check-in is private',
              body: 'Your words belong to you. Nobody reads your sessions. Your record is never shared without your explicit approval for a named decision chosen by you.',
            },
            {
              n: 2,
              title: 'Both sides build the picture',
              body: "Each party checks in independently. Neither sees what the other wrote. A report shows both versions at the same time.",
            },
            {
              n: 3,
              title: 'The record builds over time',
              body: "Each session deepens the picture. A confidence score shows how strong the evidence is. At 4/5 the recommendation is defensible.",
            },
          ].map(item => (
            <div key={item.n} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '13px 14px', background: 'var(--gw-bg)', borderRadius: 'var(--gw-radius)', border: '0.5px solid var(--gw-border)' }}>
              <div style={{ width: 22, height: 22, background: 'var(--gw-navy)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1, fontSize: 11, fontWeight: 700, color: 'white' }}>{item.n}</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 3 }}>{item.title}</div>
                <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.6 }}>{item.body}</div>
              </div>
            </div>
          ))}
        </div>

        <button className="gw-btn" onClick={() => navigate('/grounds')} style={{ margin: 0 }}>
          Open Groundwork →
        </button>
      </div>
    </div>
  )
}
