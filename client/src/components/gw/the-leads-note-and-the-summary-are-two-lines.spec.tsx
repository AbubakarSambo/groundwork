import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { EachPerson } from './EachPerson'

/**
 * GROUP 3'S REVIEW, THE SCREEN'S OWN SENTENCES 7: TWO SENTENCES ON ONE LINE, READING AS ONE WORD.
 *
 * On the Context tab's each-person card, the lead's note and the row's summary were two inline
 * spans with nothing between them, so a real check-in read "I sell fridges in KilimaniNothing on
 * record yet." - the lead's own words running straight into the next sentence. They are now a
 * column, each sentence its own line.
 */
const PEOPLE = [
  { id: 'p-rukia', userId: 'u-rukia', roleAsDescribed: 'I sell fridges in Kilimani', user: { firstName: 'Rukia', lastName: 'Otieno' } },
]

describe('the each-person card, as the lead reads it', () => {
  it('reads the lead\'s note and the summary as two separate lines, not one run-on word', () => {
    render(
      <EachPerson
        groundId="g1"
        people={PEOPLE as any}
        targets={[]}
        toDos={[]}
        files={[]}
        asks={{}}
        viewerUserId="u-lead"
        isLead
        isTheLead
        leadFirstName="Rukia"
      />,
    )
    expect(screen.queryByText(/KilimaniNothing on record yet/)).toBeNull()
    expect(screen.getByText('I sell fridges in Kilimani')).toBeTruthy()
    expect(screen.getByText('Nothing on record yet')).toBeTruthy()
  })
})
