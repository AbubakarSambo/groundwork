import { describe, it, expect } from 'vitest'
import { render, screen, within, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import PROJECT from '@/pages/preview/__fixtures__/release-5-project.json'
import { ThePicturedBoard } from './ThePicturedBoard'
import { PROJECT_ORDER } from '../release-5-orders'
import { useAskStore } from '@/stores/ask'

/* Release 5, hand-written data only: Mastercard market study (test), its board drawn by the engine (release-5-projects) from its
   records (api board/__fixtures__/a-funded-project.ts), read by Wanjiku, who leads it. */
const draw = () => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MemoryRouter>
      <ThePicturedBoard order={PROJECT_ORDER} b={PROJECT as any} groundId="mastercard-test"
        sessionRows={[]} renderActions={() => null} overTime={null} recommendations={[]} onAnswerRecommendation={() => undefined}
        recommendationBusy={false} onRecordTheDecision={() => undefined} navigate={() => undefined} />
    </MemoryRouter>
  </QueryClientProvider>,
)
const heads = () => screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent ?? '')

describe('Release 5: a project, as its lead reads it', () => {
  it('has the five parts of "A project", in its order', () => {
    draw()
    expect(heads().filter((h) => ['The plan', 'Money in and out', 'Stakeholders', 'Coming up', 'If it goes off track'].includes(h)))
      .toEqual(['The plan', 'Money in and out', 'Stakeholders', 'Coming up', 'If it goes off track'])
  })

  it('reads the plan as the milestones, each with its day and share', () => {
    draw()
    const plan = screen.getByRole('list', { name: 'The plan' })
    expect(within(plan).getAllByRole('listitem').map((li) => li.querySelector('.h')?.textContent)).toEqual([
      'Milestone 1, the inception report', 'Milestone 2, field data from 6 markets', 'Milestone 3, the final report and workshop',
    ])
    expect(within(plan).getByText('Due 30 November. 30% of the contract is paid when it is accepted. It is started.')).toBeTruthy()
  })

  it('shows each month\'s money, and the tightest month in December\'s own card', () => {
    draw()
    expect(screen.getByText('The tightest month is December, KES 210,000 short if nothing else comes in by then.', { selector: 'b' })).toBeTruthy()
  })

  it('opens Ask on the funder\'s brief from "Rehearse with me"', () => {
    draw()
    fireEvent.click(screen.getByRole('button', { name: 'Rehearse with me' }))
    const asked = useAskStore.getState().pendingMessage ?? ''
    expect(asked).toMatch(/^Rehearse this update with me\. Here is the brief Groundwork drew from the record\. The update for The Mastercard programme lead\./)
    expect(asked).toContain('Last time they asked: “How many traders have you spoken to, and in which markets?”')
  })

  it('says what could go off track from the record, in full sentences', () => {
    draw()
    expect(screen.getByText('County trade officers in 6 counties could be at risk. Brian keeps in touch with them. What they need is still to be learned.')).toBeTruthy()
    expect(document.body.textContent).not.toMatch(/\bOut: |\bIn: |Owner: /)
  })
})
