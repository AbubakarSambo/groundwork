import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PageCrash } from './PageCrash'

/**
 * A BROKEN PAGE IS NOT A WHITE SCREEN. W8-63.
 *
 * The `/feed` bug - one bad read handing React an object - blanked the WHOLE APP. Not the
 * feed: the rail, the check-in, whatever was open. Then a search for `ErrorBoundary`,
 * `componentDidCatch` and `getDerivedStateFromError` across the entire client returned
 * nothing, so that was the behaviour for every render error in every page.
 *
 * A white page is worse than the dead ends in W8-62. A dead end tells you something went
 * wrong. This tells you the product does not exist.
 */

function Boom(): never {
  throw new Error('Objects are not valid as a React child')
}

describe('when a page throws while rendering', () => {
  beforeEach(() => {
    // React logs the caught error itself; the boundary logs it too. Neither is the thing
    // under test and both are noise in the run.
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => vi.restoreAllMocks())

  /*
   * U.20: THE PROTOTYPE'S OWN WORDS (F4-small-states/crash.txt) REPLACE THE PAGE'S EARLIER,
   * UNMATCHED ONES - "This page could not load" / "Go to my check-ins" were never checked
   * against docs/prototype, and did not say what the prototype says. Updated here, not deleted:
   * the thing being checked (a page, a way out that survives the crash) is unchanged.
   */
  it('the person gets a page, not nothing', () => {
    render(<PageCrash><Boom /></PageCrash>)
    expect(screen.getByText('Something broke on this page')).toBeTruthy()
  })

  it('with a way out that does not depend on the broken page working', () => {
    render(<PageCrash><Boom /></PageCrash>)
    expect(screen.getByRole('button', { name: 'Go to Today' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Reload the page' })).toBeTruthy()
  })

  it('and no "try again", because the state that crashed it is still there', () => {
    /**
     * Retrying the same render with the same props crashes again, and a button that
     * fails every time teaches people the product lies to them. The two offers are the
     * two that actually work: leave, or start the page from scratch.
     */
    expect(screen.queryByRole('button', { name: /^try again$/i })).toBeNull()
  })

  it('it says the record is safe, because that is the first thing anybody wonders', () => {
    render(<PageCrash><Boom /></PageCrash>)
    expect(screen.getByText(/Nothing you wrote is lost; it was saved before this happened\./)).toBeTruthy()
  })

  /*
   * U.20: the prototype also says "We've been told." - not drawn, because it is not true: there
   * is no client error reporting wired up (see PageCrash's own comment on componentDidCatch).
   * A sentence promising somebody is already looking into it would be a lie.
   */
  it('does not say "We’ve been told", because nobody has been', () => {
    render(<PageCrash><Boom /></PageCrash>)
    expect(screen.queryByText(/We.?ve been told/)).toBeNull()
  })

  it('and it shows the error, so there is something to paste to whoever they ask', () => {
    render(<PageCrash><Boom /></PageCrash>)
    expect(screen.getByText(/Objects are not valid as a React child/)).toBeTruthy()
  })

  it('a page that renders fine is untouched', () => {
    // A boundary that swallows working pages is worse than none.
    render(<PageCrash><div>the actual page</div></PageCrash>)
    expect(screen.getByText('the actual page')).toBeTruthy()
    expect(screen.queryByText('This page could not load')).toBeNull()
  })
})

describe('and it is actually mounted', () => {
  it('around the routes, so it covers every page rather than one', () => {
    // A boundary that exists in a file and wraps nothing is the shape of bug this
    // repo keeps producing: the dead AppShell, the dead FeedbackWidget.
    const app = readFileSync(join(__dirname, '../../App.tsx'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
    expect(app).toMatch(/<PageCrash>[\s\S]*<Routes>/)
    expect(app).toMatch(/<\/Routes>[\s\S]*<\/PageCrash>/)
  })
})
