import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { YourRunningRecord } from './YouPage'

/* Release 7, hand-written: Daniel's running record on his You board, as the engine serves it (api suites/the-running-record). */
const RECORD = {
  heading: 'Your record so far',
  inShort: 'You said you would do 4 things. 2 done, 1 not done, 1 still open.',
  rows: [
    { id: 'c4', title: 'Visit Westgate Deli', said: 'Said in Sales team, Q3, check-in 9, on 22 September.', became: 'Still open.', shows: 'Nothing to show yet.', tone: 'act' },
    { id: 'c3', title: 'Send Kito Foods the revised quote', said: '', became: 'Done on 21 September.', shows: 'Your word only, no document yet.', tone: 'att' },
    { id: 'c2', title: 'Set up a monthly call with each corporate account', said: '', became: 'Not done, marked on 2 September.', shows: 'Nothing to show yet.', tone: 'con' },
    { id: 'c1', title: 'Renew Lakeside’s contract', said: '', became: 'Done on 20 August.', shows: 'A document backs it, added on 20 August.', tone: 'rec' },
  ],
  more: 0,
  adapted: ['You stopped “Visit 10 new corporate prospects” on 19 September, when the direction changed.'],
}

describe('Release 7: Daniel reads his running record', () => {
  it('shows three, the rest behind "and 1 more", each with what became of it and what shows it', () => {
    render(<MemoryRouter><YourRunningRecord r={RECORD} /></MemoryRouter>)
    expect(screen.getByRole('heading', { name: 'Your record so far' })).toBeTruthy()
    expect(screen.getByText('You said you would do 4 things. 2 done, 1 not done, 1 still open.')).toBeTruthy()
    expect(screen.getByText('Done on 21 September. Your word only, no document yet.')).toBeTruthy()
    expect(screen.getByText('and 1 more')).toBeTruthy()
    expect(screen.getByText('You stopped “Visit 10 new corporate prospects” on 19 September, when the direction changed.')).toBeTruthy()
    expect(document.body.textContent).not.toMatch(/score|rating|at risk|PIP/i)
  })
})
