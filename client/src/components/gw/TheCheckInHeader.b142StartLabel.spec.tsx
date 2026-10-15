import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { TheCheckInHeader } from './TheCheckInHeader'

/**
 * B-142. A member's session report header always said "Start my check-in", even when nothing was
 * open for them - pressing it landed on "No check-in open right now". The label now only promises
 * what is true: "Start my check-in" while a session is open, "Back to the check-in" when none is.
 * The destination (the check-in's own page) never changes.
 */
function renderHeader(hasOpenSessionNow?: boolean) {
  return render(
    <MemoryRouter>
      <TheCheckInHeader
        id="g1"
        title="Weekly sales push, Nairobi"
        canRunThisCheckIn={false}
        isAParty
        hasOpenSessionNow={hasOpenSessionNow}
        active="report"
      />
    </MemoryRouter>,
  )
}

describe('B-142: the check-in header link for a party who does not run it', () => {
  it('says "Start my check-in" while a session is open for them', () => {
    renderHeader(true)
    const link = screen.getByRole('link', { name: 'Start my check-in' })
    expect(link.getAttribute('href')).toBe('/grounds/g1')
  })

  it('says "Back to the check-in" when nothing is open for them right now', () => {
    renderHeader(false)
    expect(screen.getByRole('link', { name: 'Back to the check-in' })).toBeTruthy()
    expect(screen.queryByRole('link', { name: 'Start my check-in' })).toBeNull()
  })

  it('keeps the old label when a caller has not been taught to say which (undefined)', () => {
    renderHeader(undefined)
    expect(screen.getByRole('link', { name: 'Start my check-in' })).toBeTruthy()
  })
})
