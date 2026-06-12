import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GroundworkLogo } from '@/components/gw/GroundworkLogo'

export function LandingPage() {
  const navigate = useNavigate()
  const [demoTooltipVisible, setDemoTooltipVisible] = useState(false)

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', minHeight: '100vh', background: '#fff', display: 'flex', flexDirection: 'column' }}>
      <main style={{ maxWidth: 720, margin: '0 auto', padding: '80px 24px', flex: 1 }}>
        {/* Logo */}
        <div style={{ marginBottom: 48 }}>
          <GroundworkLogo height={36} />
        </div>
        {/* Hero */}
        <h1 style={{ fontSize: '2.5rem', fontWeight: 700, lineHeight: 1.2, margin: 0 }}>
          Most people's best work never makes it into any record.
        </h1>
        <p style={{ fontSize: '1.25rem', color: '#475569', marginTop: 16, lineHeight: 1.6 }}>
          Groundwork is where that changes. Build an honest, two-sided record of a working relationship — before the hard conversation, not after.
        </p>

        {/* #67 — 'Session 1 is free' near primary CTA */}
        <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: 24, marginBottom: 0 }}>
          Session 1 is always free.
        </p>

        {/* #38 — Dual CTA */}
        <p style={{ marginTop: 12, display: 'flex', gap: 12, flexWrap: 'wrap' as const, alignItems: 'center' }}>
          <button
            onClick={() => navigate('/register')}
            style={{ background: '#1d4ed8', color: '#fff', padding: '12px 24px', borderRadius: 8, border: 'none', fontSize: '1rem', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Set up your org
          </button>
          <button
            onClick={() => navigate('/enter-org-code')}
            style={{ background: '#fff', color: '#1d4ed8', padding: '12px 24px', borderRadius: 8, border: '2px solid #1d4ed8', fontSize: '1rem', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            I have an org code
          </button>
        </p>

        {/* #77 — Social proof row */}
        <div style={{ display: 'flex', gap: 24, marginTop: 16, flexWrap: 'wrap' as const }}>
          {[
            'Trusted by 40+ early-stage founders',
            'Average ground resolves in 6 weeks',
            'Session 1 is always free',
          ].map((text) => (
            <span key={text} style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>
              {text}
            </span>
          ))}
        </div>

        {/* #39 — Demo section */}
        <div style={{ marginTop: 64, borderRadius: 12, border: '1px solid #e2e8f0', padding: 32, background: '#f8fafc' }}>
          <div style={{ marginBottom: 4, fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: '0.08em' }}>
            See a live example
          </div>
          <div style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b', marginBottom: 20 }}>
            Northgate Ventures — 90-day new hire evaluation in progress.
          </div>

          {/* Alignment feed signals */}
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 12 }}>
            {[
              { code: 'D2', label: 'Specificity declining over 3 sessions' },
              { code: 'B4', label: 'Commitment stated but not evidenced' },
              { code: 'M1+', label: 'Measurable result named with stakeholder confirmation' },
            ].map(({ code, label }) => (
              <div
                key={code}
                style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#fff', borderRadius: 8, padding: '12px 16px', border: '1px solid #e2e8f0' }}
              >
                <span style={{ fontFamily: 'monospace', fontSize: '0.8125rem', fontWeight: 700, color: '#1d4ed8', minWidth: 36 }}>
                  {code}
                </span>
                <span style={{ fontSize: '0.9375rem', color: '#334155' }}>
                  {label}
                </span>
              </div>
            ))}
          </div>

          {/* View demo button with tooltip */}
          <div style={{ marginTop: 20, position: 'relative' as const, display: 'inline-block' }}>
            <button
              disabled
              onMouseEnter={() => setDemoTooltipVisible(true)}
              onMouseLeave={() => setDemoTooltipVisible(false)}
              onFocus={() => setDemoTooltipVisible(true)}
              onBlur={() => setDemoTooltipVisible(false)}
              style={{ background: '#e2e8f0', color: '#94a3b8', padding: '10px 20px', borderRadius: 8, border: 'none', fontSize: '0.9375rem', cursor: 'not-allowed', fontFamily: 'inherit' }}
            >
              View demo
            </button>
            {demoTooltipVisible && (
              <div style={{ position: 'absolute' as const, bottom: '110%', left: '50%', transform: 'translateX(-50%)', background: '#1e293b', color: '#fff', padding: '6px 12px', borderRadius: 6, fontSize: '0.8125rem', whiteSpace: 'nowrap' as const, pointerEvents: 'none' as const }}>
                Demo launching soon
              </div>
            )}
          </div>
        </div>
      </main>

      {/* #76 — Privacy notice bar above footer */}
      <div style={{ background: '#f1f5f9', borderTop: '1px solid #e2e8f0', padding: '16px 24px', textAlign: 'center' as const }}>
        <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b', lineHeight: 1.6 }}>
          Your answers belong to you. They are never shared with your employer without your consent. The shared report describes patterns — not what you said.
        </p>
      </div>
    </div>
  )
}
