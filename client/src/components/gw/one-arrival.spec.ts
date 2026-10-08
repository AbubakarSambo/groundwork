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
 * that looked least like a product was the magic link - the path a person takes to reach the check-in
 * they just built.
 *
 * WHAT WAS DELIBERATELY NOT DONE, and this is the part to argue with if you disagree. W8-49 says
 * collapse the three routes onto one page. The three flows are genuinely different mechanics against
 * different endpoints - `/invite` accepts a token and lands in a check-in, `/join` needs a name and
 * an email first, `/verify-email` verifies and then commits a check-in built before the account
 * existed - and each already has its own guard file asserting its own behaviour. Folding them into
 * one component would put the three paths that get people into the product at all through one set of
 * branches, to save some markup.
 *
 * The chrome is shared, which is the part a person sees. The mechanics stay where they are tested.
 *
 * U.20 UPDATE (the invitation's rebuild, design-audit.md section 3): `/invite` is no longer one of
 * the three `Arrival` pages. It is the first screen rebuilt from `components/gw/ui`
 * (rebuilt-pages.ts), whose own `Page narrow` + `Mark` is now the prototype-accurate version of the
 * same idea `Arrival`'s `plain` mode approximated - a cream page, a small mark, no header band.
 *
 * GROUP 3, PIECE 1 UPDATE (signing in and joining): `/join` and `/verify-email` are rebuilt the same
 * way now, so all three of the routes this file once called "arrivals" draw `Page`/`Mark` rather
 * than `Arrival`. `Arrival` itself is not removed - `JoinConfirmPage.tsx` (a later step of the join
 * flow, outside this task) still renders inside it - so its own file and header still exist, and
 * this file keeps proving the thing that mattered about each of the three: one consistent frame,
 * never three different ideas of how much product surrounds a link from an email.
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
    it(`${route} renders inside the shared Page/Mark, now that it is rebuilt`, () => {
      const code = strip(P(file))
      expect(code).not.toMatch(/from '@\/components\/gw\/Arrival'/)
      expect(code).toMatch(/import \{[^}]*\bPage\b[^}]*\bMark\b[^}]*\} from '@\/components\/gw\/ui'/)
      expect(code).toMatch(/<Page narrow>/)
      expect(code).toMatch(/<Mark/)
    })
  }

  for (const [route, file] of Object.entries(ARRIVALS)) {
    it(`${route} no longer rolls its own full-height page`, () => {
      /**
       * The specific divergence: each of these built its own `minHeight: 100vh` wrapper with its own
       * idea of whether there should be a header. One of them had none.
       */
      expect(strip(P(file))).not.toMatch(/minHeight: '100vh'/)
    })
  }

  /*
   * B-047: `JoinConfirmPage.tsx` was the one page still rendering inside `Arrival`'s header band
   * (`gw-hdr`/`GroundworkLogo`) - a left-aligned, full-width bar with "GROUNDWORK" in small
   * letter-spaced capitals, the one refusal screen in the whole page audit that did not centre a
   * card on the cream page with the plain inline `Mark`, the way `/join`'s own `LinkProblem` (the
   * same component, for the same failure) already does. It now renders inside `Page narrow` +
   * `Mark`, completing the migration this file already describes for the other three arrivals, so
   * nothing in the app imports `Arrival` any more.
   */
  it('JoinConfirmPage now renders inside the same shared shell, not Arrival’s own header', () => {
    const code = strip(readFileSync(join(__dirname, '../../pages/join/JoinConfirmPage.tsx'), 'utf8'))
    expect(code).not.toMatch(/from '@\/components\/gw\/Arrival'/)
    expect(code).toMatch(/import \{[^}]*\bPage\b[^}]*\bMark\b[^}]*\} from '@\/components\/gw\/ui'/)
    expect(code).toMatch(/<Page narrow>/)
    expect(code).toMatch(/<Mark/)
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
    /* U.2 review: /verify-email says it on the account card, "That link didn’t work", with a box to
       ask for a new link; /invite and /join keep LinkProblem, whose way on is the person who invited them. */
    for (const file of Object.values(ARRIVALS)) expect(strip(P(file))).toMatch(/<LinkProblem|<LinkDidNotWork/)
  })
})

describe('the rail on the entry flow, and the way out of a session', () => {
  /**
   * REVERSED AGAIN, GROUP 3 REVIEW BATCH B (1 October) - AND THIS TIME AGAINST THE PROTOTYPE
   * ITSELF, NOT AGAINST SOMEBODY'S MEMORY OF THE PRODUCT.
   *
   * The history: `showSidebar` once required `isAuthenticated`, so a branch in `AppSidebar` meant
   * to draw an "entry ground" rail for a stranger on /start (name, renameable, session count, a
   * navy "+ Start a check-in", a "Not saved yet" card, "Sign in") could never run. Hafsah
   * remembered that rail, it was restored (`isEntryFlow`, OR'd into `showSidebar`), and this test
   * pinned the restoration.
   *
   * But the prototype's own signed-out #/start (start.jpg) draws none of that - no sidebar at
   * all, just the mark and the one question. The restored rail was real, but it was never what the
   * prototype draws, and this same review's picture check found it sitting over "See every
   * situation" on a phone (w375-out-_start.png) because of it. `showSidebar` is `isAuthenticated`
   * again; a signed-out /start keeps its own way to sign in on the page itself now
   * (`EntryChatPage.tsx`'s `Mark` + "Sign in" row), not in a rail the prototype never shows.
   */
  const SHELL = strip(readFileSync(join(__dirname, 'AppShell.tsx'), 'utf8'))

  it('the entry flow no longer gets the rail without being signed in', () => {
    expect(SHELL).toMatch(/const showSidebar =\s*isAuthenticated && !CHROMELESS/)
    expect(SHELL).not.toMatch(/const isEntryFlow = location\.pathname === '\/start'/)
    expect(SHELL).not.toMatch(/isAuthenticated \|\| isEntryFlow/)
  })

  it('and the branch that drew it is unreachable again, deliberately', () => {
    // `isEntryPage` still exists (AppSidebar's own branch), but AppSidebar no longer mounts at
    // all for a signed-out /start, so the branch below it never runs while signed out.
    expect(SHELL).toMatch(/const isEntryPage = !isAuthenticated && location\.pathname === '\/start'/)
    expect(SHELL).toMatch(/\{isEntryPage && \(/)
  })

  it('and the page itself keeps a way to sign in, with the shared mark', () => {
    const ENTRY = strip(readFileSync(join(__dirname, '..', '..', 'pages', 'enter', 'EntryChatPage.tsx'), 'utf8'))
    expect(ENTRY).toMatch(/<Mark \/>/)
    expect(ENTRY).toMatch(/Sign in/)
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
     * ROUND 5, ITEM B: THE BACK BUTTON MOVED INTO ConversationCard.tsx's OWN SLOT.
     *
     * `className="gw-back"` and a literal `title="Leave this session..."` used to sit directly in
     * ChatPage.tsx, above the card. Both now live one level up: ChatPage passes `backTitle` and
     * `onBack` to `<ConversationCard>`, which renders its own back button - always before the
     * `header` slot in its own source - so the way back still sits above the card, on the left, as
     * "← Sales team, Q3" does in check-in-start.jpg. The guarantee splits accordingly: ChatPage
     * really does pass a real title and a real leave handler, and ConversationCard really does
     * draw the back button before the header.
     */
    expect(CHAT).toMatch(/backTitle="Leave this session\. Everything you have said is already saved\."/)
    expect(CHAT).toMatch(/onBack=\{leave\}/)
    const CARD = strip(readFileSync(join(__dirname, 'ui/ConversationCard.tsx'), 'utf8'))
    expect(CARD.indexOf('← {backLabel}')).toBeLessThan(CARD.indexOf('{header}'))
  })

  it('and it returns you to the check-in, not to the list of every ground', () => {
    // Leaving a session should not cost you your place.
    expect(CHAT).toMatch(/navigate\(groundId \? `\/grounds\/\$\{groundId\}\$\{isInitiator \? '' : '\/p'\}` : '\/grounds'\)/)
  })

  it('and says leaving does not lose anything', () => {
    expect(CHAT).toMatch(/Everything you have said is already saved/)
  })
})
