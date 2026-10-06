import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { TheCheckInHeader } from './TheCheckInHeader'

/**
 * Seen on 29 September as Juma, an admin who reads "Sales team, Q3" and is not in it: the board's
 * header offered him "Your check-in" and a Check-in tab, though he has no conversation there. The
 * prototype's read-only view (read-only-view.txt) has three tabs: Board, Context, People and setup.
 */
function header(canRunThisCheckIn: boolean, isAParty: boolean) {
  return render(
    <MemoryRouter>
      <TheCheckInHeader id="g1" title="Sales team, Q3" cadence={null} plannedSessions={null} currentSession={null} endsAt={null} endedSaying={null} canRunThisCheckIn={canRunThisCheckIn} isAParty={isAParty} active="board" />
    </MemoryRouter>,
  )
}

describe('the check-in header for someone who only reads', () => {
  it('shows the read-only three tabs, and no way into a check-in', () => {
    header(false, false)
    const tabs = screen.getAllByRole('link').map((a) => a.textContent)
    /* "Context" renamed to "Context and resources" so the tab's name says what it now holds. */
    expect(tabs).toEqual(expect.arrayContaining(['Board', 'Context and resources', 'People and setup']))
    expect(tabs).not.toContain('Check-in')
    expect(tabs).not.toContain('My work')
    expect(screen.queryByText('Your check-in')).toBeNull()
    expect(screen.queryByText('Start my check-in')).toBeNull()
  })

  it('still offers the lead and a participant their check-in', () => {
    header(true, false)
    expect(screen.getByText('Your check-in')).toBeTruthy()
    expect(screen.getAllByRole('link').map((a) => a.textContent)).toContain('Check-in')
  })

  it('offers a participant "Start my check-in"', () => {
    header(false, true)
    expect(screen.getByText('Start my check-in')).toBeTruthy()
  })
})
