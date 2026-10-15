import { boardAs } from './the-switchboards-sections-harness';
import { review5, RUKIA_RUNS_IT, AMANI, JUMA_READS, GRACE_SET_IT_UP } from './__fixtures__/sales-board-review-5';

/**
 * REQUEST 118 (6): THE GLANCE'S WAIT IS SAID BY THE DAY IT BEGAN, NOT A COUNT THAT DISAGREES WITH IT.
 *
 * On "Sales team, Q3" `howItIsGoing.glance.inTheWay` served `daysWaiting: 2` (counted to the board's last change,
 * 30 September) beside `sinceSays: "since 27 September"`. A count to the moment of reading would change on opening
 * (decision 7). The count is now not sent (null); the screen draws `sinceSays`. Read the same by every reader, and at
 * two different hours.
 */
describe('request 118 (6): the wait on the glance has no count of days', () => {
  it.each([['Rukia, who runs it', RUKIA_RUNS_IT], ['Grace, the admin who set it up', GRACE_SET_IT_UP], ['Juma, an admin who only reads', JUMA_READS], ['Amani, who checks in', AMANI]])('%s reads the day it began and no count', async (_who, reader) => {
    const early = await boardAs({ ...review5(), clock: { now: new Date('2026-10-02T08:00:00Z') } }, reader[0], reader[1]);
    const late = await boardAs({ ...review5(), clock: { now: new Date('2026-10-05T21:00:00Z') } }, reader[0], reader[1]);
    for (const b of [early, late]) {
      const w = b.howItIsGoing?.glance?.inTheWay;
      if (!w || !w.since) continue;
      expect(w.daysWaiting).toBeNull();
      expect(w.sinceSays).toMatch(/^since \d{1,2} [A-Z][a-z]+$/);
    }
    expect(early.howItIsGoing?.glance?.inTheWay?.sinceSays ?? null).toBe(late.howItIsGoing?.glance?.inTheWay?.sinceSays ?? null);
  });

  it('Rukia is served a wait on the glance at all, so the check above is not empty', async () => {
    const b = await boardAs(review5(), ...RUKIA_RUNS_IT);
    expect(b.howItIsGoing?.glance?.inTheWay?.sinceSays).toMatch(/^since /);
  });
});
