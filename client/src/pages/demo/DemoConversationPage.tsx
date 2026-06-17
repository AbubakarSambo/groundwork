import { useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { DEMO_PERSONAS } from './demoData'

const MARKETING_URL = import.meta.env.VITE_MARKETING_URL ?? 'https://myground.work'

export function DemoConversationPage() {
  const { persona } = useParams<{ persona: string }>()
  const msgsRef = useRef<HTMLDivElement>(null)

  const demo = persona ? DEMO_PERSONAS[persona] : undefined

  useEffect(() => {
    if (msgsRef.current) msgsRef.current.scrollTop = msgsRef.current.scrollHeight
  }, [])

  if (!demo) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--gw-bg)', gap: 16 }}>
        <div style={{ fontSize: 15, color: 'var(--gw-sub)' }}>Demo not found.</div>
        <a href={MARKETING_URL} style={{ fontSize: 13, color: 'var(--gw-navy)', textDecoration: 'underline' }}>← Back to Groundwork</a>
      </div>
    )
  }

  const checkInCount = demo.history.filter(m => m.role === 'user').length
  const isFounder = persona === 'founder'

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--gw-bg)' }}>
      {/* Header */}
      <div className="gw-hdr">
        <div>
          <div className="gw-logo">{demo.name}</div>
          <div style={{ fontSize: 11, color: 'var(--gw-muted)' }}>
            {demo.role} · {demo.org}
          </div>
        </div>
        <a href={MARKETING_URL} style={{ fontSize: 12, color: 'var(--gw-sub)', textDecoration: 'none', padding: '6px 12px', border: '1px solid var(--gw-border)', borderRadius: 6, background: 'white' }}>
          ← Back
        </a>
      </div>

      {/* Demo banner */}
      <div style={{ background: '#EEF4FB', borderBottom: '1px solid #C5D9EF', padding: '8px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 12, color: '#0C447C', lineHeight: 1.4 }}>
          <strong>Demo:</strong> {demo.name}'s {isFounder ? 'alignment feed' : 'contribution chat'} — {isFounder ? 'founder view' : `${checkInCount} check-in${checkInCount !== 1 ? 's' : ''} shown`}. Add an account to continue live.
        </div>
        <a
          href={`${MARKETING_URL}#demo`}
          style={{ fontSize: 12, fontWeight: 700, color: 'white', background: '#0C447C', padding: '5px 12px', borderRadius: 6, textDecoration: 'none', whiteSpace: 'nowrap' }}
        >
          Try Groundwork →
        </a>
      </div>

      {/* Messages */}
      <div
        ref={msgsRef}
        className="gw-chat-msgs"
        style={{ maxWidth: 680, width: '100%', margin: '0 auto', alignSelf: 'center', boxSizing: 'border-box', paddingBottom: 32 }}
      >
        {demo.history.map((m, idx) => (
          <div
            key={idx}
            className={`gw-msg ${m.role === 'user' ? 'gw-msg-user' : 'gw-msg-ai'}`}
          >
            {m.content}
          </div>
        ))}
      </div>

      {/* Frozen input bar */}
      <div style={{ borderTop: '1px solid var(--gw-border)', background: 'white', flexShrink: 0 }}>
        <div style={{ padding: '4px 14px', borderBottom: '0.5px solid var(--gw-border)', fontSize: 11, color: 'var(--gw-sub)', background: 'var(--gw-bg)', lineHeight: 1.4 }}>
          Demo mode · {isFounder ? 'Admin view · Northgate Ventures' : `Session ${checkInCount} · Your words are private until you both activate the report.`}
        </div>
        <div style={{ padding: '10px 14px', display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <div
            style={{ flex: 1, height: 38, padding: '0 10px', fontSize: 13, border: '1px solid var(--gw-border)', borderRadius: 6, background: '#F7F6F4', display: 'flex', alignItems: 'center', color: 'var(--gw-muted)' }}
          >
            {isFounder ? 'Ask about your team…' : 'Share what you have been working on.'}
          </div>
          <a
            href={`${MARKETING_URL}#demo`}
            style={{ padding: '0 14px', borderRadius: 6, background: 'var(--gw-navy)', color: 'white', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, flexShrink: 0, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', whiteSpace: 'nowrap' }}
          >
            Get started
          </a>
        </div>
      </div>
    </div>
  )
}
