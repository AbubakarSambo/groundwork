import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WhosInItRoster, whatStopsThem, whosInItSays } from './WhosInItRoster'

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
  /* In a QueryClientProvider, as the app draws it: the add panel now asks whether WhatsApp is on, for the sentence under its
     "Phone number" field (Hafsah, 30 October 2026). The words checked below are unchanged. */
  function renderAddPanel(isOrgAdmin: boolean) {
    return render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          <WhosInItRoster
            {...baseProps()}
            isOrgAdmin={isOrgAdmin}
            ground={{ initiatorId: 'lead-1', createdAt: '2026-09-27T09:00:00.000Z', participants: [] }}
            showAdd
          />
        </MemoryRouter>
      </QueryClientProvider>,
    )
  }

  it('says "until you share the report", not "until the report releases"', () => {
    renderAddPanel(true)
    expect(screen.getByText(/You cannot see what they write until you share the report\./)).toBeTruthy()
    expect(document.body.textContent).not.toContain('until the report releases')
  })

  /* Says what happens, not how approval works (Hafsah, 30 October 2026: plain language for an
     impatient first-time lead; "all the approval they need" explained the product instead). */
  it('for an admin, says what happens to somebody she adds, in plain sentences', () => {
    renderAddPanel(true)
    expect(screen.getByText('Anybody you add can check in straight away. Somebody from outside your organisation also appears on your People page, where you can take them off again.')).toBeTruthy()
    expect(document.body.textContent).not.toContain('all the approval they need')
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

/**
 * JOURNEY ROUND 4 (Hafsah, 13 October 2026). Dara Delta accepted and never answered anything; her sessions were
 * closed by the clock. People and setup said "Dara Delta has checked in for this session." A missed session is
 * never "checked in". Eli Epsilon never accepted: he is "Not joined yet" and never said to be late.
 */
describe('People and setup, with the journey round 4 people', () => {
  const quiet = (n: number) => ({ sessionNumber: n, status: 'COMPLETED', closedReason: 'auto_closed', turns: [] })
  const said = (n: number) => ({ sessionNumber: n, status: 'COMPLETED', closedReason: null, turns: [{ id: 't' }] })
  const round4 = {
    initiatorId: 'lead-1',
    createdAt: '2026-10-12T09:00:00.000Z',
    participants: [
      { id: 'p-lead', userId: 'lead-1', email: 'lena@example.test', invitedAt: null, checkIns: [said(1)] },
      { id: 'p-dara', userId: 'user-dara', email: 'dara@example.test', invitedAt: '2026-10-12T09:00:00.000Z', user: { firstName: 'Dara', lastName: 'Delta' }, checkIns: [quiet(1), quiet(2)] },
      { id: 'p-eli', userId: null, email: 'eli@example.test', nameGiven: 'Eli Epsilon', invitedAt: '2026-10-12T09:00:00.000Z', notJoinedYet: true, checkIns: [] },
    ],
  }

  it('a session closed by the clock with nothing said is not one they did', async () => {
    const { hasDoneThisSession } = await import('@/lib/which-session-are-we-on')
    expect(hasDoneThisSession([quiet(2)], 2)).toBe(false)
    expect(hasDoneThisSession([said(2)], 2)).toBe(true)
  })

  it('Dara reads "has not checked in for this session yet", and Eli reads "Not joined yet" with no session line', async () => {
    const { hasDoneThisSession } = await import('@/lib/which-session-are-we-on')
    const sessionParties = round4.participants.map((p) => ({ id: p.id, done: hasDoneThisSession(p.checkIns as any, 2), isSelf: p.id === 'p-lead' }))
    render(
      <MemoryRouter>
        <WhosInItRoster {...baseProps()} ground={round4} sessionParties={sessionParties} notOpenYet={false} />
      </MemoryRouter>,
    )
    const text = document.body.textContent ?? ''
    console.log(`PEOPLE AND SETUP READS: ${text}`)
    expect(text).not.toContain('Dara Delta has checked in for this session.')
    expect(text).toContain('Dara Delta has not checked in for this session yet.')
    expect(screen.getByText('Not joined yet')).toBeTruthy()
    expect(text).not.toMatch(/Eli Epsilon has (not )?checked in/)
  })
})

/*
 * THE LINE ABOVE THE ROSTER SAYS WHAT EACH PERSON NEEDS (Hafsah, 30 October 2026, first-experience
 * round 1: "3 need something before they can start" told an impatient lead nothing). It is counted
 * from the same reason each row's tag reads, so the two cannot disagree.
 */
describe('the count above the roster', () => {
  it('names each reason somebody cannot check in yet, from the one reason the rows read', () => {
    const people = [
      { id: 'a', userId: 'u-a' },
      { id: 'b', userId: null, notJoinedYet: true },
      { id: 'c', userId: null, notJoinedYet: true },
      { id: 'd', userId: 'u-d', user: { awaitingOrgApproval: true } },
      { id: 'e', userId: null, inviteDeliveryStatus: 'BOUNCED' },
    ]
    expect(people.map(whatStopsThem)).toEqual([null, 'notJoined', 'notJoined', 'admin', 'bounced'])
    expect(whosInItSays(people)).toBe('5 people. 1 is checking in. 2 have not joined yet. 1 is waiting for an admin to let them in. 1 did not get the invitation, because the email bounced.')
    expect(whosInItSays(people)).not.toMatch(/need something|needs something/)
  })
})
