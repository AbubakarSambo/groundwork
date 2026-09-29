import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ConversationCard } from './ConversationCard'

const CSS = readFileSync(join(__dirname, 'gw-ui.css'), 'utf8')

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
    const outer = container.firstElementChild as HTMLElement
    expect(outer.className).toContain('gwui-conv-outer')
    const card = outer.querySelector('.gwui-conv-card')
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
    const outerRule = CSS.slice(CSS.indexOf('.gwui-conv-outer {'), CSS.indexOf('.gwui-conv-outer {') + 60)
    const cardRule = CSS.slice(CSS.indexOf('.gwui-conv-card {'), CSS.indexOf('.gwui-conv-card {') + 200)
    expect(outerRule).toMatch(/max-width:\s*560px/)
    expect(cardRule).toMatch(/border:\s*1px solid var\(--gw-border\)/)
    expect(cardRule).toMatch(/border-radius:\s*16px/)
    const mobile = CSS.slice(CSS.indexOf('@media (max-width: 640px) {\n  .gwui-conv-outer'))
    expect(mobile).toMatch(/\.gwui-conv-outer \{ max-width: none; margin: 0; \}/)
    expect(mobile).toMatch(/\.gwui-conv-card \{ border-radius: 0; border-left: none; border-right: none; \}/)
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
