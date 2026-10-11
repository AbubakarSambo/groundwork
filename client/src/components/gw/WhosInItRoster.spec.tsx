import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { WhosInItRoster } from './WhosInItRoster'

/**
 * "NOT LET IN" IN THE ROSTER (U.4 re-review, item 2b and 2c).
 *
 * With Faraji declined by an admin: his row must never claim he "has not checked in for this
 * session yet" - a sentence that reads as if a session were open and waiting on him, which is
 * untrue of somebody who cannot get in at all - and the help line that names him twice must use his
 * first name the second time, the way his own page already does ("...so Faraji cannot check in.",
 * never "...so Faraji Odhiambo cannot check in.").
 */
const noop = () => {}
const noopMutation = { mutate: noop, isPending: false }

function baseProps() {
  return {
    isInitiator: true,
    isOrgAdmin: true,
    addingMany: false,
    addManyParticipants: noop,
    newParticipantEmail: '',
    setNewParticipantEmail: noop,
    newParticipantNote: '',
    setNewParticipantNote: noop,
    newParticipantDepartment: '',
    setNewParticipantDepartment: noop,
    addParticipantMut: noopMutation,
    queuedToAdd: [],
    setQueuedToAdd: noop,
    inviteTheQueue: noopMutation,
    lastInvitedEmail: null,
    whyItWaits: null,
    lastInviteWaits: false,
    billingStatus: null,
    navigate: noop,
    onShareCode: noop,
    fixingEmailId: null,
    setFixingEmailId: noop,
    fixingEmailValue: '',
    setFixingEmailValue: noop,
    fixEmail: noopMutation,
    resendInvite: { ...noopMutation, variables: undefined },
    showAdd: false,
    showLink: false,
  }
}

const groundWithADecline = {
  initiatorId: 'lead-1',
  createdAt: '2026-09-27T09:00:00.000Z',
  participants: [
    { id: 'p-lead', userId: 'lead-1', email: 'rukia@example.test', invitedAt: null },
    {
      id: 'p-faraji', userId: 'user-faraji', email: 'faraji@example.test',
      user: { firstName: 'Faraji', lastName: 'Odhiambo', awaitingOrgApproval: true },
      invitedAt: '2026-09-27T09:00:00.000Z',
      notLetIn: true, notLetInBy: null, notLetInAt: null,
    },
  ],
}

function renderRoster(sessionParties?: { id: string; done: boolean; isSelf: boolean }[]) {
  return render(
    <MemoryRouter>
      <WhosInItRoster {...baseProps()} ground={groundWithADecline} sessionParties={sessionParties} notOpenYet={false} />
    </MemoryRouter>,
  )
}

/*
 * FAULT 5 (live walk, 6 October 2026): PLAIN SENTENCES, NOT JARGON OR A DASH JOIN.
 *
 * "You cannot see what they write until the report releases" used the filing-cabinet word
 * ("releases") for sharing a report with people, and "adding somebody is the approval - there is
 * no queue" joined two separate statements with a dash rather than saying each as its own
 * sentence - both against the wording rule in CLAUDE.md.
 */
describe('the "add a person" panel reads plain sentences (fault 5, live walk, 6 October 2026)', () => {
  function renderAddPanel(isOrgAdmin: boolean) {
    return render(
      <MemoryRouter>
        <WhosInItRoster
          {...baseProps()}
          isOrgAdmin={isOrgAdmin}
          ground={{ initiatorId: 'lead-1', createdAt: '2026-09-27T09:00:00.000Z', participants: [] }}
          showAdd
        />
      </MemoryRouter>,
    )
  }

  it('says "until you share the report", not "until the report releases"', () => {
    renderAddPanel(true)
    expect(screen.getByText(/You cannot see what they write until you share the report\./)).toBeTruthy()
    expect(document.body.textContent).not.toContain('until the report releases')
  })

  it('for an admin, says adding is the approval and nobody waits in a queue, as two sentences', () => {
    renderAddPanel(true)
    expect(screen.getByText(/You are an admin here, so adding someone here is all the approval they need\. Nobody waits in a queue\./)).toBeTruthy()
    expect(document.body.textContent).not.toContain('is the approval - there is no queue')
  })
})

describe('somebody an admin has declined, in "Who is in it"', () => {
  it('never says he has not checked in for this session, because he cannot check in at all', () => {
    renderRoster([
      { id: 'p-lead', done: true, isSelf: true },
      { id: 'p-faraji', done: false, isSelf: false },
    ])
    expect(screen.getByText('Not let in')).toBeTruthy()
    expect(screen.queryByText(/Faraji Odhiambo has not checked in for this session yet\./)).toBeNull()
  })

  it('names him in full once, then by his first name, in the sentence saying he cannot check in', () => {
    renderRoster()
    expect(screen.getByText('An admin did not let Faraji Odhiambo in, so Faraji cannot check in.')).toBeTruthy()
  })

  it('reads "Invited", not "Joined", while he is still waiting at the door', () => {
    const waiting = {
      initiatorId: 'lead-1',
      createdAt: '2026-09-22T09:00:00.000Z',
      participants: [
        { id: 'p-lead', userId: 'lead-1', email: 'rukia@example.test', invitedAt: null },
        {
          id: 'p-peter', userId: 'user-peter', email: 'peter@example.test',
          user: { firstName: 'Peter', lastName: 'Otieno', awaitingOrgApproval: true },
          invitedAt: '2026-09-22T09:00:00.000Z',
        },
      ],
    }
    render(
      <MemoryRouter>
        <WhosInItRoster {...baseProps()} ground={waiting} notOpenYet={false} />
      </MemoryRouter>,
    )
    expect(screen.getByText('Invited 22 September')).toBeTruthy()
    expect(screen.queryByText(/^Joined/)).toBeNull()
  })
})

/**
 * U.4 RE-REVIEW, ITEM 4: NEVER A NAME GUESSED OUT OF AN EMAIL ADDRESS, AND NEVER SHOWN TWICE.
 *
 * Zawadi, held for a seat with no account of her own, used to read as "AC", "A colleague" here, and
 * the same fact her admin already sees on People (her address) was withheld from this page. Now
 * that the server serves her address to an admin (or whoever runs the check-in), this reads that
 * address as her name where there is none on record - never "Zawadi U8", a word split out of
 * "zawadi.u8@example.test" that nobody typed as her name - and never the address a second time
 * underneath it.
 */
describe('somebody with no name and no account, whose email this reader may see', () => {
  const groundWithZawadi = {
    initiatorId: 'lead-1',
    createdAt: '2026-09-27T09:00:00.000Z',
    participants: [
      { id: 'p-lead', userId: 'lead-1', email: 'rukia@example.test', invitedAt: null },
      { id: 'p-zawadi', userId: null, email: 'zawadi.u8@example.test', awaitingSeat: true, user: null },
    ],
  }

  it('reads her plain address as her name, never a name guessed out of it, and never "A colleague"', () => {
    render(
      <MemoryRouter>
        <WhosInItRoster {...baseProps()} ground={groundWithZawadi} notOpenYet={false} />
      </MemoryRouter>,
    )
    expect(screen.getByText('zawadi.u8@example.test')).toBeTruthy()
    expect(screen.queryByText('Zawadi U8')).toBeNull()
    expect(screen.queryByText('A colleague')).toBeNull()
    /* Her address is not repeated a second time underneath itself. */
    expect(screen.getAllByText('zawadi.u8@example.test')).toHaveLength(1)
  })
})

/* Re-review, 30 September: for an admin, the server hides the address of someone with no name
   (the "hide email addresses" setting), and the roster used to put a made-up "A colleague" in the
   middle of a sentence. It now says "this person", and heads the row "Somebody invited by email". */
describe('somebody with no name, whose email this reader may not see', () => {
  const groundWithZawadiHidden = {
    initiatorId: 'lead-1',
    createdAt: '2026-09-27T09:00:00.000Z',
    participants: [
      { id: 'p-lead', userId: 'lead-1', email: null, invitedAt: null, user: { firstName: 'Rukia', lastName: 'Otieno' } },
      { id: 'p-zawadi', userId: null, email: null, awaitingSeat: true, user: null },
    ],
  }
  /* PHONE WALK, SCREEN FAULT 1: the held-for-a-seat sentence now names who it is about instead of
     burying it in the middle ("Your plan has no seat for..."), the same sentence GroundAdminPage's
     own "Who has answered" roster uses for the same state. */
  it('heads the row plainly and says "this person" in a sentence, never "A colleague"', () => {
    render(
      <MemoryRouter>
        <WhosInItRoster {...baseProps()} isInitiator={false} isOrgAdmin ground={groundWithZawadiHidden} notOpenYet={false} />
      </MemoryRouter>,
    )
    expect(screen.getAllByText('Somebody invited by email').length).toBeGreaterThan(0)
    expect(screen.getByText('Somebody invited by email is waiting for a seat on your plan. They will get their invitation as soon as there is one.')).toBeTruthy()
    expect(document.body.textContent).not.toMatch(/A colleague/)
  })
})

/**
 * IN AN ANCHOR CHECK-IN THE LEAD WHO ONLY MANAGES IS NOT COUNTED AND NOT "CHECKING IN" (screens' item a, 8 October).
 * Before: "1 person. 1 is checking in." and "Checking in" on her own row.
 */
describe('an anchor check-in with a lead who only manages', () => {
  const anchor = (scenario: string) => ({
    scenario,
    initiatorId: 'lead-1',
    createdAt: '2026-09-27T09:00:00.000Z',
    participants: [
      { id: 'p-lead', userId: 'lead-1', email: 'baraka@example.test', invitedAt: null, managingOnly: true },
      { id: 'p-kito', userId: 'u-kito', email: 'kito@example.test', user: { firstName: 'Kito', lastName: 'Mwangi' }, invitedAt: '2026-09-28T09:00:00.000Z', managingOnly: false },
    ],
  })
  const draw = (scenario: string) => render(<MemoryRouter><WhosInItRoster {...baseProps()} ground={anchor(scenario)} notOpenYet={false} /></MemoryRouter>)

  it('counts one person, one checking in, and shows "Checking in" once', () => {
    const { container } = draw('HELP_TEAM_UNDERSTAND')
    expect(container.textContent).toContain('1 person. 1 is checking in.')
    expect(screen.getAllByText('Checking in')).toHaveLength(1)
  })
  it('counts both in any other check-in', () => {
    const { container } = draw('OKR_ALIGNMENT')
    expect(container.textContent).toContain('2 people. 2 are checking in.')
  })
})
