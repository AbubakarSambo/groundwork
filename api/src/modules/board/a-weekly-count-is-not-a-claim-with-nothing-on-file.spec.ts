import { thePersonsRecord } from './the-persons-record';
import { whoGroundworkCouldNotMove } from './what-the-lead-reads-about-each-person';

/**
 * AN HONEST WEEKLY COUNT IS NORMAL (fix plan 17 November, group 3; end-to-end check of 17 November).
 * Joel gave a specific number of sales each week and the lead's letter said "Joel said 5 times that something was sold or signed with
 * nothing on file ... so call Joel". A number said with no deal named has nothing to be filed against.
 */
describe('a specific weekly number with no deal named', () => {
  const at = (d: string) => new Date(`${d}T09:00:00Z`);
  const line = (n: number, text: string) => ({ id: `l${n}`, participantId: 'p-joel', checkInId: null, type: 'PROGRESS', text, createdAt: at(`2026-10-${10 + n}`), mark: 'said' });
  const record = (texts: string[]) => thePersonsRecord({
    participantId: 'p-joel', now: at('2026-10-30'), zone: 'Africa/Nairobi', sales: true, checkIns: [],
    lines: texts.map((t, i) => line(i + 1, t)), items: [], commitments: [], saidDone: {}, blockers: [], codes: [], ourTurns: [],
  } as any);

  it('is not a claim, so five weeks of counts are not five things with nothing on file', () => {
    const r = record(['I sold 5 units this week.', 'We sold 4 units this week.', 'I sold 6 units this week.', 'I sold 5 units this week.', 'I sold 7 units this week.']);
    expect(r.claims).toHaveLength(0);
    expect(r.summary.claims).toBe(0);
  });

  it('never reaches the lead as "so call Joel"', () => {
    const r = record(['I sold 5 units this week.', 'We sold 4 units this week.']);
    const stored: any = { record: r, coaching: [{ about: 'proof', done: false, outcome: 'the same', givenOn: 'Monday 12 October', since: { sessions: [1, 2] } }] };
    expect(whoGroundworkCouldNotMove(stored, 'Joel', 'sales')).toBeNull();
  });
});
