import { useState, useEffect } from 'react'
import { GroundworkLogo } from './GroundworkLogo'

const SEEN_KEY = 'gw_onboard_seen'

const RESOLUTION_STATES = [
  { label: 'Alignment confirmed', bg: '#E8F8F5', color: '#085041' },
  { label: 'Continue current course', bg: '#E8F8F5', color: '#085041' },
  { label: 'Realignment needed', bg: '#FDF3E3', color: '#8A5C1A' },
  { label: 'Gaps identified and addressed', bg: '#FDF3E3', color: '#8A5C1A' },
  { label: 'Promotion recommended', bg: '#EEF4FB', color: '#0C447C' },
  { label: 'Compensation review recommended', bg: '#EEF4FB', color: '#0C447C' },
  { label: 'Equity discussion recommended', bg: '#EEF4FB', color: '#0C447C' },
  { label: 'Brief revised', bg: '#EEF4FB', color: '#0C447C' },
  { label: 'Scope adjustment required', bg: '#EEF4FB', color: '#0C447C' },
  { label: 'Additional support required', bg: '#FDF3E3', color: '#8A5C1A' },
  { label: 'Escalation required', bg: '#FCEBEB', color: '#791F1F' },
  { label: 'Mutual exit agreed', bg: '#FCEBEB', color: '#791F1F' },
]

type Tab = 0 | 1 | 2 | 3

export function OnboardingModal() {
  const [visible, setVisible] = useState(false)
  const [tab, setTab] = useState<Tab>(0)

  useEffect(() => {
    try {
      if (!localStorage.getItem(SEEN_KEY)) setVisible(true)
    } catch {
      setVisible(true)
    }
  }, [])

  function close() {
    try { localStorage.setItem(SEEN_KEY, '1') } catch {}
    setVisible(false)
  }

  if (!visible) return null

  const tabs = ['What it is', 'How to use it', 'Use cases', 'Reports']

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(10,22,40,0.75)',
      zIndex: 9000, overflowY: 'auto', padding: '20px 16px',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
    }}>
      <div style={{
        background: 'white', borderRadius: 14, maxWidth: 560, width: '100%',
        overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        margin: 'auto',
      }}>
        {/* Header */}
        <div style={{ background: '#0A1628', padding: '24px 24px 20px', position: 'relative' }}>
          <div style={{ marginBottom: 12 }}>
            <GroundworkLogo color="white" height={16} />
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'white', lineHeight: 1.2, marginBottom: 8, letterSpacing: '-.02em' }}>
            A clinic for your work.
          </div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', lineHeight: 1.65 }}>
            Diagnose issues early. Identify contributions. Build records that belong to the people who built them.
          </div>
          <button onClick={close} style={{
            position: 'absolute', top: 16, right: 16,
            background: 'rgba(255,255,255,.1)', border: 'none', color: 'white',
            width: 28, height: 28, borderRadius: '50%', cursor: 'pointer',
            fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'inherit',
          }}>×</button>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', borderBottom: '0.5px solid #E2E0DB' }}>
          {tabs.map((t, i) => (
            <button key={t} onClick={() => setTab(i as Tab)} style={{
              flex: 1, padding: '10px 6px', fontSize: 12, fontWeight: tab === i ? 600 : 500,
              color: tab === i ? '#0C447C' : '#6B6560',
              background: 'none', border: 'none',
              borderBottom: tab === i ? '2px solid #0C447C' : '2px solid transparent',
              cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
            }}>{t}</button>
          ))}
        </div>

        {/* Tab 0 — What it is */}
        {tab === 0 && (
          <div style={{ padding: 24 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { border: '#0C447C', title: 'A shared record of contribution', body: 'Both parties check in independently. Neither sees what the other wrote. A report shows both versions at the same time. The gap between them is usually the conversation that needed to happen months earlier.' },
                { border: '#5DCAA5', title: 'The record belongs to you. Permanently.', body: 'Not the organisation. Not the platform. The person. Your words are private until you both activate the report. Your record survives the relationship.' },
                { border: '#E8A94A', title: 'The confidence score tells you when to act', body: 'Every ground has a confidence score from 1 to 5. It rises as both parties check in and evidence accumulates. At 3/5 the report is ready. At 4/5 a recommendation is defensible. At 5/5 the evidence is comprehensive.' },
              ].map(c => (
                <div key={c.title} style={{ background: '#F5F3EF', borderRadius: 8, padding: 16, borderLeft: `3px solid ${c.border}` }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#1A1916', marginBottom: 6 }}>{c.title}</div>
                  <div style={{ fontSize: 13, color: '#6B6560', lineHeight: 1.65 }}>{c.body}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
              <button onClick={() => setTab(1)} style={{ padding: '10px 20px', background: '#0C447C', color: 'white', fontSize: 13, fontWeight: 700, border: 'none', borderRadius: 7, cursor: 'pointer', fontFamily: 'inherit' }}>How to use it →</button>
            </div>
          </div>
        )}

        {/* Tab 1 — How to use it */}
        {tab === 1 && (
          <div style={{ padding: 24 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { n: 1, title: 'Open a ground before the situation becomes urgent', body: 'The product is most powerful when used early. A new hire starting, a project beginning, a cofounder agreement forming. The record built before the conversation is the one you can stand on.' },
                { n: 2, title: 'Set a resolution state before the ground starts', body: 'Before the first check-in, both parties agree on what a successful outcome looks like. Alignment confirmed. Promotion recommended. Brief revised. Agreeing on the end state before you start changes the quality of every session.' },
                { n: 3, title: 'Check in independently. Be specific.', body: 'The product probes for specificity. Vague answers produce vague records. The more specific your check-in, the stronger your record, the higher the confidence score, the more defensible the outcome.' },
                { n: 4, title: 'Use the report as the basis for the conversation, not the conversation itself', body: 'The report shows both versions at the same time. Both parties read it together. The gap is what needs to be discussed. The product never decides. You decide with evidence.' },
              ].map(s => (
                <div key={s.n} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <div style={{ width: 26, height: 26, background: '#0C447C', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'white', flexShrink: 0 }}>{s.n}</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#1A1916', marginBottom: 3 }}>{s.title}</div>
                    <div style={{ fontSize: 12, color: '#6B6560', lineHeight: 1.6 }}>{s.body}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
              <button onClick={() => setTab(0)} style={{ padding: '10px 16px', background: 'none', color: '#6B6560', fontSize: 13, fontWeight: 600, border: '0.5px solid #E2E0DB', borderRadius: 7, cursor: 'pointer', fontFamily: 'inherit' }}>Back</button>
              <button onClick={() => setTab(2)} style={{ padding: '10px 20px', background: '#0C447C', color: 'white', fontSize: 13, fontWeight: 700, border: 'none', borderRadius: 7, cursor: 'pointer', fontFamily: 'inherit' }}>Use cases →</button>
            </div>
          </div>
        )}

        {/* Tab 2 — Use cases */}
        {tab === 2 && (
          <div style={{ padding: 24 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { border: '#5DCAA5', cat: 'Team use', catColor: '#085041', title: 'Get alignment across the whole team', body: 'Open a multi-party ground before a new quarter, project launch, or team restructure. Every person submits their version of the plan independently.' },
                { border: '#5DCAA5', cat: 'Contribution identification', catColor: '#085041', title: 'Surface invisible work before it disappears', body: 'Open a recognition ground when you want to capture what someone is actually contributing. The record shows what was delivered, what was invisible, and what was absorbed.' },
                { border: '#0C447C', cat: 'Conflict recall', catColor: '#0C447C', title: 'Use the record when you need to recall what was agreed', body: "When a dispute arises about what was agreed, the ground record is the reference. Both parties can return to the record at any point. Nobody can rewrite history." },
                { border: '#E8A94A', cat: 'Pre-agreed resolution', catColor: '#8A5C1A', title: 'Agree on the resolution state before the ground opens', body: 'Both parties select the resolution state they are aiming for before the first session. Agreeing on the destination changes the quality of the journey.' },
              ].map(c => (
                <div key={c.title} style={{ background: '#F5F3EF', borderRadius: 8, padding: '14px 16px', borderLeft: `3px solid ${c.border}` }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: c.catColor, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 5 }}>{c.cat}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1A1916', marginBottom: 4 }}>{c.title}</div>
                  <div style={{ fontSize: 12, color: '#6B6560', lineHeight: 1.55 }}>{c.body}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
              <button onClick={() => setTab(1)} style={{ padding: '10px 16px', background: 'none', color: '#6B6560', fontSize: 13, fontWeight: 600, border: '0.5px solid #E2E0DB', borderRadius: 7, cursor: 'pointer', fontFamily: 'inherit' }}>Back</button>
              <button onClick={() => setTab(3)} style={{ padding: '10px 20px', background: '#0C447C', color: 'white', fontSize: 13, fontWeight: 700, border: 'none', borderRadius: 7, cursor: 'pointer', fontFamily: 'inherit' }}>Reports →</button>
            </div>
          </div>
        )}

        {/* Tab 3 — Reports */}
        {tab === 3 && (
          <div style={{ padding: 24 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#1A1916', marginBottom: 14 }}>What the report contains</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
              {[
                { title: 'Resolution summary', body: 'One sentence. Auto-generated. The thing neither party named directly but both records implied.', dot: '#0C447C' },
                { title: 'Where both accounts aligned', body: 'The areas of genuine agreement. Plain language. Both parties see the same list at the same time.', dot: '#0C447C' },
                { title: 'Where the accounts diverged', body: 'What each party said. Where the difference lies. The product never decides. It describes.', dot: '#0C447C' },
                { title: 'Resolution state', body: 'The end state both parties agreed to before the ground started. Whether the ground evidence supports it.', dot: '#0C447C' },
                { title: 'The credential', body: 'A shareable verified record. End state. Confidence score. Duration. Two-party confirmed. Both parties keep it permanently.', dot: '#5DCAA5' },
              ].map(s => (
                <div key={s.title} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: s.dot, flexShrink: 0, marginTop: 5 }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#1A1916', marginBottom: 2 }}>{s.title}</div>
                    <div style={{ fontSize: 12, color: '#6B6560', lineHeight: 1.6 }}>{s.body}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ background: '#EEF4FB', border: '0.5px solid #B5D4F4', borderRadius: 8, padding: 14, marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#0C447C', marginBottom: 8 }}>Resolution states available</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {RESOLUTION_STATES.map(r => (
                  <span key={r.label} style={{ fontSize: 10, fontWeight: 600, padding: '3px 9px', borderRadius: 20, background: r.bg, color: r.color }}>{r.label}</span>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button onClick={() => setTab(2)} style={{ padding: '10px 16px', background: 'none', color: '#6B6560', fontSize: 13, fontWeight: 600, border: '0.5px solid #E2E0DB', borderRadius: 7, cursor: 'pointer', fontFamily: 'inherit' }}>Back</button>
              <button onClick={close} style={{ padding: '10px 24px', background: '#0C447C', color: 'white', fontSize: 14, fontWeight: 700, border: 'none', borderRadius: 7, cursor: 'pointer', fontFamily: 'inherit' }}>Got it, open a ground →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
