import { describe, it, expect, vi } from 'vitest'
import { render, screen, within, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WhatNeedsYou, TheTeamToday, HeadlineAndGap, TheOpenDeal, OpenIssues, WhatKeepsComingUp } from './ThePicturedSalesBoard'
import { YourTeamPersonByPerson } from './YourTeamPersonByPerson'
import { TheMatterBoard } from './TheMatterBoard'
import { PROJECT_ORDER, PROJECT_FOLD_AFTER } from '../release-5-orders'
import { RELEASE_4_ORDERS, whereItFolds } from '../release-4-orders'
import NIGHT from '../__fixtures__/night-run-2-boards.json'
import TEAM from './__fixtures__/your-team-served.json'
import MATTER from './__fixtures__/matter-served.json'
import './pictured-board.css'

vi.mock('@/api/reports', () => ({ reportsApi: { sharing: vi.fn(async () => null), release: vi.fn(), hold: vi.fn() } }))
vi.mock('@/api/check-in-links', () => ({ checkInLinksApi: { get: vi.fn(async () => ({})) } }))
vi.mock('@/lib/the-direct-morning', () => ({ useTheDirectMorning: () => true }))

/**
 * WHAT GRACE NEEDS, BACK ON HER BOARD (boards audit, 30 October 2026: "Restore everything people need that was removed by accident ...
 * so each board shows complete information. Keep the prototype's look; restore the function."). Grace's payload is what the API served
 * her in the second night run (night-run-2-boards.json); each case reads what she sees, in the words she sees.
 */
const grace = (NIGHT as any).grace
const wrap = (node: React.ReactNode) => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter>{node}</MemoryRouter></QueryClientProvider>)
const text = () => (document.body.textContent ?? '').replace(/\s+/g, ' ')
const KEVIN = '9f2e58a4-06d8-4a0a-bddc-03cd96df027c'

describe('The team today: who is delivering (S3)', () => {
  it('Grace reads each person’s own number against their own target, and what they said, on their row', () => {
    wrap(<TheTeamToday b={grace} deals={null} today="2026-10-20" groundId="g" />)
    const kevin = screen.getByRole('link', { name: 'Kevin' }).closest('.pb-row') as HTMLElement
    expect(within(kevin).getByText('49 sold, 46 with proof of payment. Kevin’s target is 30.')).toBeTruthy()
    expect(within(kevin).getByText('Kevin Omondi has checked in, and has been waiting on Paul for a reply to their calls since 14 October.')).toBeTruthy()
    /* The reason said short is gone where the sentence is there. */
    expect(within(kevin).queryByText('Waiting on someone')).toBeNull()
  })
})

describe('What needs you: the lead’s own items (S2, S4, S11)', () => {
  it('Grace reads the people not yet told their target, a target nobody owns, and her own open promise, with no team-size condition', () => {
    const b = { ...grace, leadActions: [...grace.leadActions, { id: 'own-c1', says: 'In session 2, you said “I will do that now.” It has been open for 4 sessions.', because: null, action: { label: 'Open your check-in' } }] }
    wrap(<WhatNeedsYou b={b} renderActions={(a: any) => <span>{a?.label}</span>} groundId="g" deals={null} sessionRows={[]} />)
    expect(text()).toContain('people have not been told their target')
    expect(text()).toContain("One target has nobody's name on it, so everybody on this check-in can see it.")
    expect(text()).toContain('In session 2, you said “I will do that now.” It has been open for 4 sessions.')
  })
})

describe('To close the gap, and every deal (S7, S8, S9, S15)', () => {
  const rows = [
    { id: 'a', kind: 'deal', name: 'Lavington Business Park', owner: 'Grace Achieng', group: 'possible', valueLine: '20 units', nextStep: 'Site visit on Tuesday at 10' },
    { id: 'b', kind: 'deal', name: 'Mama Pima Stores', owner: 'Joseph Kariuki', group: 'possible', valueLine: '10 units', nextStep: 'Waiting on Mrs Atieno' },
    { id: 'c', kind: 'deal', name: 'Juja Hardware', owner: 'Joseph Kariuki', group: 'possible', valueLine: '5 units, KES 22,500 if you agree KES 4,500', nextStep: 'Get that price to Juja Hardware' },
    { id: 'd', kind: 'deal', name: 'Upper Hill Offices', owner: 'Peter Njoroge', group: 'possible', valueLine: null, nextStep: 'If no reply, drop it' },
  ]
  it('each gap row says what the deal holds, and the fourth can be opened and read', () => {
    const b = { headline: { question: 'Will we reach 120 units sold by 30 October?' }, objectives: [{ id: 'o', target: 120, count: 75, ownerParticipantId: null }], toCloseTheGap: { heading: 'To close the gap, all four and more', says: 'Two of them have no number of units yet.' } }
    wrap(<HeadlineAndGap b={b} deals={{ rows }} groups={{ possible: rows }} />)
    expect(screen.getByText('Grace, 20 units')).toBeTruthy()
    expect(screen.getByText('Joseph, 5 units, KES 22,500 if you agree KES 4,500')).toBeTruthy()
    const more = screen.getByText('and 1 more')
    expect(getComputedStyle(more).display).not.toBe('none')
    fireEvent.click(more)
    expect(getComputedStyle(screen.getByText('Upper Hill Offices')).display).not.toBe('none')
  })
  it('the opened deal reads the whole next step, and who to speak to at the customer', () => {
    const r = { id: 'm', kind: 'deal', name: 'Mama Pima Stores', owner: 'Joseph Kariuki', mark: 'said', fields: { Contact: 'Mrs. Atieno' }, nextStep: 'Waiting on Mrs Atieno for her final decision', next: 'Waiting on Mrs Atieno for her final decision on the number of units and confirmation of payment.', contactHistory: [] }
    wrap(<TheOpenDeal r={r} groupNote={null} today="2026-10-20" groundId="g" onChange={null} />)
    expect(text()).toContain('Next: Waiting on Mrs Atieno for her final decision on the number of units and confirmation of payment.')
    expect(screen.getByText('Mrs. Atieno is the contact at Mama Pima Stores.')).toBeTruthy()
  })
})

describe('Open issues and What keeps coming up (S10, S14)', () => {
  it('Grace reads every open issue, not the first three', () => {
    const issues = ['One', 'Two', 'Three', 'Four'].map((t, i) => ({ id: `i${i}`, title: `Issue ${t}`, step: 'Unclear' }))
    wrap(<OpenIssues b={{ openIssues: { issues } }} renderActions={() => null} />)
    for (const t of ['One', 'Two', 'Three', 'Four']) expect(screen.getByText(`Issue ${t}`)).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Show all/ })).toBeNull()
  })
  it('reads each person’s own description of what ran ahead, not only the first person’s', () => {
    const patterns = [
      { id: 'p1', participantId: 'p-k', about: 'what is said against what happened', heading: 'Sold before it is paid', whatHappened: 'Kevin said Roysambu Gym was won before the payment came.' },
      { id: 'p2', participantId: 'p-j', about: 'what is said against what happened', heading: 'Sold before it is paid', whatHappened: 'Joseph said Mama Pima was won with nothing on file.' },
    ]
    wrap(<WhatKeepsComingUp b={{ patterns, participants: [{ id: 'p-k', name: 'Kevin Omondi' }, { id: 'p-j', name: 'Joseph Kariuki' }] }} />)
    expect(text()).toContain('Kevin said Roysambu Gym was won before the payment came.')
    expect(text()).toContain('Joseph said Mama Pima was won with nothing on file.')
  })
})

describe('Your team, person by person (S6)', () => {
  it('what each person delivered says how many with proof without a tap, and what you have done starts open', () => {
    const drop = (TEAM as any).drop
    wrap(<YourTeamPersonByPerson groundId="g" team={drop} />)
    const kevin = drop.people.find((p: any) => p.participantId === KEVIN) ?? drop.people[0]
    expect(text()).toContain(`${kevin.delivered.proven.length ? `${kevin.delivered.proven.length} delivered with proof.` : 'Nothing delivered with proof yet.'}`)
    for (const d of document.querySelectorAll('details')) {
      if (d.querySelector('.gwui-fold-name')?.textContent === 'What you have done') expect(d.hasAttribute('open')).toBe(true)
    }
  })
})

describe('The matter board (M4, M5)', () => {
  it('Wanjiru reads each decision with what she can do about it, and where this is heading', () => {
    const m = { ...(MATTER as any).matter.wanjiru, decide: { heading: 'What you need to decide', rows: [{ question: 'Brian is waiting on you for guidance on the double-billing claim.', why: 'They cannot move until it comes.', action: { label: 'Reply in your check-in' } }], empty: null } }
    const b = { whereThisIsHeading: { heading: 'Where this is heading', outcomes: [], outcomesSays: 'No outcome is clear yet.', signals: [], signalsSays: 'No signal yet.', whatWouldSettleIt: [], whatWouldSettleItSays: 'Nothing on record yet.', whoDecides: 'You decide.', groundworkDoesNotChoose: 'Groundwork does not choose.' } }
    wrap(<TheMatterBoard board={m} b={b} renderActions={(a: any) => <button>{a.label}</button>} onRecordTheDecision={() => undefined} />)
    expect(screen.getByRole('button', { name: 'Reply in your check-in' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Where this is heading' })).toBeTruthy()
  })
})

describe('The release boards’ first screens (R4-1, R5-1)', () => {
  it('a team board shows the team today before every ticket or sale, and folds after it', () => {
    for (const kind of ['support desk', 'distribution operations', 'engineering release', 'sales org']) {
      const o = RELEASE_4_ORDERS[kind]
      expect(o.indexOf('teamToday')).toBeLessThan(o.indexOf('everySale'))
      expect(whereItFolds(kind)).toBe('teamToday')
    }
  })
  it('a project has What needs you on its first screen and its Blockers', () => {
    expect(PROJECT_ORDER).toContain('needsYou')
    expect(PROJECT_ORDER).toContain('blockers')
    expect(PROJECT_FOLD_AFTER).toBe('needsYou')
  })
})
