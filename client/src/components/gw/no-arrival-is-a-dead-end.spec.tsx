import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { LinkProblem } from './LinkProblem'

/**
 * NO ARRIVAL IS A DEAD END. W8-62.
 *
 * Her words: "We have deadend pages that trap you there."
 *
 * The three routes a person can arrive on from a link somebody else sent them are
 * `/invite`, `/join` and `/verify-email`. When the link did not work, two of the three
 * rendered a red tick, one sentence, and NOTHING TO PRESS. That is the first thing
 * somebody ever sees of this product, and for two thirds of the ways in it was a full
 * stop with no next move.
 *
 * Two things pinned here: the shared state has a way out, and none of the three has
 * gone back to rolling its own without one.
 */

const SRC = join(__dirname, '../..')

const ARRIVALS = [
  'pages/invite/InvitePage.tsx',
  'pages/join/JoinPage.tsx',
  'pages/auth/MagicVerifyPage.tsx',
]

describe('the shared failed-link state', () => {
  function renderProblem(kind: 'invite' | 'join' | 'sign-in') {
    render(<MemoryRouter><LinkProblem kind={kind} /></MemoryRouter>)
  }

  it('has a button, which is the whole point', () => {
    renderProblem('join')
    expect(screen.getByRole('button')).toBeTruthy()
  })

  it('tells an invited person the true thing: only the inviter can reissue it', () => {
    /**
     * There is no endpoint that reissues an invite token to an unauthenticated
     * stranger, and there should not be. So "try again" would be a lie and "get a new
     * link" would be a button that cannot work. The honest instruction is the one that
     * names who can actually help.
     */
    renderProblem('invite')
    expect(screen.getByText(/Ask whoever invited you to send a new one/)).toBeTruthy()
    expect(screen.getByRole('button', { name: /Sign in instead/ })).toBeTruthy()
  })

  it('but a sign-in link is one they CAN reissue themselves', () => {
    renderProblem('sign-in')
    expect(screen.getByRole('button', { name: /Get a new link/ })).toBeTruthy()
  })

  it('and it does not say which of the three token failures it was', () => {
    /**
     * "No token in the URL", "expired" and "already used" are the same instruction to
     * the person reading it, and telling an unauthenticated caller which one it was is
     * a small oracle about a link they do not hold.
     */
    renderProblem('join')
    const body = document.body.textContent ?? ''
    expect(body).not.toMatch(/expired but|already used|no token found/i)
  })
})

describe('none of the arrival pages rolls its own', () => {
  for (const rel of ARRIVALS) {
    it(`${rel.split('/').pop()} uses the shared state`, () => {
      const src = readFileSync(join(SRC, rel), 'utf8')
      expect(src).toContain('LinkProblem')
    })
  }

  it('and the old dead-end markup is gone rather than sitting alongside it', () => {
    // The exact shapes that were there: a big tick over a bold "Invalid ..." with no
    // control under it. Two of these existed, worded differently, doing the same
    // nothing.
    for (const rel of ARRIVALS) {
      const src = readFileSync(join(SRC, rel), 'utf8')
      expect(src, `${rel} still has its own invalid-link card`).not.toMatch(/>Invalid (link|invite)</)
      expect(src, `${rel} still has its own invalid-link card`).not.toMatch(/>Link invalid</)
    }
  })
})
