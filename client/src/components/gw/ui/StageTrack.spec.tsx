import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StageTrack } from './StageTrack'

const STAGES = ['Contacted', 'Need established', 'Pitched', 'Qualified', 'Quoted', 'Won']

describe('StageTrack: the shape of the work', () => {
  /* Board review, 30 September, item 3: "Quoted (1)" is a label with a number bolted on, not a
     sentence a person reads - "Quoted: none yet" / "1 deal" / "3 deals" instead, in the kind's own
     word for one row. */
  it('draws every stage, in order, with how many rows sit at each one, in the kind\'s own word', () => {
    render(<StageTrack stages={STAGES} counts={{ Contacted: 3, Won: 2 }} itemNoun="deal" />)
    const items = screen.getAllByRole('listitem')
    expect(items.map((li) => li.textContent)).toEqual([
      'Contacted: 3 deals', 'Need established: none yet', 'Pitched: none yet', 'Qualified: none yet', 'Quoted: none yet', 'Won: 2 deals',
    ])
  })

  it('says "1 deal", not "1 deals"', () => {
    render(<StageTrack stages={STAGES} counts={{ Won: 1 }} itemNoun="deal" />)
    expect(screen.getByText('Won: 1 deal')).toBeTruthy()
  })

  it('falls back to "item" when no noun is given', () => {
    render(<StageTrack stages={STAGES} counts={{ Won: 2 }} />)
    expect(screen.getByText('Won: 2 items')).toBeTruthy()
  })

  it('marks a stage with rows against it as done, and an empty one as plain', () => {
    render(<StageTrack stages={STAGES} counts={{ Won: 2 }} itemNoun="deal" />)
    expect(screen.getByText('Won: 2 deals')).toHaveClass('gwui-stage-track-done')
    expect(screen.getByText('Contacted: none yet')).toHaveClass('gwui-stage-track-plain')
  })

  it('reads every stage as none yet when nothing is served for any of them, never as an empty gap', () => {
    render(<StageTrack stages={STAGES} counts={{}} itemNoun="deal" />)
    for (const s of STAGES) expect(screen.getByText(`${s}: none yet`)).toHaveClass('gwui-stage-track-plain')
  })

  it('names itself for a screen reader', () => {
    render(<StageTrack stages={STAGES} counts={{}} />)
    expect(screen.getByLabelText('The shape of the work, by stage')).toBeInTheDocument()
  })
})
