import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WhatTheRecordShows } from './WhatTheRecordShows'

/**
 * REQUEST 87: "1 SESSIONS" NEVER APPEARS. `overTime.inSessions` already says "in 1 session" or
 * "in 3 sessions" as a full sentence fragment, in the server's own words; this screen used to build
 * its own ", over N sessions" from `sessions`, which read "over 1 sessions" after a single round.
 * The heading now prints `inSessions` in place of that when the server sends it.
 */
describe('What the record shows: the heading over every session, in the server’s own words', () => {
  const open = [{ who: 'Rukia Mwangi', what: 'send the Westgate quote', say: 'Rukia Mwangi committed to send the Westgate quote.' }]

  it('reads "in 1 session" after the first round, never "over 1 sessions"', () => {
    render(<WhatTheRecordShows it={{ sessions: 1, inSessions: 'in 1 session', commitments: open }} />)
    expect(screen.getByText('What people said they would do, in 1 session')).toBeTruthy()
    expect(screen.queryByText(/over 1 sessions/)).toBeNull()
  })

  it('reads "in 3 sessions" once there have been several', () => {
    render(<WhatTheRecordShows it={{ sessions: 3, inSessions: 'in 3 sessions', commitments: open }} />)
    expect(screen.getByText('What people said they would do, in 3 sessions')).toBeTruthy()
  })

  it('falls back to the old sentence when an older server sends no inSessions at all', () => {
    render(<WhatTheRecordShows it={{ sessions: 2, commitments: open }} />)
    expect(screen.getByText('What people said they would do, over 2 sessions')).toBeTruthy()
  })

  it('before any session, inSessions is null and the heading names nothing', () => {
    render(<WhatTheRecordShows it={{ inSessions: null, commitments: open }} />)
    expect(screen.getByText('What people said they would do')).toBeTruthy()
  })
})
