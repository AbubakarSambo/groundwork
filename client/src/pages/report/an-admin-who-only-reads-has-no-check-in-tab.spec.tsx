import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { TheReportHeader } from './TheReportHeader'

/**
 * Seen on 29 September as Juma, an admin who reads "Sales team, Q3" and is not in it: the board's
 * header offered him "Your check-in" and a Check-in tab, though he has no conversation there. The
 * prototype's read-only view (read-only-view.txt) has three tabs: Board, Context, People and setup.
 */
function header(canRunThisCheckIn: boolean, isAParty: boolean) {
  return render(
    <MemoryRouter>
      <TheReportHeader id="g1" title="Sales team, Q3" cadence={null} plannedSessions={null} canRunThisCheckIn={canRunThisCheckIn} isAParty={isAParty} active="report" />
    </MemoryRouter>,
  )
}

describe('the check-in header for someone who only reads', () => {
  it('shows the read-only three tabs, and no way into a check-in', () => {
    header(false, false)
    const tabs = screen.getAllByRole('tab').map((a) => a.textContent)
    /* "Context" renamed to "References and resources" so the tab's name says what it now holds. */
    expect(tabs).toEqual(expect.arrayContaining(['Board', 'References and resources', 'People and setup']))
    expect(tabs).not.toContain('Check-in')
    expect(tabs).not.toContain('My work')
    expect(screen.queryByText('Your check-in')).toBeNull()
    expect(screen.queryByText('Start my check-in')).toBeNull()
  })

  it('still offers the lead and a participant their check-in', () => {
    header(true, false)
    expect(screen.getByRole('link', { name: 'Your check-in' })).toBeTruthy()
    expect(screen.getAllByRole('tab').map((a) => a.textContent)).toContain('Check-in')
  })

  it('offers a participant the Check-in tab, and no second link of the same name (check-in pages audit, row 3)', () => {
    header(false, true)
    expect(screen.queryByText('Start my check-in')).toBeNull()
    expect(screen.getAllByRole('tab').map((a) => a.textContent)).toContain('Check-in')
  })
})
