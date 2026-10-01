import { useState } from 'react'
import { FieldLabel, TextField } from './FormFields'
import './gw-ui.css'

/**
 * A PASSWORD FIELD WITH "SHOW" (prototype: password.jpg, signup.jpg, reset.jpg).
 *
 * Added here for group 3, piece 1 (signing in and joining): every sign-in screen that asks for a
 * password drew its own copy of this (`auth-kit.tsx`'s old `PasswordField`), with its own CSS. It
 * is a shared shape now - the label above a box, a button inside it that shows or hides what was
 * typed - so a later screen that needs a password field does not draw a fourth copy.
 *
 * Somebody typing on a phone cannot see what their thumb hit, and a password that fails for a typo
 * they could not see reads as the product refusing them. The button is a real button, so the
 * keyboard reaches it and a screen reader says whether the password is showing.
 */
export function PasswordField({ id, label, value, onChange, autoComplete, autoFocus, spokenAs }: {
  id: string
  label: string
  /** What "Show the …" says aloud. Defaults to the label ("Show the new password"); a second box
      says "the password you typed again", because "Show the type it again" is not a sentence. */
  spokenAs?: string
  value: string
  onChange: (v: string) => void
  autoComplete: 'current-password' | 'new-password'
  autoFocus?: boolean
}) {
  const [shown, setShown] = useState(false)
  return (
    <FieldLabel htmlFor={id}>
      {label}
      <span className="gwui-password-wrap">
        <TextField
          id={id}
          type={shown ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          autoCapitalize="off"
          spellCheck={false}
        />
        <button
          type="button"
          className="gwui-password-show"
          onClick={() => setShown(s => !s)}
          aria-controls={id}
          aria-pressed={shown}
          aria-label={`${shown ? 'Hide' : 'Show'} the ${spokenAs ?? label.toLowerCase()}`}
        >
          {shown ? 'Hide' : 'Show'}
        </button>
      </span>
    </FieldLabel>
  )
}

/**
 * THE RULES A NEW PASSWORD HAS TO MEET, TICKED AS THEY ARE MET (group 3 drift list, piece 1).
 *
 * Moved here from auth-kit.tsx's own `PasswordRules`, which drew this list with a one-off
 * `gwui-rule-met` class: the ticked style now belongs to this shared part (`gwui-password-rule-met`)
 * rather than floating as a page-only rule. `auth-kit.tsx` still works out which rules are met
 * (`todaysPasswordRules`, which the server checks too) and hands the finished list here to render.
 *
 * Each mark is also said in words, for anyone who cannot see a tick.
 */
export function PasswordRulesList({ rules }: { rules: { text: string; met: boolean }[] }) {
  return (
    <ul className="gwui-rules" aria-label="What your password needs">
      {rules.map(r => (
        <li key={r.text} className={r.met ? 'gwui-password-rule-met' : undefined}>
          <span aria-hidden>{r.met ? '✓' : '○'}</span>
          {/* Read aloud as "Met, at least 8 characters" or "Not met yet, at least 8 characters". */}
          <span className="gwui-sr-only">{r.met ? 'Met, ' : 'Not met yet, '}</span>
          {r.text}
        </li>
      ))}
    </ul>
  )
}
