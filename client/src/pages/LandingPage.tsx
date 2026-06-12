import { useNavigate } from 'react-router-dom'

const SITUATIONS = [
  {
    mode: 'Starting',
    bg: '#E8F8F5', color: '#085041',
    title: 'A new hire starting. A project about to begin. A partnership being formalised.',
    sub: 'The brief on record from both sides before the work starts.',
  },
  {
    mode: 'Recognition',
    bg: '#FDF3E3', color: '#8A5C1A',
    title: 'A raise or promotion conversation coming up. Contribution that has not been acknowledged.',
    sub: 'Contribution on record before the conversation. Evidence on both sides.',
  },
  {
    mode: 'Resolution',
    bg: '#EEF4FB', color: '#0C447C',
    title: 'Something not working between two people. A conversation that keeps being avoided.',
    sub: 'Both sides independent before the conversation. A record that names the gap clearly.',
  },
  {
    mode: 'Multi-party',
    bg: '#EEF4FB', color: '#0C447C',
    title: 'A programme, a full team, an advisory board. More than two people.',
    sub: "Every person's version in one feed. The whole picture before the conversation.",
  },
]

export function LandingPage() {
  const navigate = useNavigate()

  return (
    <div style={{ minHeight: '100vh', background: '#0A1628', color: 'white', display: 'flex', flexDirection: 'column' }}>
      {/* Nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
        <div>
          <span style={{ fontSize: 16, fontWeight: 700, color: 'white', letterSpacing: '-.02em' }}>Groundwork</span>
          <span style={{ fontSize: 11, fontWeight: 400, color: 'rgba(255,255,255,.28)', letterSpacing: '.1em', textTransform: 'uppercase', marginLeft: 10 }}>myground.work</span>
        </div>
        <button
          onClick={() => navigate('/auth?mode=member')}
          style={{ fontSize: 13, color: 'rgba(255,255,255,.55)', background: 'none', border: '1px solid rgba(255,255,255,.12)', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontFamily: 'inherit' }}
        >
          I have an org code
        </button>
      </div>

      {/* Body */}
      <div style={{ padding: '52px 24px 48px', flex: 1, maxWidth: 520, margin: '0 auto', width: '100%' }}>
        <h1 style={{ fontSize: 44, fontWeight: 700, lineHeight: 1.08, letterSpacing: '-.03em', marginBottom: 22, color: 'white' }}>
          Both sides of every <em style={{ color: '#93C5FD', fontStyle: 'normal' }}>working relationship</em>
        </h1>
        <p style={{ fontSize: 16, color: 'rgba(255,255,255,.48)', lineHeight: 1.65, marginBottom: 0, maxWidth: 400 }}>
          Independent accounts. No mediation. A record built by both sides before the conversation.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, margin: '36px 0 32px' }}>
          <button
            className="gw-btn"
            style={{ margin: 0, fontSize: 15, padding: '13px 16px', background: '#0C447C' }}
            onClick={() => navigate('/auth')}
          >
            Set up your org →
          </button>
          <button
            className="gw-btn-sec"
            style={{ margin: 0, fontSize: 14, padding: '11px 16px', background: 'rgba(255,255,255,.06)', color: 'rgba(255,255,255,.6)', border: '1px solid rgba(255,255,255,.09)' }}
            onClick={() => navigate('/enter')}
          >
            I have an org code
          </button>
        </div>

        <div style={{ height: 1, background: 'rgba(255,255,255,.07)', marginBottom: 28 }} />

        <div style={{ fontSize: 11, color: 'rgba(255,255,255,.25)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 14 }}>Situations Groundwork handles</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {SITUATIONS.map(s => (
            <div key={s.mode} className="land-sit-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: s.bg + '22', color: s.bg }}>{s.mode}</span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'white', marginBottom: 3 }}>{s.title}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,.4)', lineHeight: 1.5 }}>{s.sub}</div>
            </div>
          ))}
        </div>

        <div style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 6, padding: '14px 16px', marginTop: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,.45)', marginBottom: 6 }}>Privacy by design</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,.22)', lineHeight: 1.65 }}>
            Neither party ever sees what the other wrote until both activate the report. Your record belongs to you — not the org, not the platform.
          </div>
        </div>
      </div>
    </div>
  )
}
