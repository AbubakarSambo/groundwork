import { withNames, namesVisibleTo } from './party-labels';
import { PartyType } from '@prisma/client';

/**
 * "THE RECORD SHOWS YOU BLAMES THE MARKET."
 *
 * Read on the lead's own board of the sales check-in. The label was swapped for "you" correctly and
 * the verb stayed in the third person, because "blames" was not in the closed list in `withNames`.
 *
 * FOUND BY LOOKING, NOT BY GUESSING. Every `you <word>s` across all twenty-four scenarios' served
 * reports and boards was read. Four were genuine verbs and are added. Four were correct English and
 * are deliberately left out, and they are pinned here too, because they are the argument for the
 * list being closed at all:
 *
 *   "Grace's own plan for you calls for two signed distribution agreements"
 *   "which for you means the supplier acknowledging tickets within four hours"
 *
 * The subject is the plan and the agreement; "you" is the object of "for". The same search turned
 * up a live bug in the rules that already existed - "A key worry for you is that you didn't see
 * this coming" would have become "for you are" - so a preposition immediately before "you" now
 * holds every one of these rules off, not only the new verbs.
 */

const ME = { id: 'p-me', partyType: PartyType.PARTICIPANT, roleAsDescribed: null, email: 'm@x.test', user: { firstName: 'Amara', lastName: 'Eze' } };
const LEAD = { id: 'p-lead', partyType: PartyType.INITIATOR, roleAsDescribed: null, email: 'l@x.test', user: { firstName: 'Grace', lastName: 'Obi' } };
const PARTIES = [LEAD, ME] as any[];
const LABELS = ['the initiator', 'Participant A'];

/** The reader is Participant A, which is the shape every one of these sentences was read in. */
const render = (text: string) =>
  withNames(text, namesVisibleTo('p-me', PARTIES), LABELS, { viewerLabel: 'Participant A' });

describe('the four verbs the twenty-four scenarios actually produced', () => {
  it('blames', () => {
    expect(render('The record shows Participant A blames the market and the credit committee.'))
      .toBe('The record shows you blame the market and the credit committee.');
  });

  it('owes', () => {
    expect(render('This is work Participant A owes Dele, not the other way round.'))
      .toBe('This is work you owe Dele, not the other way round.');
  });

  it('points', () => {
    expect(render('Bisi names the credit committee, while Participant A points to collecting bank statements.'))
      .toBe('Bisi names the credit committee, while you point to collecting bank statements.');
  });

  it('observes', () => {
    expect(render('Dr Ade is leading the client meetings while Participant A observes.'))
      .toBe('Dr Ade is leading the client meetings while you observe.');
  });
});

describe('and the ones in the same search that were already right', () => {
  it('leaves "calls" alone, because the plan calls, not the reader', () => {
    expect(render("The initiator's own plan for Participant A calls for two signed distribution agreements."))
      .toBe("Grace Obi's own plan for you calls for two signed distribution agreements.");
  });

  it('leaves "means" alone, because the agreement means, not the reader', () => {
    expect(render('Participant A is focused on the agreement, which for Participant A means acknowledging tickets within four hours.'))
      .toBe('You are focused on the agreement, which for you means acknowledging tickets within four hours.');
  });

  it('and the same guard fixes a rule that was already wrong', () => {
    /* `you is` would have made this "A key worry for you are that...". The worry is the subject. */
    expect(render("A key worry for Participant A is that Participant A didn't see this coming."))
      .toBe("A key worry for you is that you didn't see this coming.");
  });
});

describe('and none of that loosens the rules that were already there', () => {
  it('the four irregulars still agree where the reader is the subject', () => {
    expect(render('Participant A is concerned about sign-off.')).toBe('You are concerned about sign-off.');
    expect(render('Participant A was clear about the date.')).toBe('You were clear about the date.');
    expect(render('Participant A has the plan.')).toBe('You have the plan.');
    expect(render('Participant A does the weekly review.')).toBe('You do the weekly review.');
  });

  it('and mid-sentence, where the word before is not a preposition', () => {
    expect(render('On the timeline, Participant A is clear.')).toBe('On the timeline, you are clear.');
  });

  it('and another party\'s verb is still left alone', () => {
    expect(render('The initiator blames the market.')).toBe('Grace Obi blames the market.');
  });
});

describe('and "You agrees", read by the lead about their own account', () => {
  /* "Success for the initiator means ... The initiator agrees." rendered for the initiator. */
  const asTheLead = (text: string) =>
    withNames(text, namesVisibleTo('p-lead', PARTIES), LABELS, { viewerLabel: 'the initiator' });

  it('agrees, disagrees, confirms and the rest take the verb that goes with "you"', () => {
    expect(asTheLead('The initiator agrees.')).toBe('You agree.');
    expect(asTheLead('The initiator disagrees with the date.')).toBe('You disagree with the date.');
    expect(asTheLead('The initiator confirms the target is eight.')).toBe('You confirm the target is eight.');
    expect(asTheLead('The initiator mentions the renewals.')).toBe('You mention the renewals.');
  });

  it('but not where "you" is the object of "for"', () => {
    expect(asTheLead('What matters for the initiator agrees with the plan.')).toBe('What matters for you agrees with the plan.');
  });
});

describe('and one or two adverbs between "you" and the verb', () => {
  const asTheLead = (text: string) =>
    withNames(text, namesVisibleTo('p-lead', PARTIES), LABELS, { viewerLabel: 'the initiator' });

  it('"You also believes the credit committee is the only delay" reads "You also believe"', () => {
    /* check-1 and check-2, the lead's judgement, theGap. */
    expect(asTheLead('The initiator also believes the credit committee is the only delay.'))
      .toBe('You also believe the credit committee is the only delay.');
    expect(asTheLead('The initiator still has not said so.')).toBe('You still have not said so.');
    expect(asTheLead('The initiator already is behind, and the initiator now wants help.')).toBe('You already are behind, and you now want help.');
  });

  it('still not where "you" is the object of a preposition', () => {
    expect(asTheLead('A key worry for the initiator also is the date.')).toBe('A key worry for you also is the date.');
  });

  it('and a second verb after "but" or "and" is left for the rewrite, because its subject may be somebody else', () => {
    /* No serve-time fix: in the second line the verb belongs to the office move, not to the reader. */
    expect(asTheLead('The initiator expects Tobi Adewale to take on the renewals, but has not communicated this.'))
      .toBe('You expect Tobi Adewale to take on the renewals, but has not communicated this.');
    expect(asTheLead('The initiator says the office move is going well, and is on schedule.'))
      .toBe('You say the office move is going well, and is on schedule.');
  });
});
