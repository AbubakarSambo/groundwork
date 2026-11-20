import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Board from './mvnext'

/**
 * The MarketView where-next example board, read against mvnext.txt of the prototype (docs/prototype is not in git, so the words are copied here as literals).
 * Every section open, in order, its lists as real tables, and the tab row says "References and resources", not "Context".
 */
function draw() {
  return render(<MemoryRouter><Board /></MemoryRouter>)
}
function noFolds(c: HTMLElement) { expect(c.querySelectorAll('details, summary, [aria-expanded="false"]').length).toBe(0) }
function says(list: string[]) { for (const t of list) expect(screen.getAllByText(t, { exact: false }).length, t).toBeGreaterThan(0) }

describe('the MarketView, where next example board', () => {
  it('says every heading of the prototype, in its order', () => {
    const { container } = draw()
    expect([...container.querySelectorAll('h1, h2')].map((h) => h.textContent)).toEqual([
      'MarketView, where next', 'In short', 'By who they are', 'Where next, ranked', 'Where they disagree', 'What this can’t tell you', 'Where this is heading',
    ])
    expect(screen.getByRole('tab', { name: 'References and resources' })).toBeTruthy()
    expect(screen.queryByText('Context')).toBeNull()
    noFolds(container)
  })
  it('says the prototype sentences and numbers', () => {
    draw()
    says([
      '24 people: 10 agroprocessors, 10 input distributors, 4 research organisations. Answered once.',
      'Processors and distributors both point to Kano maize first, and processors would pay for it.',
      'Researchers want the same markets but a different product: history, not daily prices.',
      '21 of 24 answered, each on their own, once.', 'What each group said it needs',
      '10, 9 answered', 'Daily maize and soybean prices in Kano and Kaduna', 'Would pay: 7 of 9, for a named buyer feed', 'Want it in their ERP, not a new app',
      '10, 8 answered', 'Where farmers are buying, by LGA', 'Would pay: 3 of 8; want it free for a pilot', 'Wary of sharing their own sales figures',
      '4, 4 answered', 'Monthly averages, back to 2022', 'Would pay through grants, not subscriptions', 'Offer their survey data in exchange',
      'From how many said it, and who',
      '“Daily prices or it’s no use to us. Monthly is history.”',
      '“Daily numbers without methodology won’t pass review. We need consistent monthly series.”',
      'Both can be served from the same collection: daily for processors, monthly averages for researchers.',
      'Whether anyone will actually pay: willingness was said, not tested. And the three who didn’t answer are all distributors outside Kano.',
      'Work out where to focus', 'For processors, with a named-buyer feed.', 'Kano maize, 3 processors and 3 distributors, 8 weeks.',
      'Their surveys for monthly series.', 'Benue and Plateau, where nobody answered.',
      '17 of 21 point to Kano', 'From the workshop answers', '7 of 9 processors say they’d pay', 'Said, not tested', 'Distributors outside Kano didn’t answer', '3 of 10',
      'The pilot: do 3 processors pay after 8 weeks?', 'The MarketView team decides.', 'Groundwork lays out the outcomes and the proof. It doesn’t choose.',
    ])
    expect(screen.getByText('Steady')).toBeTruthy()
    expect(screen.getAllByText('Watch').length).toBe(2)
    expect(screen.getByRole('button', { name: 'Record the decision' })).toBeTruthy()
  })
  it('draws the ranking as a real table, all seven rows', () => {
    draw()
    const t = screen.getByRole('table', { name: 'Where next, ranked' })
    expect(within(t).getAllByRole('rowheader').map((c) => c.textContent)).toEqual(['Markets and regions', 'Value chains', 'Who to serve first', 'Information they need', 'Integrations', 'Networks', 'Pilot'])
    for (const c of ['Kano, then Kaduna', '17 of 21: processors and distributors', 'They’d pay; 7 of 9', 'Their ERP; WhatsApp for distributors', '9 processors; 6 distributors', '5 of 8 distributors', 'Named by 12'])
      expect(within(t).getByRole('cell', { name: c })).toBeTruthy()
  })
})
