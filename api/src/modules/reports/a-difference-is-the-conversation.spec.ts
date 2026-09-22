import { draftTheQuestion, pickTheFinding } from './the-picture-is-drafted-from-the-reads';

/**
 * ONE SESSION REPORT, TWO SENTENCES THAT CANNOT BOTH BE TRUE (22 September 2026).
 *
 * Section 01 named the difference - one person selling tractors, the other subscriptions - and said
 * what would settle it. Section 06 said "No question yet ... neither is on record here". And the
 * headline above both said "their responsibilities are staying with them, so there is nothing here
 * to read into", which is the absence of a finding printed as one.
 */
describe('a difference is the conversation worth having', () => {
  const base = { functions: [], blockers: [] as any[] };

  it('asks what settles it, in the report’s own words', () => {
    const q = draftTheQuestion({
      ...base,
      differences: [{ topic: 'The Goal of the Work', settledBy: 'Agree on which product is being sold and what the primary metric for success is' }],
    })!;
    expect(q.text).toBe('Agree on which product is being sold and what the primary metric for success is. That is what settles the Goal of the Work.');
  });

  it('and names the difference even where the report did not say what settles it', () => {
    const q = draftTheQuestion({ ...base, differences: [{ topic: 'Who owns the Kano depot' }] })!;
    expect(q.text).toBe('Settle who owns the Kano depot between the people who described it differently.');
  });

  it('a blocker still gets its question when the round found no difference', () => {
    const q = draftTheQuestion({ ...base, blockers: [{ what: 'the pricing sign-off', kind: 'APPROVAL' as any }] });
    expect(q?.text).toContain('the pricing sign-off');
  });

  it('and nothing on record is still no question', () => {
    expect(draftTheQuestion({ ...base })).toBeNull();
  });
});

describe('an absence is not a finding', () => {
  it('will not name a round by a coverage line that says nothing is happening', () => {
    const keys = ['cov-nothing', 'differs-goal'];
    const texts = {
      'cov-nothing': 'Sahar Jamal and Catherine Kinyanjui: their responsibilities are staying with them. Nothing is leaking out or piling in, so there is nothing here to read into.',
      'differs-goal': 'Sahar Jamal and Catherine Kinyanjui describe the goal of the work differently.',
    };
    expect(pickTheFinding(keys, texts)).toBe('differs-goal');
    /* And with only the absence, the round is named by nothing rather than by it. */
    expect(pickTheFinding(['cov-nothing'], texts)).toBeNull();
  });

  it('while a coverage read that says something still counts', () => {
    const texts = { 'cov-real': 'Emeka Obi: work that sits in his remit is landing with other people.' };
    expect(pickTheFinding(['cov-real'], texts)).toBe('cov-real');
  });
});
