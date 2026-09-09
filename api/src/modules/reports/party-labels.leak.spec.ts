import { PartyType } from '@prisma/client';
import { labelsForParties, namesVisibleTo, withNames } from './party-labels';

/**
 * THE TIDY-UP MUST NOT MOVE A NAME ONTO SOMEBODY ELSE. W8-73.
 *
 * The model writes bare "the participant" where it was given the label "participant A", so a
 * lead read their own board with one name resolved and one left as a placeholder. Collapsing
 * "participant A" to "participant" fixes that - and my first version of the collapse counted
 * uniqueness across the labels the READER may see.
 *
 * On a three-party ground, read by participant A, only "participant A" is visible. So
 * "participant" looked unambiguous, and the substitution rewrote
 *
 *   "participant B said the handover was late"   ->   "Abubakar B B said the handover was late"
 *
 * One person's statement attributed to another, by a tidy-up. The existing wall tests caught
 * it on the first run, which is the whole reason they are written the way they are.
 *
 * These are the cases that must keep holding.
 */

const lead = { id: 'p-lead', partyType: PartyType.INITIATOR, roleAsDescribed: null, email: 'h@x.test', user: { firstName: 'Hafsah', lastName: null } } as any;
const a = { id: 'p-a', partyType: PartyType.PARTICIPANT, roleAsDescribed: null, email: 'a@x.test', user: { firstName: 'Abubakar', lastName: null } } as any;
const b = { id: 'p-b', partyType: PartyType.PARTICIPANT, roleAsDescribed: null, email: 'k@x.test', user: { firstName: 'Kavon', lastName: null } } as any;

describe('collapsing a bare label', () => {
  it('resolves on a two-party ground, which is the case that was broken', () => {
    const parties = [lead, a];
    const all = [...labelsForParties(parties).values()];
    const visible = namesVisibleTo('p-lead', parties);
    // Exactly what a real report said: one label written in full, one written bare.
    const out = withNames('the initiator asked and the participant answered', visible, all);
    // The ARTICLE goes with it. Without that, "the participant answered" became "the
    // Abubakar answered" - the same class of half-fix as the placeholder it replaced.
    expect(out).toBe('Hafsah asked and Abubakar answered');
  });

  it('and a bare label with no article still resolves', () => {
    const parties = [lead, a];
    const all = [...labelsForParties(parties).values()];
    const visible = namesVisibleTo('p-lead', parties);
    expect(withNames('participant answered late', visible, all)).toBe('Abubakar answered late');
  });

  it('and leaves it alone when more than one person could be meant', () => {
    // Three parties: "participant" is genuinely ambiguous, and guessing which of them is a
    // worse failure than a placeholder.
    const parties = [lead, a, b];
    const all = [...labelsForParties(parties).values()];
    const visible = namesVisibleTo('p-lead', parties);
    const out = withNames('the participant was late', visible, all);
    expect(out).toBe('the participant was late');
  });

  it('never rewrites another party\'s label into a name', () => {
    // THE REGRESSION. Reading as A, "participant B" must survive untouched.
    const parties = [lead, a, b];
    const all = [...labelsForParties(parties).values()];
    const visible = namesVisibleTo('p-a', parties);
    const out = withNames('participant B said the handover was late.', visible, all);
    expect(out).toBe('participant B said the handover was late.');
    expect(out).not.toContain('Abubakar');
    expect(out).not.toContain('Kavon');
  });

  it('does nothing at all without the full label set', () => {
    // The safe direction: a caller that does not pass every label gets no collapsing.
    const parties = [lead, a];
    const visible = namesVisibleTo('p-lead', parties);
    expect(withNames('the participant answered', visible)).toBe('the participant answered');
  });

  it('and does not eat a word that merely starts the same way', () => {
    const parties = [lead, a];
    const all = [...labelsForParties(parties).values()];
    const visible = namesVisibleTo('p-lead', parties);
    const out = withNames('participation was high across participants', visible, all);
    expect(out).toBe('participation was high across participants');
  });
});

describe('a label does not match inside a word', () => {
  /**
   * A LIVE DEFECT, FOUND BY ACCIDENT. W8-73.
   *
   * The substitution had no word boundaries, and "participant A" - the label for anybody
   * with no stated role - matches the middle of "particip[ant a]nswered" case-insensitively:
   *
   *   "the participant answered"  ->  "the Abubakarnswered"
   *
   * "answered", "agreed", "asked", "acknowledged": the commonest words to follow
   * "participant" in a report about what somebody said. Every reader entitled to that name
   * has been getting mangled sentences.
   */
  const lead = { id: 'p-lead', partyType: PartyType.INITIATOR, roleAsDescribed: null, email: 'h@x.test', user: { firstName: 'Hafsah', lastName: null } } as any;
  const a = { id: 'p-a', partyType: PartyType.PARTICIPANT, roleAsDescribed: null, email: 'a@x.test', user: { firstName: 'Abubakar', lastName: null } } as any;
  const parties = [lead, a];
  const all = [...labelsForParties(parties).values()];
  const visible = namesVisibleTo('p-lead', parties);

  for (const word of ['answered', 'agreed', 'asked', 'acknowledged', 'admitted']) {
    it(`"participant ${word}" survives`, () => {
      const out = withNames(`the participant ${word} in week two`, visible, all);
      // The name goes in, the article goes with it, and the verb is still a verb. These
      // expectations first said "the Abubakar answered", which was the article bug written
      // down as if it were correct - the test was passing on the wrong sentence.
      expect(out).toBe(`Abubakar ${word} in week two`);
    });
  }

  it('and the label still resolves when it IS the label', () => {
    // The fix must not stop the substitution working, only stop it working mid-word.
    const out = withNames('participant A raised it', visible, all);
    expect(out).toBe('Abubakar raised it');
  });
})

describe('the collapse respects who may see the name', () => {
  it('a reader who may not see that person gets the label, not "undefined"', () => {
    /**
     * FOUND BY BITE-CHECK. Removing the visibility check from the collapse left all 313
     * report tests green, so the guard was doing unasserted work.
     *
     * The case that isolates it: an org admin who is not a party reads a two-party ground.
     * They may see the lead's name and not the participant's. "participant A" is then the
     * only label with that base - unambiguous - but its name is not theirs to see. Without
     * the check the code looks up a name that is not in the map and substitutes the string
     * "undefined" into the sentence.
     */
    const lead = { id: 'p-lead', partyType: PartyType.INITIATOR, roleAsDescribed: null, email: 'h@x.test', user: { firstName: 'Hafsah', lastName: null } } as any;
    const a = { id: 'p-a', partyType: PartyType.PARTICIPANT, roleAsDescribed: null, email: 'a@x.test', user: { firstName: 'Abubakar', lastName: null } } as any;
    const parties = [lead, a];
    const all = [...labelsForParties(parties).values()];
    const visible = namesVisibleTo(null, parties);

    const out = withNames('the initiator asked and the participant answered', visible, all);
    expect(out).toContain('Hafsah');
    expect(out).not.toContain('Abubakar');
    expect(out).not.toContain('undefined');
    expect(out).toContain('the participant answered');
  })
})
