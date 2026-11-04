import { it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HeadlineAndGap } from './ThePicturedSalesBoard'

/**
 * DROP ACCESS, 17 OCTOBER. Grace's board read "To close the gap, all seven of these" for 55 units still to sell, over seven
 * open deals that hold 13 units between them. The server now counts the gap by what each deal holds, and the board reads its
 * heading and its sentence.
 */
const wrap = (node: React.ReactNode) => render(<QueryClientProvider client={new QueryClient()}><MemoryRouter>{node}</MemoryRouter></QueryClientProvider>)
const deal = (id: string, name: string, units: string | null) => ({ id, kind: 'deal', name, group: 'possible', owner: 'Kevin Omondi', fields: units ? { Units: units } : {}, nextSays: 'Nobody has said what happens next.' })
const POSSIBLE = [deal('a', 'Savannah Cafe', '6'), deal('b', 'Ngong Road Minimart', '4'), deal('c', 'Juja Hardware', null)]
const aim = { id: 'o', name: 'Units sold by 30 October', count: 65, target: 120, ownerParticipantId: null, fromTheDeals: { counts: 'units', sold: 65, proven: 65 } }

it('reads the server\'s heading and sentence when the deals cannot close the gap, never "all three of these"', () => {
  const b = {
    headline: { question: 'Will we reach 120 units sold by 30 October?', answer: 'Not yet.' },
    objectives: [aim],
    toCloseTheGap: {
      gap: 55, aim: 'Units sold by 30 October', deals: [],
      heading: 'To close the gap, more than these three deals are needed',
      says: '55 more units are needed by 30 October. The three open deals still possible hold 10 units on record, so even if all of them close, 45 more units would be needed. 1 of them has nothing on record for how many units, so it is not counted.',
    },
  }
  wrap(<HeadlineAndGap b={b} deals={{ rows: POSSIBLE }} groups={{ possible: POSSIBLE }} />)
  const text = document.body.textContent ?? ''
  expect(text).toContain('To close the gap, more than these three deals are needed')
  expect(text).toContain('so even if all of them close, 45 more units would be needed.')
  expect(text).not.toContain('all three of these')
  expect(text).toContain('Juja Hardware')
})

it('reads "two of these three" when two of them hold enough', () => {
  const b = {
    headline: { question: 'Will we reach 120 units?', answer: 'Not yet.' },
    objectives: [{ ...aim, count: 110 }],
    toCloseTheGap: { gap: 10, aim: 'Units sold by 30 October', deals: [], heading: 'To close the gap, two of these three', says: '10 more units are needed by 30 October. The three open deals still possible hold 10 units on record, so two of these three would need to close. 1 of them has nothing on record for how many units, so it is not counted.' },
  }
  wrap(<HeadlineAndGap b={b} deals={{ rows: POSSIBLE }} groups={{ possible: POSSIBLE }} />)
  expect(document.body.textContent).toContain('To close the gap, two of these three')
})

it('an aim that counts sales still counts each deal as one, as before', () => {
  const b = { headline: { question: 'Will we reach 25 sales?', answer: 'Not yet.' }, objectives: [{ id: 'o', name: '25 sales', count: 23, target: 25, ownerParticipantId: null, fromTheDeals: { counts: 'sales', sold: 23, proven: 20 } }] }
  wrap(<HeadlineAndGap b={b} deals={{ rows: POSSIBLE }} groups={{ possible: POSSIBLE }} />)
  expect(document.body.textContent).toContain('To close the gap, two of these three')
})

it('Grace reads the kit\'s "Nothing booked" under a deal with no next step on record, with Release 1\'s sales board on (point 4)', () => {
  const b = {
    releaseOneSalesBoard: true,
    headline: { question: 'Will we reach 120 units sold by 30 October?', answer: 'Not yet.' },
    objectives: [aim],
    toCloseTheGap: { gap: 55, aim: 'Units sold by 30 October', deals: [], heading: 'To close the gap, more than these three deals are needed', says: '' },
  }
  wrap(<HeadlineAndGap b={b} deals={{ rows: POSSIBLE }} groups={{ possible: POSSIBLE }} />)
  const rowOf = (name: string) => (Array.from(document.querySelectorAll('.pb-gap-row')).find((x) => x.textContent?.includes(name)) as HTMLElement).textContent
  expect(rowOf('Juja Hardware')).toContain('Nothing booked')
  expect(document.body.textContent).not.toContain('Nobody has said what happens next.')
})

it('switched off, the row reads the sentence it read before', () => {
  const b = { headline: { question: 'Will we reach 120 units?', answer: 'Not yet.' }, objectives: [aim], toCloseTheGap: { gap: 55, aim: 'x', deals: [], heading: 'To close the gap, more than these three deals are needed', says: '' } }
  wrap(<HeadlineAndGap b={b} deals={{ rows: POSSIBLE }} groups={{ possible: POSSIBLE }} />)
  expect(document.body.textContent).toContain('Nobody has said what happens next.')
})
