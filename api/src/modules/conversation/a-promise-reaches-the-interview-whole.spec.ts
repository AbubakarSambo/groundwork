import { buildIntakeBlock } from './prompt-library';

/**
 * A PROMISE REACHES THE INTERVIEW AS A PROMISE, not as a sentence.
 *
 * Every one of these fields was loaded from the row and dropped before the model saw it. The
 * interview knew "Get three proposals out" and did not know it was a number, due on the thirtieth,
 * with the CEO waiting on it - so the best it could ask was how things were going.
 */
const base: any = {
  groundLabel: 'First 90 days',
  scenario: 'NEW_HIRE',
  partyType: 'PARTICIPANT',
  sessionNumber: 2,
  totalSessions: 5,
};
const block = (o: any) => buildIntakeBlock({ ...base, personObjectives: [o] } as any);

const promise = (over: any = {}) => ({
  text: 'Get three proposals out',
  authoredBy: 'self',
  authoredByThem: true,
  seenBySubject: true,
  kind: 'TARGET',
  dueSaid: 'end of November',
  dueDate: new Date(Date.UTC(2026, 10, 30)),
  status: 'OPEN',
  ...over,
});

describe('what the interview is told about a promise', () => {
  it('the words, and the date those words meant', () => {
    const out = block(promise());
    expect(out).toContain('Get three proposals out');
    expect(out).toContain('due 2026-11-30');
    /* Their words survive beside our reading of them. */
    expect(out).toContain('they said "end of November"');
  });

  it('who is waiting, by name, when somebody is', () => {
    const out = block(promise({ kind: 'COMMITMENT', owedToName: 'Hafsah' }));
    expect(out).toContain('Hafsah is waiting on this');
  });

  it('that a target is a number', () => {
    expect(block(promise())).toContain('a number has to cross a line');
  });

  it('and that they set it themselves', () => {
    expect(block(promise())).toContain('they wrote this themselves');
  });
});

describe('when the words carry no date', () => {
  it('says so, and says to ask once rather than assume a deadline', () => {
    const out = block(promise({ dueSaid: 'soon', dueDate: null }));
    expect(out).toContain('"soon"');
    expect(out).toContain('which is not a date');
    expect(out).toContain('ask');
    /* And never prints a date it does not have. */
    expect(out).not.toMatch(/due \d{4}-\d{2}-\d{2}/);
  });

  it('says nothing at all about timing when they said nothing', () => {
    const out = block(promise({ dueSaid: null, dueDate: null }));
    expect(out).not.toContain('which is not a date');
    expect(out).not.toMatch(/due \d{4}-\d{2}-\d{2}/);
  });
});

describe('a promise that has ended', () => {
  it('is marked, so a finished thing is not chased as if it were live', () => {
    expect(block(promise({ status: 'MET' }))).toContain('recorded as met');
  });

  it('and an open one says nothing, because open is the ordinary case', () => {
    expect(block(promise({ status: 'OPEN' }))).not.toContain('recorded as');
  });
});
