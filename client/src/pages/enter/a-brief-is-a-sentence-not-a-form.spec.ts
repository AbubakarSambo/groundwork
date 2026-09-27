import { describe, it, expect } from 'vitest'
import { composeLeadBrief, theirOwnSetupWords, SITUATION_CARDS } from './EntryChatPage'

/**
 * THE BRIEF EVERY PARTICIPANT READS WAS THE SETUP Q&A GLUED TOGETHER.
 *
 * Read on a real check-in, under a band heading saying WHAT THIS CHECK-IN IS FOR:
 *
 *   "What this check-in is for: I run a 40 person logistics company... before she gets buried in
 *    it.. Who is part of this: Just Nadia and me for this one... run their own check-ins
 *    separately.. Why now: ..."
 *
 * The label said twice, and two doubled full stops - the join added one to fragments that already
 * ended in a stop. Neither is visible in the code; both are the first thing on the page.
 */
describe('composing the brief', () => {
  it('leads with the situation in their own words, unlabelled', () => {
    const brief = composeLeadBrief({ initial: 'Margaret joins the sales team on the 15th.' })
    expect(brief).toBe('Margaret joins the sales team on the 15th.')
    expect(brief).not.toContain('What this check-in is for')
  })

  it('and never doubles a full stop', () => {
    const brief = composeLeadBrief({
      initial: 'She starts on the 15th.',
      whoInvolved: 'Just the two of us.',
      decision: 'Her probation is decided in March.',
      goals: ['Get the contracts filed'],
    })
    expect(brief).not.toMatch(/\.\./)
    expect(brief).not.toMatch(/\.\s*\./)
  })

  it('and punctuates a fragment that has none', () => {
    expect(composeLeadBrief({ initial: 'She starts on the 15th' })).toBe('She starts on the 15th.')
  })

  /** On the coordinator path this is the only context a lead inherits, so it all still travels. */
  it('and still carries everything the onboarding gathered', () => {
    const brief = composeLeadBrief({
      initial: 'She starts on the 15th.',
      whoInvolved: 'Nadia and me',
      decision: 'Probation in March',
      goals: ['Contracts filed', 'An onboarding pack'],
      brief: 'The hiring handover',
    })
    /* U.7 third review: no quotation marks and no name. These are Groundwork's reading of the
       answers, not anybody's exact words; each follows the question it answered. */
    expect(brief).toBe('She starts on the 15th. When asked who is part of this, the answer was taken to mean this. Nadia and me. When asked why this matters now, the answer was taken to mean this. Probation in March. When asked what this is aiming at, the answer was taken to mean these 2 things. Contracts filed. An onboarding pack. When asked what the questions should focus on, the answer was taken to mean this. The hiring handover.')
    expect(brief).not.toMatch(/[:“”"]/)
  })

  /* The reviewer's case: Aisha's probation, and what setup drew out of Wanjiru's answers. */
  it('reads as sentences for Aisha’s check-in, with nobody quoted', () => {
    const brief = composeLeadBrief({
      initial: 'Aisha’s probation in the warehouse team needs a decision.',
      whoInvolved: 'Aisha and the warehouse team',
      decision: 'Decide whether to confirm Aisha for her role in the warehouse team',
      brief: 'she is often late with the stock counts',
    })
    expect(brief).toBe('Aisha’s probation in the warehouse team needs a decision. When asked who is part of this, the answer was taken to mean this. Aisha and the warehouse team. When asked why this matters now, the answer was taken to mean this. Decide whether to confirm Aisha for her role in the warehouse team. When asked what the questions should focus on, the answer was taken to mean this. She is often late with the stock counts.')
    expect(brief).not.toMatch(/said|Wanjiru|[“”:]/)
  })

  it('an answer that is a question, a single word, or a sentence with its own full stop', () => {
    expect(composeLeadBrief({ decision: 'Is he ready to be confirmed?' }))
      .toBe('When asked why this matters now, the answer was taken to mean this. Is he ready to be confirmed?')
    expect(composeLeadBrief({ brief: 'punctuality' }))
      .toBe('When asked what the questions should focus on, the answer was taken to mean this. Punctuality.')
    expect(composeLeadBrief({ decision: 'His probation ends in March.' }))
      .toBe('When asked why this matters now, the answer was taken to mean this. His probation ends in March.')
    expect(composeLeadBrief({ goals: ['Are the counts on time?'] }))
      .toBe('When asked what this is aiming at, the answer was taken to mean this. Are the counts on time?')
    expect(composeLeadBrief({ brief: '"stock counts"' }))
      .toBe('When asked what the questions should focus on, the answer was taken to mean this. Stock counts.')
  })

  it('what the person typed in setup is their own turns only', () => {
    expect(theirOwnSetupWords([
      { role: 'assistant', content: 'What is going on?' },
      { role: 'user', content: SITUATION_CARDS[0].message },
      { role: 'user', content: 'Juma joined our warehouse team in January and his probation ends in March.' },
      { role: 'user', content: '[Document: "rota.pdf"]\nsome text' },
      { role: 'user', content: 'He is often late with the stock counts.' },
    ])).toEqual([
      'Juma joined our warehouse team in January and his probation ends in March.',
      'He is often late with the stock counts.',
    ])
  })

  it('and keeps a name its capital', () => {
    expect(composeLeadBrief({ initial: 'Kwame joins the sales team.', whoInvolved: 'Kwame and Wairimu', decision: 'Kwame starts on Monday' }))
      .toBe('Kwame joins the sales team. When asked who is part of this, the answer was taken to mean this. Kwame and Wairimu. When asked why this matters now, the answer was taken to mean this. Kwame starts on Monday.')
  })

  it('and says nothing when there is nothing', () => {
    expect(composeLeadBrief({})).toBe('')
    expect(composeLeadBrief({ initial: '   ' })).toBe('')
  })
})
