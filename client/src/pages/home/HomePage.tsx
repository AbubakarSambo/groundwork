import { useState, useRef, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import type { EntryMode } from '@/api/entry'
import { entryApi } from '@/api/entry'

const MODES: { id: EntryMode; label: string }[] = [
  { id: 'something_new', label: 'Something new' },
  { id: 'look_back', label: 'Look back' },
  { id: 'look_forward', label: 'Look forward' },
  { id: 'both', label: 'Both' },
]

const PLACEHOLDERS: Record<EntryMode, string> = {
  something_new: 'Who is involved and what are you trying to get right from the start?',
  look_back: 'What happened, with whom, and what needs to be on record?',
  look_forward: 'What needs to be agreed before the work begins?',
  both: 'What happened and what needs to happen next?',
}

export function HomePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [mode, setMode] = useState<EntryMode>('something_new')
  const [text, setText] = useState('')
  const [faqAnswer, setFaqAnswer] = useState('')

  const faqMutation = useMutation({
    mutationFn: (question: string) => entryApi.faq(question),
    onSuccess: res => setFaqAnswer(res.reply),
    onError: () => setFaqAnswer('That one is better answered directly - email hello@myground.work and someone will get back to you.'),
  })

  function handleSubmit() {
    const trimmed = text.trim()
    if (!trimmed || faqMutation.isPending) return
    setText('')
    setFaqAnswer('')
    if (taRef.current) { taRef.current.style.height = 'auto' }

    if (trimmed.endsWith('?')) {
      faqMutation.mutate(trimmed)
      return
    }

    navigate(`/start?mode=${mode}&initial=${encodeURIComponent(trimmed)}`)
  }

  useEffect(() => {
    const faqParam = searchParams.get('faq')
    const modeParam = searchParams.get('mode') as EntryMode | null
    if (modeParam && MODES.some(m => m.id === modeParam)) setMode(modeParam)
    if (faqParam) faqMutation.mutate(faqParam)
  }, [])

  const taRef = useRef<HTMLTextAreaElement>(null)

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit() }
  }

  function autoResize(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setText(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 180) + 'px'
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
          <p style={{ fontSize: 14, color: 'var(--gw-sub)', lineHeight: 1.65, marginBottom: 24 }}>
            Name the situation and who is involved. Groundwork builds a record from both sides.
          </p>

          <div className="gw-mode-pills">
            {MODES.map(m => (
              <button
                key={m.id}
                onClick={() => { setMode(m.id); setFaqAnswer('') }}
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

          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <textarea
              ref={taRef}
              value={text}
              onChange={autoResize}
              onKeyDown={handleKey}
              placeholder={PLACEHOLDERS[mode]}
              rows={2}
              style={{
                flex: 1,
                padding: '10px 12px',
                fontSize: 14,
                lineHeight: 1.55,
                border: '1px solid var(--gw-border)',
                borderRadius: 8,
                background: 'white',
                color: 'var(--gw-text)',
                fontFamily: 'inherit',
                outline: 'none',
                transition: 'border-color 0.1s',
                resize: 'none',
                overflow: 'hidden',
              }}
              onFocus={e => { e.target.style.borderColor = 'var(--gw-navy)' }}
              onBlur={e => { e.target.style.borderColor = 'var(--gw-border)' }}
            />
            <button
              onClick={handleSubmit}
              disabled={faqMutation.isPending}
              style={{
                padding: '0 14px',
                borderRadius: 8,
                background: 'var(--gw-navy)',
                color: 'white',
                border: 'none',
                cursor: faqMutation.isPending ? 'not-allowed' : 'pointer',
                fontSize: 18,
                flexShrink: 0,
                height: 44,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: faqMutation.isPending ? 0.6 : 1,
                fontFamily: 'inherit',
              }}
            >
              {faqMutation.isPending ? '…' : '↑'}
            </button>
          </div>

          {faqAnswer && (
            <div style={{ marginTop: 10, padding: '12px 14px', background: 'white', border: '0.5px solid var(--gw-border)', borderRadius: 8, fontSize: 14, lineHeight: 1.65, color: 'var(--gw-text)' }}>
              {faqAnswer}
            </div>
          )}

          <div style={{ marginTop: 28 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gw-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 12 }}>What you can do</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {[
                // Labels double as routing params (?scenario=<label>), resolved by
                // SCENARIO_FROM_LABEL in CreateGroundPage - the reframed labels are
                // in that map, so these route to the same untouched scenario keys.
                { label: 'New hire',               desc: 'Get you and a new hire on the same page about the role and what early success looks like.' },
                { label: 'New project',            desc: 'Line everyone up on scope, ownership, and what "done" means before the work starts.' },
                { label: 'New advisor or board member', desc: 'Pin down what the advisor will actually contribute, on what terms.' },
                { label: 'New partner or co-founder', desc: 'Put what each of you expects to build, own, and contribute in writing, before assumptions collide.' },
                { label: 'New manager or lead',    desc: 'Get clear on scope, reporting, and success for someone stepping into an existing team.' },
                { label: 'Contract or renewal',    desc: 'Both sides give an honest account of how the term actually went, and what a fair next one looks like.' },
                { label: 'Raise, promotion, or recognition', desc: 'Build the evidence behind the ask before the conversation.' },
                { label: 'Performance improvement plan', desc: 'Run a fair plan with both sides on the concern, the support, and what success looks like.' },
                { label: 'Goals & planning',       desc: 'Check everyone is genuinely on the same goals and plan before the cycle locks in.' },
                { label: 'Workplan & budget',      desc: 'Check each person\'s plan and budget holds up against the resources available.' },
                { label: 'Quick check-in',         desc: 'A fast, repeatable read from each person. What is moving, what is stuck, what has changed.' },
                { label: 'Something\'s off track', desc: 'Name what was agreed, what actually happened, and the exact gap, so you can act on it.' },
                { label: 'Board & leadership strategy', desc: 'Each leader gives their own read on strategy before the room debates it.' },
                { label: 'Cohort check-in',        desc: 'Many people in the same role check in against a shared question, on a recurring cadence.' },
                { label: 'A shock just hit',       desc: 'A jarring event just happened. Get everyone\'s honest read before anyone decides anything.' },
                { label: 'Get a team back on the same page', desc: 'Each person gives their honest read before the group talks, so the conversation starts from a shared picture.' },
                { label: 'Describe your own situation', desc: 'Not sure which fits? Describe it in your own words and we will set up the right ground for you.' },
              ].map(c => (
                <div
                  key={c.label}
                  onClick={() => navigate(`/grounds/new?scenario=${encodeURIComponent(c.label.toLowerCase())}`)}
                  style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: 'white', border: '0.5px solid var(--gw-border)', borderRadius: 8, padding: '10px 12px', cursor: 'pointer' }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gw-text)', marginBottom: 2 }}>{c.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.5 }}>{c.desc}</div>
                  </div>
                  <div style={{ fontSize: 14, color: 'var(--gw-muted)', flexShrink: 0, marginTop: 2 }}>→</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 24, paddingTop: 20, borderTop: '0.5px solid var(--gw-border)', display: 'flex', flexDirection: 'column', gap: 8, textAlign: 'center' }}>
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

          <div style={{ marginTop: 12, textAlign: 'center', fontSize: 12, color: 'var(--gw-muted)' }}>
            Not sure what this is?{' '}
            <a href="https://myground.work" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gw-navy)', textDecoration: 'underline' }}>Learn more.</a>
          </div>
        </div>
      </div>
    </div>
  )
}
