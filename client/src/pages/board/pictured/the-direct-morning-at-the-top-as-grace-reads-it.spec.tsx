import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WhatNeedsYou, TheTeamToday, EveryDealDayByDay } from './ThePicturedSalesBoard'
import { WhatIsClosing } from './TheMorningOnTheBoard'
import { TheCollectionsBoard } from './TheCollectionsBoard'
import SERVED from './__fixtures__/the-direct-morning-served.json'
import COLLECTIONS from './__fixtures__/collections-served.json'

vi.mock('@/api/reports', () => ({ reportsApi: { sharing: vi.fn(async () => null), release: vi.fn(), hold: vi.fn() } }))
vi.mock('@/api/check-in-links', () => ({ checkInLinksApi: { get: vi.fn(async () => ({})) } }))

/**
 * GRACE'S AND WANJIRU'S MORNING, ON THEIR BOARDS (boards audit S1, S2, S12 and C1, 30 October 2026).
 *
 * CHANGED 30 OCTOBER. This spec read the direct morning drawn as one block above the board (TheMorningAtTheTop). That block left the
 * board on 24 October, and with it every line the server marks for the board alone: what is about to close, the credit and the asks
 * about each person, who to chase, and the deals with their close dates. Hafsah's decision kept "What's closing and the team" on the
 * first screen, so the block is gone for good (TheMorningAtTheTop.tsx is deleted) and each line is now drawn once, where it belongs:
 * closing as "What’s closing", each team line on that person's row of The team today, what needs her inside What needs you beside
 * the board's own decisions, and each deal's close date on its own row. The same served payloads are read, and the same sentences.
 */
const drop = (SERVED as any).drop
const fees = (SERVED as any).fees
const wrap = (node: React.ReactNode) => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter>{node}</MemoryRouter></QueryClientProvider>)
const KEVIN = '9f2e58a4-06d8-4a0a-bddc-03cd96df027c'
const MERCY = '5632caa0-593e-48d5-910e-5c9ea5bc4fb2'
const text = () => (document.body.textContent ?? '').replace(/\s+/g, ' ')

describe('Grace’s board, with her morning drawn where each line belongs', () => {
  it('reads what is closing on the first screen, in the server’s sentence', () => {
    wrap(<WhatIsClosing b={drop} heading="What’s closing" />)
    expect(screen.getByRole('heading', { name: 'What’s closing' })).toBeTruthy()
    expect(screen.getByText('Ngong Road Minimart pays KES 25,000 for 5 units on delivery tomorrow.')).toBeTruthy()
  })

  it('reads each team line on that person’s own row, and on no other', () => {
    const b = {
      ...drop,
      eachPersonToday: [
        { participantId: KEVIN, who: 'Kevin Omondi', line: 'Checked in today.', checkedInToday: true },
        { participantId: MERCY, who: 'Mercy Wairimu', line: 'Checked in today.', checkedInToday: true },
      ],
      eachPerson: [],
    }
    wrap(<TheTeamToday b={b} deals={{ rows: [] }} today="2026-10-20" groundId="g1" />)
    const kevin = screen.getByRole('link', { name: 'Kevin' }).closest('.pb-row') as HTMLElement
    const mercy = screen.getByRole('link', { name: 'Mercy' }).closest('.pb-row') as HTMLElement
    expect(within(kevin).getByText("Kevin's sale to Roysambu Gym has no proof yet, so ask Kevin for the payment record.")).toBeTruthy()
    expect(within(mercy).getByText('Mercy has 2 sales with proof, so tell Mercy well done.')).toBeTruthy()
    expect(kevin.textContent).not.toContain('Mercy has 2 sales')
  })

  it('reads her decisions with their buttons, and her morning’s lines only where the board has no item for the same thing', () => {
    const b = {
      theMorning: { parts: [{ key: 'needsYou', heading: 'What needs you today', lines: [
        'Peter has been waiting on you since Thursday for a specific area to focus on.',
        'People said different things about how sales are counted, so settle it with them.',
      ], about: [{ ref: 'wait-1' }, { ref: 'People said different things about how sales are counted, so it needs settling.' }] }] },
      decisions: [
        { question: 'Decide whether a price range counts as a budget', why: 'Brian and Miriam both raised it.', source: 'lead', action: { label: 'Decide it', choices: [{ label: 'Yes, it counts' }, { label: 'No' }] } },
        { question: 'People said different things about how sales are counted, so it needs settling.', why: 'What people said does not match.', source: 'divergence', action: { label: 'Open your check-in' } },
      ],
      leadActions: [],
      participants: [],
    }
    wrap(<WhatNeedsYou b={b} renderActions={(a: any) => (a?.choices ?? []).map((c: any) => <button key={c.label}>{c.label}</button>)} groundId="g1" deals={null} sessionRows={[]} />)
    expect(screen.getByText('Decide whether a price range counts as a budget')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Yes, it counts' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'No' })).toBeTruthy()
    expect(screen.getByText('Peter has been waiting on you since Thursday for a specific area to focus on.')).toBeTruthy()
    /* The difference is the board's own decision, drawn once. */
    expect(screen.queryByText('People said different things about how sales are counted, so settle it with them.')).toBeNull()
    expect(text()).not.toContain('Nothing needs you today.')
  })

  it('says "Nothing needs you today." only where nothing else needs her', () => {
    const b = { theMorning: { parts: [{ key: 'needsYou', heading: 'What needs you today', lines: [], none: 'Nothing needs you today.' }] }, decisions: [], leadActions: [], participants: [] }
    wrap(<WhatNeedsYou b={b} renderActions={() => null} groundId="g1" deals={null} sessionRows={[]} />)
    expect(screen.getByText('Nothing needs you today.')).toBeTruthy()
  })

  it('reads each deal’s close date on its own row, as the morning’s deal list had it', () => {
    const rows = [
      { id: 's', kind: 'deal', name: 'Savannah Cafe', owner: 'Kevin Omondi', stage: 'Quoted', group: 'likely', buyingDate: '2026-10-24', contactHistory: [] },
      { id: 'k', kind: 'deal', name: 'Kilele Hotel', owner: 'Kevin Omondi', stage: 'Quoted', group: 'possible', buyingDate: '2026-10-16', contactHistory: [] },
    ]
    wrap(<EveryDealDayByDay b={{ participants: [], canEditFrame: false }} section={{ section: 'Deal grid', rows, groups: [] }} now={new Date('2026-10-20T09:00:00Z')} groundId="g1" />)
    expect(screen.getByText('Buys on 24 October.')).toBeTruthy()
    expect(screen.getByText('Was to buy on 16 October.')).toBeTruthy()
  })
})

describe('Wanjiru’s fee notes board, with her morning', () => {
  it('reads the wait on her beside the bills, who to chase, and the team, and no bill twice', () => {
    const board = (COLLECTIONS as any).boards.wanjiru
    wrap(<TheCollectionsBoard board={board} b={fees} />)
    expect(screen.getByText('Brian has been waiting on you since 12 October for guidance on how to proceed with the double-billing claim.')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Who to chase' })).toBeTruthy()
    expect(screen.getByText('Jamii Clinics owes KES 180,000 on FN-007, and Aisha follows it up.')).toBeTruthy()
    expect(text()).not.toMatch(/shared picture|a conversation worth having|It's not a verdict|Groundwork does not/i)
  })

  it('draws a morning line about a bill only where the board has no row for that bill', () => {
    const board = { ...(COLLECTIONS as any).boards.wanjiru }
    board.needsYou = { ...board.needsYou, refs: board.needsYou.rows.map((_: any, i: number) => (i === 0 ? 'bill-x' : `bill-${i}`)) }
    const b = { theMorning: { groundId: 'g', parts: [{ key: 'needsYou', heading: 'What needs you today', lines: ['A line about the first row’s bill.', 'Brian has been waiting on you.'], about: [{ ref: 'bill-x' }, { ref: 'wait-1' }] }] } }
    wrap(<TheCollectionsBoard board={board} b={b} />)
    expect(screen.queryByText('A line about the first row’s bill.')).toBeNull()
    expect(screen.getByText('Brian has been waiting on you.')).toBeTruthy()
  })
})
