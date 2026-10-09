import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { GroundworkIsWriting } from './GroundworkIsWriting'

/**
 * THE SHARED "GROUNDWORK IS WRITING…" INDICATOR (Hafsah, 9 October). One part, used everywhere a
 * reply is awaited, now that replies arrive whole rather than streamed in piece by piece. Fails
 * before this file existed - there was no one part to test.
 */
describe('GroundworkIsWriting', () => {
  it('says "Groundwork is writing…" by default', () => {
    render(<GroundworkIsWriting />)
    expect(screen.getByText('Groundwork is writing…')).toBeTruthy()
  })

  it('speaks as Ask, under Ask\'s own name, where one is given', () => {
    render(<GroundworkIsWriting name="Ask Kijani Foods" />)
    expect(screen.getByText('Ask Kijani Foods is writing…')).toBeTruthy()
  })

  it('reads its words to a screen reader: role="status" and aria-live="polite"', () => {
    render(<GroundworkIsWriting />)
    const status = screen.getByRole('status')
    expect(status.textContent).toContain('Groundwork is writing…')
    expect(status.getAttribute('aria-live')).toBe('polite')
  })

  it('draws in Groundwork\'s own bubble shape and colours by default', () => {
    const { container } = render(<GroundworkIsWriting />)
    // Bubble.tsx squares the bottom-left corner on Groundwork's own turn.
    const bubble = container.firstElementChild as HTMLElement
    expect(bubble.style.borderRadius).toBe('16px 16px 16px 4px')
    expect(bubble.style.background).toBe('var(--gw-bg)')
  })

  it('draws no bubble of its own when `wrap` is false, for a caller that already has one', () => {
    const { container } = render(<GroundworkIsWriting wrap={false} />)
    expect(container.querySelector('[role="status"]')).toBeTruthy()
    // No bubble's own background/border-radius wraps it - just the status span itself.
    expect((container.firstElementChild as HTMLElement).getAttribute('role')).toBe('status')
  })
})
