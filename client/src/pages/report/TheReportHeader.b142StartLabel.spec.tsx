import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { TheReportHeader } from './TheReportHeader'

/**
 * B-142 said the party's link must only promise what is true ("Start my check-in" or "Back to the check-in"). The audit of the
 * check-in pages (15 November 2026, row 3) removed the link for a person who is only in the check-in altogether, because the
 * Check-in tab sits one row below it and a link of the same name led to the place they were standing. The lead keeps "Your check-in".
 */
function renderHeader(canRunThisCheckIn: boolean) {
  return render(
    <MemoryRouter>
      <TheReportHeader id="g1" title="Weekly sales push, Nairobi" canRunThisCheckIn={canRunThisCheckIn} isAParty={!canRunThisCheckIn} active="report" />
    </MemoryRouter>,
  )
}

describe('the check-in header link', () => {
  it('draws no second "Start my check-in" for a person who is only in the check-in; the Check-in tab is the way in', () => {
    renderHeader(false)
    expect(screen.queryByRole('link', { name: 'Start my check-in' })).toBeNull()
    expect(screen.queryByRole('link', { name: 'Back to the check-in' })).toBeNull()
    expect(screen.getByRole('tab', { name: 'Check-in' }).getAttribute('href')).toBe('/grounds/g1')
  })

  it('keeps "Your check-in" for the lead', () => {
    renderHeader(true)
    expect(screen.getByRole('link', { name: 'Your check-in' }).getAttribute('href')).toBe('/grounds/g1')
  })
})
