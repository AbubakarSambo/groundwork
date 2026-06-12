import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth'

export function ProfilePage() {
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)
  const initials = user ? `${user.firstName?.charAt(0) ?? ''}${user.lastName?.charAt(0) ?? ''}`.toUpperCase() : 'GW'
  const name = user ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() : 'Your Profile'

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--gw-bg)' }}>
      <div style={{ background: 'var(--gw-navy)', padding: '24px 20px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 16 }}>
          <svg width="18" height="14" viewBox="0 0 22 17" fill="none">
            <rect x="5" y="0" width="12" height="3" rx="1.5" fill="white" opacity="0.45" />
            <rect x="2" y="6" width="18" height="3" rx="1.5" fill="white" opacity="0.72" />
            <rect x="0" y="12" width="22" height="3" rx="1.5" fill="white" />
          </svg>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'white', letterSpacing: '-.02em' }}>Groundwork</span>
        </div>
        <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(255,255,255,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: 'white', marginBottom: 10 }}>
          {initials}
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'white', marginBottom: 3 }}>{name}</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,.55)' }}>Groundwork verified contributor</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,.4)', marginTop: 4 }}>0 verified grounds</div>
      </div>

      <div className="gw-bd">
        <div style={{ fontSize: 13, color: 'var(--gw-sub)', textAlign: 'center', padding: 24, background: 'var(--gw-bg)', borderRadius: 8, border: '0.5px solid var(--gw-border)', marginBottom: 20 }}>
          <div style={{ fontWeight: 600, color: 'var(--gw-text)', marginBottom: 6 }}>Profile is building</div>
          Each closed ground adds a verified record. Grounds you choose to make public will appear here.
        </div>

        <div style={{ background: 'var(--gw-bg)', border: '0.5px solid var(--gw-border)', borderRadius: 8, padding: 14, marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>What does Two-party confirmed mean?</div>
          <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.65 }}>
            Both parties in this ground submitted independent records. Neither could see the other's account until both activated the report. The outcome shown was confirmed by both parties simultaneously. Verified by Groundwork.
          </div>
        </div>

        <div style={{ textAlign: 'center', paddingBottom: 24 }}>
          <div style={{ fontSize: 13, color: 'var(--gw-sub)', marginBottom: 10 }}>Build your own verified record</div>
          <button onClick={() => navigate('/')} style={{ padding: '12px 24px', borderRadius: 7, background: 'var(--gw-navy)', color: 'white', fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
            Get started at myground.work
          </button>
        </div>
      </div>
    </div>
  )
}
