import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { authApi } from '@/api/auth'
import { entryStorage } from '@/api/entry'
import type { EntryMode } from '@/api/entry'

type Variant = 'admin' | 'participant'

const MODE_LABEL: Record<string, string> = {
  something_new: 'Something new',
  look_back: 'Look back',
  look_forward: 'Look forward',
  both: 'Both',
}

const APP_URL = import.meta.env.VITE_APP_URL ?? ''

function generateToken(): string {
  const arr = new Uint8Array(24)
  crypto.getRandomValues(arr)
  return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('')
}

interface Props {
  mode?: EntryMode
  variant?: Variant
  onClear: () => void
}

export function SaveCard({ mode, variant = 'admin', onClear }: Props) {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState('')
  const [copied, setCopied] = useState(false)
  const [note, setNote] = useState('')
  const [participantEmail, setParticipantEmail] = useState('')
  const [participantAdded, setParticipantAdded] = useState(false)

  const [inviteToken] = useState<string>(() => {
    const session = entryStorage.load()
    if (session?.inviteToken) return session.inviteToken
    const token = generateToken()
    if (session) entryStorage.save({ ...session, inviteToken: token })
    return token
  })

  const inviteUrl = `${APP_URL}/invite?token=${inviteToken}`

  const saveSession = useMutation({
    mutationFn: (emailVal: string) => authApi.entrySave(emailVal),
    onSuccess: () => {
      navigate(`/auth/sent?email=${encodeURIComponent(email.trim())}`)
    },
    onError: () => {
      navigate(`/auth/sent?email=${encodeURIComponent(email.trim())}`)
    },
  })

  if (variant === 'participant') {
    return (
      <div style={{ background: 'white', border: '0.5px solid var(--gw-border)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px', background: 'var(--gw-blue-bg)', borderBottom: '0.5px solid var(--gw-blue-b)' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--gw-navy)', marginBottom: 3 }}>
            Your conversation is ready to save.
          </div>
          <div style={{ fontSize: 12, color: 'var(--gw-blue-t)', lineHeight: 1.5 }}>
            Enter the email where you received this invite. A link lands in your inbox to confirm your account and see the report when it is ready.
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
                onChange={e => { setEmail(e.target.value); setEmailError('') }}
                autoFocus
              />
            </div>
            {emailError && <div className="gw-er">{emailError}</div>}
            <button
              type="submit"
              className="gw-btn"
              disabled={saveSession.isPending}
              style={{ marginTop: 4 }}
            >
              {saveSession.isPending ? 'Sending…' : 'Save my account'}
            </button>
          </form>
          <div style={{ marginTop: 10, fontSize: 11, color: 'var(--gw-muted)', textAlign: 'center', lineHeight: 1.5 }}>
            A link lands in your inbox. Follow it to see the report when both parties have submitted.
          </div>
        </div>
        <div style={{ padding: '0 16px 14px', textAlign: 'center' }}>
          <button
            onClick={onClear}
            style={{ background: 'none', border: 'none', fontSize: 11, color: 'var(--gw-muted)', cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline', padding: 0 }}
          >
            Start over
          </button>
        </div>
      </div>
    )
  }

  function save(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = email.trim().toLowerCase()
    if (!trimmed || !trimmed.includes('@')) { setEmailError('Enter a valid email.'); return }
    setEmailError('')
    const session = entryStorage.load()
    if (session) {
      entryStorage.save({ ...session, inviteToken, inviteNote: note.trim() || undefined })
    }
    saveSession.mutate(trimmed)
  }

  function copyLink() {
    navigator.clipboard?.writeText(inviteUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
    const session = entryStorage.load()
    if (session && note.trim()) {
      entryStorage.save({ ...session, inviteToken, inviteNote: note.trim() })
    }
  }

  function addParticipant() {
    const trimmed = participantEmail.trim().toLowerCase()
    if (!trimmed || !trimmed.includes('@')) return
    const session = entryStorage.load()
    if (session) {
      entryStorage.save({ ...session, participantEmail: trimmed, inviteToken, inviteNote: note.trim() || undefined })
      setParticipantAdded(true)
    }
  }

  return (
    <div
      style={{
        background: 'white',
        border: '0.5px solid var(--gw-border)',
        borderRadius: 12,
        overflow: 'hidden',
      }}
    >
      <div style={{ padding: '14px 16px', background: 'var(--gw-blue-bg)', borderBottom: '0.5px solid var(--gw-blue-b)' }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--gw-navy)', marginBottom: 3 }}>
          Your first session is on record.
        </div>
        <div style={{ fontSize: 12, color: 'var(--gw-blue-t)', lineHeight: 1.5 }}>
          {mode ? `${MODE_LABEL[mode]}. ` : ''}Enter your email to save it and come back for session 2.
        </div>
      </div>

      {/* Section 1: email */}
      <div style={{ padding: '16px', borderBottom: '0.5px solid var(--gw-border)' }}>
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
            disabled={saveSession.isPending}
            style={{ marginTop: 4 }}
          >
            {saveSession.isPending ? 'Sending…' : 'Save my session'}
          </button>
        </form>
        <div style={{ marginTop: 10, fontSize: 11, color: 'var(--gw-muted)', textAlign: 'center', lineHeight: 1.5 }}>
          A link lands in your inbox. Follow it on this device and your session is waiting.
        </div>
      </div>

      {/* Section 2: invite link */}
      <div style={{ padding: '14px 16px', borderBottom: '0.5px solid var(--gw-border)' }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gw-muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 10 }}>
          Share your invite link
        </div>

        <div style={{ display: 'flex', gap: 7, alignItems: 'center', marginBottom: 10 }}>
          <input
            readOnly
            value={inviteUrl}
            style={{ flex: 1, fontSize: 11, padding: '7px 9px', border: '0.5px solid var(--gw-border)', borderRadius: 6, background: 'var(--gw-bg)', color: 'var(--gw-sub)', fontFamily: 'inherit', minWidth: 0 }}
            onClick={e => (e.target as HTMLInputElement).select()}
          />
          <button
            onClick={copyLink}
            style={{ padding: '7px 14px', borderRadius: 6, background: copied ? 'var(--gw-green-t)' : 'var(--gw-navy)', color: 'white', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit', flexShrink: 0, transition: 'background 0.15s' }}
          >
            {copied ? 'Copied' : 'Copy link'}
          </button>
        </div>

        <div style={{ fontSize: 11, color: 'var(--gw-sub)', lineHeight: 1.65, marginBottom: 12 }}>
          The people you share this with will submit their own account of the same situation, independently, without seeing what you wrote. Their version and yours will be cross-referenced to show where you agree, where you differ, and what the gap means. That is the report.
        </div>

        <div className="gw-fld" style={{ marginBottom: 0 }}>
          <label className="gw-label">Add a note to send with your link <span style={{ fontWeight: 400, color: 'var(--gw-muted)' }}>(optional)</span></label>
          <textarea
            className="gw-ta"
            rows={2}
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="e.g. I opened this so we both have a record before the conversation."
          />
        </div>
      </div>

      {/* Section 3: send directly by email */}
      <div style={{ padding: '14px 16px' }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gw-muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>
          Add participant email
        </div>
        <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.5, marginBottom: 10 }}>
          Add their email and we will send them directly. Each participant gets an invitation email with a subject drawn from what you described.
        </div>
        {participantAdded ? (
          <div style={{ fontSize: 12, color: 'var(--gw-green-t)', lineHeight: 1.5 }}>
            Saved. They will receive an invite when your ground opens.
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
            <input
              className="gw-input"
              type="email"
              placeholder="them@company.com"
              value={participantEmail}
              onChange={e => { setParticipantEmail(e.target.value); setParticipantAdded(false) }}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addParticipant() } }}
              style={{ flex: 1, margin: 0 }}
            />
            <button
              onClick={addParticipant}
              style={{ padding: '9px 16px', borderRadius: 6, background: 'var(--gw-navy)', color: 'white', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit', flexShrink: 0 }}
            >
              Add
            </button>
          </div>
        )}
      </div>

      <div style={{ padding: '0 16px 14px', textAlign: 'center' }}>
        <button
          onClick={onClear}
          style={{ background: 'none', border: 'none', fontSize: 11, color: 'var(--gw-muted)', cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline', padding: 0 }}
        >
          Start over
        </button>
      </div>
    </div>
  )
}
