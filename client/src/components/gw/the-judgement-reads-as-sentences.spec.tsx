import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { TheJudgement, startWith, howManyNeverReachedIt } from './TheJudgement'

/**
 * U.9: THE JUDGEMENT, AS THE LEAD READS IT, IN SENTENCES.
 *
 * Found by the engine workspace, reading the lead's board as a person: "What this cannot tell you"
 * read "The renewals target: nobody said who set it." and "What the check-ins did not get to" read
 * "How they vet people: 2 conversations never reached it". Two pieces and a colon each time.
 *
 * Only the lead is served `theJudgement` (the server takes it off a participant's board), so the
 * participant's case is the component drawing nothing at all when the field is absent.
 */
const AS_THE_SERVER_SENDS_IT_TO_THE_LEAD = {
  theGap: 'Four of six people count a price range as a budget. Wairimu does not.',
  whatToDo: [
    { move: 'Agree what qualified means.', because: 'It changes how 4 sales are counted.', startWith: 'Brian and Miriam' },
    { move: 'Ask for a competitor and a price.', because: '9 customers said the price was too high.', startWith: 'The 3 newest customers' },
  ],
  whatThisCannotTellYou: [
    { about: 'Why sales are lost.', why: 'People rarely say why a sale was lost.' },
  ],
  whatWeFailedToAsk: [
    { about: 'How each person chooses which customer to visit.', howManyMissedIt: 2 },
    { about: 'What the customer said about delivery.', howManyMissedIt: 1 },
  ],
}

function linesOf(el: HTMLElement): string[] {
  return Array.from(el.querySelectorAll('div, span'))
    .filter((n) => n.children.length === 0)
    .map((n) => (n.textContent ?? '').trim())
    .filter(Boolean)
}

describe('the judgement, as the lead reads it', () => {
  it('shows what it cannot tell you as two sentences, one under the other, with no colon between them', () => {
    const { container } = render(<TheJudgement it={AS_THE_SERVER_SENDS_IT_TO_THE_LEAD} />)
    const lines = linesOf(container)
    expect(lines).toContain('Why sales are lost.')
    expect(lines).toContain('People rarely say why a sale was lost.')
    expect(container.textContent).not.toMatch(/lost\.?:/)
  })

  it('says how many conversations missed something as a sentence of its own', () => {
    const { container } = render(<TheJudgement it={AS_THE_SERVER_SENDS_IT_TO_THE_LEAD} />)
    const lines = linesOf(container)
    expect(lines).toContain('How each person chooses which customer to visit.')
    expect(lines).toContain('2 conversations never reached this.')
    expect(lines).toContain('One conversation never reached this.')
    expect(container.textContent).not.toMatch(/: \d+ conversation/)
  })

  it('says who to start with as one sentence, not a label and a colon', () => {
    const { container } = render(<TheJudgement it={AS_THE_SERVER_SENDS_IT_TO_THE_LEAD} />)
    const lines = linesOf(container)
    expect(lines).toContain('Start with Brian and Miriam.')
    expect(lines).toContain('Start with the 3 newest customers.')
    expect(container.textContent).not.toContain('Start with:')
  })

  it('no longer offers the counts behind it, because the server no longer sends them to anybody', () => {
    const { container } = render(<TheJudgement it={AS_THE_SERVER_SENDS_IT_TO_THE_LEAD} />)
    expect(container.textContent).not.toContain('See the counts behind this')
  })

  it('draws nothing for a participant, whose board carries no judgement', () => {
    const { container } = render(<TheJudgement it={undefined} />)
    expect(container.textContent).toBe('')
  })

  it('keeps a name as it is written and adds no second full stop', () => {
    expect(startWith('Aisha')).toBe('Start with Aisha.')
    expect(startWith('Allan, who knows them.')).toBe('Start with Allan, who knows them.')
    expect(howManyNeverReachedIt(86)).toBe('86 conversations never reached this.')
  })

  it('says "Start with yourself." when the reader is the one to start with, never "Start with You."', () => {
    expect(startWith('You')).toBe('Start with yourself.')
    expect(startWith('you')).toBe('Start with yourself.')
  })
})
