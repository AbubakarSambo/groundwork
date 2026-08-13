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

describe('the rail on the entry flow, and the way out of a session', () => {
  /**
   * BOTH OF THESE WERE THINGS SHE REMEMBERED WORKING, AND SHE WAS RIGHT BOTH TIMES.
   *
   * I had written "show the rail when signed in, hide it for a stranger" into a plan as work to do,
   * and it was already the behaviour - so I recorded that as a wrong plan item. She then said the
   * rail HAD been there on a signed-out window. Also right, and the mechanism was sitting in the
   * file: `AppSidebar` carries a branch commented "Entry ground shown when unauthenticated on
   * /start", which draws the ground being built for somebody with no account yet.
   *
   * It could never run. `showSidebar` required `isAuthenticated`, so the sidebar was never mounted
   * for a stranger, which makes `isEntryPage = !isAuthenticated && pathname === '/start'` false
   * whenever it is evaluated. An auth gate added later killed the branch without removing it. The
   * same shape as the G37 defect, on the client this time, where my sweep for that class had not
   * looked.
   */
  const SHELL = strip(readFileSync(join(__dirname, 'AppShell.tsx'), 'utf8'))

  it('the entry flow gets the rail without being signed in', () => {
    expect(SHELL).toMatch(/const isEntryFlow = location\.pathname === '\/start'/)
    expect(SHELL).toMatch(/\(isAuthenticated \|\| isEntryFlow\) && !CHROMELESS/)
  })

  it('and the branch that draws it is therefore reachable', () => {
    // `isEntryPage` was dead for as long as the auth gate existed. It is the thing being restored.
    expect(SHELL).toMatch(/const isEntryPage = !isAuthenticated && location\.pathname === '\/start'/)
    expect(SHELL).toMatch(/\{isEntryPage && \(/)
  })
})

describe('the check-in is not a trap', () => {
  /**
   * THE EXIT WAS THERE AND UNDER SOMETHING. `ChatPage` has always had a back button in its header.
   * `AppShell` moves the feedback pill to `top: 12, right: 16` on chat pages specifically, and the
   * back button sits at the right of the same header. Measured on the running page before the fix:
   * back at x 1180 to 1264, pill at x 1159 to 1264. Every pixel covered.
   *
   * So "how do you get back from the check-in" had no answer, and the control that was supposed to
   * answer it had been invisible since the pill was moved.
   */
  const CHAT = strip(readFileSync(join(__dirname, '../../pages/chat/ChatPage.tsx'), 'utf8'))

  it('the exit is on the left, where nothing floats over it', () => {
    /**
     * Anchored on the button's own title, because `ChatPage` has two `gw-hdr` blocks - the loading
     * state draws one too - and slicing from the first one measured the wrong header entirely.
     */
    const i = CHAT.indexOf('title="Leave this session')
    expect(i).toBeGreaterThan(0)
    const header = CHAT.slice(i - 600, i + 900)
    expect(header.indexOf('gw-back')).toBeLessThan(header.indexOf('gw-logo'))
  })

  it('and it returns you to the ground, not to the list of every ground', () => {
    // Leaving a session should not cost you your place.
    expect(CHAT).toMatch(/navigate\(groundId \? `\/grounds\/\$\{groundId\}\$\{isInitiator \? '' : '\/p'\}` : '\/grounds'\)/)
  })

  it('and says leaving does not lose anything', () => {
    expect(CHAT).toMatch(/Everything you have said is already saved/)
  })
})
