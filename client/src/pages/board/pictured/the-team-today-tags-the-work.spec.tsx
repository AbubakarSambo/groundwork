import { it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { TheTeamToday, aTagForTheWork } from './ThePicturedSalesBoard'

/**
 * "THE TEAM TODAY", EACH ROW'S SHORT TAG (board-as-lead.txt): Aisha "Deals moving", Brian "Many visits, few moves", David
 * "Visits without names", Omar "Not in yet". The two about visits are the server's, from a pattern about the work
 * (a-short-tag-for-the-work.ts); a deal moving with proof this week, or not having checked in, still comes first.
 */
const TODAY = '2026-09-23'
const B = {
  eachPerson: [
    { participantId: 'p-a', reason: 'nothing to do' }, { participantId: 'p-b', reason: 'nothing to do' },
    { participantId: 'p-d', reason: 'nothing to do' }, { participantId: 'p-o', reason: 'has not answered' },
  ],
  eachPersonToday: [
    { participantId: 'p-a', who: 'Aisha Otieno', line: 'I spoke to John Butchery.', workTag: 'Many visits, few moves' },
    { participantId: 'p-b', who: 'Brian Mwangi', line: 'I made 8 visits and 6 older follow-ups.', workTag: 'Many visits, few moves' },
    { participantId: 'p-d', who: 'David Kariuki', line: 'I made 8 visits today.', workTag: 'Visits without names' },
    { participantId: 'p-o', who: 'Omar Said', line: 'Omar has not checked in.', workTag: 'Visits without names' },
  ],
  patterns: [],
}
const DEALS = { rows: [{ kind: 'deal', ownerParticipantId: 'p-a', contactHistory: [{ on: '2026-09-22', how: 'proof: quote photo' }] }] }

it('Wairimu reads each person’s tag about the work, as pictured', () => {
  render(<MemoryRouter><TheTeamToday b={B} deals={DEALS} today={TODAY} groundId="g1" /></MemoryRouter>)
  const rowOf = (name: string) => screen.getByText(name).closest('.pb-row') as HTMLElement
  expect(rowOf('Aisha').textContent).toContain('Deals moving')
  expect(rowOf('Brian').textContent).toContain('Many visits, few moves')
  expect(rowOf('David').textContent).toContain('Visits without names')
  expect(rowOf('Omar').textContent).toContain('Not in yet')
  expect(rowOf('Omar').textContent).not.toContain('Visits without names')
})

it('with no tag from the server, the row reads as before', () => {
  expect(aTagForTheWork('nothing to do', [], TODAY)).toEqual({ word: 'Nothing needs you', tone: 'proven' })
  expect(aTagForTheWork('nothing to do', [], TODAY, 'Visits without names')).toEqual({ word: 'Visits without names', tone: 'attention' })
})
