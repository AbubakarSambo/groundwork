import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ThatsNotRight, aCorrectionOf } from './ThatsNotRight'
import { useAskStore } from '@/stores/ask'

/* F4 item 3: "That's not right" on a line opens the assistant on that line, in a plain sentence with the line quoted. */
describe('That’s not right', () => {
  it('opens the assistant with the line it is on', () => {
    render(<ThatsNotRight line="Kilele Hotel paid KES 40,000 on Monday." />)
    fireEvent.click(screen.getByRole('button', { name: 'That’s not right' }))
    expect(useAskStore.getState().open).toBe(true)
    expect(useAskStore.getState().pendingMessage).toBe('That’s not right. “Kilele Hotel paid KES 40,000 on Monday.”')
  })
  it('is not drawn on an empty line, and never joins pieces with a colon', () => {
    const { container } = render(<ThatsNotRight line="  " />)
    expect(container.textContent).toBe('')
    expect(aCorrectionOf('“Westgate quote sent”')).toBe('That’s not right. “Westgate quote sent”')
    expect(aCorrectionOf('x')).not.toMatch(/:/)
  })
})
