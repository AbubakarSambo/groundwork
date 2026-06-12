import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth'
import { groundsApi } from '@/api'
import { GroundworkLogo } from '@/components/gw/GroundworkLogo'

export function ProfilePage() {
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)

  const { data: grounds = [] } = useQuery({
    queryKey: ['grounds'],
    queryFn: groundsApi.list,
  })

  // Verified grounds = closed/resolved with a released report that the user participated in
  const verified = grounds.filter(g =>
    (g.status === 'RESOLVED' || g.status === 'CLOSED') &&
    g.report?.releasedAt != null,
  )

  const name = user ? `${user.firstName} ${user.lastName}`.trim() : ''
  const initials = user
    ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase() || (user.email?.[0]?.toUpperCase() ?? '?')
    : '?'

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gw-bg)', display: 'flex', flexDirection: 'column' }}>
      {/* Navy header band */}
      <div style={{ background: '#0C447C', padding: '24px 20px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <GroundworkLogo color="white" />
          <button
            style={{ fontSize: 13, color: 'rgba(255,255,255,.55)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
            onClick={() => navigate('/')}
          >
            ← Grounds
          </button>
        </div>

        {/* Avatar */}
        <div style={{
          width: 48, height: 48, borderRadius: '50%',
          background: 'rgba(255,255,255,.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, fontWeight: 700, color: 'white',
          marginBottom: 10,
        }}>
          {initials}
        </div>

        <div style={{ fontSize: 18, fontWeight: 700, color: 'white', marginBottom: 3 }}>{name || user?.email}</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,.55)' }}>Groundwork contributor</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,.4)', marginTop: 4 }}>
          {verified.length} verified {verified.length === 1 ? 'ground' : 'grounds'}
        </div>
      </div>

      <div className="gw-bd" style={{ maxWidth: 600, margin: '0 auto', width: '100%' }}>

        {/* Profile card */}
        <div style={{ background: 'white', border: '1px solid #E2E0DB', borderRadius: 8, padding: 16, marginBottom: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gw-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 12 }}>
            Your record
          </div>
          <div style={{ fontSize: 13, color: 'var(--gw-sub)', lineHeight: 1.65 }}>
            Your record belongs to you — not your organisation, not this platform.
            It stays with you whether or not you remain a part of the org that opened it.
          </div>
        </div>

        {/* Verified grounds */}
        <div style={{ background: 'white', border: '1px solid #E2E0DB', borderRadius: 8, padding: 16, marginBottom: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gw-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 12 }}>
            Verified grounds
          </div>

          {verified.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--gw-muted)', fontStyle: 'italic' }}>
              No verified grounds yet. A ground is verified when both parties activate the shared report.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {verified.map(g => (
                <div
                  key={g.id}
                  style={{ padding: '10px 12px', background: '#F0FAF4', border: '1px solid #BBF7D0', borderRadius: 6, cursor: 'pointer' }}
                  onClick={() => navigate(`/grounds/${g.id}`)}
                >
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1916', marginBottom: 2 }}>{g.label}</div>
                  <div style={{ fontSize: 11, color: '#085041' }}>
                    {g.scenario?.replace(/_/g, ' ').toLowerCase()} · report released
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Two-party confirmed mark */}
        {verified.length > 0 && (
          <div style={{ background: '#EEF4FB', border: '1px solid #B5D4F4', borderRadius: 8, padding: '12px 16px', marginBottom: 8 }}>
            <div style={{ fontSize: 13, color: '#0C447C', lineHeight: 1.65 }}>
              <strong>Two-party confirmed:</strong> each of these grounds reached a shared picture that both parties activated.
              This record cannot be altered by anyone else.
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
