import { it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { EveryDealDayByDay, ThePicturedOwnDeals, TheTeamToday } from './ThePicturedSalesBoard'

/**
 * HAFSAH'S POINTS OF 17 OCTOBER (Drop Access), AS GRACE AND MERCY READ THEM ON THE PAGE. The rows are as the server serves them
 * with Release 1's sales board on (api: hafsahs-drop-access-points-as-each-reader-reads-them.spec.ts).
 */
const NOW = new Date('2026-10-15T17:00:00Z')
const wrap = (node: React.ReactNode) => render(<QueryClientProvider client={new QueryClient()}><MemoryRouter>{node}</MemoryRouter></QueryClientProvider>)
const MBOGA = { id: 'm', kind: 'deal', name: 'Mama Mboga Mart', stage: 'Contacted', owner: 'Mercy Wairimu', ownerParticipantId: 'p-mercy', fields: { Units: 'two', Contact: 'Rose' }, value: null, buyingDate: '2026-10-30', mark: 'said', next: null, nextStep: 'Waiting on Rose for the purchase of the two units', group: 'possible', groupSays: 'It rests on what somebody said, with no proof yet. The customer said they will buy on 30 October. It was last spoken about on 15 October. A next step is on record.', contactHistory: [{ on: '2026-10-15', how: 'in their words' }], lastSaidOn: '2026-10-15' }
const JUJA = { id: 'j', kind: 'deal', name: 'Juja Hardware', stage: 'Pitched', owner: 'Joseph Kariuki', ownerParticipantId: 'p-joseph', fields: { Contact: 'the assistant', 'Price each': 'KES 4,500' }, value: null, mark: 'said', next: null, group: 'possible', contactHistory: [], lastSaidOn: '2026-10-15' }
const ADDED = { id: 'a', kind: 'deal', name: 'Karen Butchery', stage: null, owner: null, ownerParticipantId: null, fields: {}, value: null, mark: 'none', next: null, group: 'possible', contactHistory: [], lastSaidOn: null }
const GROUPS = [{ group: 'possible', heading: 'Possible', reason: 'Each of these is still open.', rowIds: ['m', 'j', 'a'] }]
const row = (name: string) => screen.getAllByText(name)[0].closest('tr') as HTMLElement

it('Grace reads no value beside Joseph for a price of one unit, the kit\'s six stages and "Nothing booked" (points 4, 5, 7)', () => {
  wrap(<EveryDealDayByDay b={{ participants: [], canEditFrame: false, releaseOneSalesBoard: true }} section={{ section: 'Deal grid', rows: [MBOGA, JUJA, ADDED], groups: GROUPS }} now={NOW} groundId="g1" />)
  expect(row('Juja Hardware').textContent).toContain('Joseph')
  expect(row('Juja Hardware').textContent).not.toContain('4,500')
  expect(row('Juja Hardware').textContent).toContain('Pitched')
  expect(row('Juja Hardware').textContent).toContain('Nothing booked')
  expect(row('Karen Butchery').textContent).toContain('Not contacted yet.')
  expect(document.body.textContent).not.toContain('No stage said yet')
})

it('Mercy reads her own Mama Mboga Mart deal as Grace does: the same stage, the same step and why it is there (point 6)', () => {
  const b = { participants: [], canEditFrame: false, releaseOneSalesBoard: true, myParticipantId: 'p-mercy', workRecords: [{ section: 'Deal grid', rows: [MBOGA], groups: [{ ...GROUPS[0], rowIds: ['m'] }] }] }
  wrap(<ThePicturedOwnDeals b={b} groundId="g1" myFirstName="Mercy" />)
  expect(row('Mama Mboga Mart').textContent).toContain('Contacted')
  expect(row('Mama Mboga Mart').textContent).toContain('Waiting on Rose for the purchase of the two units')
  expect(document.body.textContent).toContain('The customer said they will buy on 30 October.')
})

it('Grace reads each person\'s line from today, and "Not in yet" only for somebody who has not checked in today (point 10)', () => {
  const b = {
    eachPerson: [{ participantId: 'p-mercy', reason: 'has not answered' }, { participantId: 'p-omar', reason: 'has not answered' }],
    eachPersonToday: [
      { participantId: 'p-mercy', who: 'Mercy Wairimu', line: 'Greenfield Supermarket ordered 25 units, which comes to 125,000 shillings.', checkedInToday: true },
      { participantId: 'p-omar', who: 'Omar Said', line: 'Hasn’t checked in today.', checkedInToday: false },
    ],
    patterns: [],
  }
  wrap(<TheTeamToday b={b} deals={{ rows: [] }} today="2026-10-15" groundId="g1" />)
  const rowOf = (name: string) => screen.getByText(name).closest('.pb-row') as HTMLElement
  expect(rowOf('Mercy').textContent).toContain('Greenfield Supermarket ordered 25 units')
  expect(rowOf('Mercy').textContent).not.toContain('Not in yet')
  expect(rowOf('Omar').textContent).toContain('Hasn’t checked in today.')
  expect(rowOf('Omar').textContent).toContain('Not in yet')
})
