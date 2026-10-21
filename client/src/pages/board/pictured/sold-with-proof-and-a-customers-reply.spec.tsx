import { it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HeadlineAndGap, TheOpenDeal } from './ThePicturedSalesBoard'

/**
 * DROP ACCESS, AND HAFSAH'S ANSWERS OF 17 OCTOBER. Grace's tile read "25 done" over two won deals with proof (65 units).
 * The aim is now counted from the deals, and the tile reads as the picture does: "21 sold, 17 with proof of payment"
 * (board-as-lead.txt). And a customer's reply is on its deal: the Savannah Cafe card says Kevin is waiting on Jane.
 */
const wrap = (node: React.ReactNode) => render(<QueryClientProvider client={new QueryClient()}><MemoryRouter>{node}</MemoryRouter></QueryClientProvider>)

it('Grace reads what is sold and what proof of payment shows, from the deals', () => {
  const b = {
    headline: { question: 'Will we reach 120 units sold by 30 October?', answer: 'Not yet. 65 units are sold, and no more are likely yet. That is 65 of the 120 needed.', bars: [] },
    objectives: [{ id: 'o', name: 'The team is aiming for 120 units sold by 30 October.', count: 65, target: 120, ownerParticipantId: null, fromTheDeals: { counts: 'units', sold: 65, proven: 40, says: '65 sold, 40 with proof of payment.' } }],
  }
  wrap(<HeadlineAndGap b={b} deals={{ rows: [] }} groups={{}} />)
  expect(screen.getByText('Not yet. 65 units are sold, and no more are likely yet. That is 65 of the 120 needed.')).toBeTruthy()
  expect(document.body.textContent).toContain('65 sold, 40 with proof of payment')
  expect(document.body.textContent).not.toContain('65 done')
})

it('the deal card says who is waiting on the customer, in the engine\'s own sentence', () => {
  const r = {
    id: 'd', kind: 'deal', name: 'Savannah Cafe', stage: 'Quoted', owner: 'Kevin Omondi', mark: 'said', next: null, nextStep: 'Follow up with Jane at Savannah Cafe',
    contactHistory: [], waitingOnTheCustomer: [{ id: 'w', says: 'Kevin Omondi has been waiting on Jane for a deposit since 14 October, and it has not been cleared.', step: 'Waiting on Jane for a deposit' }],
  }
  wrap(<TheOpenDeal r={r} groupNote={null} today="2026-10-16" groundId="g1" onChange={null} />)
  expect(screen.getByText('Kevin Omondi has been waiting on Jane for a deposit since 14 October, and it has not been cleared.')).toBeTruthy()
})
