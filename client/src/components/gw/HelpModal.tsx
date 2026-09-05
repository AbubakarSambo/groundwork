import { useHelpStore } from '@/stores/help'
import { useAuthStore } from '@/stores/auth'
import { HOW_TO_STEPS } from './how-a-check-in-is-run'

const TABS = ['What it is', 'How to use it', 'Use cases', 'Reports'] as const

const RES_PILLS: { label: string; bg: string; color: string }[] = [
  { label: 'Alignment confirmed',            bg: 'var(--gw-green-bg)', color: 'var(--gw-green-t)' },
  { label: 'Continue current course',        bg: 'var(--gw-green-bg)', color: 'var(--gw-green-t)' },
  { label: 'Realignment needed',             bg: 'var(--gw-amber-bg)', color: 'var(--gw-amber-t)' },
  { label: 'Additional support required',    bg: 'var(--gw-amber-bg)', color: 'var(--gw-amber-t)' },
  { label: 'Promotion recommended',          bg: 'var(--gw-blue-bg)', color: 'var(--gw-navy)' },
  { label: 'Compensation review recommended',bg: 'var(--gw-blue-bg)', color: 'var(--gw-navy)' },
  { label: 'Equity discussion recommended',  bg: 'var(--gw-blue-bg)', color: 'var(--gw-navy)' },
  { label: 'Brief revised',                  bg: 'var(--gw-blue-bg)', color: 'var(--gw-navy)' },
  { label: 'Scope adjustment required',      bg: 'var(--gw-blue-bg)', color: 'var(--gw-navy)' },
  { label: 'Gaps identified and addressed',  bg: 'var(--gw-blue-bg)', color: 'var(--gw-navy)' },
  { label: 'Escalation required',            bg: 'var(--gw-red-bg)', color: 'var(--gw-red-t)' },
  { label: 'Mutual exit agreed',             bg: 'var(--gw-red-bg)', color: 'var(--gw-red-t)' },
]

function Tab0({ onNext }: { onNext: () => void }) {
  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ background: 'var(--gw-paper-2)', borderRadius: 8, padding: 16, borderLeft: '3px solid var(--gw-navy)' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--gw-text)', marginBottom: 6 }}>1. Start a check-in</div>
          <div style={{ fontSize: 13, color: 'var(--gw-sub)', lineHeight: 1.65 }}>Pick the situation, set how long it runs and how often people check in, then add the people. Takes about two minutes.</div>
        </div>
        <div style={{ background: 'var(--gw-paper-2)', borderRadius: 8, padding: 16, borderLeft: '3px solid var(--gw-green-b)' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--gw-text)', marginBottom: 6 }}>2. Everyone answers on their own</div>
          <div style={{ fontSize: 13, color: 'var(--gw-sub)', lineHeight: 1.65 }}>Each person gets a link and a conversation of their own. Nobody sees anybody else's answers, including you.</div>
        </div>
        <div style={{ background: 'var(--gw-paper-2)', borderRadius: 8, padding: 16, borderLeft: '3px solid var(--gw-amber-b)' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--gw-text)', marginBottom: 6 }}>3. Read the report together</div>
          <div style={{ fontSize: 13, color: 'var(--gw-sub)', lineHeight: 1.65 }}>It releases to everyone at once and shows where the accounts agree and where they do not. The gaps are the conversation.</div>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
        <button onClick={onNext} style={{ padding: '10px 20px', background: 'var(--gw-navy)', color: 'white', fontSize: 13, fontWeight: 700, border: 'none', borderRadius: 7, cursor: 'pointer' }}>How to use it</button>
      </div>
    </div>
  )
}


function Tab1({ onBack, onNext }: { onBack: () => void; onNext: () => void }) {
  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {HOW_TO_STEPS.map((s, i) => (
          <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <div style={{ width: 26, height: 26, background: 'var(--gw-navy)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'white', flexShrink: 0 }}>{i + 1}</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gw-text)', marginBottom: 3 }}>{s.title}</div>
              <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.6 }}>{s.body}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
        <button onClick={onBack} style={{ padding: '10px 16px', background: 'none', color: 'var(--gw-sub)', fontSize: 13, fontWeight: 600, border: '1px solid var(--gw-border)', borderRadius: 7, cursor: 'pointer' }}>Back</button>
        <button onClick={onNext} style={{ padding: '10px 20px', background: 'var(--gw-navy)', color: 'white', fontSize: 13, fontWeight: 700, border: 'none', borderRadius: 7, cursor: 'pointer' }}>Use cases</button>
      </div>
    </div>
  )
}

const USE_CASES = [
  { accent: 'var(--gw-green-b)', accentText: 'var(--gw-green-t)', label: 'Team use',                     title: 'Get alignment across the whole team',               body: 'Open a multi-party check-in before a new quarter, project launch, or team restructure. Every person submits their version of the plan independently. The alignment feed shows where all versions agree and where they diverge. Without anyone performing for the group.' },
  { accent: 'var(--gw-green-b)', accentText: 'var(--gw-green-t)', label: 'Contribution identification',   title: 'Surface invisible work before it disappears',       body: 'Open a recognition check-in when you want to capture what someone is actually contributing. The record shows what was delivered, what was invisible, and what was absorbed. The conversation happens with evidence, not competing feelings.' },
  { accent: 'var(--gw-navy)', accentText: 'var(--gw-navy)', label: 'Conflict recall',               title: 'Use the record when you need to recall what was agreed', body: 'When a dispute arises about what was agreed, the check-in record is the reference. Everybody can return to the record at any point. The check-ins are timestamped. The pattern is documented. Nobody can rewrite history.' },
  { accent: 'var(--gw-navy)', accentText: 'var(--gw-navy)', label: 'Work terms and conditions',     title: 'Set the terms of the working relationship in writing. Both sides.', body: 'Open a check-in to formalise what each party expects, what they are committed to, and what success looks like. This is not an HR document. It is a living record that updates with every session. Both versions. Independently submitted.' },
  { accent: 'var(--gw-amber-b)', accentText: 'var(--gw-amber-t)', label: 'Project alignment',             title: 'Agree on what success looks like before the work starts', body: 'The brief you gave and the brief they heard are almost never the same. Open a check-in before the project starts. Everybody describes what they are building and what done looks like. The gap appears before it becomes a dispute at month three.' },
  { accent: 'var(--gw-amber-b)', accentText: 'var(--gw-amber-t)', label: 'Pre-agreed resolution',         title: 'Agree on the resolution state before the check-in opens', body: 'Everybody selects the resolution state they are aiming for before the first session. Alignment confirmed. Promotion recommended. Brief revised. Agreeing on the destination changes the quality of the journey. The check-in becomes a shared project, not a test.' },
]

function Tab2({ onBack, onNext }: { onBack: () => void; onNext: () => void }) {
  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {USE_CASES.map((c, i) => (
          <div key={i} style={{ background: 'var(--gw-paper-2)', borderRadius: 8, padding: '14px 16px', borderLeft: `3px solid ${c.accent}` }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: c.accentText, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 5 }}>{c.label}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gw-text)', marginBottom: 4 }}>{c.title}</div>
            <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.55 }}>{c.body}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
        <button onClick={onBack} style={{ padding: '10px 16px', background: 'none', color: 'var(--gw-sub)', fontSize: 13, fontWeight: 600, border: '1px solid var(--gw-border)', borderRadius: 7, cursor: 'pointer' }}>Back</button>
        <button onClick={onNext} style={{ padding: '10px 20px', background: 'var(--gw-navy)', color: 'white', fontSize: 13, fontWeight: 700, border: 'none', borderRadius: 7, cursor: 'pointer' }}>Reports</button>
      </div>
    </div>
  )
}

const REPORT_ITEMS = [
  { title: 'Resolution summary',          body: 'One sentence. Auto-generated. The thing neither party named directly but both records implied. This is the most valuable line in the report. It is what the conversation needs to be about.' },
  { title: 'Where you agreed', body: 'What you genuinely agree on. Plain language, and everyone sees the same list at the same time.' },
  { title: 'Where you saw it differently', body: 'What each party said. Where the difference lies. Not which party is right. The product never decides. It describes.' },
  { title: 'Resolution state',            body: 'The end state everybody agreed to before the check-in started. The report closes with the resolution state that was agreed. Whether the check-in evidence supports it.' },
  { title: 'The credential',              body: 'A shareable verified record. End state. Alignment status. Duration. Confirmed by everybody in it, and everybody keeps it permanently. It belongs to the people who built it.' },
]

function Tab3({ onBack, onClose }: { onBack: () => void; onClose: () => void }) {
  return (
    <div style={{ padding: 24 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--gw-text)', marginBottom: 14 }}>What the report contains</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
        {REPORT_ITEMS.map((r, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: i < 4 ? 'var(--gw-navy)' : 'var(--gw-green-b)', flexShrink: 0, marginTop: 5 }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gw-text)', marginBottom: 2 }}>{r.title}</div>
              <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.6 }}>{r.body}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ background: 'var(--gw-blue-bg)', border: '1px solid var(--gw-blue-b)', borderRadius: 8, padding: 14, marginBottom: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--gw-navy)', marginBottom: 8 }}>Resolution states available</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {RES_PILLS.map((p) => (
            <span key={p.label} style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 4, background: p.bg, color: p.color }}>{p.label}</span>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={onBack} style={{ padding: '10px 16px', background: 'none', color: 'var(--gw-sub)', fontSize: 13, fontWeight: 600, border: '1px solid var(--gw-border)', borderRadius: 7, cursor: 'pointer' }}>Back</button>
        <button onClick={onClose} style={{ padding: '10px 24px', background: 'var(--gw-navy)', color: 'white', fontSize: 14, fontWeight: 700, border: 'none', borderRadius: 7, cursor: 'pointer' }}>Got it</button>
      </div>
    </div>
  )
}

export function HelpModal() {
  const { open, tab, hide, setTab } = useHelpStore()

  if (!open) return null

  const go = (t: 0 | 1 | 2 | 3) => setTab(t)

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) hide() }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(10,22,40,0.75)', zIndex: 9000, overflowY: 'auto', padding: '20px 16px', display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}
    >
      <div style={{ background: 'white', borderRadius: 14, width: '100%', maxWidth: 560, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ background: 'var(--gw-dark)', padding: '24px 24px 20px', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <svg width="20" height="15" viewBox="0 0 22 17" fill="none">
              <rect x="5" y="0" width="12" height="3" rx="1.5" fill="white" opacity="0.45" />
              <rect x="2" y="6" width="18" height="3" rx="1.5" fill="white" opacity="0.72" />
              <rect x="0" y="12" width="22" height="3" rx="1.5" fill="white" />
            </svg>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'white', letterSpacing: '-.01em' }}>Groundwork</span>
          </div>
          {/*
            * THE ? BUTTON IS PRESSED BY SOMEBODY WHO IS STUCK, NOT BY SOMEBODY BROWSING.
            *
            * This opened on a slogan and three cards about what the product believes. The verdict
            * was "tells me nothing of what I should do and sounds like generic AI BS", and that is
            * a fair reading of an answer that starts with "A shared picture, built from both
            * sides." Say what to do first. The philosophy is still here, one tab across.
            */}
          <div style={{ fontSize: 22, fontWeight: 800, color: 'white', lineHeight: 1.2, marginBottom: 8, letterSpacing: '-.02em' }}>How this works</div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', lineHeight: 1.65 }}>Start a check-in, add the people in it, and everyone answers on their own. You get one report showing all the accounts side by side.</div>
          <button
            onClick={hide}
            style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,.1)', border: 'none', color: 'white', width: 28, height: 28, borderRadius: '50%', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >×</button>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--gw-border)' }}>
          {TABS.map((label, i) => (
            <button
              key={label}
              onClick={() => go(i as 0 | 1 | 2 | 3)}
              style={{
                flex: 1, padding: '10px 6px', fontSize: 12, fontWeight: tab === i ? 700 : 500,
                color: tab === i ? 'var(--gw-navy)' : 'var(--gw-muted)',
                background: 'none', border: 'none',
                borderBottom: tab === i ? '2px solid var(--gw-navy)' : '2px solid transparent',
                cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all .15s',
              }}
            >{label}</button>
          ))}
        </div>

        {/* Panels */}
        {tab === 0 && <Tab0 onNext={() => go(1)} />}
        {tab === 1 && <Tab1 onBack={() => go(0)} onNext={() => go(2)} />}
        {tab === 2 && <Tab2 onBack={() => go(1)} onNext={() => go(3)} />}
        {tab === 3 && <Tab3 onBack={() => go(2)} onClose={hide} />}
      </div>
    </div>
  )
}

export function HelpButton() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const show = useHelpStore(s => s.show)
  if (!isAuthenticated) return null
  return (
    <button
      onClick={() => show(0)}
      title="Help"
      className="gw-help-btn"
      style={{
        position: 'fixed', bottom: 72, right: 20, zIndex: 8000,
        width: 38, height: 38, borderRadius: '50%',
        background: 'var(--gw-navy)', color: 'white', border: 'none',
        fontSize: 16, fontWeight: 700, cursor: 'pointer',
        boxShadow: '0 2px 12px rgba(12,68,124,0.35)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >?</button>
  )
}
