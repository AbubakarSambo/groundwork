import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WhatYouGaveUs } from './WhatYouGaveUs'

/** WHAT THE PERSON READS AFTER THE OPEN LINK, in plain lines (audit of the check-in pages, 15 November 2026, row 19). */
describe('what you gave, said back', () => {
  const it_ = { checkable: 3, general: 2, theStrongest: ['Green Mart paid by M-Pesa on Monday.'], worthAdding: [{ said: 'the Green Mart quote', needs: 'a photo' }], saying: 'x' }

  it('says how many points can be checked, and what to add, with no capital heading, no lead-ins and no colons', () => {
    render(<WhatYouGaveUs it={it_} />)
    expect(screen.getByText((_, el) => el?.tagName === 'DIV' && el.textContent === '3 of your 5 points can be checked.')).toBeTruthy()
    expect(screen.getByText('Green Mart paid by M-Pesa on Monday.')).toBeTruthy()
    expect(screen.getByText('For the Green Mart quote, add a photo.')).toBeTruthy()
    const text = document.body.textContent ?? ''
    expect(text).not.toMatch(/WHAT YOU GAVE US|A reader can stand on these|One detail would make these usable|needs a photo/)
    expect(text).not.toMatch(/:/)
  })

  it('draws nothing when there is nothing to say', () => {
    const { container } = render(<WhatYouGaveUs it={{ ...it_, saying: '' }} />)
    expect(container.textContent).toBe('')
  })
})
