import { howItReads, worthAsking, Metric, WHAT_A_NUMBER_IS_NOT, NEVER_CONCLUDE_FROM_A_NUMBER } from './a-number-does-not-argue';

const m = (over: Partial<Metric> = {}): Metric => ({
  key: 'crash_rate',
  says: 'sessions that ended in a crash',
  value: 8,
  unit: 'percent',
  asOf: new Date('2026-08-20T00:00:00Z'),
  sourceSystem: 'sentry',
  ...over,
});

describe('how a number is said', () => {
  it('says what it counts, not just what it is called', () => {
    /* "crash_rate: 8" is a key and a number. Neither means anything to somebody reading a report. */
    expect(howItReads(m())).toContain('sessions that ended in a crash: 8 percent');
    expect(howItReads(m())).not.toContain('crash_rate');
  });

  it('dates it, because a number without a date is a claim about now', () => {
    expect(howItReads(m())).toContain('as of 2026-08-20');
  });

  it('attributes it, because a dashboard export is not a database read', () => {
    expect(howItReads(m())).toContain('from sentry');
  });

  it('copes with a number that has no unit', () => {
    expect(howItReads(m({ unit: null, value: 3, says: 'active vehicles' }))).toContain('active vehicles: 3, as of');
  });
});

describe('a number that disagrees does not win', () => {
  it('puts the two side by side and asks', () => {
    const said = worthAsking('The product is stable', m());
    expect(said).toContain('The record says: "The product is stable"');
    expect(said).toContain('Your systems say:');
    expect(said).toContain('Which is it?');
  });

  it('offers the innocent reading first, because it is usually the right one', () => {
    expect(worthAsking('The product is stable', m())).toContain('may be about different things');
  });

  it('never says anybody was wrong', () => {
    const said = worthAsking('The product is stable', m()).toLowerCase();
    for (const verdict of ['contradict', 'wrong', 'overstat', 'inaccurate', 'false', 'disproves', 'however']) {
      expect(said).not.toContain(verdict);
    }
  });
});

describe('what is said with the numbers, every time', () => {
  it('says nobody has checked them', () => {
    expect(WHAT_A_NUMBER_IS_NOT[0]).toContain('nobody here has checked them');
  });

  it('says a disagreement is not proof', () => {
    expect(WHAT_A_NUMBER_IS_NOT.join(' ')).toContain('is not proof they were wrong');
  });

  it('refuses to say whether a number is good', () => {
    /* That depends on what somebody was aiming for, which this cannot know - and the moment it
       decides 8 percent is high it is a product analytics tool with opinions. */
    expect(WHAT_A_NUMBER_IS_NOT.join(' ')).toContain('Nothing here says whether a number is good');
  });

  it('and the synthesis is forbidden all three', () => {
    expect(NEVER_CONCLUDE_FROM_A_NUMBER).toContain('cannot tell you that somebody was wrong');
    expect(NEVER_CONCLUDE_FROM_A_NUMBER).toContain('good or bad');
    expect(NEVER_CONCLUDE_FROM_A_NUMBER).toContain('never rank or score anybody using one');
  });
});

describe('and it is not analytics', () => {
  it('holds no trend, threshold or comparison', () => {
    const src = require('fs').readFileSync(require('path').join(__dirname, 'a-number-does-not-argue.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, '');
    for (const analytics of ['threshold', 'trend', 'previous', 'average', 'baseline', 'target', 'delta']) {
      expect(src.toLowerCase()).not.toContain(analytics);
    }
  });
});
