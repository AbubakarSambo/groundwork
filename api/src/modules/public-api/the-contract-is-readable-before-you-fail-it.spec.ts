/**
 * Six calls, four of which fail on the first attempt.
 *
 * Not because anything is broken. Each one knows something the caller does not,
 * and only says it once the caller has guessed wrong - so reading the good
 * error message requires already having made the mistake, and an integrator who
 * has made four in six calls concludes the API is difficult rather than that
 * they are three steps from finished.
 *
 * Measured by connecting our own back office to our own API as a customer for
 * the first time. This endpoint answers all of it in advance, generated from the
 * same enums the validators use so it cannot drift into describing an API we do
 * not have.
 */
import { THE_SEQUENCE, VOCABULARY, WORDS_THAT_DIFFER } from './what-you-need-to-know-before-you-start';
import { GroundScenario, GroundMoment, ObjectiveKind } from '@prisma/client';

describe('the sequence', () => {
  it('is the six calls, numbered', () => {
    expect(THE_SEQUENCE).toHaveLength(6);
    expect(THE_SEQUENCE.map((s) => s.n)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('and every step says why it exists, not only what to call', () => {
    const silent = THE_SEQUENCE.filter((s) => s.why.length < 20).map((s) => s.n);
    expect(silent).toEqual([]);
  });

  it('names the human step in the middle of an automated sequence', () => {
    /**
     * The one nothing else will tell you. An integrator builds and ships a
     * nightly job and then discovers that a person has to sign in - and by then
     * the job is written, which is the expensive moment to find out.
     */
    const signIn = THE_SEQUENCE.find((s) => /signs in/i.test(s.call));
    expect(signIn).toBeDefined();
    expect(signIn!.watchOutFor).toMatch(/human step/);
  });

  it('and warns about the 200 that writes nothing', () => {
    const evidence = THE_SEQUENCE.find((s) => s.call.includes('/evidence'))!;
    expect(evidence.watchOutFor).toMatch(/matched.*false/);
    expect(evidence.watchOutFor).toMatch(/check `matched`, not the status code/);
  });

  it('and about the address that has to be an address', () => {
    const scim = THE_SEQUENCE.find((s) => s.call.includes('scim'))!;
    expect(scim.watchOutFor).toMatch(/nothing fails until step 4/);
  });
});

describe('the vocabularies', () => {
  /**
   * Generated from the enums rather than typed out. A hand-written list is a
   * list that drifts, and a description of an API we do not have is worse than
   * no description at all - it costs the reader the same afternoon and takes
   * their trust with it.
   */
  it('are the real scenarios', () => {
    expect(VOCABULARY.scenario).toEqual(Object.values(GroundScenario).filter((s) => s !== 'HELP_TEAM_UNDERSTAND')); /* the anchor's own situation is not offered to developers */
    expect(VOCABULARY.scenario.length).toBeGreaterThan(5);
  });

  it('and the real moments, which are the three somebody discovers by sending a fourth', () => {
    expect(VOCABULARY.moment).toEqual(Object.values(GroundMoment));
  });

  it('and the real objective kinds, whose error is otherwise the only place they appear', () => {
    expect(VOCABULARY.objectiveKind).toEqual(Object.values(ObjectiveKind));
  });
});

describe('the words that differ', () => {
  it('name the field, what it is not called, and why somebody would expect otherwise', () => {
    /* `text` versus `described` cost an afternoon on its own: every other part
       of the product speaks of an objective being described. */
    const objectives = WORDS_THAT_DIFFER.find((w) => w.field === 'text')!;
    expect(objectives.notCalled).toBe('described');
    expect(objectives.note).toMatch(/described/);
  });

  it('and every entry says all three, rather than being a list of field names', () => {
    for (const w of WORDS_THAT_DIFFER) {
      expect(w.endpoint.length).toBeGreaterThan(5);
      expect(w.field.length).toBeGreaterThan(2);
      expect(w.notCalled.length).toBeGreaterThan(2);
      expect(w.note.length).toBeGreaterThan(20);
    }
  });
});
