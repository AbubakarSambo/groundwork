import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
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
    expect(head.closest('section')?.classList.contains('pb-folded-open')).toBe(false)
    fireEvent.click(head)
    expect(head.getAttribute('aria-expanded')).toBe('true')
    expect(head.closest('section')?.classList.contains('pb-folded-open')).toBe(true)
    expect(screen.getByText('Price objections')).toBeTruthy()
    fireEvent.keyDown(head, { key: 'Enter' })
    expect(head.getAttribute('aria-expanded')).toBe('false')
  })

  /*
   * The fold hides only Grace's folded sections (removed.md, 30 October): the old rule on `.pb-fold` also hid the summary line and the
   * opened contents of every <details class="pb-fold"> (the gap's "and N more", the weekly report's actions, the new hire's 90 days,
   * the You page's record), so none of them could be read.
   */
  it('hides nothing in a <details class="pb-fold">: the rule that hides is on the board’s own folded sections only', () => {
    const css = readFileSync(join(__dirname, 'pictured-board.css'), 'utf8')
    expect(css).toContain('.pb-folded:not(.pb-folded-open) > :not(.sec-h) { display: none; }')
    expect(css).not.toMatch(/\.pb-fold:not\(/)
    render(<FoldTheRest startOpen={false}><Section heading="Open issues"><p>Four issues</p></Section></FoldTheRest>)
    expect(screen.getByRole('button', { name: /Open issues/ }).closest('section')?.classList.contains('pb-fold')).toBe(false)
  })
})
