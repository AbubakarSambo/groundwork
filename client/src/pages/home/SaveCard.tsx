import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { authApi } from '@/api/auth'
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
  const [error, setError] = useState('')

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
    if (!trimmed || !trimmed.includes('@')) { setError('Enter a valid email.'); return }
    setError('')
    sendLink.mutate(trimmed)
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

      <div style={{ padding: '16px' }}>
        <form onSubmit={save}>
          <div className="gw-fld">
            <label className="gw-label">Your email</label>
            <input
              className="gw-input"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={e => { setEmail(e.target.value); setError('') }}
              autoFocus
            />
          </div>
          {error && <div className="gw-er">{error}</div>}
          <button
            type="submit"
            className="gw-btn"
            disabled={sendLink.isPending}
            style={{ marginTop: 4 }}
          >
            {sendLink.isPending ? 'Sending…' : 'Save and open ground'}
          </button>
        </form>

        <div style={{ marginTop: 14, fontSize: 11, color: 'var(--gw-muted)', textAlign: 'center', lineHeight: 1.5 }}>
          A link lands in your inbox. Follow it on this device and your session is waiting.
        </div>

        <button
          onClick={onClear}
          style={{
            marginTop: 14,
            background: 'none',
            border: 'none',
            fontSize: 11,
            color: 'var(--gw-muted)',
            cursor: 'pointer',
            fontFamily: 'inherit',
            textDecoration: 'underline',
            padding: 0,
            width: '100%',
            textAlign: 'center',
            display: 'block',
          }}
        >
          Start over
        </button>
      </div>
    </div>
  )
}
