import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import CONTRACT from '@/pages/preview/__fixtures__/release-8-contract-review.json'
import { ThePicturedBoard } from './ThePicturedBoard'
import { theSituationsOrder } from './TheSituationsSections'

/* Release 8, hand-written data only: Baridi checking Juma Logistics (test)'s contract before signing, the board as the engine
   serves it (api board/release-8-situations), read by Grace, who runs it, and by Amani, who is in it. */
const draw = (b: any, runsIt: boolean) => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MemoryRouter>
      <ThePicturedBoard order={theSituationsOrder(b.situation, runsIt) as any} b={b} groundId="juma-test"
        sessionRows={[]} renderActions={() => null} overTime={null} recommendations={[]} onAnswerRecommendation={() => undefined}
        recommendationBusy={false} onRecordTheDecision={() => undefined} navigate={() => undefined} />
    </MemoryRouter>
  </QueryClientProvider>,
)
const heads = () => screen.queryAllByRole('heading', { level: 2 }).map((h) => h.textContent ?? '')

describe('Release 8: a situation no kit picture draws, as each reader reads it', () => {
  it('draws the sections checking an agreement switches on, in order, and nothing that is off', () => {
    draw(CONTRACT, true)
    expect(heads().filter((h) => ['What was agreed at the start', 'What each side promised', 'Risks'].includes(h)))
      .toEqual(['What was agreed at the start', 'What each side promised', 'Risks'])
    expect(heads()).not.toContain('Targets')
    expect(heads()).not.toContain('What happened, day by day')
  })

  it('says each promise and each risk in full sentences, with the facts it rests on', () => {
    draw(CONTRACT, true)
    expect(screen.getByText('Amani will send the contract back with the penalty clause marked by Friday 30 October.')).toBeTruthy()
    expect(screen.getByText('The contract could be signed before anyone has read the penalty clause again.')).toBeTruthy()
    expect(screen.getByText('Amani raised it on 20 October. Nobody has said what was decided about it.')).toBeTruthy()
    expect(screen.getByText('What each person said appears here once a check-in gives it something to show.')).toBeTruthy()
    expect(document.body.textContent).not.toMatch(/\b(Owner|Due|Status): /)
  })

  it('gives a person in it no "What needs you" and nothing to decide', () => {
    const order = theSituationsOrder(CONTRACT.situation, false)
    expect(order).not.toContain('needsYou')
    expect(order).not.toContain('recommends')
  })

  it('starts an open read empty, and says so plainly', () => {
    const open = { scenario: 'OPEN_READ', releaseEightSituations: true, participants: [], situation: { scenario: 'OPEN_READ', situation: 'Work through something else', group: 'Open', sections: [], stillToCome: null, empty: 'Nothing is clear yet, so this board is empty. Each part appears here as soon as people’s check-ins give it something to show.' } }
    draw(open, true)
    expect(screen.getByText('Nothing is clear yet, so this board is empty. Each part appears here as soon as people’s check-ins give it something to show.')).toBeTruthy()
    expect(heads().filter((h) => ['What each person said', 'What is known, what is believed, and what nobody knows yet', 'What keeps being raised'].includes(h))).toEqual([])
  })

  it('switches a section of an open read on once the record holds something for it', () => {
    const later = { scenario: 'OPEN_READ', releaseEightSituations: true, participants: [], timeline: [{ on: '2026-10-21', says: 'Kevin said the Mombasa depot stopped taking orders.' }], situation: { scenario: 'OPEN_READ', situation: 'Work through something else', group: 'Open', sections: [{ key: 'timeline', heading: 'What happened, day by day', why: 'It puts what happened in order, so nobody argues about when.' }], stillToCome: null, empty: null } }
    draw(later, true)
    expect(heads()).toContain('What happened, day by day')
    expect(screen.getByText('Kevin said the Mombasa depot stopped taking orders.')).toBeTruthy()
    expect(screen.getByText('21 October')).toBeTruthy()
  })
})
