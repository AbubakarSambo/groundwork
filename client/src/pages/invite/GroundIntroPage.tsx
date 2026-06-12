import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/api'
import { GroundworkLogo } from '@/components/gw/GroundworkLogo'

interface InvitePreview {
  groundLabel: string
  scenario: string
  orgName: string
  adminEmail: string
  brief?: string | null
  timelineDays?: number | null
}

function scenarioBlurb(scenario: string): string {
  const map: Record<string, string> = {
    NEW_HIRE:         'This is a structured 90-day alignment ground. Each session builds a private record of how this working relationship is going — from both sides.',
    NEW_COFOUNDER:    'This ground creates a shared record of founder intent and contribution before hard decisions get made.',
    NEW_ADVISOR:      'This ground tracks expected return vs cost across the advisory engagement.',
    NEW_PROJECT:      'This ground keeps both parties honest about scope, ownership, and delivery.',
    NEW_MANAGER:      'This ground aligns expectations on scope and success criteria from the start.',
    RECOGNITION:      'This ground documents both perspectives on contribution before a raise, equity, or promotion decision.',
    DRIFT:            'This ground creates a structured path through a relationship that needs resetting.',
    CONTRACT_RENEWAL: 'This ground supports a record-based decision at the end of a contract period.',
    CRISIS_ALIGNMENT: 'This ground builds a shared picture of what is happening in a moment of pressure.',
    GENERAL_ALIGNMENT:'This ground creates a private, structured record across a working relationship.',
  }
  return map[scenario] ?? 'This ground creates a structured, private record of your working relationship.'
}

export function GroundIntroPage() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()

  const { data, isLoading, isError } = useQuery<InvitePreview>({
    queryKey: ['invite-preview', token],
    queryFn: () => apiClient.get(`/invite/${token}/preview`).then(r => r.data),
    enabled: !!token,
    retry: false,
  })

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--gw-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: 13, color: 'var(--gw-muted)' }}>Loading…</div>
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--gw-bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#1A1916', marginBottom: 8 }}>Invite not found</div>
        <div style={{ fontSize: 13, color: 'var(--gw-muted)' }}>This link may have expired or already been used.</div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gw-bg)', display: 'flex', flexDirection: 'column' }}>
      <div className="gw-hdr">
        <GroundworkLogo />
      </div>

      <div className="gw-bd" style={{ maxWidth: 520, margin: '0 auto', width: '100%', paddingTop: 32 }}>
        {/* Org badge */}
        <div style={{ fontSize: 11, fontWeight: 600, color: '#0C447C', background: '#EEF4FB', border: '0.5px solid #B5D4F4', borderRadius: 20, padding: '4px 12px', display: 'inline-block', marginBottom: 16 }}>
          {data.orgName}
        </div>

        <div className="gw-ttl">{data.groundLabel}</div>

        <div style={{ fontSize: 13, color: 'var(--gw-sub)', lineHeight: 1.7, marginTop: 10, marginBottom: 20 }}>
          {scenarioBlurb(data.scenario)}
        </div>

        {data.brief && (
          <div className="gw-box gw-box-blue" style={{ marginBottom: 16, fontSize: 13, lineHeight: 1.65 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: '#0C447C', marginBottom: 4 }}>Context</div>
            {data.brief}
          </div>
        )}

        {/* What to expect */}
        <div style={{ background: 'white', border: '0.5px solid #E2E0DB', borderRadius: 10, padding: '16px 18px', marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--gw-muted)', marginBottom: 10 }}>
            What to expect
          </div>
          {[
            ['Private', 'Your check-in text is never shared without your explicit confirmation.'],
            ['Structured', 'Each session takes 5–15 minutes and follows the same format.'],
            ['Your record', 'You build a private record over time. You own it, always.'],
            ['Activation', 'Both parties must confirm before any shared view is unlocked.'],
          ].map(([title, desc]) => (
            <div key={title} style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#5DCAA5', flexShrink: 0, marginTop: 5 }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1916' }}>{title}</div>
                <div style={{ fontSize: 12, color: 'var(--gw-sub)', marginTop: 2 }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ fontSize: 11, color: 'var(--gw-muted)', marginBottom: 20, textAlign: 'center' }}>
          Invited by {data.adminEmail}
        </div>

        <button
          className="gw-btn"
          style={{ width: '100%', marginBottom: 10 }}
          onClick={() => navigate(`/invite?token=${token}`)}
        >
          Accept and set up my account →
        </button>

        <button
          className="gw-btn-sec"
          style={{ width: '100%' }}
          onClick={() => navigate(`/login?redirect=/invite?token=${token}`)}
        >
          I already have an account — sign in
        </button>
      </div>
    </div>
  )
}
