import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, it, expect } from 'vitest'

/**
 * THE FEED DOES NOT PROMISE WHAT IT CANNOT DO, AND IT DOES NOT TAKE THE APP DOWN. W8-63.
 *
 * W9-6 asked whether `/feed` answers anything the rail and the ground do not. Opening it
 * and typing one question answered that: **it white-screened the entire app.**
 *
 * `GET /alignment/narrative` returns `{ summary, activeGrounds, surfacedPatterns }` and
 * takes no question at all - it counts grounds. The page read `res.narrative ?? res`, so
 * with no `narrative` field it handed React the object, which React cannot render:
 * "Objects are not valid as a React child", uncaught, blank page, everything gone.
 *
 * Around that crash, three things told the person it was something it is not: a welcome
 * line inviting them to "ask about a specific person", three suggestion chips asking
 * three different questions that all produced the same count, and a silent failure for
 * every non-admin, since the endpoint is `@Roles(Role.ADMIN)` while "Feed" is in the rail
 * for everybody.
 *
 * Checked as source rather than by rendering, because what is pinned here is the WORDING
 * and the shape of the read - the crash itself is proved in a browser, and a jsdom render
 * of a chat that talks to an admin-only endpoint proves less than the file does.
 */

const WHOLE = readFileSync(join(__dirname, 'AlignmentFeedPage.tsx'), 'utf8')

/**
 * Comments stripped, for the reason `a-link-that-failed-says-what-to-do.spec.ts` records:
 * the comments in that file explain what the old wording and the old read were, and
 * checking the raw source made every one of those checks fail on the explanation of its
 * own fix. A rule that punishes writing down the reason gets the reason deleted.
 */
const SRC = WHOLE.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/^\s*\/\/.*$/gm, '')

describe('the read that crashed it', () => {
  it('stripped the comments without eating the code', () => {
    // The whole basis of this file.
    expect(SRC).toContain('onSuccess:')
    expect(SRC).not.toContain('WHITE-SCREENED THE WHOLE APP')
  })

  it('does not fall through to the response object', () => {
    // `res.narrative ?? res` is the crash. The object is the fallback.
    expect(SRC).not.toMatch(/res\.narrative \?\? res\b(?!\?)/)
  })

  it('reads the field the endpoint actually returns', () => {
    expect(SRC).toMatch(/res\?\.summary/)
  })

  it('and coerces anything unexpected instead of handing it to React', () => {
    // A briefing being unhelpful is survivable. The app disappearing is not.
    expect(SRC).toMatch(/JSON\.stringify\(text\)/)
  })
})

describe('what it says it can do', () => {
  it('no longer offers to talk about a particular person', () => {
    /**
     * The endpoint reads no question, so "ask about a specific person" was an
     * invitation to the one thing it cannot do - and on a product whose whole point is
     * that nobody reads anybody's account, an admin page offering to discuss a named
     * person is the wrong promise even if it worked.
     */
    expect(SRC).not.toMatch(/ask about a specific person\./)
    expect(SRC).toMatch(/does not answer questions about a particular person/)
  })

  it('and does not offer three chips that all give one answer', () => {
    for (const gone of ['Who is overdue?', 'Which grounds are at risk?']) {
      expect(SRC, `${gone} still sends a question nothing reads`).not.toContain(gone)
    }
  })

  it('the team overview is a button, since it was never a question', () => {
    expect(SRC).toMatch(/onClick=\{\(\) => setShowTeam\(true\)\}/)
  })
})

describe('a non-admin is told, not ignored', () => {
  it('a 403 gets an answer instead of the loading dots vanishing', () => {
    // The endpoint is ADMIN-only and the rail shows Feed to everyone, so this was the
    // designed experience for every participant who clicked it.
    expect(SRC).toMatch(/status === 403/)
    expect(SRC).toMatch(/for organisation admins/)
  })

  it('and any other failure says so too', () => {
    expect(SRC).toMatch(/Could not fetch the picture/)
  })
})
