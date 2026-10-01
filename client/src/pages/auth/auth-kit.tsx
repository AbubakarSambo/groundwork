import type { ReactNode } from 'react'
import {
  Mark, Page, Panel, PageTitle, FieldLabel, TextField, Note,
  PasswordField as SharedPasswordField, PasswordRulesList, SplitPage, SplitPanelLine, SplitPanelList,
} from '@/components/gw/ui'
import { todaysPasswordRules } from './password-rules'

/**
 * THE PARTS EVERY SIGN-IN SCREEN IS BUILT FROM (A2) - REBUILT FROM `components/gw/ui` ONLY (group
 * 3, piece 1, "signing in and joining").
 *
 * The prototype draws nine account screens, and eight of them are the same shape: the Groundwork
 * mark in the corner, a narrow column, a Literata heading, one plain sentence under it, and the
 * fields - exactly the shape `Page narrow` / `Mark` / `PageTitle` already give the invitation and
 * "Almost in". Sign-in is the ninth, and it is that same column with a dark panel beside it
 * (`SplitPage`, added here because no earlier screen needed one).
 *
 * This file keeps the names every other auth page already imports (`AuthCard`, `AuthSplit`,
 * `AuthField`, `PasswordField`, `PasswordRules`, `PasswordStrength`, `AuthError`, `AuthNotice`,
 * `GoogleMark`, `AuthBrand`) - only what each one is built from changed, so `AuthPage.tsx`,
 * `LinkExpired.tsx`, `EmailConfirmed.tsx`, `LinkSentPanel.tsx`, `GoogleFailedPage.tsx`,
 * `SignOutPage.tsx` and `ChoosePasswordPage.tsx` all draw the new parts without each having to be
 * rewritten on its own.
 */

/** The mark and the name, top-left of every account screen. `Arrival.tsx` still imports this by
    name for the pages this task does not touch, so the export stays. */
export function AuthBrand() {
  return <Mark />
}

/**
 * A white card in the middle of the cream page: forgot, reset, choose a password, check your
 * email, Google did not finish, signed out, create an account.
 *
 * GROUP 3 REVIEW, BATCH B: signup.jpg and verify-expired.jpg both draw this column inside a white
 * card with a rule and rounded corners (app.css's `.panel`) - this used to be `Page narrow` with
 * nothing else, so every one of these screens sat directly on the cream page. The shared `Panel`
 * draws that same card; `.gwui-auth-card` restores the 30px rhythm `Page narrow`'s own direct
 * children get (gw-ui.css), now that the mark, heading and form are nested one level deeper,
 * inside the panel rather than directly inside the page.
 */
export function AuthCard({ title, sub, children }: {
  title: string
  sub?: ReactNode
  children?: ReactNode
}) {
  return (
    <Page narrow>
      <Panel className="gwui-auth-card">
        <Mark />
        <PageTitle title={title} subtitle={sub} />
        {children}
      </Panel>
    </Page>
  )
}

/**
 * The sign-in screen's two halves: the form on the cream side, and the dark panel with the one
 * line about what Groundwork is (`SplitPage`). On a phone the panel goes, because the form is the
 * only thing somebody on that screen came to do.
 */
export function AuthSplit({ title, sub, children }: {
  title: string
  sub?: ReactNode
  children?: ReactNode
}) {
  return (
    <SplitPage
      panel={
        <>
          <SplitPanelLine>Short check-ins, and proof of what actually moved.</SplitPanelLine>
          <SplitPanelList
            items={[
              { dot: 'said', text: 'What people say, in their own words' },
              { dot: 'proven', text: 'What a photo, a payment or a document shows' },
            ]}
          />
        </>
      }
    >
      <PageTitle title={title} subtitle={sub} />
      {children}
    </SplitPage>
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
    <FieldLabel htmlFor={id}>
      {label}
      <TextField
        id={id}
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        autoComplete={autoComplete}
        placeholder={placeholder}
        autoFocus={autoFocus}
      />
    </FieldLabel>
  )
}

/** A password box with "Show" inside it. The shared part now lives in `components/gw/ui`
    (`PasswordField.tsx`); kept under this name so every caller is unchanged. */
export const PasswordField = SharedPasswordField

/**
 * THE RULES A NEW PASSWORD HAS TO MEET, TICKED AS THEY ARE MET.
 *
 * The prototype's rules, which the server checks too (see password-rules.ts). A list that promised
 * rules the server does not check would let somebody meet every one and still be refused.
 *
 * Each mark is also said in words, for anyone who cannot see a tick.
 */
export function PasswordRules({ password, confirm, email }: { password: string; confirm?: string; email?: string | null }) {
  const rules = todaysPasswordRules(password, confirm, email)
  return <PasswordRulesList rules={rules} />
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
export function PasswordStrength({ password, email }: { password: string; email?: string | null }) {
  const rules = todaysPasswordRules(password, undefined, email)
  const allMet = rules.every(r => r.met)
  return (
    <div>
      <div className="gwui-strength-bar" aria-hidden>
        {rules.map(r => <span key={r.text} className={r.met ? 'gwui-strength-on' : undefined} />)}
      </div>
      {allMet && <p className="gwui-strength-ok" role="status">Strong enough</p>}
      <PasswordRules password={password} email={email} />
    </div>
  )
}

/** A line saying something went wrong, read out as soon as it appears. */
export function AuthError({ children }: { children: ReactNode }) {
  return <Note tone="error">{children}</Note>
}

/**
 * A calm notice: not an error, something the person should know. The same amber tone as `Callout`
 * (`tone="warning"`), but its own two lines rather than `Callout`'s single paragraph: a title of
 * its own ("Check your email") above the sentence under it, the same shape the prototype's account
 * screens draw this in.
 */
export function AuthNotice({ title, children, role = 'status' }: { title?: string; children: ReactNode; role?: 'status' | 'alert' }) {
  return (
    <div className="gwui-callout gwui-callout-warning" role={role}>
      {title && <p className="gwui-callout-title">{title}</p>}
      <p className="gwui-callout-body">{children}</p>
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
