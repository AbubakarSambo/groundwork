import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TheirRecord } from './TheirRecord'

/**
 * MERCY READS GRACE'S PRAISE IN HER OWN RECORD (Groundwork does the managing, part 2). The record is what the API serves Mercy on My work
 * after Grace tapped "Praise Mercy" on her board (api board/your-team-person-by-person-as-each-reader-reads-it.spec.ts writes the same
 * line): no message was sent, and the praise is in the record Mercy already reads. Nothing is drawn where the server sends none.
 */
const RECORD = {
  heading: 'Your record in Sales team, Q4',
  note: 'This is read from what you said in your check-ins and what is on file. It changes only when something new comes in.',
  parts: [{ heading: 'What you said and what shows it', says: 'You said five times that something was sold, paid or signed, and every one has proof on file.', toChange: null, evidence: [] }],
  coaching: [],
  coachingEmpty: 'Groundwork has not coached you on anything yet.',
}

describe('Mercy’s own record', () => {
  it('carries what Grace said about her work, with the day', () => {
    render(<TheirRecord record={{ ...RECORD, fromYourLead: { heading: 'What Grace said about your work', lines: ['On Wednesday 21 October Grace said “Well done on Greenfield Supermarket, with the signed order on file.”'] } }} />)
    expect(screen.getByText('What Grace said about your work')).toBeTruthy()
    expect(screen.getByText('On Wednesday 21 October Grace said “Well done on Greenfield Supermarket, with the signed order on file.”')).toBeTruthy()
  })
  it('draws nothing of it where the server sends none', () => {
    render(<TheirRecord record={RECORD} />)
    expect(screen.queryByText(/said about your work/)).toBeNull()
  })
})
