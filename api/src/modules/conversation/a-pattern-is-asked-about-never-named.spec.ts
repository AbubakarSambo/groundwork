import { theOneWorthAsking, askAboutItBlockFor } from './what-keeps-happening-becomes-a-question';
import { ALIGNMENT_FEED_ONLY_CODES, PATTERN_PROBE_BY_CODE } from '../patterns/pattern-library';

const anyProbeCode = [...PATTERN_PROBE_BY_CODE.keys()][0];
const anotherProbeCode = [...PATTERN_PROBE_BY_CODE.keys()][1];

describe('a pattern is asked about, never named', () => {
  it('says nothing when a thing has been seen once', () => {
    expect(theOneWorthAsking([{ code: anyProbeCode, periodsObserved: 1 }])).toBeNull();
  });

  it('asks once it has survived a second period', () => {
    const one = theOneWorthAsking([{ code: anyProbeCode, periodsObserved: 2 }]);
    expect(one?.code).toBe(anyProbeCode);
    expect(one?.probe).toBeTruthy();
  });

  it('never asks about a code that exists for the alignment feed only', () => {
    for (const code of ALIGNMENT_FEED_ONLY_CODES) {
      expect(theOneWorthAsking([{ code, periodsObserved: 9 }])).toBeNull();
    }
  });

  it('never asks about a code with no safe question form', () => {
    expect(theOneWorthAsking([{ code: 'NOT_A_REAL_CODE', periodsObserved: 5 }])).toBeNull();
  });

  it('asks about one thing, not two', () => {
    const one = theOneWorthAsking([
      { code: anyProbeCode, periodsObserved: 2 },
      { code: anotherProbeCode, periodsObserved: 4 },
    ]);
    expect(one?.code).toBe(anotherProbeCode);
  });

  it('adds nothing to a prompt when there is nothing to ask', () => {
    expect(askAboutItBlockFor(null)).toBe('');
  });

  it('tells the model not to name it, and to drop it if it does not fit', () => {
    const block = askAboutItBlockFor({ probe: 'What is the last thing you sent them?' });
    expect(block).toContain('NEVER say that it keeps happening');
    expect(block).toContain('never name the pattern');
    expect(block).toContain('If it does not fit this conversation, leave it');
    expect(block).toContain('What is the last thing you sent them?');
  });

  it('never puts the engine observation in front of anybody', () => {
    const block = askAboutItBlockFor(theOneWorthAsking([
      { code: anyProbeCode, periodsObserved: 3, observationText: 'They have committed to this three times.' },
    ]));
    expect(block).not.toContain('committed to this three times');
  });
});
