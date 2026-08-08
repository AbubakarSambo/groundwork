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
          <a href="https://myground.work" target="_blank" rel="noopener noreferrer" style={{ fontSize: 14, fontWeight: 700, color: 'white', letterSpacing: '-.02em', textDecoration: 'none' }}>Groundwork</a>
        </div>
        <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(255,255,255,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: 'white', marginBottom: 10 }}>
          {initials}
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'white', marginBottom: 3 }}>{name}</div>
        {/* "Groundwork verified contributor" asserted a status with nothing
              behind it - no verification exists, and nothing on this page is
              fetched. */}
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,.55)' }}>{user?.email}</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,.4)', marginTop: 4 }}>No completed grounds yet</div>
      </div>

      <div className="gw-bd">
        <div style={{ fontSize: 13, color: 'var(--gw-sub)', textAlign: 'center', padding: 24, background: 'var(--gw-bg)', borderRadius: 8, border: '0.5px solid var(--gw-border)', marginBottom: 20 }}>
          {/* This said "Each closed ground adds a verified entry to your
              profile", and this page fetches nothing at all - there is no
              cross-ground history endpoint, so no entry has ever appeared for
              anyone. Describe where the record actually lives. */}
          <div style={{ fontWeight: 600, color: 'var(--gw-text)', marginBottom: 6 }}>Your record lives in your grounds</div>
          Each ground keeps its own record of what you contributed, and stays open to you after it closes. A profile that gathers them in one place is not built yet.
        </div>

        {/* The "What does Two-party confirmed mean?" explainer used to sit here
            unconditionally, defining a badge the page does not carry - and
            cannot, until a ground actually closes. An explainer belongs beside
            the thing it explains; on its own it reads like a description of
            something the reader has and cannot find. */}

        <div style={{ textAlign: 'center', paddingBottom: 24 }}>
          <div style={{ fontSize: 13, color: 'var(--gw-sub)', marginBottom: 10 }}>Your record grows as grounds close</div>
          <button onClick={() => navigate('/grounds')} style={{ padding: '12px 24px', borderRadius: 7, background: 'var(--gw-navy)', color: 'white', fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
            Go to my grounds
          </button>
        </div>
      </div>
    </div>
  )
}
