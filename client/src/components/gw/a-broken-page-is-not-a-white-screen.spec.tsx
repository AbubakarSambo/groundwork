import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PageCrash } from './PageCrash'

/**
 * A BROKEN PAGE IS NOT A WHITE SCREEN. W8-63.
 *
 * The `/feed` bug - one bad read handing React an object - blanked the WHOLE APP. Not the
 * feed: the rail, the ground, whatever was open. Then a search for `ErrorBoundary`,
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

  it('the person gets a page, not nothing', () => {
    render(<PageCrash><Boom /></PageCrash>)
    expect(screen.getByText('This page could not load')).toBeTruthy()
  })

  it('with a way out that does not depend on the broken page working', () => {
    render(<PageCrash><Boom /></PageCrash>)
    expect(screen.getByRole('button', { name: /Go to my grounds/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /reload this page/i })).toBeTruthy()
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
    expect(screen.getByText(/Nothing you have written is affected/)).toBeTruthy()
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
    const app = readFileSync(join(__dirname, '../../App.tsx'), 'utf8')
    expect(app).toMatch(/<PageCrash>[\s\S]*<Routes>/)
    expect(app).toMatch(/<\/Routes>[\s\S]*<\/PageCrash>/)
  })
})
