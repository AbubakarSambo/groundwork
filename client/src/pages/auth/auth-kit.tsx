import { useId, useState } from 'react'
import { MARKETING_URL } from '@/lib/marketing'
import { todaysPasswordRules } from './password-rules'

/**
 * THE PARTS EVERY SIGN-IN SCREEN IS BUILT FROM (A2).
 *
 * The prototype draws nine account screens, and eight of them are the same shape: the Groundwork
 * mark in the corner, a white card on the cream page, a Literata heading, one plain sentence under
 * it, and the fields. Sign-in is the ninth, and it is that card with a dark panel beside it.
 *
 * Built once here, from the U.1 look, so the screens cannot drift apart again the way the old
 * sign-in, "check your email" and "choose a password" pages did, each with its own header and its
 * own idea of a heading.
 */

/** The three bars, drawn in the text colour. The same mark as the sidebar's. */
function Bars() {
  return (
    <svg width="22" height="17" viewBox="0 0 22 17" aria-hidden focusable="false">
      <rect x="5" y="0" width="12" height="3" rx="1.5" fill="currentColor" opacity="0.45" />
      <rect x="2" y="6" width="18" height="3" rx="1.5" fill="currentColor" opacity="0.72" />
      <rect x="0" y="12" width="22" height="3" rx="1.5" fill="currentColor" />
    </svg>
  )
}

/** The mark and the name. It always goes back to the marketing site, as every Groundwork mark does. */
export function AuthBrand() {
  return (
    <a href={MARKETING_URL} className="gw-auth-brand">
      <Bars />
      <span>Groundwork</span>
    </a>
  )
}

/** The heading and the one sentence under it. */
function AuthHead({ title, sub }: { title: string; sub?: React.ReactNode }) {
  return (
    <>
      <h1 className="gw-auth-title">{title}</h1>
      {sub && <p className="gw-auth-sub">{sub}</p>}
    </>
  )
}

/**
 * A white card in the middle of the cream page: forgot, reset, choose a password, check your
 * email, Google did not finish, signed out.
 */
export function AuthCard({ title, sub, children }: {
  title: string
  sub?: React.ReactNode
  children?: React.ReactNode
}) {
  return (
    <div className="gw-auth-page">
      <div className="gw-auth-card">
        <AuthBrand />
        <AuthHead title={title} sub={sub} />
        {children}
      </div>
    </div>
  )
}

/**
 * The sign-in screen's two halves: the form on the cream side, and the dark panel with the one line
 * about what Groundwork is. On a phone the panel goes, because the form is the only thing somebody
 * on that screen came to do.
 */
export function AuthSplit({ title, sub, children }: {
  title: string
  sub?: React.ReactNode
  children?: React.ReactNode
}) {
  return (
    <div className="gw-auth-split">
      <section className="gw-auth-split-form">
        <AuthBrand />
        <div className="gw-auth-split-body">
          <AuthHead title={title} sub={sub} />
          {children}
        </div>
      </section>
      <aside className="gw-auth-split-panel" aria-label="What Groundwork is">
        <p className="gw-auth-panel-line">Short check-ins, and proof of what actually moved.</p>
        <ul className="gw-auth-panel-list">
          <li><span className="gw-auth-dot gw-auth-dot-said" aria-hidden />What people say, in their own words</li>
          <li><span className="gw-auth-dot gw-auth-dot-proven" aria-hidden />What a photo, a payment or a document shows</li>
        </ul>
      </aside>
    </div>
  )
}

/** One labelled field. The label is always above the box and always names it. */
export function AuthField({ id, label, type = 'text', value, onChange, autoComplete, placeholder, autoFocus }: {
  id: string
  label: string
  type?: 'text' | 'email'
  value: string
  onChange: (v: string) => void
  autoComplete?: string
  placeholder?: string
  autoFocus?: boolean
}) {
  return (
    <div className="gw-auth-fld">
      <label className="gw-auth-label" htmlFor={id}>{label}</label>
      <input
        id={id}
        className="gw-auth-input"
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        autoComplete={autoComplete}
        placeholder={placeholder}
        autoFocus={autoFocus}
      />
    </div>
  )
}

/**
 * A PASSWORD FIELD WITH "SHOW".
 *
 * The prototype puts "Show" inside every password box. Somebody typing on a phone cannot see what
 * their thumb hit, and a password that fails for a typo they could not see reads as the product
 * refusing them. The button is a real button, so the keyboard reaches it and a screen reader says
 * whether the password is showing.
 */
export function PasswordField({ id, label, value, onChange, autoComplete, autoFocus }: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  autoComplete: 'current-password' | 'new-password'
  autoFocus?: boolean
}) {
  const [shown, setShown] = useState(false)
  return (
    <div className="gw-auth-fld">
      <label className="gw-auth-label" htmlFor={id}>{label}</label>
      <span className="gw-auth-pw">
        <input
          id={id}
          className="gw-auth-input"
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
          className="gw-auth-show"
          onClick={() => setShown(s => !s)}
          aria-controls={id}
          aria-pressed={shown}
          aria-label={shown ? `Hide the ${label.toLowerCase()}` : `Show the ${label.toLowerCase()}`}
        >
          {shown ? 'Hide' : 'Show'}
        </button>
      </span>
    </div>
  )
}

/**
 * THE RULES A NEW PASSWORD HAS TO MEET, TICKED AS THEY ARE MET.
 *
 * These are the rules the server enforces today (see password-rules.ts), not the prototype's. The
 * prototype's rules are a decision waiting for Hafsah, and a list that promised rules the server
 * does not check would let somebody meet every one and still be refused.
 *
 * Each mark is also said in words, for anyone who cannot see a tick.
 */
export function PasswordRules({ password, confirm }: { password: string; confirm?: string }) {
  const listId = useId()
  const rules = todaysPasswordRules(password, confirm)
  return (
    <ul className="gw-auth-rules" id={listId} aria-label="What your password needs">
      {rules.map(r => (
        <li key={r.text} className={r.met ? 'met' : undefined}>
          <span className="gw-auth-rule-mark" aria-hidden>{r.met ? '✓' : '○'}</span>
          {/* Read aloud as "Met, at least 8 characters" or "Not met yet, at least 8 characters". */}
          <span className="gw-sr-only">{r.met ? 'Met, ' : 'Not met yet, '}</span>
          {r.text}
        </li>
      ))}
    </ul>
  )
}

/**
 * THE STRENGTH BAR, MADE ONLY OF THE RULES THE SERVER CHECKS.
 *
 * The prototype draws a four-part bar over "Strong enough". There is no strength score anywhere in
 * the product, and inventing one would tell people a password is strong on grounds nobody checks. So
 * the bar has one part per rule the server enforces today, each filled when its rule is met, and it
 * says "Strong enough" only when every rule is. The rules are listed under it, so the bar never has
 * to be read on its own.
 */
export function PasswordStrength({ password }: { password: string }) {
  const rules = todaysPasswordRules(password)
  const allMet = rules.every(r => r.met)
  return (
    <div className="gw-auth-strength">
      <div className="gw-auth-strength-bar" aria-hidden>
        {rules.map(r => <span key={r.text} className={r.met ? 'on' : undefined} />)}
      </div>
      {allMet && <p className="gw-auth-strength-ok" role="status">Strong enough</p>}
      <PasswordRules password={password} />
    </div>
  )
}

/** A line saying something went wrong, read out as soon as it appears. */
export function AuthError({ children }: { children: React.ReactNode }) {
  return <p className="gw-auth-error" role="alert">{children}</p>
}

/** A calm notice: not an error, something the person should know. */
export function AuthNotice({ title, children, role = 'status' }: { title?: string; children: React.ReactNode; role?: 'status' | 'alert' }) {
  return (
    <div className="gw-auth-notice" role={role}>
      {title && <p className="gw-auth-notice-h">{title}</p>}
      <p>{children}</p>
    </div>
  )
}

/**
 * GOOGLE'S OWN MARK. Drawn inline so it arrives with the button: people look for the mark rather
 * than reading the words. The four colours are Google's published brand values.
 */
export function GoogleMark() {
  return (
    <svg width="17" height="17" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path fill="#4285F4" d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z" />
      <path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z" />
      <path fill="#FBBC05" d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24s.85 6.91 2.34 9.88l7.35-5.7z" />
      <path fill="#EA4335" d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z" />
    </svg>
  )
}
