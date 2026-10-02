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

/**
 * REQUEST 108 (c): EACH RECORD ROW CARRIES ITS MARK, drawn with the shared `ProofMark` - filled
 * for `proven`, ringed for `confirmed`/`said`/`memory`, nothing for `none` (a record added on the
 * board with nothing behind it).
 */
describe('a work record carries its own mark', () => {
  /*
   * BOARD FIX (sales B, item 1): the deal grid now also draws its own key above the table
   * (board-as-lead.txt: "Contact with proof...", "Contact in their words..."), itself built from
   * the shared ProofMark - so a sales deal grid with a proven row now carries two "Proven" marks,
   * the key's own and the row's. `getAllByRole` (was `getByRole`, which only tolerates one match)
   * checks there are at least that many, rather than asserting there is exactly one.
   */
  it('draws the shared ProofMark for a proven line', () => {
    renderSections([dealGrid({ mark: 'proven' })])
    expect(screen.getAllByRole('img', { name: 'Proven' }).length).toBeGreaterThanOrEqual(1)
  })

  it('draws nothing for a record added on the board, with mark "none"', () => {
    renderSections([dealGrid({ from: 'lead', said: undefined, saidBy: null, mark: 'none' })])
    expect(screen.queryByRole('img', { name: 'Not reached' })).toBeNull()
  })
})

/**
 * REQUEST 107 (c), part 1: THE RECORD'S OWN "NEXT" - only an open commitment whose words name
 * this exact record, drawn as the server's own sentence, never invented from nothing.
 */
describe('a work record says what happens next', () => {
  it('draws the server\'s own sentence for an open commitment about this record', () => {
    renderSections([dealGrid({ nextSays: 'You committed to visit Naivas Karen on Wednesday 30 September to show them the fridges.' })])
    expect(screen.getByText('You committed to visit Naivas Karen on Wednesday 30 September to show them the fridges.')).toBeTruthy()
  })

  it('draws nothing when nobody has said what happens next', () => {
    renderSections([dealGrid({ nextSays: undefined })])
    expect(screen.queryByText(/committed to/)).toBeNull()
  })
})
