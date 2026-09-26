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

describe('PasswordRules shows the rules the server checks today, ticked as they are met', () => {
  const rows = () => screen.getAllByRole('listitem').map(li => ({ text: li.textContent, met: li.className.includes('met') }))

  it('nothing typed: every rule is waiting, and says so in words', () => {
    render(<PasswordRules password="" confirm="" />)
    expect(rows()).toEqual([
      { text: '○Not yet: At least 8 characters', met: false },
      { text: '○Not yet: A capital letter and a small letter', met: false },
      { text: '○Not yet: Both passwords match', met: false },
    ])
  })

  it('a good password typed twice: every rule is ticked', () => {
    render(<PasswordRules password="Harbour7lamp" confirm="Harbour7lamp" />)
    expect(rows().every(r => r.met)).toBe(true)
    expect(rows()[0].text).toBe('✓Done: At least 8 characters')
  })

  it('without a second box there is no "Both passwords match"', () => {
    render(<PasswordRules password="abc" />)
    expect(screen.queryByText('Both passwords match')).toBeNull()
  })

  it('the rules match the server\'s: 8 characters, an uppercase and a lowercase letter', () => {
    // The same cases the server's @MinLength(8) and /^(?=.*[A-Z])(?=.*[a-z]).*$/ decide.
    expect(meetsTodaysPasswordRules('Abcdefgh')).toBe(true)
    expect(meetsTodaysPasswordRules('Abcdefg')).toBe(false)
    expect(meetsTodaysPasswordRules('abcdefgh')).toBe(false)
    expect(meetsTodaysPasswordRules('ABCDEFGH')).toBe(false)
    expect(meetsTodaysPasswordRules('Abcdefgh', 'Abcdefgx')).toBe(false)
    expect(todaysPasswordRules('Abcdefgh', 'Abcdefgh').map(r => r.met)).toEqual([true, true, true])
  })
})
