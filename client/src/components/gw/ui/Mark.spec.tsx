import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { withTheSizes } from '@/styles/read-with-the-sizes'
import { join } from 'path'
import { render, screen } from '@testing-library/react'
import { Mark } from './Mark'
import { MARKETING_URL } from '@/lib/marketing'
import { Note, Callout } from './NoteEmpty'
import { Steps, Step } from './Steps'
import { SubHeading } from './SubHeading'

/**
 * THE PARTS ADDED FOR THE INVITATION'S REBUILD (design-audit.md section 4; the invitation task).
 *
 * `Mark` is `auth-kit.tsx`'s `AuthBrand`, already checked against the prototype (U.1/U.2), moved
 * into the shared kit. It has no caption above it (Hafsah, pictured at 1440px against
 * join-invite.jpg): the short line each exported picture shows above the mark is the prototype
 * PICTURE's own frame header, not something the screen itself draws. `Callout` is the tinted line
 * the prototype injects above the invitation's heading (s44.js). `Steps` is the ticked list on
 * "Almost in" (join-waiting.jpg), for which the prototype's own CSS has no class. `SubHeading` is
 * the smaller, ~15px heading inside the invitation's white panel ("What it asks", "Who sees your
 * answers"), which is not `Section`'s 21px page-heading size.
 */
const CSS = withTheSizes(readFileSync(join(__dirname, 'gw-ui.css'), 'utf8'))

describe('Mark', () => {
  it('renders only the wordmark, linking home - no caption', () => {
    render(<Mark />)
    const link = screen.getByRole('link', { name: 'Groundwork' })
    expect(link).toBeTruthy()
    /* Was "starts with http". A build not told where its marketing site is (this test run, local, staging) now links to its own
       root rather than to the live site, so the mark links to wherever lib/marketing.ts decided, which is the rule that matters. */
    expect(link.getAttribute('href')).toBe(MARKETING_URL)
    expect(document.querySelector('.gwui-mark-caption')).toBeNull()
  })

  it('takes no props - there is nothing left to pass it', () => {
    expect(Mark.length).toBe(0)
  })

  it('matches auth-kit\'s already-checked mark values: 18px bold navy, 9px gap', () => {
    expect(CSS).toMatch(/\.gwui-mark \{[^}]*font-size: 18px/)
    expect(CSS).toMatch(/\.gwui-mark \{[^}]*font-weight: 700/)
    expect(CSS).toMatch(/\.gwui-mark \{[^}]*gap: 8px/)
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

  it('holds a row with a button without a block inside a paragraph (People and setup\'s problems, browser test 20 October)', () => {
    const errors: unknown[] = []
    const was = console.error
    console.error = (...a: unknown[]) => { errors.push(a) }
    try {
      render(<Callout tone="warning"><div className="row"><span>Joseph has not joined yet.</span><button>Send it again</button></div></Callout>)
      render(<Callout title="One thing"><div>Two lines.</div></Callout>)
    } finally { console.error = was }
    expect(document.querySelector('p .row, p div')).toBeNull()
    expect(errors.filter((e) => /descendant|nested/.test(String((e as unknown[])[0])))).toEqual([])
  })

  it('matches the prototype\'s injected values (s44.js): background var(--chat) i.e. var(--gw-bg), 10px corners', () => {
    expect(CSS).toMatch(/\.gwui-callout \{[^}]*background: var\(--gw-bg\)/)
    expect(CSS).toMatch(/\.gwui-callout \{[^}]*border-radius: 8px/)
    expect(CSS).toMatch(/\.gwui-callout \{[^}]*padding: 8px 12px/)
  })
})

describe('SubHeading', () => {
  it('renders a heading, smaller than Section\'s', () => {
    render(<SubHeading>What it asks</SubHeading>)
    const h = screen.getByRole('heading', { name: 'What it asks' })
    expect(h.tagName).toBe('H2')
    expect(h).toHaveClass('gwui-subheading')
  })

  /* U.20 sixth round (Hafsah's first review): 14.5px, matching the prototype exactly - not 15px. */
  it('is about 14.5px bold ink, not Section\'s 21px', () => {
    expect(CSS).toMatch(/\.gwui-subheading \{[^}]*font-size: 14px/)
    expect(CSS).toMatch(/\.gwui-subheading \{[^}]*font-weight: 700/)
    expect(CSS).toMatch(/\.gwui-subheading \{[^}]*color: var\(--gw-text\)/)
  })

  it('a list of them keeps a gap between blocks', () => {
    expect(CSS).toMatch(/\.gwui-subheading-list \{[^}]*gap: 16px/)
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
