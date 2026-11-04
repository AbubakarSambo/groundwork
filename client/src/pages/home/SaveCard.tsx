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
import { Panel, Callout, SubHeading, FieldLabel, TextField, TextArea, Button, Note, Steps, Step } from '@/components/gw/ui'

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

/**
 * REBUILT FROM THE SHARED PARTS (group 3, piece 4, B1-starting-a-check-in): the outer card is a
 * `Panel` (`pad={false}`, each inner block a `.gwui-panel-row`, the prototype's own white,
 * bordered, 12-pixel-corner panel); the two tinted banners are `Callout` with a `title` (the same
 * two-line shape `AuthNotice` already draws for the amber tone, now also in green and in a new
 * blue `tone="info"`); the email form uses `FieldLabel`/`TextField`/`Button`/`Note`; the
 * participant variant's three-line checklist uses `Steps`/`Step`. The invite link itself no
 * longer sits in a read-only text box to select by hand - it is plain text next to the Copy
 * button, the same shape `TheInviteLink.tsx` already uses for the organisation's own invite link -
 * because the button already copies it and a second way to select the same text added nothing.
 * No API call, and no state the form keeps, changed.
 *
 * PRIMARY-BUTTONS-NEVER-TOGETHER: the participant variant's "Send me my link" and the admin
 * variant's "Save and continue" are each the one primary submit button on their own early return -
 * `variant === 'participant'` returns before the admin branch's button is ever reached, so the two
 * never render at once.
 */
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
      setEmailError('That didn’t send. Try again.')
    },
  })

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

  if (variant === 'participant') {
    return (
      <Panel pad={false}>
        <Callout tone="success" title="Session 1 is on record.">
          <Steps>
            <Step done>Your check-in is saved. The report shows where people agree, where they differ, and what to do next.</Step>
            <Step>Everyone else checks in independently. What they say is compared with what you said, to show where there is alignment and where there are gaps.</Step>
            <Step>The report shows where everyone sees the same thing, where they do not, and what the gaps between them mean.</Step>
          </Steps>
        </Callout>
        <Callout tone="info" title="Save this to receive the report.">
          Enter the email where you received this invite. We will send you a link when the report is ready.
        </Callout>
        <div className="gwui-panel-row">
          <form onSubmit={save}>
            {/* Once. Two renders shared an id and a name, which is invalid markup and exactly what makes a password
                manager fill the trap and lock a real person out. */}
            {trap.field}
            <FieldLabel htmlFor="savecard-email-participant">Your email</FieldLabel>
            <TextField
              id="savecard-email-participant"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => { setEmail(e.target.value); setEmailError('') }}
              autoFocus
            />
            {emailError && <Note tone="error">{emailError}</Note>}
            <Button type="submit" disabled={saveSession.isPending}>
              {saveSession.isPending ? 'Sending…' : 'Send me my link'}
            </Button>
          </form>
        </div>
        <div className="gwui-panel-row" style={{ textAlign: 'center' }}>
          <StartOver onClear={onClear} />
        </div>
      </Panel>
    )
  }

  return (
    <Panel pad={false}>
      <Callout tone="info" title="Your first session is on record.">
        {mode ? `${MODE_LABEL[mode]}. ` : ''}Enter your email to save it. The report builds as people check in - you will see alignment and gaps emerge over time.
      </Callout>

      {/* Section 1: email */}
      <div className="gwui-panel-row">
        <form onSubmit={save}>
          {/* The admin variant called entrySave with trap.filled and never rendered the trap, so its spam defence did nothing. */}
          {trap.field}
          <FieldLabel htmlFor="savecard-email">Your email</FieldLabel>
          <TextField
            id="savecard-email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={e => { setEmail(e.target.value); setEmailError('') }}
            autoFocus
          />
          {emailError && <Note tone="error">{emailError}</Note>}
          <Button type="submit" disabled={saveSession.isPending}>
            {saveSession.isPending ? 'Sending…' : 'Save and continue'}
          </Button>
        </form>
        <p className="gwui-fine" style={{ textAlign: 'center' }}>
          A link lands in your inbox. Click it to finish saving and set a password.
        </p>
      </div>

      {/* Section 2: invite link */}
      <div className="gwui-panel-row">
        <SubHeading>Share your invite link</SubHeading>

        <span className="gwui-invite-link-row">
          <span className="gwui-invite-link-address">{inviteUrl}</span>
          <Button kind="secondary" size="small" onClick={copyLink}>
            {copied ? 'Copied' : 'Copy link'}
          </Button>
        </span>

        <p className="gwui-panel-text-muted">
          Each person checks in independently without seeing what you wrote. What they say is compared with what you said to show where you agree, where you differ, and what the gap means.
        </p>

        <FieldLabel htmlFor="savecard-note">Add a note to send with your link (optional)</FieldLabel>
        <TextArea
          id="savecard-note"
          rows={2}
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="e.g. I started this so we both know where things stand before we talk."
        />
      </div>

      {/* Section 3: send directly by email */}
      <div className="gwui-panel-row">
        <SubHeading>Invite someone to answer</SubHeading>
        <p className="gwui-panel-text-muted">
          Add their email and we will send them an invite once you have saved.
        </p>
        {participantError && <Note tone="error">{participantError}</Note>}
        {participantAdded ? (
          <Callout tone="success">Saved. They will receive an invite once you have saved.</Callout>
        ) : (
          <span className="gwui-invite-link-row">
            <TextField
              type="email"
              placeholder="them@company.com"
              value={participantEmail}
              onChange={e => { setParticipantEmail(e.target.value); setParticipantAdded(false) }}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addParticipant() } }}
            />
            <Button kind="secondary" size="small" onClick={addParticipant}>Add</Button>
          </span>
        )}
      </div>

      <div className="gwui-panel-row" style={{ textAlign: 'center' }}>
        <StartOver onClear={onClear} />
      </div>
    </Panel>
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
    <button type="button" onClick={() => setAsking(true)} className="gwui-plain-link">
      Start over
    </button>
  )
}
