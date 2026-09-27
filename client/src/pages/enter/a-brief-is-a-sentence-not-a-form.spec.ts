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
    }, 'Wanjiru')
    /* U.7 re-check: each answer quoted after the question it answered, never glued onto an opening. */
    expect(brief).toBe('She starts on the 15th. Asked who is part of this, Wanjiru said “Nadia and me”. Asked why this matters now, Wanjiru said “Probation in March”. Asked what this is aiming at, Wanjiru said “Contracts filed” and “An onboarding pack”. Asked what the questions should focus on, Wanjiru said “The hiring handover”.')
    expect(brief).not.toMatch(/:|Who is part of this:|Why now|Focus/)
  })

  /* The reviewer's case: what the lead typed about Juma, and what setup drew out of it. */
  it('reads as sentences for Juma’s check-in, whatever shape each answer has', () => {
    const brief = composeLeadBrief({
      initial: 'Juma’s performance during his probation with the warehouse team needs review.',
      whoInvolved: 'Juma and the warehouse team',
      decision: 'whether to confirm him',
      brief: 'he is often late with the stock counts',
    }, 'Wanjiru')
    expect(brief).toBe('Juma’s performance during his probation with the warehouse team needs review. Asked who is part of this, Wanjiru said “Juma and the warehouse team”. Asked why this matters now, Wanjiru said “whether to confirm him”. Asked what the questions should focus on, Wanjiru said “he is often late with the stock counts”.')
    expect(brief).not.toContain('because whether')
    expect(brief).not.toContain('focus on he')
  })

  it('an answer that is a question, a single word, or a sentence with its own full stop', () => {
    expect(composeLeadBrief({ decision: 'Is he ready to be confirmed?' }, 'Wanjiru'))
      .toBe('Asked why this matters now, Wanjiru said “Is he ready to be confirmed?”')
    expect(composeLeadBrief({ brief: 'Punctuality' }, 'Wanjiru'))
      .toBe('Asked what the questions should focus on, Wanjiru said “Punctuality”.')
    expect(composeLeadBrief({ decision: 'His probation ends in March.' }, 'Wanjiru'))
      .toBe('Asked why this matters now, Wanjiru said “His probation ends in March”.')
    expect(composeLeadBrief({ goals: ['Are the counts on time?'] }, 'Wanjiru'))
      .toBe('Asked what this is aiming at, Wanjiru said “Are the counts on time?”')
    expect(composeLeadBrief({ brief: '"stock counts"' }, 'Wanjiru'))
      .toBe('Asked what the questions should focus on, Wanjiru said “stock counts”.')
  })

  it('and without a name yet, says who answered in plain words', () => {
    expect(composeLeadBrief({ decision: 'whether to confirm him' }))
      .toBe('Asked why this matters now, the person who set this up said “whether to confirm him”.')
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
    expect(composeLeadBrief({ initial: 'Kwame joins the sales team.', whoInvolved: 'Kwame and Wairimu', decision: 'Kwame starts on Monday' }, 'Wairimu'))
      .toBe('Kwame joins the sales team. Asked who is part of this, Wairimu said “Kwame and Wairimu”. Asked why this matters now, Wairimu said “Kwame starts on Monday”.')
  })

  it('and says nothing when there is nothing', () => {
    expect(composeLeadBrief({})).toBe('')
    expect(composeLeadBrief({ initial: '   ' })).toBe('')
  })
})
