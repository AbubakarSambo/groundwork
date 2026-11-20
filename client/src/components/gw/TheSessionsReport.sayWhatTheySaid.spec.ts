import { describe, it, expect } from 'vitest'
import { sayWhatTheySaid } from './TheSessionsReport'

/**
 * RELEASE WALKTHROUGH A, FIX 2: THE SAME PERSON, NAMED TWICE.
 *
 * "Where things stand" read "Amani Wekesa said amani Wekesa stated an aim..." and "You said you
 * stated..." because the served `view` already opens with the person's name (or "You"), and the
 * component glued its own "{who} said " in front of it regardless. When the view already carries
 * the name, it is said once, as a plain sentence; otherwise the "{who} said ..." frame is kept.
 */
describe('sayWhatTheySaid', () => {
  it('says the view alone, capitalised, when it already opens with the person\'s name', () => {
    expect(sayWhatTheySaid('Amani Wekesa', 'amani Wekesa stated an aim to close more deals.', null))
      .toBe('Amani Wekesa stated an aim to close more deals.')
  })

  it('says the view alone, capitalised, when it already opens with "you"', () => {
    expect(sayWhatTheySaid('Amani Wekesa', 'you stated an aim to close more deals.', 'Amani Wekesa'))
      .toBe('You stated an aim to close more deals.')
  })

  it('keeps "{who} said ..." when the view does not open with the person\'s name', () => {
    expect(sayWhatTheySaid('Baraka Mwangi', 'Competitor pricing is the main obstacle.', 'Amani Wekesa'))
      .toBe('Baraka Mwangi said competitor pricing is the main obstacle.')
  })

  it('still says "You" for the reader\'s own row when the view does not open with the name', () => {
    expect(sayWhatTheySaid('Amani Wekesa', 'Competitor pricing is the main obstacle.', 'Amani Wekesa'))
      .toBe('You said competitor pricing is the main obstacle.')
  })

  /**
   * REQUEST 174, ITEM 7: "Amani Wekesa said describes the start date as October 1st…" - the view is
   * a subjectless predicate ("describes ...", "is waiting ..."), written to be read as "{who}
   * describes ..." directly, not as a clause to report with "said" in front of it. The name goes at
   * its start, the sentence otherwise exactly as served - never a quote, because this was never the
   * person's own words to begin with.
   */
  it('puts the name straight in front of a served phrase that already starts with a verb, with no "said"', () => {
    expect(sayWhatTheySaid('Amani Wekesa', 'describes the start date as October 1st as the deadline.', null))
      .toBe('Amani Wekesa describes the start date as October 1st as the deadline.')
  })

  it('does the same for "is waiting ..."', () => {
    expect(sayWhatTheySaid('Baraka Mwangi', 'is waiting for budget approval.', 'Amani Wekesa'))
      .toBe('Baraka Mwangi is waiting for budget approval.')
  })

  /**
   * The served view is always written in the third person (the model's own `participantLabel` is
   * never "you"), so reading it back for the reader's own row needs the verb re-conjugated too -
   * otherwise swapping in "You" produces "You is waiting", a name with the wrong grammar for it.
   */
  it('re-conjugates the verb for the reader\'s own row, rather than printing "You is ..."', () => {
    expect(sayWhatTheySaid('Amani Wekesa', 'is waiting for budget approval.', 'Amani Wekesa'))
      .toBe('You are waiting for budget approval.')
  })

  /**
   * B-059: E1 on Riverbank Trading's old data (docs/existing-users-check.md) found reports stored
   * by the old engine whose `view` opens with a PAST-tense bare verb - "described success in terms
   * of a three-month outcome." - which `openingBareVerb` did not recognise, so the default case ran
   * and read "Ines Barros said described success...", "You said stated...". Past tense needs no
   * re-conjugation for "you" (unlike "is"/"are"), so the same word is used either way.
   */
  it('puts the name straight in front of a served phrase that already opens with a past-tense verb, with no "said"', () => {
    expect(sayWhatTheySaid('Ines Barros', 'described success in terms of a three-month outcome.', null))
      .toBe('Ines Barros described success in terms of a three-month outcome.')
  })

  it('does the same for the reader\'s own row, with no re-conjugation needed for past tense', () => {
    expect(sayWhatTheySaid('Amani Wekesa', "stated the rewrite was 'shipped' in check-in 2.", 'Amani Wekesa'))
      .toBe("You stated the rewrite was 'shipped' in check-in 2.")
  })
})
