import { useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { participantsApi } from '@/api'
import { entryApi } from '@/api/entry'
import { useAuthStore } from '@/stores/auth'

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--gw-bg)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: 'var(--gw-navy)', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 9 }}>
        <svg width="18" height="14" viewBox="0 0 22 17" fill="none">
          <rect x="5" y="0" width="12" height="3" rx="1.5" fill="white" opacity="0.45" />
          <rect x="2" y="6" width="18" height="3" rx="1.5" fill="white" opacity="0.72" />
          <rect x="0" y="12" width="22" height="3" rx="1.5" fill="white" />
        </svg>
        <span style={{ fontSize: 14, fontWeight: 700, color: 'white', letterSpacing: '-.02em' }}>Groundwork</span>
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 20px' }}>
        <div style={{ width: '100%', maxWidth: 440 }}>
          {children}
        </div>
      </div>
    </div>
  )
}

export function InvitePage() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [faqInput, setFaqInput] = useState('')
  const [faqAnswer, setFaqAnswer] = useState('')

  const { data: preview, isLoading, isError } = useQuery({
    queryKey: ['invite', token],
    queryFn: () => participantsApi.preview(token),
    enabled: !!token,
    retry: false,
  })

  const accept = useMutation({
    mutationFn: () => participantsApi.accept(token, {}),
    onSuccess: (res) => {
      setAuth(res.user, res.accessToken)
      navigate(res.checkInId ? `/checkin/${res.checkInId}` : `/grounds/${res.groundId}`)
    },
  })

  const faqMutation = useMutation({
    mutationFn: (q: string) => entryApi.faq(q),
    onSuccess: res => setFaqAnswer(res.reply),
    onError: () => setFaqAnswer('That is something the team can answer. hello@myground.work'),
  })

  function handleFaqKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      const q = faqInput.trim()
      if (q) { faqMutation.mutate(q); setFaqInput('') }
    }
  }

  if (!token) {
    return (
      <Shell>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>Invalid invite</div>
          <div style={{ fontSize: 13, color: 'var(--gw-sub)' }}>This invite link is missing its token.</div>
        </div>
      </Shell>
    )
  }

  if (isLoading) {
    return (
      <Shell>
        <div style={{ fontSize: 13, color: 'var(--gw-muted)', textAlign: 'center' }}>Loading…</div>
      </Shell>
    )
  }

  if (isError || !preview) {
    return (
      <Shell>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>Invite not found</div>
          <div style={{ fontSize: 13, color: 'var(--gw-sub)' }}>This invite link is invalid or has already been used.</div>
        </div>
      </Shell>
    )
  }

  if (preview.alreadyAccepted) {
    return (
      <Shell>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>You have already joined</div>
          <div style={{ fontSize: 13, color: 'var(--gw-sub)', marginBottom: 24, lineHeight: 1.6 }}>
            Sign in to continue your check-in for <strong>{preview.groundLabel}</strong>.
          </div>
          <button className="gw-btn" style={{ display: 'inline-block', width: 'auto', padding: '10px 24px' }} onClick={() => navigate('/auth?mode=signin')}>
            Sign in
          </button>
        </div>
      </Shell>
    )
  }

  return (
    <Shell>
      <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-.02em', color: 'var(--gw-text)', marginBottom: 6, lineHeight: 1.2 }}>
        {preview.groundLabel}
      </div>

      <div style={{ fontSize: 13, color: 'var(--gw-sub)', marginBottom: 24, lineHeight: 1.7 }}>
        <p style={{ marginBottom: 6 }}>{preview.initiatorName} opened a ground and wants your version of what happened.</p>
        <p style={{ marginBottom: 6 }}>Your check-in is private. {preview.initiatorName} does not see what you write until you both activate the report together.</p>
        <p>You give your account first, in your own words, before seeing any other version.</p>
      </div>

      {preview.roleAsDescribed && (
        <div className="gw-box gw-box-blue" style={{ marginBottom: 20 }}>
          Your role as described: <strong>{preview.roleAsDescribed}</strong>
        </div>
      )}

      <button
        className="gw-btn"
        onClick={() => accept.mutate()}
        disabled={accept.isPending}
        style={{ marginTop: 0 }}
      >
        {accept.isPending ? 'Opening your check-in…' : 'Submit my account'}
      </button>

      {accept.isError && (
        <div className="gw-er" style={{ textAlign: 'center', marginTop: 8 }}>
          Something went wrong. Try again.
        </div>
      )}

      <button
        onClick={() => navigate('/')}
        style={{ marginTop: 12, background: 'none', border: 'none', fontSize: 12, color: 'var(--gw-muted)', cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline', padding: 0, width: '100%', textAlign: 'center', display: 'block' }}
      >
        Not right now
      </button>

      {/* Inline FAQ */}
      <div style={{ marginTop: 28, paddingTop: 18, borderTop: '0.5px solid var(--gw-border)' }}>
        <div style={{ fontSize: 12, color: 'var(--gw-muted)', marginBottom: 8 }}>Have a question? Ask here.</div>
        <div style={{ display: 'flex', gap: 6 }}>
          <input
            type="text"
            value={faqInput}
            onChange={e => { setFaqInput(e.target.value); setFaqAnswer('') }}
            onKeyDown={handleFaqKey}
            placeholder="What does this cost? Is my account private?"
            style={{ flex: 1, padding: '7px 10px', fontSize: 12, border: '1px solid var(--gw-border)', borderRadius: 6, background: 'white', color: 'var(--gw-text)', fontFamily: 'inherit', outline: 'none' }}
            onFocus={e => { e.target.style.borderColor = 'var(--gw-navy)' }}
            onBlur={e => { e.target.style.borderColor = 'var(--gw-border)' }}
          />
          <button
            onClick={() => { const q = faqInput.trim(); if (q) { faqMutation.mutate(q); setFaqInput('') } }}
            disabled={faqMutation.isPending || !faqInput.trim()}
            style={{ padding: '0 12px', borderRadius: 6, background: 'var(--gw-navy)', color: 'white', border: 'none', cursor: 'pointer', fontSize: 14, opacity: faqMutation.isPending ? 0.6 : 1, fontFamily: 'inherit' }}
          >
            &#8593;
          </button>
        </div>
        {faqAnswer && (
          <div style={{ marginTop: 8, padding: '10px 12px', background: 'white', border: '0.5px solid var(--gw-border)', borderRadius: 6, fontSize: 12, color: 'var(--gw-text)', lineHeight: 1.65 }}>
            {faqAnswer}
          </div>
        )}
      </div>
    </Shell>
  )
}
