import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { authApi } from '@/api/auth'
import { entryStorage } from '@/api/entry'
import type { EntryMode } from '@/api/entry'

const MODE_LABEL: Record<string, string> = {
  something_new: 'Something new',
  look_back: 'Look back',
  look_forward: 'Look forward',
  both: 'Both',
}

interface Props {
  mode: EntryMode
  onClear: () => void
}

export function SaveCard({ mode, onClear }: Props) {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState('')
  const [participantEmail, setParticipantEmail] = useState('')
  const [saved, setSaved] = useState(false)

  const sendLink = useMutation({
    mutationFn: (e: string) => authApi.memberSignin(e),
    onSuccess: () => {
      navigate(`/auth/sent?email=${encodeURIComponent(email.trim())}`)
    },
    onError: () => {
      navigate(`/auth?mode=signin&email=${encodeURIComponent(email.trim())}`)
    },
  })

  function save(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = email.trim().toLowerCase()
    if (!trimmed || !trimmed.includes('@')) { setEmailError('Enter a valid email.'); return }
    setEmailError('')
    const session = entryStorage.load()
    if (session) {
      entryStorage.save({ ...session, participantEmail: participantEmail.trim().toLowerCase() || undefined })
    }
    sendLink.mutate(trimmed)
  }

  function saveParticipantEmail() {
    const trimmed = participantEmail.trim().toLowerCase()
    if (!trimmed) return
    const session = entryStorage.load()
    if (session) {
      entryStorage.save({ ...session, participantEmail: trimmed })
      setSaved(true)
    }
  }

  return (
    <div
      style={{
        background: 'white',
        border: '0.5px solid var(--gw-border)',
        borderRadius: 10,
        overflow: 'hidden',
        animation: 'gw-fadein 0.35s ease',
      }}
    >
      <div style={{ padding: '14px 16px', background: 'var(--gw-blue-bg)', borderBottom: '0.5px solid var(--gw-blue-b)' }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--gw-navy)', marginBottom: 3 }}>
          Your session is ready.
        </div>
        <div style={{ fontSize: 12, color: 'var(--gw-blue-t)', lineHeight: 1.5 }}>
          Mode: {MODE_LABEL[mode]}. Save this to open your ground and invite the other person.
        </div>
      </div>

      {/* Section 1: save your account */}
      <div style={{ padding: '16px', borderBottom: '0.5px solid var(--gw-border)' }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gw-muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 10 }}>
          1. Save your account
        </div>
        <form onSubmit={save}>
          <div className="gw-fld">
            <label className="gw-label">Your email</label>
            <input
              className="gw-input"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={e => { setEmail(e.target.value); setEmailError('') }}
              autoFocus
            />
          </div>
          {emailError && <div className="gw-er">{emailError}</div>}
          <button
            type="submit"
            className="gw-btn"
            disabled={sendLink.isPending}
            style={{ marginTop: 4 }}
          >
            {sendLink.isPending ? 'Sending…' : 'Save and open ground'}
          </button>
        </form>
        <div style={{ marginTop: 10, fontSize: 11, color: 'var(--gw-muted)', textAlign: 'center', lineHeight: 1.5 }}>
          A link lands in your inbox. Follow it on this device and your session is waiting.
        </div>
      </div>

      {/* Section 2: invite link preview */}
      <div style={{ padding: '14px 16px', borderBottom: '0.5px solid var(--gw-border)', opacity: 0.6 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gw-muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>
          2. Share the invite link
        </div>
        <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.6 }}>
          After you verify your email, your ground opens and you get a link to share. The other person follows it, checks in from their side, and the record builds.
        </div>
      </div>

      {/* Section 3: add participant email now */}
      <div style={{ padding: '14px 16px' }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gw-muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>
          3. Add their email directly (optional)
        </div>
        <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.5, marginBottom: 10 }}>
          Enter their email now and we will send them an invite automatically when your ground opens.
        </div>
        <div className="gw-fld" style={{ marginBottom: 0 }}>
          <input
            className="gw-input"
            type="email"
            placeholder="them@company.com"
            value={participantEmail}
            onChange={e => { setParticipantEmail(e.target.value); setSaved(false) }}
            onBlur={saveParticipantEmail}
          />
        </div>
        {saved && participantEmail && (
          <div style={{ fontSize: 11, color: 'var(--gw-green-t)', marginTop: 5 }}>
            Saved. They will be invited when your ground opens.
          </div>
        )}
      </div>

      <div style={{ padding: '0 16px 14px', textAlign: 'center' }}>
        <button
          onClick={onClear}
          style={{
            background: 'none',
            border: 'none',
            fontSize: 11,
            color: 'var(--gw-muted)',
            cursor: 'pointer',
            fontFamily: 'inherit',
            textDecoration: 'underline',
            padding: 0,
          }}
        >
          Start over
        </button>
      </div>
    </div>
  )
}
