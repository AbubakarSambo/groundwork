import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { StageTrack } from './StageTrack'

const STAGES = ['Contacted', 'Need established', 'Pitched', 'Qualified', 'Quoted', 'Won']

/* Board review, 30 September, two passes: "Quoted (1)" is a label with a number bolted on, not a
   sentence a person reads. The first fix ("Quoted: 1 deal") still joined a label and a value with
   a colon - the second fix stacks the stage's name and its count on two lines instead, the
   prototype's own shape (salesorg.txt), with no punctuation joining them. */
describe('StageTrack: the shape of the work', () => {
  it('draws every stage, in order, with how many rows sit at each one, in the kind\'s own word, stacked on two lines', () => {
    render(<StageTrack stages={STAGES} counts={{ Contacted: 3, Won: 2 }} itemNoun="deal" />)
    const items = screen.getAllByRole('listitem')
    expect(items.length).toBe(STAGES.length)
    const named = (name: string) => items.find((li) => within(li).queryByText(name, { selector: '.gwui-stage-track-name' }))!
    expect(within(named('Contacted')).getByText('3 deals')).toBeTruthy()
    expect(within(named('Won')).getByText('2 deals')).toBeTruthy()
    for (const s of ['Need established', 'Pitched', 'Qualified', 'Quoted']) {
      expect(within(named(s)).getByText('none yet')).toBeTruthy()
    }
    /* Never joined with a colon, or any other punctuation, on one line. */
    expect(screen.queryByText(/:/)).toBeNull()
  })

  it('says "1 deal", not "1 deals"', () => {
    render(<StageTrack stages={STAGES} counts={{ Won: 1 }} itemNoun="deal" />)
    expect(screen.getByText('1 deal')).toBeTruthy()
    expect(screen.queryByText('1 deals')).toBeNull()
  })

  it('falls back to "item" when no noun is given', () => {
    render(<StageTrack stages={STAGES} counts={{ Won: 2 }} />)
    expect(screen.getByText('2 items')).toBeTruthy()
  })

  it('marks a stage with rows against it as done, and an empty one as plain', () => {
    render(<StageTrack stages={STAGES} counts={{ Won: 2 }} itemNoun="deal" />)
    expect(screen.getByText('Won', { selector: '.gwui-stage-track-name' }).closest('li')).toHaveClass('gwui-stage-track-done')
    expect(screen.getByText('Contacted', { selector: '.gwui-stage-track-name' }).closest('li')).toHaveClass('gwui-stage-track-plain')
  })

  it('reads every stage as none yet when nothing is served for any of them, never as an empty gap', () => {
    render(<StageTrack stages={STAGES} counts={{}} itemNoun="deal" />)
    for (const s of STAGES) {
      expect(screen.getByText(s, { selector: '.gwui-stage-track-name' }).closest('li')).toHaveClass('gwui-stage-track-plain')
    }
    expect(screen.getAllByText('none yet').length).toBe(STAGES.length)
  })

  it('names itself for a screen reader', () => {
    render(<StageTrack stages={STAGES} counts={{}} />)
    expect(screen.getByLabelText('The shape of the work, by stage')).toBeInTheDocument()
  })
})
