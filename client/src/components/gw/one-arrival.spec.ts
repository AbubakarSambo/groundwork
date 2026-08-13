import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, it, expect } from 'vitest'

/**
 * ONE ARRIVAL. Stage 4, and the reachable part of W8-49.
 *
 * Three ways in from an email, and each had a different amount of the product around it:
 *
 *   /invite         a header with the logo, a title, a centred column
 *   /join           a title and a column, no header at all
 *   /verify-email   four bare full-height divs, one per state
 *
 * So the first thing somebody saw of Groundwork depended on which email they were sent, and the one
 * that looked least like a product was the magic link - the path a person takes to reach the ground
 * they just built.
 *
 * WHAT WAS DELIBERATELY NOT DONE, and this is the part to argue with if you disagree. W8-49 says
 * collapse the three routes onto one page. The three flows are genuinely different mechanics against
 * different endpoints - `/invite` accepts a token and lands in a check-in, `/join` needs a name and
 * an email first, `/verify-email` verifies and then commits a ground built before the account
 * existed - and each already has its own guard file asserting its own behaviour. Folding them into
 * one component would put the three paths that get people into the product at all through one set of
 * branches, to save some markup.
 *
 * The chrome is shared, which is the part a person sees. The mechanics stay where they are tested.
 */
const P = (p: string) => readFileSync(join(__dirname, '../../pages', p), 'utf8')
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

const ARRIVALS = {
  '/invite': 'invite/InvitePage.tsx',
  '/join': 'join/JoinPage.tsx',
  '/verify-email': 'auth/MagicVerifyPage.tsx',
}

describe('every arrival uses the same shell', () => {
  for (const [route, file] of Object.entries(ARRIVALS)) {
    it(`${route} renders inside Arrival`, () => {
      const code = strip(P(file))
      expect(code).toMatch(/import \{ Arrival \} from '@\/components\/gw\/Arrival'/)
      expect(code).toMatch(/<Arrival/)
    })

    it(`${route} no longer rolls its own full-height page`, () => {
      /**
       * The specific divergence: each of these built its own `minHeight: 100vh` wrapper with its own
       * idea of whether there should be a header. One of them had none.
       */
      expect(strip(P(file))).not.toMatch(/minHeight: '100vh'/)
    })
  }

  it('and the shell is the thing that carries the header', () => {
    const shell = strip(readFileSync(join(__dirname, 'Arrival.tsx'), 'utf8'))
    expect(shell).toMatch(/className="gw-hdr"/)
    expect(shell).toMatch(/<GroundworkLogo \/>/)
  })
})

describe('what the shell must not have taken over', () => {
  it('each flow still reads its own token, under its own name', () => {
    /**
     * Three different parameter names, because three different things issue them. A shared shell that
     * started normalising these would be the merge this stopped short of, arriving by accident.
     */
    expect(strip(P(ARRIVALS['/invite']))).toMatch(/params\.get\('token'\)/)
    expect(strip(P(ARRIVALS['/join']))).toMatch(/params\.get\('t'\)/)
    expect(strip(P(ARRIVALS['/verify-email']))).toMatch(/params\.get\('token'\)/)
  })

  it('and each still calls its own endpoint', () => {
    expect(strip(P(ARRIVALS['/join']))).toMatch(/joinApi/)
    expect(strip(P(ARRIVALS['/invite']))).toMatch(/participantsApi/)
    expect(strip(P(ARRIVALS['/verify-email']))).toMatch(/entryApi\.commit/)
  })

  it('and all three still say the same thing when the link is dead', () => {
    // W8-62. Verified rendered: "This invite link did not work", "This join link did not work",
    // "This sign-in link did not work", each with a way out.
    for (const file of Object.values(ARRIVALS)) expect(strip(P(file))).toMatch(/<LinkProblem/)
  })
})
