import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Board from './matter'

/**
 * The law firm matter example board, read against matter.txt of the prototype (docs/prototype is not in git, so the words are copied here as literals).
 * Every section open, in order, its lists as real tables, and the tab row says "References and resources", not "Context".
 */
function draw() {
  return render(<MemoryRouter><Board /></MemoryRouter>)
}
function noFolds(c: HTMLElement) { expect(c.querySelectorAll('details, summary, [aria-expanded="false"]').length).toBe(0) }
function says(list: string[]) { for (const t of list) expect(screen.getAllByText(t, { exact: false }).length, t).toBeGreaterThan(0) }

describe('the Kasarani Foods v Pwani Mills example board', () => {
  it('says every heading of the prototype, in its order', () => {
    const { container } = draw()
    expect([...container.querySelectorAll('h1, h2')].map((h) => h.textContent)).toEqual([
      'Kasarani Foods v Pwani Mills', 'What you need to decide', 'What changed this week, and what it changed', 'Where this is heading',
    ])
    expect(screen.getByText('Where the matter stands')).toBeTruthy()
    expect(screen.getByText('More confident than the evidence allows')).toBeTruthy()
    expect(screen.getByText('This may change the strategy. It needs your review.')).toBeTruthy()
    expect(screen.getByText('Leila moves to another matter on Monday')).toBeTruthy()
    expect(screen.getByRole('tab', { name: 'References and resources' })).toBeTruthy()
    expect(screen.queryByText('Context')).toBeNull()
    noFolds(container)
  })
  it('says the prototype sentences', () => {
    draw()
    says([
      'A Partner, a Senior Associate, two Associates, a paralegal and a tax specialist. Weekly. Reply due Friday 2 October.',
      'Breach of a maize supply contract. High Court, Commercial Division, Nairobi. Stage: pleadings. Our reply is due on Friday 2 October.',
      'The reply is due on Friday. It is at risk because the client has not sent the original contract. The team talks as if the delivery terms are proven, but without the original they are not.',
      'Do we argue the limitation point first?', 'Leila’s research made it stronger. Tom wants to lead with it. You have not decided.',
      'Ask the court for more time, or file on Friday?', 'Only if the original contract does not arrive by Wednesday.',
      'Kevin believes the evidence that Pwani Mills broke the delivery terms is strong. Joy, the paralegal, says the signed original contract is still with the client. Tom thought it had arrived. Without the original, the delivery terms rest on an unsigned copy.',
      'Nobody is wrong to believe it. The proof is just not in the firm’s hands yet.',
      'We planned to win on the broken delivery terms. Leila’s research this week found that Pwani Mills filed their defence 3 months too late under the Limitation Act. Tom wants to lead with this. If he is right, the case may turn on the limitation point instead.',
      'Affects: Tom, Leila and Kevin’s drafting, and what we tell the client.',
      'A document shows it', 'A lawyer believes it', 'The client says it', 'Decided', 'Not known yet',
      'Amos takes over her part. The handover page gives him what he needs.', 'Keep a read on live work',
      'Look closer at named areas', 'Step in', 'Keep watching',
      'The original contract has not arrived', 'Joy has asked the client twice', 'The limitation point is much stronger', 'From Leila’s research note',
      'Tom wants to lead with the limitation point', 'His view, not yet decided',
      'Whether the original contract arrives by Wednesday.', 'Njeri, the Partner, decides.', 'Groundwork lays out the outcomes and the proof. It doesn’t choose.',
    ])
    expect(screen.getByRole('button', { name: 'See the handover' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Record the decision' })).toBeTruthy()
  })
  it('draws what changed as a real table with all four rows', () => {
    draw()
    const t = screen.getByRole('table', { name: 'What changed this week, and what it changed' })
    expect(within(t).getAllByRole('rowheader').map((c) => c.textContent)).toEqual(['Leila’s research', 'Kevin’s drafting', 'The client', 'Original contract'])
    expect(within(t).getByRole('cell', { name: 'Found the defence was filed 3 months late. This makes the limitation point much stronger.' })).toBeTruthy()
    expect(within(t).getByRole('cell', { name: 'Not received. Joy has asked twice.' })).toBeTruthy()
    expect(screen.getAllByRole('table').length).toBe(2)
  })
})
