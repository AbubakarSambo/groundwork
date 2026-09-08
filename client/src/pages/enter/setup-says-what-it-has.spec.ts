import { describe, it, expect } from 'vitest'
import { summariseSetup } from './EntryChatPage'

/**
 * SETUP SAYS WHAT IT HAS, NOT WHAT IT WISHES IT HAD.
 *
 * The closing line was the model's own prose and it overstated. Observed live: after one sentence it
 * said "Thank you. That gives me what I need to set this up for you." while holding no roster, no
 * goals, and a `whoInvolved` of "My team".
 *
 * THE INSTRUCTION WAS ALREADY THERE. The prompt quotes that exact sentence and forbids it. The model
 * produced it word for word anyway. So what the person reads is computed from the fields instead: a
 * thing is on the record when the field is populated, and named as missing when it is not. Prose can
 * flatter; a derived list cannot.
 */
describe('setup says what it has', () => {
  const full = {
    initial: 'A client meeting on Thursday',
    peopleNamed: ['Priya', 'Tom', 'Dede'],
    decision: 'The client is unhappy about the delay',
    goals: ['Check they took in the briefing'],
  }

  it('lists what is on the record', () => {
    const { have } = summariseSetup(full, 'a_party', 1, false)
    /* "People you mentioned", not "Who is in it": nobody is on the check-in until they are added
       on the report, one at a time. Labelled as membership, this contradicted the assistant's own
       confirmation on a real setup - the lead had just said two of the three were not in it. */
    expect(have.find((h) => h.label === 'People you mentioned')?.value).toBe('Priya, Tom, Dede')
    expect(have.find((h) => h.label === 'Sessions')?.value).toBe('One')
  })

  it('says nothing is missing when nothing is', () => {
    expect(summariseSetup(full, 'a_party', 1, false).missing).toEqual([])
  })

  /** The founding case: a phrase where people were needed. It must read as absent, not as answered. */
  it('counts a lead who named nobody as missing the people', () => {
    const { have, missing } = summariseSetup(
      { ...full, peopleNamed: [] }, 'a_party', 1, true,
    )
    expect(missing.join(' ')).toContain('who is in it, by name')
    expect(have.some((h) => h.label === 'Who is in it')).toBe(false)
  })

  /** A name that is only whitespace must not appear as somebody who is in it. */
  it('does not accept a whitespace name as a person', () => {
    const { have } = summariseSetup({ ...full, peopleNamed: ['  '] }, 'a_party', 1, true)
    expect(have.some((h) => h.label === 'Who is in it')).toBe(false)
  })

  /**
   * THIS TEST SAID THE OPPOSITE UNTIL THE HAND-OFF WAS REMOVED.
   *
   * A coordinator used to owe nothing, because a lead was going to be invited to write the context.
   * Nobody is handed a check-in any more: the one non-party answer left is "I write what this is
   * about, other people check in against it", so the situation IS theirs and a missing reason is a
   * real gap. Excusing it would hide from them that the record is thin.
   */
  it('lists the same gaps for somebody whose team does the checking in', () => {
    const forThem = summariseSetup({}, 'setting_up_for_others', 1, true).missing
    const forAParty = summariseSetup({}, 'a_party', 1, true).missing
    expect(forThem).toEqual(forAParty)
    expect(forThem.join(' ')).toMatch(/who is in it/i)
  })

  it('still shows a coordinator whatever they did happen to give', () => {
    const { have } = summariseSetup({ initial: 'The launch' }, 'setting_up_for_others', 1, false)
    expect(have.find((h) => h.label === 'What this is about')?.value).toBe('The launch')
  })
})

/**
 * THE CLOSER MUST NOT CONTRADICT THE CARD PRINTED UNDER IT.
 *
 * The two sat one above the other: a sentence claiming setup had what it needed, and a derived list
 * naming what it did not. The claim was hardcoded HERE, in the client, substituted whenever the
 * wrap-up turn still contained a question - while the onboarding prompt quoted that same sentence and
 * forbade it, twice. Prompt fixes could not have worked; the prompt was not the author.
 */
/**
 * ONE RULE, IN ONE PLACE. Whether the people are missing is decided by the server, where the
 * extraction happens, and rendered here. The first version recomputed it from `peopleNamed`
 * alongside a server already computing it - two copies of one rule with nothing keeping them in
 * step, which is the shape of nearly every defect this codebase has turned up.
 */
describe('whether people are missing is the server\'s answer', () => {
  const full = {
    initial: 'A client meeting on Thursday',
    peopleNamed: ['Priya', 'Tom', 'Dede'],
    decision: 'The client is unhappy about the delay',
    goals: ['Check they took in the briefing'],
  }

  it('reports them missing when the server says so, whatever the local list looks like', () => {
    expect(summariseSetup(full, 'a_party', 1, true).missing.join(' ')).toContain('who is in it')
  })

  it('and stays quiet when the server says they are not', () => {
    expect(summariseSetup({ ...full, peopleNamed: [] }, 'a_party', 1, false).missing.join(' '))
      .not.toContain('who is in it')
  })
})

describe('the closer does not contradict the card', () => {
  it('claims nothing about sufficiency', async () => {
    const { ONBOARD_READY_CLOSER } = await import('./EntryChatPage')
    expect(ONBOARD_READY_CLOSER).not.toMatch(/what I need|everything I need|all I need/i)
  })

  it('and points at what is actually on the record', async () => {
    const { ONBOARD_READY_CLOSER } = await import('./EntryChatPage')
    expect(ONBOARD_READY_CLOSER).toMatch(/on the record/i)
  })
})
