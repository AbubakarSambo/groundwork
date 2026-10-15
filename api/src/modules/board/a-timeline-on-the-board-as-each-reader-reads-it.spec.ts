import { GroundScenario } from '@prisma/client';
import { AMINA, BARAKA, JUMA, SETUP_ADMIN, boardAs, commitment, handoff, answered, type Setup } from './the-switchboards-sections-harness';

/**
 * THE TIMELINE, AS EACH READER READS IT (request 70, the switchboard's "Timeline").
 *
 * What happened, in order, from the record: when answers came in, what was committed to and what became
 * of it, what the work was waiting on and when that ended, and when the check-in closed.
 */
const RECORD: Setup = {
  checkIns: [answered('p-rukia', 1, '2026-09-02T16:00:00Z'), answered('p-baraka', 1, '2026-09-03T08:00:00Z'), answered('p-rukia', 2, '2026-09-16T16:00:00Z')],
  commitments: [
    commitment('k-1', 'p-rukia', 'I will send the Westgate quote.', { createdAt: new Date('2026-09-02T16:05:00Z') }),
    commitment('k-2', 'p-baraka', 'I will call the Kisumu depot.', { createdAt: new Date('2026-09-03T08:05:00Z'), status: 'DONE', settledAt: new Date('2026-09-10T09:00:00Z') }),
  ],
  dependencies: [
    handoff('d-1', 'p-rukia', 'the credit terms', { onLabel: 'Finance', createdAt: new Date('2026-09-04T09:00:00Z'), clearedAt: new Date('2026-09-12T09:00:00Z'), status: 'CLEARED' }),
  ],
  closedAt: new Date('2026-09-20T12:00:00Z'),
};
const lines = (b: any) => (b.timeline ?? []).map((e: any) => e.says);

describe('The timeline, as each person reads it', () => {
  it('Amina reads every event in order, each one full sentence', async () => {
    expect(lines(await boardAs(RECORD, ...AMINA))).toEqual([
      'On 2 September, the first answers for session 1 came in.',
      'On 2 September, Rukia Mwangi committed to send the Westgate quote.',
      'On 3 September, Baraka Otieno committed to call the Kisumu depot.',
      'On 4 September, Rukia Mwangi said the work was waiting on Finance for the credit terms.',
      'On 10 September, Baraka Otieno\'s commitment to call the Kisumu depot was marked done.',
      'On 12 September, the wait for the credit terms was cleared.',
      'On 16 September, the first answers for session 2 came in.',
      'On 20 September, the check-in was closed.',
    ]);
  });

  it('Baraka, where people do not see each other, reads the sessions and his own events, and nobody else\'s', async () => {
    const b = await boardAs({ ...RECORD, peersVisibleToEachOther: false }, ...BARAKA);
    expect(lines(b)).toEqual([
      'On 2 September, the first answers for session 1 came in.',
      'On 3 September, you committed to call the Kisumu depot.',
      'On 10 September, your commitment to call the Kisumu depot was marked done.',
      'On 16 September, the first answers for session 2 came in.',
      'On 20 September, the check-in was closed.',
    ]);
    expect(JSON.stringify(b.timeline)).not.toMatch(/Rukia|Westgate|Finance/);
  });

  it('an admin who only reads an ordinary check-in reads the whole timeline', async () => {
    expect(lines(await boardAs(RECORD, ...JUMA))).toHaveLength(8);
  });

  it('on an evaluation check-in the admin who set it up reads it and another admin reads no board', async () => {
    const evaluation: Setup = { ...RECORD, scenario: GroundScenario.PIP, createdByUserId: 'u-setup' };
    expect(lines(await boardAs(evaluation, ...SETUP_ADMIN))).toHaveLength(8);
    const other = await boardAs(evaluation, ...JUMA).then((b) => b, (e) => e);
    expect(other.timeline).toBeUndefined();
  });

  it('keeps the newest forty events when there are more', async () => {
    const many: Setup = { commitments: Array.from({ length: 50 }, (_, i) => commitment(`k-${i}`, 'p-rukia', `I will do thing number ${i}.`, { createdAt: new Date(Date.UTC(2026, 8, 1 + (i % 28), 10, i)) })) };
    expect((await boardAs(many, ...AMINA)).timeline).toHaveLength(40);
  });

  it('serves nothing where nothing has happened', async () => {
    expect((await boardAs({ checkIns: [] }, ...AMINA)).timeline).toBeUndefined();
  });
});
