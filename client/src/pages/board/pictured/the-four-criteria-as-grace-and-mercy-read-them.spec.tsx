import { it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TheOpenDeal, ReportedAgainstCriteria, WhatNeedsYou } from './ThePicturedSalesBoard'

/**
 * THE FOUR CRITERIA, "REPORTED VS CRITERIA MET" AND THE PRICE-RANGE QUESTION, AS GRACE AND MERCY READ THEM ON THE PAGE
 * (Hafsah's answer to Needs Hafsah 7; board-as-lead.txt). The rows are as the server serves them with Release 1's sales board on
 * (api: the-four-criteria-as-each-reader-reads-them.spec.ts).
 */
vi.mock('@/api/reports', () => ({ reportsApi: { sharing: vi.fn(async () => null), release: vi.fn(), hold: vi.fn() } }))
const wrap = (node: React.ReactNode) => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter>{node}</MemoryRouter></QueryClientProvider>)
const tick = (criterion: string, label: string, met: boolean, says: string | null = null) => ({ criterion, label, met, says })

const KASARANI = {
  id: 'k', kind: 'deal', name: 'Kasarani Gym', stage: 'Need established', owner: 'Kevin Omondi', mark: 'said', value: null, contactHistory: [], lastSaidOn: '2026-10-15',
  groupSays: 'Three of the four criteria are on record. The buying date is not on record yet. It was last spoken about on 15 October. No next step is booked.',
  criteria: [tick('need', 'Need', true), tick('budget', 'Budget the customer stated', true), tick('decision maker', 'Decision maker', true), tick('buying date', 'Buying date', false, 'Not on record yet.')],
}
const TUSKYS_FOR = (who: string) => ({
  id: 't', kind: 'deal', name: 'Tuskys Westgate', stage: 'Contacted', owner: 'Mercy Wairimu', mark: 'said', value: null, contactHistory: [], lastSaidOn: '2026-10-15',
  groupSays: 'Three of the four criteria are on record. The budget the customer stated is not on record yet. The customer said they will buy on 28 October.',
  criteria: [
    tick('need', 'Need', true),
    tick('budget', 'Budget the customer stated', false, `The customer gave a price range, KES 120,000 to 150,000. ${who} not decided yet whether a price range counts as a budget.`),
    tick('decision maker', 'Decision maker', true), tick('buying date', 'Buying date', true),
  ],
})

it('Grace opens Kasarani Gym and reads the kit\'s four lines, three ticked and the buying date not on record yet', () => {
  wrap(<TheOpenDeal r={KASARANI} groupNote={null} today="2026-10-15" groundId="g1" onChange={null} />)
  const items = screen.getByRole('list', { name: 'The four criteria' }).querySelectorAll('li')
  expect([...items].map((li) => li.textContent)).toEqual(['✓ Need', '✓ Budget the customer stated', '✓ Decision maker', '○ Buying date. Not on record yet.'])
  expect(document.body.textContent).toContain('Why it’s here. Three of the four criteria are on record.')
})

it('Mercy opens her own Tuskys Westgate and reads the range unticked, with Grace named as the one who decides', () => {
  wrap(<TheOpenDeal r={TUSKYS_FOR('Grace has')} groupNote={null} today="2026-10-15" groundId="g1" onChange={null} ownTag="Your deal" />)
  expect(screen.getByText('○ Budget the customer stated. The customer gave a price range, KES 120,000 to 150,000. Grace has not decided yet whether a price range counts as a budget.')).toBeTruthy()
})

it('Grace reads "Reported vs criteria met" as said and met, with the kit\'s two keys and no line saying the rules are not on record', () => {
  const b = { reportedAgainstCriteria: { state: 'not-known', why: 'Each stage counts the deals people reported at it or later, and how many of them meet what that stage needs, from the record. Won is met with a signed order or a payment record.', stages: [
    { stage: 'Contacted', reported: 5, met: 5, withProof: 2, says: '' }, { stage: 'Qualified', reported: 3, met: 1, withProof: 2, says: '' }, { stage: 'Won', reported: 2, met: 1, withProof: 2, says: '' },
  ] } }
  wrap(<ReportedAgainstCriteria b={b} />)
  const text = document.body.textContent ?? ''
  for (const s of ['Reported vs criteria met, stage by stage', '5 said, 5 met', '3 said, 1 met', '2 said, 1 met', 'Outlined: what people reported. Filled: what meets the criteria.']) expect(text).toContain(s)
  /* Changed 16 November (group 10, boards pass 4 defects 5 and 6): the second key spoke of reps on every kind of board and said the same as the first. */
  expect(text).not.toContain('Dashed: what reps reported')
  expect(text).not.toContain('with proof')
  expect(text).not.toContain('Nothing on record says what a deal must show')
})

it('Grace reads "Decide whether a price range counts as a budget" with who raised it and "Yes, it counts" and "No"; Mercy is sent none of it', () => {
  const route = (yes: boolean) => ({ method: 'POST', path: '/grounds/g1/board/price-range/answer', body: { yes } })
  const grace = { decisions: [], leadActions: [{
    id: 'price-range-counts-as-a-budget', says: 'Decide whether a price range counts as a budget',
    decision: { question: 'Decide whether a price range counts as a budget', why: 'Mercy raised it. It decides whether 1 deal counts as qualified.', afterwards: 'Your answer goes in how we work, and the board counts the deals by it.' },
    action: { label: 'Decide it', says: '', goesTo: null, choices: [{ label: 'Yes, it counts', route: route(true) }, { label: 'No', route: route(false) }] },
  }] }
  const renderActions = (a: any) => (a?.choices ?? []).map((c: any) => <button key={c.label}>{c.label}</button>)
  const { unmount } = wrap(<WhatNeedsYou b={grace} renderActions={renderActions} groundId="g1" deals={null} sessionRows={[]} />)
  expect(screen.getByText('Decide whether a price range counts as a budget')).toBeTruthy()
  expect(screen.getByText('Mercy raised it. It decides whether 1 deal counts as qualified.')).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Yes, it counts' })).toBeTruthy()
  expect(screen.getByRole('button', { name: 'No' })).toBeTruthy()
  unmount()
  wrap(<WhatNeedsYou b={{ decisions: [] }} renderActions={renderActions} groundId="g1" deals={null} sessionRows={[]} />)
  expect(document.body.textContent).not.toContain('price range')
})
