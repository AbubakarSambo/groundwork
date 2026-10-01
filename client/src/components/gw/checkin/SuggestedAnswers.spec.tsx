import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SuggestedAnswers, theSuggestedAnswers } from './SuggestedAnswers'

/**
 * SUGGESTED ANSWERS, AGAINST THE PROTOTYPE'S OWN SCREENS (check-in-start.jpg, check-in-phone.jpg):
 * each suggestion sits on its own line, stacked, at every width - not wrapped into a row.
 *
 * GROUP 3 REVIEW, BATCH B.
 */
describe('SuggestedAnswers', () => {
  it('draws nothing when the engine sent nothing', () => {
    const { container } = render(<SuggestedAnswers answers={undefined} onPick={() => {}} />)
    expect(container.firstChild).toBeNull()
  })

  it('stacks each suggestion on its own line, as the prototype draws them', () => {
    render(<SuggestedAnswers answers={['Sent it. They liked it but want to wait until after December.', 'Not yet']} onPick={() => {}} />)
    const group = screen.getByRole('group', { name: 'Suggested answers' })
    expect(group.style.flexDirection).toBe('column')
    expect(group.style.flexWrap).toBe('nowrap')
  })

  it('keeps the filter: real sentences only, no repeats, at most four', () => {
    expect(theSuggestedAnswers(['Not yet', '  ', 'Not yet', 'Sent it', 'A', 'B', 'C'])).toEqual(['Not yet', 'Sent it', 'A', 'B'])
  })
})
