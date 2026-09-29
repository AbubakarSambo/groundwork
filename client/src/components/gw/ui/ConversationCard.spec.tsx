import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ConversationCard } from './ConversationCard'

/**
 * THE FOCUSED CHECK-IN'S CARD FRAME (docs/prototype/source/app.css: `.ci-focus`, `.ci-card`).
 */
describe('ConversationCard', () => {
  it('is a centred 560px card', () => {
    const { container } = render(
      <MemoryRouter>
        <ConversationCard header={<div>Header</div>}>Body</ConversationCard>
      </MemoryRouter>,
    )
    const card = container.firstElementChild as HTMLElement
    expect(card.style.maxWidth).toBe('560px')
    expect(card.style.margin).toBe('0px auto')
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
