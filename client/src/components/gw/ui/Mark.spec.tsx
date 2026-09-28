import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { render, screen } from '@testing-library/react'
import { Mark } from './Mark'
import { Note, Callout } from './NoteEmpty'
import { Steps, Step } from './Steps'

/**
 * THE PARTS ADDED FOR THE INVITATION'S REBUILD (design-audit.md section 4; the invitation task).
 *
 * `Mark` is `auth-kit.tsx`'s `AuthBrand`, already checked against the prototype (U.1/U.2), moved
 * into the shared kit with an optional caption above it - the short line every one of the
 * prototype's join screens puts above the mark (join-waiting.txt: "Waiting for an admin",
 * join-outoftime.txt: "Out of time", join-expired.txt: "An expired link"). `Callout` is the
 * tinted line the prototype injects above the invitation's heading (s44.js). `Steps` is the
 * ticked list on "Almost in" (join-waiting.jpg), for which the prototype's own CSS has no class.
 */
const CSS = readFileSync(join(__dirname, 'gw-ui.css'), 'utf8')

describe('Mark', () => {
  it('renders the wordmark, linking home, with no caption by default', () => {
    render(<Mark />)
    const link = screen.getByRole('link', { name: 'Groundwork' })
    expect(link).toBeTruthy()
    expect(link.getAttribute('href')).toMatch(/^https?:\/\//)
    expect(screen.queryByText(/./, { selector: '.gwui-mark-caption' })).toBeNull()
  })

  it('renders the caption above the mark when given, word for word', () => {
    render(<Mark caption="Waiting for an admin" />)
    expect(screen.getByText('Waiting for an admin')).toHaveClass('gwui-mark-caption')
  })

  it('matches auth-kit\'s already-checked mark values: 18px bold navy, 9px gap', () => {
    expect(CSS).toMatch(/\.gwui-mark \{[^}]*font-size: 18px/)
    expect(CSS).toMatch(/\.gwui-mark \{[^}]*font-weight: 700/)
    expect(CSS).toMatch(/\.gwui-mark \{[^}]*gap: 9px/)
    expect(CSS).toMatch(/\.gwui-mark \{[^}]*color: var\(--gw-navy\)/)
  })

  it('never redeclares the marketing URL (the-way-home-and-the-way-out.spec.ts\'s rule)', () => {
    const src = readFileSync(join(__dirname, 'Mark.tsx'), 'utf8')
    expect(src).not.toMatch(/VITE_MARKETING_URL/)
    expect(src).toMatch(/from '@\/lib\/marketing'/)
  })
})

describe('Note, with a tone', () => {
  it('is plain and muted by default', () => {
    render(<Note>A plain sentence.</Note>)
    const p = screen.getByText('A plain sentence.')
    expect(p).toHaveClass('gwui-note')
    expect(p).not.toHaveClass('gwui-note-error')
    expect(p.getAttribute('role')).toBeNull()
  })

  it('is announced as an alert, in red, when the tone is "error"', () => {
    render(<Note tone="error">That did not send. Try again.</Note>)
    const p = screen.getByRole('alert')
    expect(p).toHaveTextContent('That did not send. Try again.')
    expect(p).toHaveClass('gwui-note-error')
  })
})

describe('Callout', () => {
  it('renders one sentence in the tinted box', () => {
    render(<Callout>The people in this check-in can see what you say in it.</Callout>)
    expect(screen.getByText('The people in this check-in can see what you say in it.')).toHaveClass('gwui-callout')
  })

  it('matches the prototype\'s injected values (s44.js): background var(--chat) i.e. var(--gw-bg), 10px corners', () => {
    expect(CSS).toMatch(/\.gwui-callout \{[^}]*background: var\(--gw-bg\)/)
    expect(CSS).toMatch(/\.gwui-callout \{[^}]*border-radius: 10px/)
    expect(CSS).toMatch(/\.gwui-callout \{[^}]*padding: 10px 14px/)
  })
})

describe('Steps', () => {
  it('marks a done step with a tick and the one still to come with a circle, both said in words', () => {
    render(
      <Steps>
        <Step done>You accepted the invitation</Step>
        <Step>Grace lets you in</Step>
      </Steps>,
    )
    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(items[0]).toHaveClass('gwui-step-done')
    expect(items[0]).toHaveTextContent('Done. You accepted the invitation')
    expect(items[1]).not.toHaveClass('gwui-step-done')
    expect(items[1]).toHaveTextContent('Still to happen. Grace lets you in')
  })
})
