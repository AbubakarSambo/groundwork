import { describe, it, expect } from 'vitest'
import { aSentenceAsARow } from './a-sentence-as-a-row'

/* Rows from Grace's Today (Drop Access, test): one line of title, at most one line of detail, nothing lost. */
describe('a sentence as a row', () => {
  it('splits at the first natural break', () => {
    expect(aSentenceAsARow('You are waiting on the reps for details on what happened to the 60 units, which was due on Monday 19 October and is six days late.'))
      .toEqual({ title: 'You are waiting on the reps for details on what happened to the 60 units.', detail: 'It was due on Monday 19 October and is six days late.' })
    expect(aSentenceAsARow('In check-in 1, you committed to send the contract back with the penalty clause marked by Friday 30 October. It is marked open, and the record does not say who marked it.'))
      .toEqual({ title: 'In check-in 1, you committed to send the contract back with the penalty clause marked by Friday 30 October.', detail: 'It is marked open, and the record does not say who marked it.' })
  })
  it('leaves a short title, or one with its own detail, as it is', () => {
    expect(aSentenceAsARow('Answer Peter Njoroge on a specific area to focus on.')).toEqual({ title: 'Answer Peter Njoroge on a specific area to focus on.' })
    expect(aSentenceAsARow('A long title that goes on and on well past one line of text in the row here', 'Its own detail.')).toEqual({ title: 'A long title that goes on and on well past one line of text in the row here', detail: 'Its own detail.' })
  })
})
