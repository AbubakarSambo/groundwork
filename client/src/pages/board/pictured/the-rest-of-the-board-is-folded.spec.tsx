import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FoldTheRest } from './FoldTheRest'
import { Section } from '@/components/gw/ui'
import './pictured-board.css'

/** Hafsah, 24 October 2026: the board's first screen is the headline, What needs you and the team; everything else is folded under its own heading. */
describe('the rest of the board, folded under its own headings', () => {
  it('starts folded, opens on its heading, and keeps the heading and words as they are', () => {
    render(<FoldTheRest startOpen={false}><Section heading="Blockers"><p>Price objections</p></Section></FoldTheRest>)
    const head = screen.getByRole('button', { name: /Blockers/ })
    expect(head.getAttribute('aria-expanded')).toBe('false')
    expect(head.closest('section')?.classList.contains('pb-fold-open')).toBe(false)
    fireEvent.click(head)
    expect(head.getAttribute('aria-expanded')).toBe('true')
    expect(head.closest('section')?.classList.contains('pb-fold-open')).toBe(true)
    expect(screen.getByText('Price objections')).toBeTruthy()
    fireEvent.keyDown(head, { key: 'Enter' })
    expect(head.getAttribute('aria-expanded')).toBe('false')
  })
})
