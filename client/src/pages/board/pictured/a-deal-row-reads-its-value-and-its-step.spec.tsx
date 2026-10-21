import { it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { EveryDealDayByDay } from './ThePicturedSalesBoard'

/**
 * A DEAL ROW READS ITS VALUE AND ITS STEP (Drop Access, 16 October; board-as-lead.txt "Westgate Deli / Miriam, KES 95,000 /
 * Quoted / 7 days ago / Nothing booked", and "Eastside Foods ... Send the quote, with a photo"). Grace's grid read "Kevin, Paul"
 * and "Mercy, 30": with no value said, the first detail kept with the deal stood in for one. And the Next step column read
 * a whole sentence, "Kevin said the next step is ...", where the picture shows the step.
 */
const ROWS = [
  { id: 'd1', kind: 'deal', name: 'Upper Hill Offices', stage: 'Contacted', owner: 'Kevin Omondi', ownerParticipantId: 'p-k', fields: { Contact: 'Paul' }, value: null, mark: 'said', next: 'Kevin said the next step is “visit Upper Hill Offices again”.', nextStep: 'Visit Upper Hill Offices again', contactHistory: [{ on: '2026-10-14', how: 'in their words' }], lastSaidOn: '2026-10-14' },
  { id: 'd2', kind: 'deal', name: 'Kilele Hotel', stage: 'Won', owner: 'Kevin Omondi', ownerParticipantId: 'p-k', fields: { Units: '40', Value: 'KES 200,000' }, value: 'KES 200,000', mark: 'proven', next: null, contactHistory: [{ on: '2026-10-12', how: 'with proof' }], lastSaidOn: '2026-10-12' },
]
const SECTION = { section: 'Deal grid', rows: ROWS, groups: [] }

it('Grace reads the value beside the rep, never another detail, and the step on its own', () => {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter><EveryDealDayByDay b={{ participants: [], canEditFrame: false }} section={SECTION} now={new Date('2026-10-16T12:00:00Z')} groundId="g1" /></MemoryRouter>
    </QueryClientProvider>,
  )
  const row = (name: string) => screen.getAllByText(name)[0].closest('tr') as HTMLElement
  expect(row('Upper Hill Offices').textContent).toContain('Kevin')
  expect(row('Upper Hill Offices').textContent).not.toContain('Paul')
  expect(row('Upper Hill Offices').textContent).toContain('Visit Upper Hill Offices again')
  expect(row('Upper Hill Offices').textContent).not.toContain('said the next step is')
  expect(row('Kilele Hotel').textContent).toContain('Kevin, KES 200,000')
  expect(row('Kilele Hotel').textContent).toContain('Nothing booked')
})
