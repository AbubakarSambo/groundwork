import { useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { participantsApi } from '@/api'
import { entryApi } from '@/api/entry'

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
      <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 'clamp(20px, 5vh, 40px) 20px' }}>
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
  const role = params.get('role') ?? ''
  const isLead = role === 'lead'
  const multiParty = params.get('multiParty') === 'true'
  const navigate = useNavigate()
  const [faqInput, setFaqInput] = useState('')
  const [faqAnswer, setFaqAnswer] = useState('')

  const { data: preview, isLoading, isError } = useQuery({
    queryKey: ['invite', token],
    queryFn: () => participantsApi.preview(token),
    enabled: !!token,
    retry: false,
  })

  const faqMutation = useMutation({
    mutationFn: (q: string) => entryApi.faq(q),
    onSuccess: res => setFaqAnswer(res.reply),
    onError: () => setFaqAnswer('That is something the team can answer directly. hello@myground.work'),
  })

  function handleFaqKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      const q = faqInput.trim()
      if (q) { faqMutation.mutate(q); setFaqInput('') }
    }
  }

  function submit() {
    if (!preview) return
    if (isLead) {
      navigate(`/lead-onboarding?token=${encodeURIComponent(token)}&groundLabel=${encodeURIComponent(preview.groundLabel)}&initiatorName=${encodeURIComponent(preview.initiatorName)}`)
    } else {
      const mpParam = multiParty ? '&multiParty=true' : ''
      navigate(`/participant-chat?token=${encodeURIComponent(token)}&groundLabel=${encodeURIComponent(preview.groundLabel)}&initiatorName=${encodeURIComponent(preview.initiatorName)}${mpParam}`)
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
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
            {isLead ? 'You are already set up to manage this ground' : 'You have already submitted'}
          </div>
          <div style={{ fontSize: 13, color: 'var(--gw-sub)', marginBottom: 24, lineHeight: 1.6 }}>
            Sign in to {isLead ? 'access' : 'see the status of your record for'} <strong>{preview.groundLabel}</strong>.
          </div>
          <button className="gw-btn" style={{ display: 'inline-block', width: 'auto', padding: '10px 24px' }} onClick={() => navigate('/auth')}>
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

      {isLead ? (
        <div style={{ fontSize: 13, color: 'var(--gw-sub)', marginBottom: 28, lineHeight: 1.8 }}>
          <p style={{ margin: '0 0 8px' }}>{preview.initiatorName} has opened this ground and assigned you to manage it.</p>
          <p style={{ margin: '0 0 8px' }}>As the manager you can see submission status and activate the report when both sides are ready. You do not see what participants write until the report is activated together.</p>
          <p style={{ margin: 0 }}>This takes about three minutes to set up.</p>
        </div>
      ) : (
        <div style={{ fontSize: 13, color: 'var(--gw-sub)', marginBottom: 28, lineHeight: 1.8 }}>
          <p style={{ margin: '0 0 8px' }}>{preview.initiatorName} has opened a record for this situation and wants your account of it.</p>
          <p style={{ margin: '0 0 8px' }}>Your check-in is private. {preview.initiatorName} does not see what you write until both parties activate the report together.</p>
          <p style={{ margin: 0 }}>You give your account first, in your own words, without seeing any other version.</p>
        </div>
      )}

      <button className="gw-btn" onClick={submit} style={{ marginTop: 0, minHeight: 48, fontSize: 14 }}>
        {isLead ? 'Set up management' : 'Submit my account'}
      </button>

      <div style={{ marginTop: 28, paddingTop: 18, borderTop: '0.5px solid var(--gw-border)' }}>
        <div style={{ fontSize: 12, color: 'var(--gw-muted)', marginBottom: 8 }}>Have a question? Ask here.</div>
        <div style={{ display: 'flex', gap: 6 }}>
          <input
            type="text"
            value={faqInput}
            onChange={e => { setFaqInput(e.target.value); setFaqAnswer('') }}
            onKeyDown={handleFaqKey}
            placeholder="What does this cost? Is my account private?"
            style={{ flex: 1, padding: '7px 10px', fontSize: 13, border: '1px solid var(--gw-border)', borderRadius: 6, background: 'white', color: 'var(--gw-text)', fontFamily: 'inherit', outline: 'none', minHeight: 44 }}
            onFocus={e => { e.target.style.borderColor = 'var(--gw-navy)' }}
            onBlur={e => { e.target.style.borderColor = 'var(--gw-border)' }}
          />
          <button
            onClick={() => { const q = faqInput.trim(); if (q) { faqMutation.mutate(q); setFaqInput('') } }}
            disabled={faqMutation.isPending || !faqInput.trim()}
            style={{ minHeight: 44, width: 44, borderRadius: 6, background: 'var(--gw-navy)', color: 'white', border: 'none', cursor: 'pointer', fontSize: 16, opacity: faqMutation.isPending ? 0.6 : 1, fontFamily: 'inherit', flexShrink: 0 }}
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
