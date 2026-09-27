import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { TheReportIsAListOfSessions, stillToCheckIn, sessionDay } from './TheReportIsAListOfSessions'

/**
 * U.9: "EVERY SESSION", AS THE LEAD READS IT.
 *
 * The wording is copied from docs/prototype/screens/B4-reports-and-sharing/sessions.txt. The list is
 * on the lead's page only (GroundAdminPage). A participant reaches the team's report through their
 * own page, which is not this list.
 */
const ROWS = [
  { sessionNumber: 38, myCheckInId: null, answered: 5, total: 6, closed: false, waitingOn: ['Omar'], opened: '2026-09-23T13:00:00.000Z' },
  { sessionNumber: 37, myCheckInId: null, answered: 6, total: 6, closed: true, waitingOn: [], opened: '2026-09-22T13:00:00.000Z' },
]

function renderIt(boardRenders = true, onOpenSession = vi.fn(), onOpenBoard = vi.fn()) {
  render(
    <MemoryRouter>
      <TheReportIsAListOfSessions rows={ROWS} boardRenders={boardRenders} onOpenBoard={onOpenBoard} onOpenSession={onOpenSession} />
    </MemoryRouter>,
  )
  return { onOpenSession, onOpenBoard }
}

describe('every session, as the lead reads it', () => {
  it('opens with the prototype heading and the sentence under it', () => {
    renderIt()
    expect(screen.getByRole('heading', { name: 'Every session' })).toBeTruthy()
    expect(document.body.textContent).toContain('Below is the board, then one line for each session, newest first. Open a session to see its report.')
  })

  it('puts the board first, as "The board" and "Everything so far"', () => {
    const { onOpenBoard } = renderIt()
    const board = screen.getByRole('button', { name: /The board/ })
    expect(board.textContent).toContain('Everything so far')
    fireEvent.click(board)
    expect(onOpenBoard).toHaveBeenCalled()
  })

  it('reads each row as the prototype does, newest first', () => {
    renderIt()
    const rows = screen.getAllByRole('button').filter((b) => /Session \d+/.test(b.textContent ?? ''))
    expect(rows[0].textContent).toContain('Session 38')
    expect(rows[0].textContent).toContain('Wed, 23 Sept')
    expect(rows[0].textContent).toContain('5 of 6 checked in')
    expect(rows[0].textContent).toContain('Not shared')
    expect(rows[0].textContent).toContain('Omar has not checked in yet.')
    expect(rows[1].textContent).toContain('Session 37')
    expect(rows[1].textContent).toContain('Tue, 22 Sept')
    expect(rows[1].textContent).toContain('6 of 6 checked in')
    expect(rows[1].textContent).toMatch(/Shared$/)
  })

  it('never joins pieces with dots, and never says Released, Forming or answered', () => {
    renderIt()
    const text = document.body.textContent ?? ''
    expect(text).not.toContain(' · ')
    expect(text).not.toMatch(/Released|Ready to release|Forming|answered/)
  })

  it('opens a session with no check-in of the reader on it through the lead’s view of the round', () => {
    const { onOpenSession } = renderIt()
    fireEvent.click(screen.getAllByRole('button').find((b) => b.textContent?.includes('Session 37'))!)
    expect(onOpenSession).toHaveBeenCalledWith(37)
  })

  it('has no board row when the server says there is no board', () => {
    renderIt(false)
    expect(screen.queryByRole('button', { name: /The board/ })).toBeNull()
  })

  it('names who it waits for in a sentence, however many', () => {
    expect(stillToCheckIn(['Omar', 'Brian'])).toBe('Omar and Brian have not checked in yet.')
    expect(stillToCheckIn(['Omar', 'Brian', 'David'])).toBe('Omar, Brian and David have not checked in yet.')
    expect(stillToCheckIn(['Omar', 'Brian', 'David', 'Samuel'])).toBe('Omar, Brian and 2 others have not checked in yet.')
    expect(sessionDay('2026-08-03T12:00:00.000Z')).toBe('Mon, 3 Aug')
  })
})
