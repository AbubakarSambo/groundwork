import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ConversationCard } from './ConversationCard'


/**
 * THE FOCUSED CHECK-IN'S CARD FRAME (docs/prototype/source/app.css: `.ci-focus`, `.ci-card`).
 */
describe('ConversationCard', () => {
  /**
   * REVIEW ROUND 3, ITEM 7: THE 560px/CENTRING MOVED TO CSS (gwui-conv-outer, gw-ui.css), so a
   * narrow screen can drop it - "at 375 wide: the card runs full width with no rounded border or
   * side gutters" is a rule that only a stylesheet (with a media query) can express; an inline
   * style, fixed at every width, could not. Pinned on the class and the card's own frame class
   * now, not on inline maxWidth/margin - jsdom does not apply the external stylesheet, so the
   * actual pixel values are asserted from the CSS file itself, in its own spec.
   */
  it('is the prototype\'s card frame, centred at 560px by its own stylesheet class', () => {
    const { container } = render(
      <MemoryRouter>
        <ConversationCard header={<div>Header</div>}>Body</ConversationCard>
      </MemoryRouter>,
    )
    /* UPDATED 24 October: the prototype's own classes, .ci-focus around .ci-card. */
    const outer = container.firstElementChild as HTMLElement
    expect(outer.className).toContain('ci-focus')
    const card = outer.querySelector('.ci-card')
    expect(card).toBeTruthy()
  })

  /* Changed 3 November 2026: the way back is no longer a link above the card. It is the check-in's name in the header, on one line with
     End session (TheCheckInHeader.tsx, pinned in the-check-in-as-a-person-reads-it.spec.tsx), so the card draws no back link of its own. */
  it('draws no way back of its own above the card', () => {
    const { container } = render(
      <MemoryRouter>
        <ConversationCard header={<div>Header</div>}>Body</ConversationCard>
      </MemoryRouter>,
    )
    expect(screen.queryByRole('link')).toBeNull()
    expect(screen.queryByRole('button')).toBeNull()
    expect(container.querySelector('.ci-back')).toBeNull()
  })

  it('is 560px, centred, bordered and rounded above 640px; full width, no side border, no radius, at or below it', () => {
    /* UPDATED 24 October: pinned in the prototype's own stylesheet, .ci-focus and .ci-card, and its phone rule for a focused check-in. */
    const PROTO = readFileSync(join(__dirname, '../../../styles/prototype.css'), 'utf8')
    expect(PROTO).toMatch(/\.ci-focus\{max-width:560px;margin:0 auto\}/)
    expect(PROTO).toMatch(/\.ci-card\{[^}]*border:1px solid var\(--rule\);border-radius:16px/)
    expect(PROTO).toMatch(/body\.focus \.ci-card\{border-radius:0;border-left:0;border-right:0/)
  })

  it('renders the header, banners, body and footer slots given to it, banners between header and the scroll', () => {
    render(
      <MemoryRouter>
        <ConversationCard header={<div>The header</div>} banners={<div>A banner</div>} footer={<div>The footer</div>}>The body</ConversationCard>
      </MemoryRouter>,
    )
    expect(screen.getByText('The header')).toBeTruthy()
    expect(screen.getByText('A banner')).toBeTruthy()
    expect(screen.getByText('The body')).toBeTruthy()
    expect(screen.getByText('The footer')).toBeTruthy()
  })
})
