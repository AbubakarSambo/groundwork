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

/**
 * ADDED (Hafsah, 30 September, the setting row): check-in-people-and-setup.jpg draws a header row
 * over this table - "Person", "In this check-in", "Their role, as described", "Status" - and
 * "Runs it" as a blue tag, not the plain grey one "Checks in" gets. Neither had ever been checked.
 */
describe('the header row, and "Runs it" as a blue tag', () => {
  it('as the lead, all four column headings are there', () => {
    renderTable(true)
    expect(screen.getByText('Person')).toBeTruthy()
    expect(screen.getByText('In this check-in')).toBeTruthy()
    expect(screen.getByText('Their role, as described')).toBeTruthy()
    expect(screen.getAllByText('Status').length).toBeGreaterThan(0)
  })

  it('for anyone else, the role column heading is left out along with the column itself', () => {
    renderTable(false)
    expect(screen.getByText('Person')).toBeTruthy()
    expect(screen.getByText('In this check-in')).toBeTruthy()
    expect(screen.queryByText('Their role, as described')).toBeNull()
  })

  it('"Runs it" is the blue tag; "Checks in" stays the plain one', () => {
    renderTable(false)
    expect(screen.getByText('Runs it')).toHaveClass('gwui-tag-action')
    expect(screen.getByText('Checks in')).toHaveClass('gwui-tag-plain')
  })
})

/**
 * U.4 RE-REVIEW, ITEM 2A: SOMEBODY DECLINED READS "NOT LET IN" HERE TOO.
 *
 * With Faraji declined by an admin, this table kept saying "Waiting for an admin" - the state he was
 * in before the decision, not after it - because `statusFor` never read `p.notLetIn`, the same field
 * `WhosInItRoster.tsx`'s own roster already reads for the same fact.
 */
describe('somebody an admin has declined', () => {
  const groundWithADecline = {
    initiatorId: 'lead-1',
    participants: [
      { id: 'p-lead', userId: 'lead-1', email: 'wairimu@example.test', roleAsDescribed: null },
      { id: 'p-3', userId: 'user-3', email: 'faraji@example.test', roleAsDescribed: null, notLetIn: true, user: { awaitingOrgApproval: true } },
    ],
  }

  it('reads "Not let in", not "Waiting for an admin"', () => {
    render(
      <MemoryRouter>
        <RolesInThisCheckIn ground={groundWithADecline} isInitiator={false} updateRole={updateRole} />
      </MemoryRouter>,
    )
    expect(screen.getByText('Not let in')).toBeTruthy()
    expect(screen.queryByText('Waiting for an admin')).toBeNull()
  })
})

/** U.4 re-review, item 4: never a name guessed out of an email address, here too. */
describe('somebody with no name and no account', () => {
  const groundWithZawadi = {
    initiatorId: 'lead-1',
    participants: [
      { id: 'p-lead', userId: 'lead-1', email: 'rukia@example.test', roleAsDescribed: null },
      { id: 'p-zawadi', userId: null, email: 'zawadi.u8@example.test', roleAsDescribed: null, user: null },
    ],
  }

  it('reads her plain address, never a guessed name', () => {
    render(
      <MemoryRouter>
        <RolesInThisCheckIn ground={groundWithZawadi} isInitiator={false} updateRole={updateRole} />
      </MemoryRouter>,
    )
    expect(screen.getByText('zawadi.u8@example.test')).toBeTruthy()
    expect(screen.queryByText('Zawadi U8')).toBeNull()
  })
})

/**
 * B-077: A LEAD WHO ONLY MANAGES IS NEVER "CHECKING IN". Grace runs an anchor check-in
 * (`HELP_TEAM_UNDERSTAND`) and does not check in herself - `WhosInItRoster.tsx` already leaves her
 * out of "N are checking in" above this table, but her own row here still read "Runs it" in the
 * first column and then the status tag "Checking in", because `statusFor` had no managing-only case.
 */
describe('a lead who only manages, in an anchor check-in', () => {
  const groundWithAManager = {
    initiatorId: 'lead-1',
    scenario: 'HELP_TEAM_UNDERSTAND',
    participants: [
      { id: 'p-lead', userId: 'lead-1', email: 'grace@example.test', roleAsDescribed: null, managingOnly: true },
      { id: 'p-2', userId: 'user-2', email: 'amani@example.test', roleAsDescribed: null },
    ],
  }

  it('her status reads "Runs it", never "Checking in" - only Amani, who does check in, reads that', () => {
    renderIt(groundWithAManager)
    /* Two "Runs it" tags on Grace's row (the "In this check-in" column and the status column), and
       exactly one "Checking in" (Amani's status - he does check in). */
    expect(screen.getAllByText('Runs it').length).toBe(2)
    expect(screen.getAllByText('Checking in').length).toBe(1)
  })

  it('in an ordinary check-in, a lead who only manages is not assumed - she still reads her real status', () => {
    renderIt({ ...groundWithAManager, scenario: 'OTHER' })
    expect(screen.getAllByText('Checking in').length).toBeGreaterThanOrEqual(1)
  })

  function renderIt(g: any) {
    return render(
      <MemoryRouter><RolesInThisCheckIn ground={g} isInitiator={false} updateRole={updateRole} /></MemoryRouter>,
    )
  }
})

/**
 * B-108: "NOBODY HAS DESCRIBED IT YET.EDIT" RAN TWO SENTENCES TOGETHER WITH NO SPACE BETWEEN
 * THEM. JSX drops the line break between the sentence and the "Edit" button, so without an
 * explicit space the two sit side by side as one word.
 */
describe('the role sentence and "Edit" are not run together', () => {
  it('reads "yet. Edit", with a space, not "yet.Edit"', () => {
    renderTable(true)
    expect(document.body.textContent).toContain('Nobody has described it yet. Edit')
    expect(document.body.textContent).not.toContain('yet.Edit')
  })
})

describe('somebody with no name, whose address this reader may not see', () => {
  it('is "Somebody invited by email", never "A colleague"', () => {
    render(
      <MemoryRouter><RolesInThisCheckIn
        updateRole={{ mutate: () => {}, isPending: false }}
        ground={{ initiatorId: 'lead-1', participants: [
          { id: 'p-lead', userId: 'lead-1', email: null, user: { firstName: 'Rukia', lastName: 'Otieno' } },
          { id: 'p-zawadi', userId: null, email: null, awaitingSeat: true, user: null },
        ] } as any}
        isInitiator={false}
      /></MemoryRouter>,
    )
    expect(screen.getAllByText('Somebody invited by email').length).toBeGreaterThan(0)
    expect(document.body.textContent).not.toMatch(/A colleague/)
  })
})
