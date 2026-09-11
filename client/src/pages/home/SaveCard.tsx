import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { authApi } from '@/api/auth'
import { entryStorage } from '@/api/entry'
import type { EntryMode } from '@/api/entry'
import { useTheTrap } from '@/components/gw/a-field-nobody-can-see'
import { looksLikeAnAddress, NOT_AN_ADDRESS } from '@/components/gw/an-address-that-can-receive-mail'
import { Confirm } from '@/components/gw/a-second-press-before-it-is-gone'
import { copy } from '@/components/gw/copying-can-fail'

type Variant = 'admin' | 'participant'

const MODE_LABEL: Record<string, string> = {
  something_new: 'Something new',
  look_back: 'Look back',
  look_forward: 'Look forward',
  both: 'Both',
}

/*
 * VITE_APP_URL WAS SET NOWHERE. Referenced in exactly one place in the client and present in neither
 * env file, so every invite link copied off this card was `/invite?token=...` with no origin - in every
 * environment - and unopenable. The page's own origin is the right answer whenever nothing says otherwise.
 */
const APP_URL = import.meta.env.VITE_APP_URL || window.location.origin

function generateToken(): string {
  const arr = new Uint8Array(24)
  crypto.getRandomValues(arr)
  return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('')
}

interface Props {
  mode?: EntryMode
  variant?: Variant
  onClear: () => void
  email?: string
}

export function SaveCard({ mode, variant = 'admin', onClear, email: initialEmail }: Props) {
  const navigate = useNavigate()
  const [email, setEmail] = useState(initialEmail ?? '')
  const [emailError, setEmailError] = useState('')
  const [copied, setCopied] = useState(false)
  const [note, setNote] = useState('')
  const [participantEmail, setParticipantEmail] = useState('')
  const [participantAdded, setParticipantAdded] = useState(false)
  const [participantError, setParticipantError] = useState('')

  const [inviteToken] = useState<string>(() => {
    const session = entryStorage.load()
    if (session?.inviteToken) return session.inviteToken
    const token = generateToken()
    if (session) entryStorage.save({ ...session, inviteToken: token })
    return token
  })

  const inviteUrl = `${APP_URL}/invite?token=${inviteToken}`

  /* The honeypot the API has always accepted and no form has ever rendered. */
  const trap = useTheTrap()

  const saveSession = useMutation({
    mutationFn: (emailVal: string) => authApi.entrySave(emailVal, undefined, trap.filled),
    onSuccess: () => {
      const trimmed = email.trim()
      sessionStorage.setItem('gw_magic_type', 'entry')
      sessionStorage.setItem('gw_magic_email', trimmed)
      localStorage.setItem('gw_magic_email', trimmed)
      navigate(`/auth/sent?email=${encodeURIComponent(trimmed)}`)
    },
    /*
     * A FAILURE MUST NEVER RENDER THE SUCCESS SCREEN. This body was byte-for-byte the onSuccess
     * above: it wrote the two storage keys and navigated to "check your email" on a request that had
     * failed - so nothing was sent and the person was told to go and look for it. Stay here, keep
     * what they typed, say what happened, and leave the button live.
     */
    onError: () => {
      setEmailError('That did not save - nothing has been sent. Try again.')
    },
  })

  if (variant === 'participant') {
    return (
      <div style={{ background: 'white', border: '1px solid var(--gw-border)', borderRadius: 12, overflow: 'hidden' }}>
        {/* What happens next */}
        <div style={{ padding: '14px 16px', background: 'var(--gw-green-bg)', borderBottom: '1px solid var(--gw-green-b)' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gw-green-t)', marginBottom: 8 }}>
            Session 1 is on record.
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.5 }}>
              <span style={{ color: 'var(--gw-green-t)', fontWeight: 700, flexShrink: 0 }}>✓</span>
              <span>Your check-in is saved. The report shows where people agree, where they differ, and what to do next.</span>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.5 }}>
              <span style={{ color: 'var(--gw-muted)', fontWeight: 700, flexShrink: 0 }}>2</span>
              <span>Everyone else checks in independently. What they say is compared with what you said, to show where there is alignment and where there are gaps.</span>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.5 }}>
              <span style={{ color: 'var(--gw-muted)', fontWeight: 700, flexShrink: 0 }}>3</span>
              <span>The report shows where everyone sees the same thing, where they do not, and what the gaps between them mean.</span>
            </div>
          </div>
        </div>
        {/* Save account */}
        <div style={{ padding: '14px 16px', background: 'var(--gw-blue-bg)', borderBottom: '1px solid var(--gw-blue-b)' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gw-navy)', marginBottom: 3 }}>
            Save this to receive the report.
          </div>
          <div style={{ fontSize: 12, color: 'var(--gw-blue-t)', lineHeight: 1.5 }}>
            Enter the email where you received this invite. We will send you a link when the report is ready.
          </div>
        </div>
        <div style={{ padding: '16px' }}>
          <form onSubmit={save}>
            {/* Once. Two renders shared an id and a name, which is invalid markup and exactly what makes a password
                manager fill the trap and lock a real person out. */}
            {trap.field}
            <div className="gw-fld">
              <label className="gw-label">Your email</label>
              <input
                className="gw-input"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => { setEmail(e.target.value); setEmailError('') }}
                autoFocus
              />
            </div>
            {emailError && <div className="gw-er" role="alert">{emailError}</div>}
            <button
              type="submit"
              className="gw-btn"
              disabled={saveSession.isPending}
              style={{ marginTop: 4 }}
            >
              {saveSession.isPending ? 'Sending…' : 'Send me my link'}
            </button>
          </form>
        </div>
        <div style={{ padding: '0 16px 14px', textAlign: 'center' }}>
          <StartOver onClear={onClear} />
        </div>
      </div>
    )
  }

  function save(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = email.trim().toLowerCase()
    if (!looksLikeAnAddress(trimmed)) { setEmailError(NOT_AN_ADDRESS); return }
    setEmailError('')
    const session = entryStorage.load()
    if (session) {
      entryStorage.save({ ...session, inviteToken, inviteNote: note.trim() || undefined })
    }
    saveSession.mutate(trimmed)
  }

  async function copyLink() {
    /* The button never flipped to "Copied" where copy is unsupported, while the note below still saved - so the
       card looked alive and the lead pasted whatever was already on the clipboard into the invite email. */
    if (await copy(inviteUrl)) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } else {
      setEmailError('Copying is not available here. Select the link and copy it yourself.')
    }
    const session = entryStorage.load()
    if (session && note.trim()) {
      entryStorage.save({ ...session, inviteToken, inviteNote: note.trim() })
    }
  }

  /* Two silent returns - a bad address, and no session to attach to - each produced exactly the
     same nothing as success. Both say so now. */
  function addParticipant() {
    const trimmed = participantEmail.trim().toLowerCase()
    if (!looksLikeAnAddress(trimmed)) { setParticipantError(NOT_AN_ADDRESS); return }
    const session = entryStorage.load()
    if (!session) { setParticipantError('Nothing to attach this to - reload and try again.'); return }
    setParticipantError('')
    entryStorage.save({ ...session, participantEmail: trimmed, inviteToken, inviteNote: note.trim() || undefined })
    setParticipantAdded(true)
  }

  return (
    <div
      style={{
        background: 'white',
        border: '1px solid var(--gw-border)',
        borderRadius: 12,
        overflow: 'hidden',
      }}
    >
      <div style={{ padding: '14px 16px', background: 'var(--gw-blue-bg)', borderBottom: '1px solid var(--gw-blue-b)' }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--gw-navy)', marginBottom: 3 }}>
          Your first session is on record.
        </div>
        <div style={{ fontSize: 12, color: 'var(--gw-blue-t)', lineHeight: 1.5 }}>
          {mode ? `${MODE_LABEL[mode]}. ` : ''}Enter your email to save it. The report builds as people check in - you will see alignment and gaps emerge over time.
        </div>
      </div>

      {/* Section 1: email */}
      <div style={{ padding: '16px', borderBottom: '1px solid var(--gw-border)' }}>
        <form onSubmit={save}>
          {/* The admin variant called entrySave with trap.filled and never rendered the trap, so its spam defence did nothing. */}
          {trap.field}
          <div className="gw-fld">
            <label className="gw-label">Your email</label>
            <input
              className="gw-input"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => { setEmail(e.target.value); setEmailError('') }}
              autoFocus
            />
          </div>
          {emailError && <div className="gw-er" role="alert">{emailError}</div>}
          <button
            type="submit"
            className="gw-btn"
            disabled={saveSession.isPending}
            style={{ marginTop: 4 }}
          >
            {saveSession.isPending ? 'Sending…' : 'Save and continue'}
          </button>
        </form>
        <div style={{ marginTop: 10, fontSize: 11, color: 'var(--gw-muted)', textAlign: 'center', lineHeight: 1.5 }}>
          A link lands in your inbox. Click it to finish saving and set a password.
        </div>
      </div>

      {/* Section 2: invite link */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--gw-border)' }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gw-muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 10 }}>
          Share your invite link
        </div>

        <div style={{ display: 'flex', gap: 7, alignItems: 'center', marginBottom: 10 }}>
          <input
            readOnly
            value={inviteUrl}
            style={{ flex: 1, fontSize: 11, padding: '7px 9px', border: '1px solid var(--gw-border)', borderRadius: 6, background: 'var(--gw-bg)', color: 'var(--gw-sub)', fontFamily: 'inherit', minWidth: 0 }}
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
          Each person checks in independently without seeing what you wrote. What they say is compared with what you said to show where you agree, where you differ, and what the gap means.
        </div>

        <div className="gw-fld" style={{ marginBottom: 0 }}>
          <label className="gw-label">Add a note to send with your link <span style={{ fontWeight: 400, color: 'var(--gw-muted)' }}>(optional)</span></label>
          <textarea
            className="gw-ta"
            rows={2}
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="e.g. I started this so we both know where things stand before we talk."
          />
        </div>
      </div>

      {/* Section 3: send directly by email */}
      <div style={{ padding: '14px 16px' }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gw-muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>
          Invite a participant
        </div>
        <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.5, marginBottom: 10 }}>
          Add their email and we will send them an invite once you have saved.
        </div>
        {participantError && <div className="gw-er" role="alert" style={{ marginBottom: 6 }}>{participantError}</div>}
        {participantAdded ? (
          <div style={{ fontSize: 12, color: 'var(--gw-green-t)', lineHeight: 1.5 }}>
            Saved. They will receive an invite once you have saved.
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
        <StartOver onClear={onClear} />
      </div>
    </div>
  )
}

/**
 * "START OVER" ASKS FIRST. Two bare buttons discarded the whole anonymous conversation and its report
 * on one press. EntryChatPage confirms the identical action in all three of its placements with one
 * sentence, already written and already approved; it is the sentence here.
 */
function StartOver({ onClear }: { onClear: () => void }) {
  const [asking, setAsking] = useState(false)
  if (asking) {
    return (
      <Confirm
        saying="This throws away this session and everything in it."
        confirmLabel="Start over" keepLabel="Keep going"
        onConfirm={onClear} onKeep={() => setAsking(false)}
      />
    )
  }
  return (
    <button
      onClick={() => setAsking(true)}
      style={{ background: 'none', border: 'none', fontSize: 11, color: 'var(--gw-muted)', cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline', padding: 0 }}
    >
      Start over
    </button>
  )
}
