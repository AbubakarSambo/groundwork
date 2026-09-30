import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StageTrack } from './StageTrack'

const STAGES = ['Contacted', 'Need established', 'Pitched', 'Qualified', 'Quoted', 'Won']

describe('StageTrack', () => {
  it('draws every stage, in order, whatever the current one is', () => {
    render(<StageTrack stages={STAGES} current="Qualified" />)
    const items = screen.getAllByRole('listitem')
    expect(items.map((li) => li.textContent)).toEqual(STAGES)
  })

  it('marks the stages before the current one as done, and the current one as where it stands', () => {
    render(<StageTrack stages={STAGES} current="Qualified" />)
    expect(screen.getByText('Contacted')).toHaveClass('gwui-stage-track-done')
    expect(screen.getByText('Need established')).toHaveClass('gwui-stage-track-done')
    expect(screen.getByText('Pitched')).toHaveClass('gwui-stage-track-done')
    expect(screen.getByText('Qualified')).toHaveClass('gwui-stage-track-current')
    expect(screen.getByText('Qualified').closest('li')).toHaveAttribute('aria-current', 'step')
    expect(screen.getByText('Quoted')).toHaveClass('gwui-stage-track-plain')
    expect(screen.getByText('Won')).toHaveClass('gwui-stage-track-plain')
  })

  it('marks nothing done or current when no stage has been said yet', () => {
    render(<StageTrack stages={STAGES} current={null} />)
    for (const s of STAGES) expect(screen.getByText(s)).toHaveClass('gwui-stage-track-plain')
    expect(screen.getByLabelText('No stage said yet')).toBeInTheDocument()
  })

  it('names the current stage for a screen reader', () => {
    render(<StageTrack stages={STAGES} current="Won" />)
    expect(screen.getByLabelText('Stage: Won')).toBeInTheDocument()
  })
})
