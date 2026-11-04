import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WhatNeedsYou } from './ThePicturedSalesBoard'
import { ThePicturedTeamReport } from '../../report/pictured/ThePicturedTeamReport'
import { reportsApi } from '@/api/reports'
import { boardApi } from '@/api/board'
import { apiClient } from '@/api/client'

/**
 * WHAT NEEDS GRACE, ON HER BOARD AND IN THE TEAM'S REPORT (Hafsah, 17 October; board-as-lead.txt, team-report.txt).
 *
 * The payloads below are what the API served Grace Achieng and Mercy Wairimu in Drop Access (test) on 17 October, cut
 * to the parts these two sections read. Grace reads Joseph's question about the KES 4,500 price as a decision, with
 * "Yes, agree to it" and "No", and the stalled Mama Pima Stores with "Ask Joseph". The same question is "One question to
 * answer" on the team's report, answered the same way. Mercy, who checks in, is sent none of it, so reads none of it,
 * even with a stalled deal of her own on her board.
 */
vi.mock('@/api/reports', () => ({ reportsApi: { sharing: vi.fn(async () => null), release: vi.fn(), hold: vi.fn(), sessionReport: vi.fn(), sendToEveryone: vi.fn() } }))
vi.mock('@/api/board', () => ({ boardApi: { get: vi.fn() } }))
vi.mock('@/api/client', () => ({ apiClient: { post: vi.fn(async () => ({ data: { saidBack: 'This is now in how we work.' } })), patch: vi.fn() } }))

const G = '5f00946a-5452-4997-b905-2e565cc93708'
const ROUTE = (yes: boolean) => ({ method: 'POST', path: `/grounds/${G}/board/waits/21dec956/answer`, body: { yes } })
const GRACE = {
  decisions: [],
  leadActions: [{
    id: 'waiting-on-the-lead-21dec956',
    says: 'You need to get back to Joseph Kariuki, who is waiting on you for an answer about the KES 4,500 price for Juja Hardware.',
    because: 'It was first said on 15 October. Nobody has said what has been tried. No time has been given for it.',
    decision: {
      question: 'Decide whether to agree to the KES 4,500 price for Juja Hardware',
      asked: 'Do you agree to the KES 4,500 price for Juja Hardware?',
      why: 'Joseph Kariuki asked you on 15 October and is still waiting for your answer. It decides the price on Joseph’s Juja Hardware deal.',
      afterwards: 'Your answer updates the board, and Joseph is no longer waiting on you.',
    },
    action: { label: 'Decide it', says: 'Your answer goes in how we work, and the person waiting on you is no longer waiting.', goesTo: null, choices: [{ label: 'Yes, agree to it', route: ROUTE(true) }, { label: 'No', route: ROUTE(false) }] },
  }],
  atTheStallRule: [{
    participantId: 'p-joseph', name: 'Joseph Kariuki', deals: ['Mama Pima Stores'],
    title: 'Mama Pima Stores has not answered Joseph since 12 October',
    detail: 'The stall rule says drop it. Nothing on record says why Joseph is holding on to it.',
    ask: 'Ask Joseph',
  }],
}
/* Mercy's own board: no leadActions, no atTheStallRule, and a deal of hers the customer has gone quiet on. */
const MERCY = {
  workRecords: [{ section: 'Deal grid', rows: [{ id: 'm', kind: 'deal', name: 'Mama Mboga Mart', group: 'cold', owner: 'Mercy Wairimu', ownerParticipantId: 'p-mercy', notAnsweringSince: '2026-10-12', contactHistory: [{ on: '2026-10-13' }, { on: '2026-10-14' }] }] }],
}
const renderActions = (a: any) => (a?.choices ?? []).map((c: any) => <button key={c.label}>{c.label}</button>)
const wrap = (node: React.ReactNode) => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter>{node}</MemoryRouter></QueryClientProvider>)
const SHARED_TODAY = [{ sessionNumber: 4, shared: true, answered: 3 }]

describe('"What needs you in this check-in"', () => {
  it('Grace reads the decision first, then the stalled deal, each in full sentences with its buttons', () => {
    wrap(<WhatNeedsYou b={GRACE} renderActions={renderActions} groundId={G} deals={null} sessionRows={SHARED_TODAY} />)
    const text = document.body.textContent ?? ''
    expect(screen.getByRole('heading', { name: 'What needs you in this check-in' })).toBeTruthy()
    expect(screen.getByText('Decide whether to agree to the KES 4,500 price for Juja Hardware')).toBeTruthy()
    expect(screen.getByText('Joseph Kariuki asked you on 15 October and is still waiting for your answer. It decides the price on Joseph’s Juja Hardware deal.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Yes, agree to it' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'No' })).toBeTruthy()
    expect(screen.getByText('Mama Pima Stores has not answered Joseph since 12 October')).toBeTruthy()
    expect(screen.getByText('The stall rule says drop it. Nothing on record says why Joseph is holding on to it.')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Ask Joseph' })).toBeTruthy()
    expect(text.indexOf('Decide whether to agree')).toBeLessThan(text.indexOf('Mama Pima Stores has not answered'))
    expect(text).not.toMatch(/\b(he|she|him|her)\b/)
  })

  it('Mercy, who checks in, reads nothing here, even with a quiet customer of her own', () => {
    wrap(<WhatNeedsYou b={MERCY} renderActions={renderActions} groundId={G} deals={MERCY.workRecords[0]} sessionRows={SHARED_TODAY} />)
    expect(screen.queryByText('What needs you in this check-in')).toBeNull()
    expect(document.body.textContent).not.toMatch(/stall rule|Ask Mercy|agree to/i)
  })
})

/*
 * RELEASE 1'S SALES BOARD SWITCHED OFF FOR THE ORGANISATION (release-one-sales-board). The server sends no decision and no stall
 * list, and says the board is off; Grace reads the item the board had before it. Mercy is never told the board's state.
 */
describe('"What needs you" with Release 1’s sales board switched off', () => {
  const JOSEPHS = { section: 'Deal grid', rows: [
    { id: 'p', kind: 'deal', name: 'Mama Pima Stores', group: 'cold', owner: 'Joseph Kariuki', ownerParticipantId: 'p-joseph', notAnsweringSince: '2026-10-12', contactHistory: [{ on: '2026-10-13' }, { on: '2026-10-14' }] },
  ] }
  it('Grace reads the item the board had before: Joseph still following up a quiet lead, and "Ask Joseph"', () => {
    wrap(<WhatNeedsYou b={{ decisions: [], leadActions: [], releaseOneSalesBoard: false }} renderActions={renderActions} groundId={G} deals={JOSEPHS} sessionRows={SHARED_TODAY} />)
    expect(screen.getByText('Joseph has followed up a lead with no reply for 2 check-ins')).toBeTruthy()
    expect(screen.getByText('The stall rule says drop it. Nothing on record says why Joseph is still following it up.')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Ask Joseph' })).toBeTruthy()
    expect(document.body.textContent).not.toMatch(/Decide whether to agree|has not answered Joseph since/)
  })

  it('with it on, Grace never reads the old item beside the new one', () => {
    wrap(<WhatNeedsYou b={{ ...GRACE, releaseOneSalesBoard: true }} renderActions={renderActions} groundId={G} deals={JOSEPHS} sessionRows={SHARED_TODAY} />)
    expect(screen.getByText('Mama Pima Stores has not answered Joseph since 12 October')).toBeTruthy()
    expect(screen.queryByText('Joseph has followed up a lead with no reply for 2 check-ins')).toBeNull()
  })
})

describe('"One question to answer" on the team’s report', () => {
  const REPORT = { released: true, counting: [{ who: 'Kevin Omondi', answered: true }, { who: 'Mercy Wairimu', answered: true }, { who: 'Joseph Kariuki', answered: true }], whatEachPersonSaid: [], pictureLines: ['Three deals moved.'] }
  beforeEach(() => { vi.clearAllMocks(); vi.mocked(reportsApi.sessionReport).mockResolvedValue(REPORT as any) })

  it('Grace reads Joseph’s question, what it decides, Yes and No, and what her answer does; her answer goes the same way as on the board', async () => {
    vi.mocked(boardApi.get).mockResolvedValue(GRACE as any)
    wrap(<ThePicturedTeamReport groundId={G} sessionNumber={4} ground={{ label: 'Sales team, Q4', checkIns: [], participants: [] }} />)
    expect(await screen.findByText('One question to answer')).toBeTruthy()
    expect(screen.getByText('Do you agree to the KES 4,500 price for Juja Hardware?')).toBeTruthy()
    expect(screen.getByText('Joseph Kariuki asked you on 15 October and is still waiting for your answer. It decides the price on Joseph’s Juja Hardware deal.')).toBeTruthy()
    expect(screen.getByText('Your answer updates the board, and Joseph is no longer waiting on you.')).toBeTruthy()
    expect(document.body.textContent).not.toContain('everyone counts the same way')
    fireEvent.click(screen.getByRole('button', { name: 'Yes, agree to it' }))
    await waitFor(() => expect(apiClient.post).toHaveBeenCalledWith(`/grounds/${G}/board/waits/21dec956/answer`, { yes: true }))
    expect(screen.getByRole('button', { name: 'No' })).toBeTruthy()
  })

  it('with no decision waiting on her, the section is not shown', async () => {
    vi.mocked(boardApi.get).mockResolvedValue({ decisions: [], leadActions: [{ id: 'own-1', says: 'You said you would review these.', because: null, action: { label: 'Has it happened?', says: '', goesTo: null, choices: [] } }] } as any)
    wrap(<ThePicturedTeamReport groundId={G} sessionNumber={4} ground={{ label: 'Sales team, Q4', checkIns: [], participants: [] }} />)
    expect(await screen.findByText('In short')).toBeTruthy()
    expect(screen.queryByText('One question to answer')).toBeNull()
  })
})
