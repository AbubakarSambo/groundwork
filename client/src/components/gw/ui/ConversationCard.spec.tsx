import { describe, it, expect, vi } from 'vitest'
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

  it('shows the back link only when both a label and a destination are given', () => {
    const { rerender } = render(
      <MemoryRouter>
        <ConversationCard header={<div>Header</div>}>Body</ConversationCard>
      </MemoryRouter>,
    )
    expect(screen.queryByRole('link')).toBeNull()
    rerender(
      <MemoryRouter>
        <ConversationCard backLabel="Sales team, Q3" backTo="/grounds/g1" header={<div>Header</div>}>Body</ConversationCard>
      </MemoryRouter>,
    )
    const link = screen.getByRole('link', { name: '← Sales team, Q3' })
    expect(link.getAttribute('href')).toBe('/grounds/g1')
  })

  it('a callback back-button is offered instead, when leaving must do something first', async () => {
    const onBack = vi.fn()
    render(
      <MemoryRouter>
        <ConversationCard backLabel="Sales team, Q3" onBack={onBack} header={<div>Header</div>}>Body</ConversationCard>
      </MemoryRouter>,
    )
    expect(screen.queryByRole('link')).toBeNull()
    const button = screen.getByRole('button', { name: '← Sales team, Q3' })
    button.click()
    expect(onBack).toHaveBeenCalled()
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
