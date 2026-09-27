import { pluralLabelsBecomeSingular, withNames, namesVisibleTo } from './party-labels';
import { PartyType } from '@prisma/client';

/**
 * "PARTICIPANTS A, B, AND C" - THREE PEOPLE, NONE OF THEM NAMED, ON THEIR OWN LEAD'S BOARD.
 *
 * Read live off the sales check-in on 26 September 2026, in the lead's own judgement:
 *
 *   "You believe the target is collective, while Participants A, B, and C all believe they are
 *    working towards individual targets."
 *
 * Every substitution in `party-labels` matches word-bounded, so "Participants" matches "Participant
 * A" nowhere. The reader entitled to all three names got none of them. It also evades the scorer,
 * whose pattern is `Participant [A-Z]\b`, which is why it never appeared in any number.
 *
 * The fix expands the plural back into singulars before anything else runs and lets the ordinary
 * machinery name each one. So these cases are in two halves: the expansion on its own, and then
 * the sentence a person actually reads coming out of `withNames`.
 */

const KNOWN = ['the initiator', 'Participant A', 'Participant B', 'Participant C'];

describe('a plural label is expanded back into the labels it collapsed', () => {
  it('with an Oxford comma', () => {
    expect(pluralLabelsBecomeSingular('while Participants A, B, and C all believe otherwise', KNOWN))
      .toBe('while Participant A, Participant B and Participant C all believe otherwise');
  });

  it('and without one', () => {
    expect(pluralLabelsBecomeSingular('Participants A, B and C answered.', KNOWN))
      .toBe('Participant A, Participant B and Participant C answered.');
  });

  it('and for a pair', () => {
    expect(pluralLabelsBecomeSingular('Participants A and B disagree.', KNOWN))
      .toBe('Participant A and Participant B disagree.');
  });

  it('and where the model wrote it in lower case', () => {
    expect(pluralLabelsBecomeSingular('both participants A and B said so', KNOWN))
      .toBe('both Participant A and Participant B said so');
  });

  it('and where there is no "and" at all', () => {
    expect(pluralLabelsBecomeSingular('Participants A, B, C answered.', KNOWN))
      .toBe('Participant A, Participant B and Participant C answered.');
  });
});

describe('and it does nothing where it cannot be sure', () => {
  it('a letter that is not a label this check-in handed out', () => {
    // Inventing "Participant I" out of a pronoun is worse than leaving the sentence alone.
    const t = 'Participants A and I disagree.';
    expect(pluralLabelsBecomeSingular(t, KNOWN)).toBe(t);
  });

  it('a plural with nothing after it', () => {
    const t = 'All participants answered this round.';
    expect(pluralLabelsBecomeSingular(t, KNOWN)).toBe(t);
  });

  it('a single letter, which is not a list', () => {
    const t = 'Participants A answered.';
    expect(pluralLabelsBecomeSingular(t, KNOWN)).toBe(t);
  });

  it('and a ground with fewer than two participant labels', () => {
    const t = 'Participants A and B disagree.';
    expect(pluralLabelsBecomeSingular(t, ['the initiator', 'Participant A'])).toBe(t);
  });
});

describe('what the lead now reads, the whole sentence', () => {
  const lead = { id: 'p-lead', partyType: PartyType.INITIATOR, roleAsDescribed: null, email: 'a@x.test', user: { firstName: 'Amara', lastName: 'Eze' } };
  const femi = { id: 'p-a', partyType: PartyType.PARTICIPANT, roleAsDescribed: null, email: 'f@x.test', user: { firstName: 'Femi', lastName: 'Okonkwo' } };
  const ngozi = { id: 'p-b', partyType: PartyType.PARTICIPANT, roleAsDescribed: null, email: 'n@x.test', user: { firstName: 'Ngozi', lastName: 'Eze' } };
  const kwame = { id: 'p-c', partyType: PartyType.PARTICIPANT, roleAsDescribed: null, email: 'k@x.test', user: { firstName: 'Kwame', lastName: 'Mensah' } };
  const parties = [lead, femi, ngozi, kwame] as any[];
  const SENTENCE = 'You believe the target is collective, while Participants A, B, and C all believe they are working towards individual targets.';

  it('the lead reads three names where she read three placeholders', () => {
    const visible = namesVisibleTo('p-lead', parties);
    expect(withNames(SENTENCE, visible, KNOWN, { viewerLabel: 'the initiator' })).toBe(
      'You believe the target is collective, while Femi Okonkwo, Ngozi Eze and Kwame Mensah all believe they are working towards individual targets.',
    );
  });

  it('and a participant inside the list is called "you" in it', () => {
    /* The point of expanding before the name pass rather than after it. `true` is the third
       argument the report and the board both pass on a check-in where people are named to each
       other, which this one is. */
    const visible = namesVisibleTo('p-a', parties, true);
    expect(withNames(SENTENCE, visible, KNOWN, { viewerLabel: 'Participant A' })).toBe(
      'You believe the target is collective, while you, Ngozi Eze and Kwame Mensah all believe they are working towards individual targets.',
    );
  });

  it('and somebody they may not see becomes a plain phrase rather than a name', () => {
    /*
     * A cohort where peers are hidden: the reader keeps their own and the lead's, and the other
     * two are not named. The wall is not weakened by expanding the plural.
     *
     * CHANGED 26 SEPTEMBER 2026. This asserted "you, Participant B and Participant C", which
     * pinned the slot name. Hafsah decided the wording: two people this reader may not name are
     * "one colleague" and "another colleague". The wall itself is what this case is for and is
     * still asserted below - neither name appears.
     */
    const visible = namesVisibleTo('p-a', parties, false);
    const out = withNames(SENTENCE, visible, KNOWN, { viewerLabel: 'Participant A' });
    expect(out).toContain('you, one colleague and another colleague');
    expect(out).not.toContain('Ngozi');
    expect(out).not.toContain('Kwame');
    expect(out).not.toMatch(/[Pp]articipant [A-Z]\b/);
  });
});
