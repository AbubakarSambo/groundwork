import { whatTheirWeekLooksLike, Happened, MOST_IN_A_SESSION } from './what-their-week-looks-like';

/**
 * WHAT THEIR OWN SYSTEMS RECORDED, IN THE ROOM WHERE THEY ARE ASKED ABOUT IT.
 *
 * "How many shops did you visit" is a question their company can answer without them. "Nine of the
 * twelve visits have nothing recorded after them - what happened there" is a question only they can
 * answer. The second is only possible if the interview can see the twelve.
 */
const NOW = new Date('2026-11-08T00:00:00Z');
const visit = (over: Partial<Happened> = {}): Happened => ({
  kind: 'VISIT',
  strength: 'RECORDED',
  happenedAt: new Date('2026-11-03T10:00:00Z'),
  note: 'Owner not in',
  counterparty: 'Mama Ngozi Provisions',
  sourceSystem: 'salesapp',
  disputed: false,
  ...over,
});

describe('what the interview is given', () => {
  it('the day, the shop, and what the record proves', () => {
    const block = whatTheirWeekLooksLike([visit()], NOW);
    expect(block).toContain('2026-11-03');
    expect(block).toContain('Mama Ngozi Provisions');
    expect(block).toContain('evidence it happened');
    expect(block).toContain('no evidence of what was said');
  });

  it('the line they wrote at the time, and nothing said in the conversation', () => {
    expect(whatTheirWeekLooksLike([visit()], NOW)).toContain('Their note: "Owner not in"');
  });

  it('a scheduled meeting described as scheduled, never as one that happened', () => {
    const block = whatTheirWeekLooksLike([visit({ kind: 'MEETING', strength: 'ARRANGED', note: null })], NOW);
    expect(block).toContain('was arranged');
    expect(block).toContain('is not a record that it took place');
  });

  it('and says where it came from without saying anybody was watched', () => {
    expect(whatTheirWeekLooksLike([visit()], NOW)).toContain('not from anything we watched');
  });
});

describe('how it must be used', () => {
  const block = whatTheirWeekLooksLike([visit()], NOW);

  it('never to ask what the company already knows', () => {
    expect(block).toContain('Never ask them something this already answers');
    expect(block).toContain('How many shops did you visit');
  });

  it('never as a list to work through', () => {
    /* A session that reads somebody their activity log back to them is an audit, and nobody
       answers an audit honestly. */
    expect(block).toContain('not a list to work through');
    expect(block).toContain('nobody answers');
  });

  it('and a missing record is never treated as proof something did not happen', () => {
    expect(block).toContain('A RECORD BEING ABSENT IS NOT AN EVENT');
    expect(block).toContain('nothing is connected to');
    expect(block).toContain('never say the record proves it did not happen');
  });
});

describe('a record somebody has already disputed', () => {
  const block = whatTheirWeekLooksLike([visit({ disputed: true })], NOW);

  it('stays in, because removing it settles the disagreement quietly', () => {
    expect(block).toContain('2026-11-03');
  });

  it('and is marked, so nobody is asked to defend it twice', () => {
    expect(block).toContain('do not press them on it again');
    expect(block).toContain('not to treat it as settled either way'.replace('not to ', 'do not '));
  });
});

describe('size', () => {
  it('is context, not a spreadsheet', () => {
    const many = Array.from({ length: 30 }, (_, i) =>
      visit({ happenedAt: new Date(`2026-11-${String((i % 27) + 1).padStart(2, '0')}T10:00:00Z`) }));
    const block = whatTheirWeekLooksLike(many, NOW);
    expect(block.split('\n').filter((l) => l.startsWith('- '))).toHaveLength(MOST_IN_A_SESSION);
  });

  it('and says nothing at all when nothing was recorded', () => {
    /* Most organisations connect nothing, and that check-in must be exactly as it is today. */
    expect(whatTheirWeekLooksLike([], NOW)).toBe('');
  });
});
