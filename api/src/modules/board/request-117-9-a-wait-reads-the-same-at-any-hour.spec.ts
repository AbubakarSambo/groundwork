import { boardAs } from './the-switchboards-sections-harness';
import { review5, RUKIA_RUNS_IT, AMANI, BARAKA_M, NEEMA, JUMA_READS, GRACE_SET_IT_UP, READ_AT_20_46, READ_AT_20_51, READ_NEXT_EVENING } from './__fixtures__/sales-board-review-5';
import { serviceFor } from '../reports/__fixtures__/sales-team-q3-two-sessions';

/**
 * SCREENS REQUEST 117 (9): THE BOARD MUST NOT CHANGE JUST BECAUSE IT IS OPENED (CLAUDE.md, decision 7).
 *
 * "Amani Wekesa has been waiting 4 days on you for the price list" at 20:46 became "5 days" at 20:51 with nothing
 * new on the record, and the coaching said 5 where the row said 4. A wait is now said with the day it began, and
 * anything decided by how long it has sat is measured to the record's own clock, so the same record reads the
 * same at any hour, for every reader.
 */
const READERS = [
  ['Rukia, who runs it', RUKIA_RUNS_IT],
  ['Amani, who checks in', AMANI],
  ['Baraka, who checks in', BARAKA_M],
  ['Neema, who checks in', NEEMA],
  ['Juma, an admin who only reads', JUMA_READS],
  ['Grace, the admin who set it up', GRACE_SET_IT_UP],
] as const;

async function readAt(at: Date, reader: readonly [string, string], more: any = {}) {
  jest.setSystemTime(at);
  return boardAs(review5({ clock: { ...review5().clock, now: at }, ...more }), reader[0], reader[1]);
}

beforeAll(() => { jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] }); });
afterAll(() => { jest.useRealTimers(); });

describe('request 117 (9): the same record reads the same at any hour', () => {
  it.each(READERS)('%s reads the same board at 20:46, at 20:51 and the next evening', async (_who, reader) => {
    for (const peersVisibleToEachOther of [true, false]) {
      const first = JSON.stringify(await readAt(READ_AT_20_46, reader, { peersVisibleToEachOther }));
      expect(JSON.stringify(await readAt(READ_AT_20_51, reader, { peersVisibleToEachOther }))).toBe(first);
      expect(JSON.stringify(await readAt(READ_NEXT_EVENING, reader, { peersVisibleToEachOther }))).toBe(first);
    }
  });

  it.each(READERS)('%s is never told how many days a wait has lasted', async (_who, reader) => {
    const served = JSON.stringify(await readAt(READ_AT_20_46, reader));
    expect(served).not.toMatch(/waiting \d+ days?|for \d+ days?\b|\d+ days? on /);
  });

  it('the lead and the admin who set it up read the day each wait began', async () => {
    for (const reader of [RUKIA_RUNS_IT, GRACE_SET_IT_UP]) {
      const b = await readAt(READ_AT_20_46, reader);
      expect(b.howItIsGoing.glance.inTheWay.sinceSays).toBe('since 27 September');
    }
    const grace = await readAt(READ_AT_20_46, GRACE_SET_IT_UP);
    const amani = (grace.eachPerson as any[]).find((r) => r.participantId === 'p-amani');
    expect(amani.says).toContain('since 28 September');
  });
});

describe('request 117 (9): the coaching and the probes say the day, at any hour', () => {
  function svc() {
    const { svc, w } = serviceFor('sales');
    (svc as any).anthropic = { respond: jest.fn(async () => null) };
    const deps = w.dependencies as any[];
    deps[0].status = 'WAITING'; deps[0].clearedAt = null; deps[0].what = 'the discount';
    deps[1].what = 'the price list';
    return svc;
  }

  it('Rukia\'s own note, and Grace\'s probe list, read the same at 20:46 and the next evening', async () => {
    jest.setSystemTime(READ_AT_20_46);
    const early = JSON.stringify([await svc().coachingForTheBoard('g1', 'u-rukia'), await svc().coachingForTheBoard('g1', 'u-grace')]);
    jest.setSystemTime(READ_NEXT_EVENING);
    const later = JSON.stringify([await svc().coachingForTheBoard('g1', 'u-rukia'), await svc().coachingForTheBoard('g1', 'u-grace')]);
    expect(later).toBe(early);
    expect(early).not.toMatch(/for \d+ days|\d+ days? on /);
  });

  it('Rukia reads who is waiting on her, and since when', async () => {
    jest.setSystemTime(READ_AT_20_46);
    const c: any = await svc().coachingForTheBoard('g1', 'u-rukia');
    expect(c.yours.beforeNextTime[0]).toBe('Baraka Mwangi and Amani Wekesa are waiting on you for the discount and the price list. The first of these waits began on 24 September. Either do them, or give a date you can do them by.');
    const g: any = await svc().coachingForTheBoard('g1', 'u-grace');
    expect(g.eachPerson.find((p: any) => p.who === 'Amani Wekesa').probe[0])
      .toBe('Amani Wekesa has been waiting on Rukia Otieno for the price list since 29 September, and nothing on record says it was raised higher. It is early, so ask Amani Wekesa what is being held up and whether help raising it would be useful.');
  });
});
