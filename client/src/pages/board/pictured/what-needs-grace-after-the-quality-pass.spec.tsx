import { it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WhatNeedsYou } from './ThePicturedSalesBoard'

/**
 * WHAT NEEDS GRACE, AFTER HAFSAH'S QUALITY PASS OF 18 OCTOBER (Q2, B-7 to B-9). The payload is what the server serves Grace on the
 * short run's record (api: the-quality-pass-of-18-october-as-each-reader-reads-it.spec.ts), cut to what this section reads.
 */
vi.mock('@/api/reports', () => ({ reportsApi: { sharing: vi.fn(async () => null), release: vi.fn(), hold: vi.fn() } }))
const route = (path: string, yes: boolean) => ({ method: 'POST', path, body: { yes } })
const choices = (path: string) => [{ label: 'Yes, agree to it', route: route(path, true) }, { label: 'No', route: route(path, false) }]
const GRACE = {
  decisions: [],
  leadActions: [
    { id: 'waiting-on-the-lead-14d8', decision: { question: 'Decide whether Juja Hardware can have 5 units at KES 4,500 each', why: 'That is KES 500 a unit under the KES 5,000 on every other quote, KES 22,500 in all. Joseph asked you on 14 October, and Mr Kariuki is waiting for Joseph to call back.' }, action: { label: 'Decide it', choices: choices('/grounds/g/board/waits/14d8/answer') } },
    { id: 'the-stall-rule', decision: { question: 'No stall rule set yet', why: 'Groundwork suggests dropping a deal after 3 working days with no answer from the customer. Until you set a rule, no deal is marked cold or dropped for going quiet. Upper Hill Offices has not answered since 12 October, which is more than that.' }, action: { label: 'Set it', choices: [{ label: 'Yes, 3 working days', route: route('/grounds/g/board/stall-rule/answer', true) }, { label: 'Not now', route: route('/grounds/g/board/stall-rule/answer', false) }] } },
    { id: 'the-leads-own-decision-e2e7', decision: { question: 'Decide whether Mama Pima Stores can have 10 units for KES 38,000, which is KES 12,000 off', why: 'Wanjiru asked Joseph on 12 October and has had no answer. You said on 12 October that you would decide that day.' }, action: { label: 'Decide it', choices: choices('/grounds/g/board/deals/e2e7/decide') } },
  ],
  /* No stall rule is set (Hafsah's standing decision 4, as changed on 18 October): one item offers the suggested default to confirm. */
    atTheStallRule: [],
  participants: [],
}

it('Grace reads the price card with its deal and units, the discount she said she would decide, and the stall rule offered for her to set', () => {
  render(<QueryClientProvider client={new QueryClient()}><MemoryRouter>
    <WhatNeedsYou b={GRACE} groundId="g" deals={{ rows: [] }} sessionRows={[]} renderActions={(a: any) => <span>{(a.choices ?? []).map((c: any) => c.label).join(' / ')}</span>} />
  </MemoryRouter></QueryClientProvider>)
  const text = (document.body.textContent ?? '').replace(/\s+/g, ' ')
  expect(text).toContain('Decide whether Juja Hardware can have 5 units at KES 4,500 each')
  expect(text).toContain('That is KES 500 a unit under the KES 5,000 on every other quote, KES 22,500 in all. Joseph asked you on 14 October, and Mr Kariuki is waiting for Joseph to call back.')
  expect(text).toContain('Decide whether Mama Pima Stores can have 10 units for KES 38,000, which is KES 12,000 off')
  expect(text).toContain('You said on 12 October that you would decide that day.')
  expect(text).toContain('No stall rule set yet')
  expect(text).toContain('Until you set a rule, no deal is marked cold or dropped for going quiet.')
  expect(text).toContain('Yes, 3 working days / Not now')
  expect(text).not.toContain('The stall rule you set')
  expect(text).not.toContain('Ask Kevin')
  expect(text).not.toContain('Joseph Kariuki')
})
