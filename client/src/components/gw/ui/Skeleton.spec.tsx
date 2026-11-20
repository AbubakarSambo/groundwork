import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Skeleton } from './Skeleton'

/** What a person reads while a page is still getting its data: grey shapes, and for a screen reader one status line, never the word "Loading". */
describe('the wait is grey shapes, not a word', () => {
  it('says what is coming to a screen reader and draws shapes for everyone else', () => {
    const { container } = render(<Skeleton what="Getting your check-ins" shape="rows" count={2} />)
    const status = screen.getByRole('status')
    expect(status.getAttribute('aria-busy')).toBe('true')
    expect(status.textContent).toBe('Getting your check-ins')
    expect(container.querySelectorAll('.gwui-skeleton-item')).toHaveLength(2)
    expect(container.textContent).not.toMatch(/Loading/i)
  })
  it('draws cards and lines too', () => {
    const { container } = render(<><Skeleton what="Getting the company page" shape="cards" /><Skeleton what="Getting this page" shape="lines" /></>)
    expect(container.querySelector('.gwui-skeleton-cards')).toBeTruthy()
    expect(container.querySelector('.gwui-skeleton-lines')).toBeTruthy()
    expect(container.querySelectorAll('.gwui-skeleton-item')).toHaveLength(6)
  })
})
