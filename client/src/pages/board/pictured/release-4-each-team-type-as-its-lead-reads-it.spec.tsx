import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThePicturedBoard } from './ThePicturedBoard'
import { RELEASE_4_ORDERS, whereItFolds, theRelease4Order } from '../release-4-orders'
import operations from '../../preview/__fixtures__/release-4-operations.json'
import engineering from '../../preview/__fixtures__/release-4-engineering.json'
import salesOrg from '../../preview/__fixtures__/release-4-sales-org.json'
import subscriptions from '../../preview/__fixtures__/release-4-subscriptions.json'
import leadership from '../../preview/__fixtures__/release-4-leadership.json'
import supportDesk from '../../preview/__fixtures__/release-4-support-desk.json'

/**
 * RELEASE 4, EACH TEAM TYPE AS ITS LEAD READS IT, from its hand-written test organisation: the sections in the kit picture's order
 * (ops.jpg, eng.jpg, salesorg.jpg, mvq4.jpg), what needs you in whole sentences with no colon, and the fold where the type has one.
 */
function draw(b: any) {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>
        <ThePicturedBoard order={RELEASE_4_ORDERS[b.kindOfWork]} foldAfter={whereItFolds(b.kindOfWork)} b={b} groundId={b.groundId}
          sessionRows={[]} renderActions={() => null} overTime={null} recommendations={[]} onAnswerRecommendation={() => undefined}
          recommendationBusy={false} onRecordTheDecision={() => undefined} navigate={() => undefined} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}
const heads = () => screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent ?? '')
const inOrder = (want: string[]) => expect(heads().filter((h) => want.includes(h))).toEqual(want)

describe('Release 4: each team type, as its lead reads it', () => {
  it('operations, as ops.jpg, with incidents by site and type', () => {
    const { container } = draw(operations)
    /* The team today before every incident, on the first screen, as on Grace's board (boards audit R4-1, 30 October). */
    inOrder(['Where each target stands', 'What needs you in this check-in', 'The team today', 'Every incident, and what shows it', 'Incidents by site and type, last 8 weeks', 'By site', 'Who checked in', 'Blockers', 'What keeps coming up'])
    expect(container.querySelectorAll('.pb-heat tbody tr').length).toBe(4)
    expect(container.querySelector('.pb-heat-3')?.textContent).toBe('3')
  })

  it('engineering, as eng.jpg, with what was reported against the evidence', () => {
    draw(engineering)
    inOrder(['Where each target stands', 'What needs you in this check-in', 'The team today', 'Every task, and what shows it', 'Reported vs evidence, stage by stage', 'By area of work', 'Who checked in', 'Blockers'])
  })

  it('a sales organisation, as salesorg.jpg, by team', () => {
    draw(salesOrg)
    expect(heads()).toContain('Every sale, and what shows it')
    expect(heads()).toContain('By team')
    /* The team today comes first, then every sale (boards audit R4-1, 30 October; this pinned the team after the sales, folded). */
    expect(heads().indexOf('The team today')).toBeLessThan(heads().indexOf('Every sale, and what shows it'))
  })

  it('MarketView Q4, as mvq4.jpg: one screen, nothing folded', () => {
    const { container } = draw(subscriptions)
    inOrder(['What needs you', 'What the systems show', 'Where what people said and the systems differ', 'Where this is heading'])
    expect(container.querySelector('.pb-folded')).toBeNull()
  })

  it('writes each target with its unit, as the pictures do', () => {
    let r = draw(supportDesk)
    expect(screen.getByText('91% of 90%')).toBeTruthy()
    expect(screen.getByText('4.1% of ≤ 3%')).toBeTruthy()
    r.unmount()
    r = draw(operations)
    expect(screen.getByText('9.5h of ≤ 6h')).toBeTruthy()
    r.unmount()
    draw(salesOrg)
    expect(screen.getByText('KES 7 million of KES 8 million')).toBeTruthy()
  })

  it('leadership, as a member of the leadership team reads it (leadership-board.jpg)', () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    qc.setQueryData(['company'], (leadership as any)._company)
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <ThePicturedBoard order={theRelease4Order('leadership', false)!} b={leadership as any} groundId="baridi-leadership" leadFirstName="Amani"
            sessionRows={[]} renderActions={() => null} overTime={null} recommendations={[]} onAnswerRecommendation={() => undefined}
            recommendationBusy={false} onRecordTheDecision={() => undefined} navigate={() => undefined} />
        </MemoryRouter>
      </QueryClientProvider>,
    )
    expect(screen.getByText('You’re a participant here. Amani runs it; you see the shared picture and your own part in full.')).toBeTruthy()
    inOrder(['The priorities this quarter', 'Your part'])
    expect(screen.getByText('Bring the pipeline numbers')).toBeTruthy()
    expect(screen.getByText('At risk')).toBeTruthy()
  })

  it('says what needs the lead in whole sentences, never joined with a colon', () => {
    for (const b of [operations, engineering, salesOrg, subscriptions]) {
      const r = draw(b)
      const needs = screen.getAllByRole('heading', { level: 2 }).find((h) => /^What needs you/.test(h.textContent ?? ''))!.closest('section')!
      expect(needs.textContent).not.toMatch(/[A-Za-z]: [a-z]/)
      r.unmount()
    }
  })
})
