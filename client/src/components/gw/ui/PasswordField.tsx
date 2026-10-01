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
