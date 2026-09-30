import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StageTrack } from './StageTrack'

const STAGES = ['Contacted', 'Need established', 'Pitched', 'Qualified', 'Quoted', 'Won']

describe('StageTrack: the shape of the work', () => {
  it('draws every stage, in order, with how many rows sit at each one', () => {
    render(<StageTrack stages={STAGES} counts={{ Contacted: 3, Won: 2 }} />)
    const items = screen.getAllByRole('listitem')
    expect(items.map((li) => li.textContent)).toEqual([
      'Contacted (3)', 'Need established (0)', 'Pitched (0)', 'Qualified (0)', 'Quoted (0)', 'Won (2)',
    ])
  })

  it('marks a stage with rows against it as done, and an empty one as plain', () => {
    render(<StageTrack stages={STAGES} counts={{ Won: 2 }} />)
    expect(screen.getByText('Won (2)')).toHaveClass('gwui-stage-track-done')
    expect(screen.getByText('Contacted (0)')).toHaveClass('gwui-stage-track-plain')
  })

  it('reads every stage as 0 when nothing is served for any of them, never as an empty gap', () => {
    render(<StageTrack stages={STAGES} counts={{}} />)
    for (const s of STAGES) expect(screen.getByText(`${s} (0)`)).toHaveClass('gwui-stage-track-plain')
  })

  it('names itself for a screen reader', () => {
    render(<StageTrack stages={STAGES} counts={{}} />)
    expect(screen.getByLabelText('The shape of the work, by stage')).toBeInTheDocument()
  })
})
