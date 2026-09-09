import { decide, Kept, RoundPicture } from './what-the-report-said-at-the-time';

/**
 * WHAT THE REPORT SAID AT THE END OF EACH ROUND.
 *
 * The live report is one row and every round rewrites it, so the day-14 picture is gone the moment
 * day 30 runs, and nothing can show that an earlier account changed. A ninety-day story was being
 * re-derived from transcripts instead of read back from what was said at the time.
 */
const picture = (over: Partial<RoundPicture> = {}): RoundPicture => ({
  sharedPicture: 'Both describe the handoff differently.',
  agreements: ['the target is 150k'],
  divergences: [{ about: 'who owns conversion' }],
  centralQuestion: 'Who owns an opportunity before it is signed?',
  ...over,
});

const kept = (over: Partial<Kept> = {}): Kept => ({
  ...picture(),
  round: 2,
  takenAt: new Date('2026-11-14'),
  amendedAt: null,
  ...over,
});

describe('a round nobody has kept yet', () => {
  it('is kept', () => {
    expect(decide(picture(), null)).toEqual({ keep: true, as: 'new' });
  });

  it('unless the round produced no picture at all', () => {
    /* One party in, the other silent, the model correctly refusing to invent the missing half.
       Keeping that would put "nothing was established" in somebody's record for a fortnight. */
    const answer = decide(picture({ sharedPicture: '   ' }), null);
    expect(answer.keep).toBe(false);
  });
});

describe('a round already kept', () => {
  it('is left alone when nothing changed', () => {
    /* Synthesis runs on every completion. A round re-synthesised unchanged must not collect a
       trail of amendments - "amended" has to mean something when somebody sees it. */
    const answer = decide(picture(), kept());
    expect(answer.keep).toBe(false);
  });

  it('is amended, not duplicated, when it changed', () => {
    const answer = decide(picture({ sharedPicture: 'They now describe it the same way.' }), kept());
    expect(answer).toMatchObject({ keep: true, as: 'amendment' });
  });

  it('and the mark says what moved, in words', () => {
    const answer = decide(picture({ sharedPicture: 'Different now.' }), kept()) as any;
    expect(answer.note).toContain('the shared picture');
    expect(answer.note).toContain('corrected their own check-in');
  });

  it('names several parts when several moved', () => {
    const answer = decide(
      picture({ sharedPicture: 'Different now.', centralQuestion: 'A different question?' }),
      kept(),
    ) as any;
    expect(answer.note).toContain('the shared picture');
    expect(answer.note).toContain('the question it left open');
  });

  it('notices a change in the divergences alone', () => {
    /* The part that matters most to somebody rereading a round: whether the account of the
       disagreement moved. */
    const answer = decide(picture({ divergences: [{ about: 'pricing authority' }] }), kept()) as any;
    expect(answer.keep).toBe(true);
    /* "accounts" is the login word to a reader; this note is shown at the top of every amended
       report. It says what it means: where what people said differed. */
    expect(answer.note).toContain('where what people said differed');
  });

  it('never says why it changed', () => {
    /* The cause is somebody's own correction and this cannot know which. It says what moved. */
    const answer = decide(picture({ sharedPicture: 'Different now.' }), kept()) as any;
    expect(answer.note).not.toMatch(/\b(because|due to|as a result of)\b/i);
  });
});
