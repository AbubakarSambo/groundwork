import { wordPatternEvidence, systemForPatternEvidence } from './pattern-evidence-in-plain-words';
import type { AServedPattern } from '../patterns/who-reads-a-pattern';

/**
 * A PATTERN'S EVIDENCE, REWORDED ONCE FOR EACH READER. See pattern-evidence-in-plain-words.
 *
 * The example sentence is the one from the live capture: "Lack of progress is attributed to an
 * external factor, and the plan is to repeat the same action rather than change the approach."
 */

const RAW = 'Lack of progress is attributed to an external factor, and the plan is to repeat the same action rather than change the approach.';

const pattern = (o: Partial<AServedPattern>): AServedPattern => ({
  id: 'p1', participantId: 'p-femi', yours: true, kind: 'attention', heading: 'Heading',
  whatHappened: RAW, sessions: [1, 2, 3], howOften: 'x', askThem: null, theirWords: null, canAnswer: true,
  leadMark: null, talkedAbout: false, about: 'the work',
  ...o,
});

describe('a pattern’s evidence, worded once for the reader', () => {
  it('the person’s own reading speaks to them as "you", never their name', () => {
    const system = systemForPatternEvidence(true, null);
    expect(system).toContain('"you"');
    expect(system).not.toMatch(/\bFemi\b/);
  });

  it('the lead’s reading is told to name the person and never fall back to a pronoun', () => {
    const system = systemForPatternEvidence(false, 'Femi');
    expect(system).toContain('names Femi every time the subject comes up');
    expect(system).toMatch(/never a pronoun/);
  });

  it('composes the worded sentence and keeps it when it survives the guard', async () => {
    const compose = jest.fn(async (_system: string, _draft: string) =>
      'You said something outside the team was holding things up, and planned to do the same thing again rather than try another way.');
    const [worded] = await wordPatternEvidence([pattern({})], () => null, compose);
    expect(worded.whatHappened).toBe('You said something outside the team was holding things up, and planned to do the same thing again rather than try another way.');
    expect(compose).toHaveBeenCalledTimes(1);
    expect(compose.mock.calls[0][1]).toBe(RAW);
  });

  it('keeps the stored sentence when compose returns nothing (not worded yet, or opening a page)', async () => {
    const [worded] = await wordPatternEvidence([pattern({})], () => null, async () => null);
    expect(worded.whatHappened).toBe(RAW);
  });

  it('keeps the stored sentence when the composed line does not survive the guard, e.g. an invented number', async () => {
    const [worded] = await wordPatternEvidence([pattern({})], () => null, async () => 'They missed 12 deadlines in a row.');
    expect(worded.whatHappened).toBe(RAW);
  });

  it('keeps the stored sentence when compose throws', async () => {
    const [worded] = await wordPatternEvidence([pattern({})], () => null, async () => { throw new Error('rate limited'); });
    expect(worded.whatHappened).toBe(RAW);
  });

  it('never composes when there is nothing to reword', async () => {
    const compose = jest.fn(async () => 'should not be called');
    const [worded] = await wordPatternEvidence([pattern({ whatHappened: null })], () => null, compose);
    expect(worded.whatHappened).toBeNull();
    expect(compose).not.toHaveBeenCalled();
  });

  it('the lead’s draft is composed with a system that carries the person’s first name', async () => {
    const compose = jest.fn(async (_system: string, _draft: string) => 'Femi said something outside the team was holding things up.');
    const [worded] = await wordPatternEvidence(
      [pattern({ yours: false })],
      (pid) => (pid === 'p-femi' ? 'Femi' : null),
      compose,
    );
    expect(compose.mock.calls[0][0]).toContain('Femi');
    expect(worded.whatHappened).toBe('Femi said something outside the team was holding things up.');
  });
});
