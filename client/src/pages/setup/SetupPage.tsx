import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth'

export function SetupPage() {
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--gw-bg)' }}>
      <div className="gw-hdr"><div className="gw-logo">Groundwork</div></div>
      <div className="gw-bd" style={{ textAlign: 'center', paddingTop: 60, maxWidth: 420, margin: '0 auto', width: '100%' }}>
        <div style={{ width: 52, height: 52, background: 'var(--gw-blue-bg)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <path d="M4 11l5 5L18 6" stroke="#0C447C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>You're in{user?.firstName ? `, ${user.firstName}` : ''}.</div>
        <div style={{ fontSize: 13, color: 'var(--gw-sub)', marginBottom: 8, lineHeight: 1.65 }}>
          {user?.organizationName ? `${user.organizationName} is ready on Groundwork.` : 'Your org is ready on Groundwork.'}
        </div>
        <div style={{ fontSize: 13, color: 'var(--gw-sub)', marginBottom: 28, lineHeight: 1.65 }}>
          Create your first ground to start a structured conversation.
        </div>
        <button className="gw-btn" style={{ display: 'inline-block', width: 'auto', padding: '11px 28px' }} onClick={() => navigate('/grounds')}>
          Open Groundwork →
        </button>
      </div>
    </div>
  )
}
