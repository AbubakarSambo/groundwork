import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { joinApi, entryApi } from '@/api/entry'
import { useAuthStore } from '@/stores/auth'
import { toast } from 'sonner'

type Phase = 'loading' | 'start' | 'chat' | 'save' | 'done' | 'commit-error' | 'error'

interface Turn { role: 'user' | 'assistant'; content: string }

export function JoinPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const joinToken = params.get('t') ?? ''

  const setAuth = useAuthStore(s => s.setAuth)

  const [phase, setPhase] = useState<Phase>('loading')
  const [ground, setGround] = useState<{ groundId: string; groundLabel: string; scenario: string; initiatorName: string } | null>(null)

  const JOIN_DRAFT_KEY = `gw_join_draft_${joinToken}`

  const [history, setHistory] = useState<Turn[]>(() => {
    try { const d = JSON.parse(localStorage.getItem(JOIN_DRAFT_KEY) ?? 'null'); return d?.history ?? [] } catch { return [] }
  })
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionComplete, setSessionComplete] = useState(false)
  const [report, setReport] = useState<any>(null)

  // Save card
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('')
  const [saving, setSaving] = useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!joinToken) { setPhase('error'); return }
    joinApi.preview(joinToken)
      .then(g => { setGround(g); setPhase('start') })
      .catch(() => setPhase('error'))
  }, [joinToken])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [history])

  // Auto-save draft so a dropped connection doesn't lose progress
  useEffect(() => {
    if (history.length > 0 && joinToken) {
      try { localStorage.setItem(JOIN_DRAFT_KEY, JSON.stringify({ history })) } catch { /* */ }
    }
  }, [history, joinToken, JOIN_DRAFT_KEY])

  async function startChat() {
    setPhase('chat')
    setLoading(true)
    try {
      const res = await entryApi.chat(
        [{ role: 'user', content: 'Ready to check in.' }],
        ground?.scenario,
        ground?.groundLabel,
        joinToken,
      )
      setHistory([{ role: 'assistant' as const, content: res.reply }])
    } catch {
      toast.error('Could not start the session. Try again.')
    }
    setLoading(false)
  }

  async function sendMessage() {
    if (!input.trim() || loading || sessionComplete) return
    const next: Turn[] = [...history, { role: 'user' as const, content: input.trim() }]
    setHistory(next)
    setInput('')
    setLoading(true)
    try {
      const res = await entryApi.chat(next, ground?.scenario, ground?.groundLabel, joinToken)
      const updated: Turn[] = [...next, { role: 'assistant' as const, content: res.reply }]
      setHistory(updated)
      const replyLower = res.reply.toLowerCase()
      const done = res.sessionComplete ||
        replyLower.includes('your record is here') ||
        replyLower.includes('your record is saved as is') ||
        replyLower.includes('your contribution is saved') ||
        replyLower.includes('cannot be verified from this account')
      if (done) {
        setSessionComplete(true)
        // Generate report
        try {
          const r = await entryApi.report(updated, ground?.scenario, ground?.groundLabel)
          setReport(r.report)
        } catch { /* non-fatal */ }
        setPhase('save')
      }
    } catch {
      toast.error('Something went wrong. Try again.')
    }
    setLoading(false)
  }

  async function handleSave(skip = false) {
    setSaving(true)
    try {
      const res = await joinApi.commit({
        joinToken,
        firstName: skip ? undefined : firstName.trim() || undefined,
        lastName: skip ? undefined : lastName.trim() || undefined,
        email: skip ? undefined : email.trim() || undefined,
        roleAsDescribed: skip ? undefined : role.trim() || undefined,
        history,
        report: skip ? null : report,
      })
      try { localStorage.removeItem(JOIN_DRAFT_KEY) } catch { /* */ }
      if (!skip && res.accessToken) {
        setAuth({ id: res.userId!, email: email.trim(), firstName: firstName.trim() || email.split('@')[0], lastName: lastName.trim(), role: 'MEMBER', organizationId: '' }, res.accessToken)
      }
      setPhase('done')
    } catch {
      setPhase('commit-error')
    }
    setSaving(false)
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (phase === 'error') return (
    <div style={{ minHeight: '100vh', background: '#F5F3EF', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ textAlign: 'center', maxWidth: 360 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#0A1628', marginBottom: 8 }}>Link not found</div>
        <div style={{ fontSize: 13, color: '#6B6560' }}>This link may have expired or been removed. Ask the person who shared it to send a fresh one.</div>
      </div>
    </div>
  )

  if (phase === 'commit-error') return (
    <div style={{ minHeight: '100vh', background: '#F5F3EF', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ maxWidth: 380, width: '100%' }}>
        <div style={{ background: '#FFF4F4', border: '1px solid #F5C6C6', borderRadius: 12, padding: '20px 22px', marginBottom: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#8B1A1A', marginBottom: 6 }}>Your check-in didn't save</div>
          <div style={{ fontSize: 13, color: '#7A3030', lineHeight: 1.6 }}>Something went wrong saving your contribution. Your conversation is still here — try again.</div>
        </div>
        <button
          onClick={() => setPhase('save')}
          style={{ width: '100%', padding: '12px', borderRadius: 8, background: '#0A1628', color: 'white', fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
        >
          Try again
        </button>
      </div>
    </div>
  )

  if (phase === 'loading') return (
    <div style={{ minHeight: '100vh', background: '#F5F3EF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontSize: 13, color: '#9B9590' }}>Loading...</div>
    </div>
  )

  if (phase === 'done') return (
    <div style={{ minHeight: '100vh', background: '#F5F3EF', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ maxWidth: 400, width: '100%' }}>
        <div style={{ background: '#E7F6EF', border: '1px solid #B6E8D4', borderRadius: 12, padding: '20px 22px', marginBottom: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 22, marginBottom: 8 }}>✓</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#085041', marginBottom: 4 }}>Your check-in is on record</div>
          <div style={{ fontSize: 13, color: '#3A7A60', lineHeight: 1.6 }}>Your contribution to <strong>{ground?.groundLabel}</strong> has been saved.</div>
        </div>
        {email.trim() && (
          <div style={{ background: 'white', border: '1px solid #E2E0DB', borderRadius: 10, padding: '16px 18px', marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#0A1628', marginBottom: 6 }}>Account created at {email.trim()}</div>
            <div style={{ fontSize: 12, color: '#6B6560', lineHeight: 1.55, marginBottom: 10 }}>Check your email to set your password. Once you sign in you can view your ground and see the report when it is released.</div>
            <button
              onClick={() => navigate('/grounds')}
              style={{ fontSize: 12, fontWeight: 700, color: '#0A1628', background: 'none', border: '1px solid #C8C5C0', borderRadius: 6, padding: '7px 14px', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Go to your grounds →
            </button>
          </div>
        )}
        <div style={{ background: 'white', border: '1px solid #E2E0DB', borderRadius: 10, padding: '16px 18px' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#0A1628', marginBottom: 6 }}>What happens next</div>
          <div style={{ fontSize: 12, color: '#6B6560', lineHeight: 1.6 }}>
            When all contributions are in, everyone receives the same report at the same time. Your words stay on your side until then — nobody reads your contribution before the report is released.
          </div>
        </div>
      </div>
    </div>
  )

  if (phase === 'start') {
    const scenarioLabel = ground?.scenario
      ? ground.scenario.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
      : null
    return (
      <div style={{ minHeight: '100vh', background: '#F5F3EF', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ width: '100%', maxWidth: 420 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#9B9590', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 16 }}>Groundwork</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#0A1628', marginBottom: 6 }}>{ground?.groundLabel}</div>
          <div style={{ fontSize: 14, color: '#6B6560', lineHeight: 1.6, marginBottom: 22 }}>
            {ground?.initiatorName} set up this record and asked you to contribute. Your contribution stays on your side until everyone has checked in. Then everyone receives the same report at the same moment.
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
            {scenarioLabel && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, background: 'white', border: '1px solid #E2E0DB', borderRadius: 10, padding: '12px 14px' }}>
                <span style={{ fontSize: 15, flexShrink: 0 }}>📋</span>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#1A1916', marginBottom: 2 }}>What this is about</div>
                  <div style={{ fontSize: 12, color: '#6B6560' }}>{scenarioLabel}</div>
                </div>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, background: 'white', border: '1px solid #E2E0DB', borderRadius: 10, padding: '12px 14px' }}>
              <span style={{ fontSize: 15, flexShrink: 0 }}>🔒</span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#1A1916', marginBottom: 2 }}>Your words stay on your side</div>
                <div style={{ fontSize: 12, color: '#6B6560' }}>Nobody reads your contribution before the report is released. It is yours until all sides are in.</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, background: 'white', border: '1px solid #E2E0DB', borderRadius: 10, padding: '12px 14px' }}>
              <span style={{ fontSize: 15, flexShrink: 0 }}>📄</span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#1A1916', marginBottom: 2 }}>Everyone receives the report together</div>
                <div style={{ fontSize: 12, color: '#6B6560' }}>When all contributions are in, everyone receives the same report at the same time so the conversation starts from the same place.</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, background: 'white', border: '1px solid #E2E0DB', borderRadius: 10, padding: '12px 14px' }}>
              <span style={{ fontSize: 15, flexShrink: 0 }}>⏱</span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#1A1916', marginBottom: 2 }}>About 10 minutes</div>
                <div style={{ fontSize: 12, color: '#6B6560' }}>Answer in your own words. There are no right answers.</div>
              </div>
            </div>
          </div>
          <button
            onClick={startChat}
            style={{ width: '100%', padding: '13px', borderRadius: 8, background: '#0A1628', color: 'white', fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Start check-in
          </button>
        </div>
      </div>
    )
  }

  if (phase === 'save') return (
    <div style={{ minHeight: '100vh', background: '#F5F3EF', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 420 }}>

        <div style={{ fontSize: 20, fontWeight: 800, color: '#0A1628', marginBottom: 6 }}>Your check-in is done</div>
        <div style={{ fontSize: 13, color: '#6B6560', lineHeight: 1.6, marginBottom: 20 }}>
          Create your account to receive the report when it is ready and keep your copy of everything you put on record for this project.
        </div>

        <div style={{ background: 'white', border: '1px solid #E2E0DB', borderRadius: 10, padding: 18, marginBottom: 12 }}>

          <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#6B6560', marginBottom: 5 }}>First name</label>
              <input
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                placeholder="Jane"
                style={inputStyle}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#6B6560', marginBottom: 5 }}>Last name</label>
              <input
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                placeholder="Smith"
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#6B6560', marginBottom: 5 }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@company.com"
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: 18 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#6B6560', marginBottom: 5 }}>Your role <span style={{ fontWeight: 400, color: '#9B9590' }}>(optional)</span></label>
            <input
              value={role}
              onChange={e => setRole(e.target.value)}
              placeholder="e.g. Product lead"
              style={inputStyle}
            />
          </div>

          <button
            onClick={() => handleSave(false)}
            disabled={saving || !email.trim() || !firstName.trim()}
            style={{ width: '100%', padding: '11px', borderRadius: 7, background: '#0A1628', color: 'white', fontSize: 13, fontWeight: 700, border: 'none', cursor: (!email.trim() || !firstName.trim()) ? 'not-allowed' : 'pointer', opacity: (!email.trim() || !firstName.trim()) ? 0.5 : 1, fontFamily: 'inherit' }}
          >
            {saving ? 'Saving...' : 'Create account and save'}
          </button>
        </div>

        <div style={{ textAlign: 'center' }}>
          <button
            onClick={() => handleSave(true)}
            disabled={saving}
            style={{ background: 'none', border: 'none', fontSize: 12, color: '#9B9590', cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline' }}
          >
            Skip — I don't want to receive the report
          </button>
        </div>

      </div>
    </div>
  )

  // chat phase
  return (
    <div style={{ minHeight: '100vh', background: '#F5F3EF', display: 'flex', flexDirection: 'column' }}>
      <div style={{ borderBottom: '1px solid #E2E0DB', background: 'white', padding: '12px 20px', fontSize: 13, fontWeight: 700, color: '#0A1628' }}>
        {ground?.groundLabel}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px', maxWidth: 680, margin: '0 auto', width: '100%' }}>
        {history.map((t, i) => (
          <div key={i} style={{ marginBottom: 16, display: 'flex', justifyContent: t.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{
              maxWidth: '80%', padding: '10px 14px', borderRadius: 10, fontSize: 13, lineHeight: 1.65,
              background: t.role === 'user' ? '#0A1628' : 'white',
              color: t.role === 'user' ? 'white' : '#1A1916',
              border: t.role === 'user' ? 'none' : '1px solid #E2E0DB',
            }}>
              {t.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 16 }}>
            <div style={{ padding: '10px 14px', borderRadius: 10, background: 'white', border: '1px solid #E2E0DB', fontSize: 13, color: '#9B9590' }}>…</div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {!sessionComplete && (
        <div style={{ borderTop: '1px solid #E2E0DB', background: 'white', padding: '12px 16px', display: 'flex', gap: 10, maxWidth: 680, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
            placeholder="Type your response..."
            style={{ flex: 1, padding: '10px 12px', fontSize: 13, fontFamily: 'inherit', border: '1px solid #E2E0DB', borderRadius: 7, background: '#F5F3EF', color: '#0A1628', outline: 'none' }}
            disabled={loading}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            style={{ padding: '10px 18px', borderRadius: 7, background: '#0A1628', color: 'white', fontSize: 13, fontWeight: 700, border: 'none', cursor: !input.trim() ? 'not-allowed' : 'pointer', opacity: !input.trim() ? 0.5 : 1, fontFamily: 'inherit' }}
          >
            Send
          </button>
        </div>
      )}

      {sessionComplete && phase === 'chat' && (
        <div style={{ borderTop: '1px solid #E2E0DB', background: 'white', padding: '16px', textAlign: 'center' }}>
          <button
            onClick={() => setPhase('save')}
            style={{ padding: '11px 24px', borderRadius: 7, background: '#0A1628', color: 'white', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Save my check-in →
          </button>
        </div>
      )}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 11px',
  fontSize: 13,
  fontFamily: 'inherit',
  border: '1px solid #E2E0DB',
  borderRadius: 7,
  background: '#F5F3EF',
  color: '#0A1628',
  outline: 'none',
  boxSizing: 'border-box',
}
