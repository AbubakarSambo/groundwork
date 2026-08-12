import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { GroundGone } from './GroundGone'

/**
 * A GROUND YOU CANNOT SEE IS NOT A BLANK PAGE. W8-65.
 *
 * Both ground pages ended at the bare words "Ground not found." - grey text at the top
 * left of an empty page, no heading, no control, and a red toast that fades. Found the
 * same way as the invite and join dead ends in W8-62: by hitting it while doing something
 * else.
 *
 * The thing that makes this one worth copy rather than just a button is WHY it happens.
 * The likeliest cause by far is the org switcher - switch organisation while looking at a
 * ground and that ground belongs to the one you just left. The person can see it exists;
 * they were reading it a second ago. "Not found" tells them the product lost it.
 */
describe('the ground-not-open state', () => {
  const show = () => render(<MemoryRouter><GroundGone /></MemoryRouter>)

  it('has a way out', () => {
    show()
    expect(screen.getByRole('button', { name: /Go to my grounds/ })).toBeTruthy()
  })

  it('names the org switch, because that is how people get here', () => {
    show()
    expect(screen.getByText(/just switched organisation/)).toBeTruthy()
    expect(screen.getByText(/switch back and it/)).toBeTruthy()
  })

  it('and does not say "not found", which reads as the product losing it', () => {
    show()
    expect(screen.queryByText(/not found/i)).toBeNull()
  })

  it('it does not enumerate which reason it was', () => {
    /**
     * Closed, removed, another organisation's link - they all lead to the same move, and
     * saying which one would tell whoever holds a link whether a ground exists at that
     * id. Not something a stranger should be able to ask.
     */
    const body = document.body.textContent ?? ''
    expect(body).not.toMatch(/deleted on|you were removed by|does not exist/i)
  })
})

describe('both ground pages use it', () => {
  for (const rel of ['pages/grounds/GroundAdminPage.tsx', 'pages/grounds/GroundParticipantPage.tsx']) {
    it(`${rel.split('/').pop()}`, () => {
      const src = readFileSync(join(__dirname, '../..', rel), 'utf8')
      expect(src).toContain('<GroundGone />')
      // And the old bare version is gone rather than sitting next to it - the
      // participant page had its own two hardcoded colours for it.
      expect(src).not.toMatch(/>Ground not found\.</)
    })
  }
})
