import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { LinkProblem } from './LinkProblem'

/**
 * B-209: A CHECK-IN'S OWN JOIN LINK IS NOT SINGLE USE AND DOES NOT EXPIRE.
 *
 * /join?t= with a broken token used to read "Join links are single use and they expire." - the
 * same sentence LinkProblem gives every other kind of broken link. Neither half is true of a
 * check-in's own share link: it is shared with a whole cohort and used by everybody in it, and
 * grounds.service.ts's getJoinPreview says plainly "the token has no expiry of its own" - it stops
 * working only once the check-in it belongs to has ended or is on hold.
 *
 * B-209 (review round 2): "NO LONGER OPENS" IS ALSO NOT ALWAYS TRUE - it claims the link once
 * worked, which this screen cannot know of a link that may be nothing more than a typo or a cut
 * copy-paste. "Does not open" is true of a link that has stopped AND one that never worked, so the
 * sentence is updated to it; the assertion below is updated with it, for the same reason.
 */
describe('a broken /join link says only what is true', () => {
  it('does not claim the link is single use or that it expires', () => {
    render(<MemoryRouter><LinkProblem kind="join" /></MemoryRouter>)
    expect(screen.queryByText(/single use/i)).toBeNull()
    expect(screen.queryByText(/expire/i)).toBeNull()
    expect(screen.getByText('This link does not open a check-in. Ask whoever runs it for the current one.')).toBeTruthy()
    expect(screen.queryByText(/no longer opens/i)).toBeNull()
  })

  it('leaves the other kinds of broken link exactly as they were', () => {
    render(<MemoryRouter><LinkProblem kind="invite" /></MemoryRouter>)
    expect(screen.getByText(/Invite links are single use and they expire\./)).toBeTruthy()
  })
})
