import { describe, it, expect } from 'vitest'
import { useState } from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { AuthCard, AuthSplit, PasswordField, PasswordRules } from './auth-kit'
import { todaysPasswordRules, meetsTodaysPasswordRules } from './password-rules'

/**
 * THE PARTS THE ACCOUNT SCREENS ARE BUILT FROM, AS A PERSON READS THEM.
 */

describe('AuthCard and AuthSplit', () => {
  it('a card shows the Groundwork mark, one heading and the sentence under it', () => {
    render(<AuthCard title="Forgot your password?" sub="We will email you a link." />)
    expect(screen.getByRole('link', { name: 'Groundwork' })).toBeTruthy()
    expect(screen.getByRole('heading', { level: 1, name: 'Forgot your password?' })).toBeTruthy()
    expect(screen.getByText('We will email you a link.')).toBeTruthy()
  })

  /*
   * GROUP 3 REVIEW, BATCH B: signup.jpg and verify-expired.jpg both draw a white card (app.css's
   * `.panel`) behind the mark, heading and form - this used to sit loose on the cream page.
   */
  it('draws its content inside the shared white panel, as the prototype does', () => {
    render(<AuthCard title="That link has expired" sub="Nothing is lost; ask for a fresh one." />)
    const heading = screen.getByRole('heading', { level: 1, name: 'That link has expired' })
    const panel = heading.closest('.gwui-panel')
    expect(panel).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Groundwork' }).closest('.gwui-panel')).toBe(panel)
  })

  it('the split screen carries the prototype\'s panel, word for word', () => {
    render(<AuthSplit title="Sign in" />)
    expect(screen.getByRole('heading', { level: 1, name: 'Sign in' })).toBeTruthy()
    expect(screen.getByText('Short check-ins, and proof of what actually moved.')).toBeTruthy()
    expect(screen.getByText('What people say, in their own words')).toBeTruthy()
    expect(screen.getByText('What a photo, a payment or a document shows')).toBeTruthy()
  })
})

function Controlled() {
  const [v, setV] = useState('')
  return <PasswordField id="pw" label="Password" value={v} onChange={setV} autoComplete="current-password" />
}

describe('PasswordField', () => {
  it('is hidden until "Show" is pressed, and "Hide" hides it again', () => {
    render(<Controlled />)
    const input = screen.getByLabelText('Password') as HTMLInputElement
    expect(input.type).toBe('password')
    fireEvent.change(input, { target: { value: 'Secret123' } })

    const show = screen.getByRole('button', { name: 'Show the password' })
    expect(show.textContent).toBe('Show')
    expect(show.getAttribute('aria-pressed')).toBe('false')
    fireEvent.click(show)
    expect(input.type).toBe('text')
    expect(input.value).toBe('Secret123')

    const hide = screen.getByRole('button', { name: 'Hide the password' })
    expect(hide.textContent).toBe('Hide')
    expect(hide.getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(hide)
    expect(input.type).toBe('password')
  })

  it('pressing "Show" never submits the form it sits in', () => {
    let submitted = false
    render(<form onSubmit={e => { e.preventDefault(); submitted = true }}><Controlled /></form>)
    fireEvent.click(screen.getByRole('button', { name: 'Show the password' }))
    expect(submitted).toBe(false)
  })
})

describe('PasswordRules shows the prototype\'s rules, which the server checks too, ticked as they are met', () => {
  const rows = () => screen.getAllByRole('listitem').map(li => ({ text: li.textContent, met: li.className.includes('met') }))

  it('nothing typed: every rule is waiting, and says so in words', () => {
    render(<PasswordRules password="" confirm="" />)
    expect(rows()).toEqual([
      { text: '○Not met yet, At least 8 characters', met: false },
      { text: '○Not met yet, A number or a symbol', met: false },
      { text: '○Not met yet, Not your email address', met: false },
      { text: '○Not met yet, Both passwords match', met: false },
    ])
  })

  it('a good password typed twice: every rule is ticked', () => {
    render(<PasswordRules password="Harbour7lamp" confirm="Harbour7lamp" />)
    expect(rows().every(r => r.met)).toBe(true)
    expect(rows()[0].text).toBe('✓Met, At least 8 characters')
  })

  it('without a second box there is no "Both passwords match"', () => {
    render(<PasswordRules password="abc" />)
    expect(screen.queryByText('Both passwords match')).toBeNull()
  })

  /*
   * Hafsah's decision of 26 September: the prototype's rules replace "a capital letter and a small
   * letter". The same cases the server decides (api/src/modules/auth/the-password-rules.spec.ts).
   */
  it('the rules match the server\'s: 8 characters, a number or a symbol, not your email address', () => {
    expect(meetsTodaysPasswordRules('harbour7lamp')).toBe(true)
    expect(meetsTodaysPasswordRules('harbour lamp')).toBe(true)
    expect(meetsTodaysPasswordRules('harb7ur')).toBe(false)
    expect(meetsTodaysPasswordRules('HarbourLamp')).toBe(false)
    expect(meetsTodaysPasswordRules('harbour7lamp', 'harbour7lamx')).toBe(false)
    expect(meetsTodaysPasswordRules('wairimu@baridi.test', undefined, 'Wairimu@Baridi.test')).toBe(false)
    expect(meetsTodaysPasswordRules('wairimu@baridi.test', undefined, 'someone@else.test')).toBe(true)
    /* Without the address, a password shaped like an email address is not ticked; the server checks the real one. */
    expect(meetsTodaysPasswordRules('wairimu@baridi.test')).toBe(false)
    expect(todaysPasswordRules('harbour7lamp', 'harbour7lamp').map(r => r.met)).toEqual([true, true, true, true])
  })
})
