import { describe, it, expect } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { TheJudgement } from './TheJudgement'

/**
 * DECISION 141 (2): "See the counts behind this" is back under the judgement on the lead's board, as
 * plain sentences the server counts from the record. A participant is never served the judgement, so
 * the component draws nothing for them.
 */
const AS_THE_SERVER_SENDS_IT_TO_THE_LEAD = {
  theGap: 'Two of five people count a price range as a budget.',
  whatToDo: [{ move: 'Agree what qualified means.', because: 'It changes how 4 sales are counted.' }],
  theCountsBehindThis: {
    says: [
      '7 sessions were answered and 3 were missed.',
      '5 commitments were made. Of these, 2 were kept, 1 was not kept and 2 are still open.',
      '2 waits are still open and 1 has been cleared.',
      '1 of the 3 lines on the record is backed by a document.',
    ],
  },
}

describe('the counts behind this, as the lead reads them', () => {
  it('is folded under the judgement, and opens to the counts as full sentences', () => {
    const { getByRole, queryByText, getByText } = render(<TheJudgement it={AS_THE_SERVER_SENDS_IT_TO_THE_LEAD} />)
    expect(queryByText('7 sessions were answered and 3 were missed.')).toBeNull()
    fireEvent.click(getByRole('button', { name: 'See the counts behind this' }))
    for (const line of AS_THE_SERVER_SENDS_IT_TO_THE_LEAD.theCountsBehindThis.says) expect(getByText(line)).toBeTruthy()
    expect(getByRole('button', { name: 'Hide the counts' })).toBeTruthy()
  })

  it('draws no button when the server sent no counts (an older report, or no judgement at all)', () => {
    const { queryByRole } = render(<TheJudgement it={{ theGap: AS_THE_SERVER_SENDS_IT_TO_THE_LEAD.theGap }} />)
    expect(queryByRole('button', { name: 'See the counts behind this' })).toBeNull()
  })

  it('a participant, who is never served the judgement, reads nothing here', () => {
    const { container } = render(<TheJudgement it={null} />)
    expect(container.textContent).toBe('')
  })
})
