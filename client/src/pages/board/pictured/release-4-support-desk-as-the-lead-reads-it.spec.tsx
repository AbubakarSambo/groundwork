import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThePicturedBoard } from './ThePicturedBoard'
import { RELEASE_4_ORDERS, RELEASE_4_FOLD_AFTER } from '../release-4-orders'
import board from '../../preview/__fixtures__/release-4-support-desk.json'

/**
 * RELEASE 4, THE SUPPORT DESK (support.jpg), AS ITS LEAD READS IT, from Kijani Helpdesk (test), written by hand. The sections in the
 * picture's order, each target with the picture's colour for where it stands, a ceiling read as "of ≤", and no line joined with a colon.
 */
function draw(startOpen = true) {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>
        <ThePicturedBoard order={RELEASE_4_ORDERS['support desk']} foldAfter={startOpen ? RELEASE_4_FOLD_AFTER : undefined} b={board as any} groundId="kijani-support-desk"
          sessionRows={[]} renderActions={() => null} overTime={null} recommendations={[]} onAnswerRecommendation={() => undefined}
          recommendationBusy={false} onRecordTheDecision={() => undefined} navigate={() => undefined} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('Release 4: the support desk, as its lead reads it', () => {
  it('draws the sections in support.jpg’s order', () => {
    draw()
    const heads = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)
    /* The team today before every ticket, on the first screen, as on Grace's board (boards audit R4-1, 30 October). */
    const want = ['Where each target stands', 'What needs you in this check-in', 'The team today', 'Every ticket, and what shows it', 'Volume from the helpdesk, causes from the check-ins', 'By queue', 'Who checked in', 'Blockers', 'What keeps coming up']
    expect(heads.filter((h) => want.includes(h ?? ''))).toEqual(want)
  })

  it('says where each target stands in the picture’s colours, with a limit as “of ≤”', () => {
    const { container } = draw()
    expect(screen.getByText('7 of ≤ 5')).toBeTruthy()
    expect(container.querySelector('.tag.rec')?.textContent).toBe('Met')
    expect(container.querySelector('.tag.con')?.textContent).toBe('Over limit')
    expect(container.querySelector('.tag.att')?.textContent).toBe('Close')
  })

  it('shows the helpdesk’s counts as tiles and the causes people gave, and joins nothing with a colon', () => {
    const { container } = draw()
    expect(container.querySelectorAll('.pb-volume-tile').length).toBe(5)
    expect(screen.getByText('Billing bug after a plan change')).toBeTruthy()
    const needs = screen.getByRole('heading', { name: 'What needs you in this check-in' }).closest('section')!
    expect(needs.textContent).not.toMatch(/Tom: /)
  })
})
