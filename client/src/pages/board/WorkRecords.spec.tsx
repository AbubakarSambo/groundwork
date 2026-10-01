import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WorkRecordsSections } from './WorkRecords'
import type { AServedWorkSection } from '@/api/board'

/**
 * REQUEST 89: WHO SAID A RECORD. `AServedWorkRow.saidBy` is the person's first name, "a colleague"
 * (lower case, to sit inside "In ...'s words") where this reader may not be told who, or null for a
 * record the lead added or an older server. This was this screen's own stand-in for a field the
 * engine had not built yet ("In the words of someone in this check-in,") - now that the field
 * exists, the row says whose words they actually are.
 */
function renderSections(sections: AServedWorkSection[]) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <WorkRecordsSections
        groundId="g1"
        kindOfWork="sales org"
        sections={sections}
        participants={[{ id: 'p-baraka', name: 'Baraka Otieno' }]}
        leadFirstName="Wairimu"
        readerIsLead={false}
        canEdit={false}
      />
    </QueryClientProvider>,
  )
}

const dealGrid = (row: Record<string, unknown>): AServedWorkSection => ({
  section: 'Deal grid', holds: 'deals', state: 'filled', stages: ['Quoted', 'Won'],
  rows: [{
    id: 'row-1', kind: 'deal', name: 'Gikomba Cold Store', stage: 'Quoted',
    owner: 'Baraka Otieno', ownerParticipantId: 'p-baraka', due: null, fields: {}, from: 'said',
    ...row,
  }] as any,
})

describe('a work record says whose words it is, by name', () => {
  it('names the person a reader may be told, in "In ...\'s words,"', () => {
    renderSections([dealGrid({ said: 'Hold 30 Sep as the date.', saidBy: 'Baraka', saidByParticipantId: 'p-baraka' })])
    expect(screen.getByText("In Baraka's words,")).toBeTruthy()
    expect(screen.getByText('“Hold 30 Sep as the date.”')).toBeTruthy()
  })

  it('reads "a colleague", in lower case, where this reader may not be told who', () => {
    renderSections([dealGrid({ said: 'Hold 30 Sep as the date.', saidBy: 'a colleague', saidByParticipantId: null })])
    expect(screen.getByText("In a colleague's words,")).toBeTruthy()
  })

  it('falls back to the old sentence when an older server sends no saidBy at all', () => {
    renderSections([dealGrid({ said: 'Hold 30 Sep as the date.' })])
    expect(screen.getByText('In the words of someone in this check-in,')).toBeTruthy()
  })

  it('a record the lead added still says the lead added it, never a saidBy sentence', () => {
    renderSections([dealGrid({ from: 'lead', said: undefined, saidBy: null })])
    expect(screen.getByText('Wairimu added it.')).toBeTruthy()
  })
})
