import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { EntryMode } from '@/api/entry'
import { entryStorage } from '@/api/entry'

const MODES: { id: EntryMode; label: string; sub: string }[] = [
  { id: 'something_new', label: 'Something new', sub: 'New hire, cofounder, project or partnership starting' },
  { id: 'look_back', label: 'Look back', sub: 'Recognise what happened and who did what' },
  { id: 'look_forward', label: 'Look forward', sub: 'Prepare for a conversation or decision coming up' },
  { id: 'both', label: 'Both', sub: 'Look at the past and plan forward from it' },
]

export function HomePage() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<EntryMode | null>(null)
  const [text, setText] = useState('')

  function start() {
    if (!mode) return
    const trimmed = text.trim()
    entryStorage.save({
      mode,
      messages: trimmed ? [{ role: 'user', content: trimmed }] : [],
      completed: false,
      firstMessage: trimmed,
    })
    navigate(`/entry-chat?mode=${mode}`)
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && mode) { e.preventDefault(); start() }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gw-bg)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: 'var(--gw-navy)', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <svg width="18" height="14" viewBox="0 0 22 17" fill="none">
            <rect x="5" y="0" width="12" height="3" rx="1.5" fill="white" opacity="0.45" />
            <rect x="2" y="6" width="18" height="3" rx="1.5" fill="white" opacity="0.72" />
            <rect x="0" y="12" width="22" height="3" rx="1.5" fill="white" />
          </svg>
          <span style={{ fontSize: 15, fontWeight: 700, color: 'white', letterSpacing: '-.02em' }}>Groundwork</span>
        </div>
        <button
          onClick={() => navigate('/auth')}
          style={{ fontSize: 12, color: 'rgba(255,255,255,.7)', background: 'rgba(255,255,255,.12)', border: '0.5px solid rgba(255,255,255,.2)', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontFamily: 'inherit' }}
        >
          Sign in
        </button>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
        <div style={{ width: '100%', maxWidth: 480 }}>
          <div style={{ marginBottom: 8, fontSize: 11, fontWeight: 600, color: 'var(--gw-muted)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
            Contribution intelligence
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--gw-text)', lineHeight: 1.2, marginBottom: 8, letterSpacing: '-.02em' }}>
            What are you working on?
          </h1>
          <p style={{ fontSize: 14, color: 'var(--gw-sub)', lineHeight: 1.65, marginBottom: 28 }}>
            Name the situation and the person involved. Groundwork builds a record from both sides.
          </p>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
            {MODES.map(m => (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                style={{
                  padding: '8px 14px',
                  borderRadius: 20,
                  fontSize: 13,
                  fontWeight: mode === m.id ? 700 : 400,
                  border: mode === m.id ? '1.5px solid var(--gw-navy)' : '1px solid var(--gw-border)',
                  background: mode === m.id ? 'var(--gw-navy)' : 'white',
                  color: mode === m.id ? 'white' : 'var(--gw-text)',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'all 0.12s',
                }}
              >
                {m.label}
              </button>
            ))}
          </div>

          {mode && (
            <div style={{ fontSize: 12, color: 'var(--gw-sub)', marginBottom: 12 }}>
              {MODES.find(m => m.id === mode)?.sub}
            </div>
          )}

          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKey}
            placeholder={mode ? 'What specifically is happening? Name the person involved.' : 'Choose a mode above first'}
            disabled={!mode}
            rows={3}
            style={{
              width: '100%',
              resize: 'none',
              padding: '10px 12px',
              fontSize: 14,
              lineHeight: 1.55,
              border: '1px solid var(--gw-border)',
              borderRadius: 8,
              background: mode ? 'white' : 'var(--gw-bg)',
              color: 'var(--gw-text)',
              fontFamily: 'inherit',
              outline: 'none',
              transition: 'border-color 0.1s',
              boxSizing: 'border-box',
              opacity: mode ? 1 : 0.6,
            }}
            onFocus={e => { if (mode) e.target.style.borderColor = 'var(--gw-navy)' }}
            onBlur={e => { e.target.style.borderColor = 'var(--gw-border)' }}
          />

          <button
            onClick={start}
            disabled={!mode}
            style={{
              width: '100%',
              marginTop: 10,
              padding: '12px',
              borderRadius: 8,
              background: mode ? 'var(--gw-navy)' : 'var(--gw-border)',
              color: mode ? 'white' : 'var(--gw-muted)',
              fontSize: 14,
              fontWeight: 700,
              border: 'none',
              cursor: mode ? 'pointer' : 'not-allowed',
              fontFamily: 'inherit',
              transition: 'background 0.1s',
            }}
          >
            Start
          </button>

          <div style={{ marginTop: 28, paddingTop: 20, borderTop: '0.5px solid var(--gw-border)', display: 'flex', flexDirection: 'column', gap: 8, textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: 'var(--gw-sub)' }}>
              No account needed to start. Your words stay private until you save them.
            </div>
            <div style={{ fontSize: 12, color: 'var(--gw-muted)' }}>
              Already have an account?{' '}
              <span
                style={{ color: 'var(--gw-navy)', textDecoration: 'underline', cursor: 'pointer' }}
                onClick={() => navigate('/auth')}
              >
                Sign in
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
