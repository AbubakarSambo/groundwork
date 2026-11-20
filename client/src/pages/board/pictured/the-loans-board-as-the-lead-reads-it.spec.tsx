import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { EveryTraderAndWhatShowsIt } from './TheLoansBoard'
import { WhereTheCohortStandsSection } from '../TheSwitchboardsSections'

/**
 * EVERY TRADER, AS THE LEAD READS IT (loans.txt). One open table, a row for each loan. A figure is drawn only where the trader said
 * it in their own check-in; where nobody has, the cell says so. A dot is filled only where a document backs the line.
 */
const section = {
  section: 'Deal grid',
  rows: [
    { id: 'l1', kind: 'loan', name: 'Freezer for the shop', stage: 'Repaying', owner: 'Achieng Otieno', ownerParticipantId: 'p1', mark: 'said', next: null, nextStep: null,
      fields: { Place: 'Kibuye, Kisumu', Sales: 'KES 38,000', Repayment: 'On time', 'In the way': 'Nothing', 'Next step': 'None' } },
    { id: 'l2', kind: 'loan', name: 'Freezer', stage: 'Late', owner: 'Musa Abdi', ownerParticipantId: 'p2', mark: 'proven', next: null,
      fields: { 'In the way': 'Repayment is due before market day' } },
  ],
}
const draw = () => render(<MemoryRouter><EveryTraderAndWhatShowsIt section={section} groundId="g-1" me="p2" /></MemoryRouter>)

describe('every trader, one open table', () => {
  it('draws what each trader said in their check-in, and says plainly what nobody has said', () => {
    draw()
    const t = screen.getByRole('table')
    const rows = within(t).getAllByRole('row')
    expect(rows).toHaveLength(3)
    const achieng = rows[1].textContent ?? ''
    expect(achieng).toContain('Achieng')
    expect(achieng).toContain('Kibuye, Kisumu')
    expect(achieng).toContain('KES 38,000')
    expect(achieng).toContain('On time')
    expect(achieng).toContain('Nothing')
    const you = rows[2].textContent ?? ''
    expect(you).toContain('You')
    expect(you).toContain('Late')
    expect(you).toContain('Repayment is due before market day')
    /* No sales figure was said, so none is drawn and none is made up. */
    expect(you).toContain('Not said yet')
    expect(you).not.toContain('KES')
  })

  it('fills a dot only where a document backs the line, and rings every other figure', () => {
    const { container } = draw()
    expect(container.querySelectorAll('.gwui-table-dot-on')).toHaveLength(1)
    expect(container.querySelectorAll('.gwui-table-dot').length).toBeGreaterThan(1)
  })

  it('has no fold', () => {
    const { container } = draw()
    expect(container.querySelector('details')).toBeNull()
  })
})

/* WHERE THE COHORT STANDS: each tile is named, counted and says what people said is behind it (what the server served, request-105 spec). */
describe('where the cohort stands, four open tiles', () => {
  const data: any = {
    heading: 'Where the cohort stands', says: '4 people are in this cohort.',
    groups: [
      { group: 'repaying', title: 'Repaying', count: 2, cause: null, says: 'The loan records show 2 loans being repaid.', who: ['Sunday Eze', 'Hauwa Ibrahim'] },
      { group: 'behind', title: 'Behind on repayment', count: 1, cause: 'They say “Repayment is due before market day” is in the way.', says: 'The loan records show 1 loan behind on repayment.', who: ['Yakubu Sani'] },
      { group: 'blocked', title: 'Stopped by something', count: 1, cause: 'They say they are waiting on “the grinding machine”.', says: '1 person is waiting on something that stops them, and it has not been cleared.', who: ['Musa Danjuma'] },
      { group: 'not heard from', title: 'Not heard from', count: 1, cause: null, says: '1 person has not checked in yet.', who: ['Yakubu Sani'] },
    ],
  }
  it('names each tile and reads the cause people gave, only where one was given', () => {
    const { container } = render(<WhereTheCohortStandsSection data={data} />)
    const text = container.textContent ?? ''
    for (const t of ['Repaying', 'Behind on repayment', 'Stopped by something', 'Not heard from']) expect(text).toContain(t)
    expect(text).toContain('They say “Repayment is due before market day” is in the way.')
    expect(text).toContain('They say they are waiting on “the grinding machine”.')
    expect(text.match(/They say /g)).toHaveLength(2)
    expect(container.querySelector('details')).toBeNull()
  })
  it('for a colleague who may not read names, draws the tiles with no names', () => {
    const noNames = { ...data, whyNoNames: 'Who is in each group is read only by whoever runs this check-in.', groups: data.groups.map((g: any) => ({ ...g, who: null })) }
    const { container } = render(<WhereTheCohortStandsSection data={noNames} />)
    expect(container.textContent).not.toContain('Yakubu')
    /* The names are not drawn (above). The sentence saying who reads the groups is no longer drawn either: a screen is not told a privacy rule the backend enforces (15 November 2026). */
    expect(container.textContent).not.toContain('read only by whoever runs this check-in')
  })
})
