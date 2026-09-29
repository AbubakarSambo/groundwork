import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Note } from './Note'

/** A NOTE: plain, muted text in the page's own flow (prototype: `.note`), never a coloured box. */
describe('Note', () => {
  it('is plain muted text, not a callout box', () => {
    render(<Note>You can read this check-in’s board and reports. Wairimu Kamau runs it.</Note>)
    const el = screen.getByText(/You can read this check-in/)
    expect(el.style.color).toBe('var(--gw-sub)')
    expect(el.style.background).toBe('')
    expect(el.style.border).toBe('')
  })
})
