import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { RolesInThisCheckIn } from './RolesInThisCheckIn'

/**
 * "ROLES IN THIS CHECK-IN" SHOWS THE LEAD'S NOTE ONLY TO THE LEAD (picture check, 29 Sept).
 *
 * `roleAsDescribed` is mostly the lead's own private sentence about a person
 * (no-screen-names-a-person-by-the-leads-note.spec.ts) - walked as Juma, an admin who does not run
 * this check-in, "I sell fridges in Kilimani" showed beside Faraji's name. Rendered here as each of
 * the three readers this tab has: the lead sees the column, an admin who does not run it and a
 * participant see the person, their part ("Runs it"/"Checks in"), and their status - and nothing of
 * what the lead wrote about them, anywhere in the page's text.
 */
const ground = {
  initiatorId: 'lead-1',
  participants: [
    { id: 'p-lead', userId: 'lead-1', email: 'wairimu@example.test', roleAsDescribed: null },
    { id: 'p-2', userId: 'user-2', email: 'faraji@example.test', roleAsDescribed: 'I sell fridges in Kilimani' },
  ],
}

const updateRole = { mutate: () => {}, isPending: false }

function renderTable(isInitiator: boolean) {
  return render(
    <MemoryRouter>
      <RolesInThisCheckIn ground={ground} isInitiator={isInitiator} updateRole={updateRole} />
    </MemoryRouter>,
  )
}

describe('the role-as-described column is the lead\'s to read', () => {
  it('as the lead, the column shows', () => {
    renderTable(true)
    expect(screen.getByText(/I sell fridges in Kilimani/)).toBeTruthy()
    expect(screen.getByText(/Role, as described/)).toBeTruthy()
  })

  it('as an admin who does not run it, the note is nowhere in the page\'s text', () => {
    const { container } = renderTable(false)
    expect(container.textContent).not.toMatch(/fridges/i)
    expect(container.textContent).not.toContain('Role, as described')
    expect(screen.queryByText('Edit')).toBeNull()
  })

  it('and as a participant, the same is true - this component draws no distinction between the two, and neither reads the lead\'s note', () => {
    const { container } = renderTable(false)
    expect(container.textContent).not.toMatch(/fridges/i)
    expect(screen.queryByText('Edit')).toBeNull()
  })

  it('everyone still sees who is in it and what part they play', () => {
    renderTable(false)
    expect(screen.getByText('wairimu@example.test')).toBeTruthy()
    expect(screen.getByText('Runs it')).toBeTruthy()
    expect(screen.getByText('Checks in')).toBeTruthy()
  })
})
