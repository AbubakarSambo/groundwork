/**
 * A period list that opens on late December in early September.
 *
 * The ordering was "newest first, because the period anybody wants is nearly
 * always the current one" — two sentences that are each true and do not follow
 * from each other. Newest is the one that STARTS last, which on 4 September was
 * a fortnight beginning on 24 December, and the period somebody actually wanted
 * sat near the bottom of the list.
 *
 * Found by reading the objectives page, not the code: the picker said Cycle 7.
 */
import { OpsFoundationService } from './ops-foundation.service';

const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

const PERIODS = [
  { key: 'sept-2026-target-list', startsOn: day('2026-09-01'), endsOn: day('2026-09-30') },
  { key: 'q4-2026', startsOn: day('2026-10-01'), endsOn: day('2026-12-31') },
  { key: 'q4-cycle-1', startsOn: day('2026-10-01'), endsOn: day('2026-10-14') },
  { key: 'q4-cycle-7', startsOn: day('2026-12-24'), endsOn: day('2026-12-31') },
];

const serviceAt = (rows: typeof PERIODS) =>
  new OpsFoundationService({
    opsPeriod: { findMany: async () => [...rows].sort((a, b) => a.startsOn.getTime() - b.startsOn.getTime()) },
  } as never);

describe('the period list', () => {
  /** Fake timers rather than a hand-rolled Date stand-in: `new Date()` inside the
   *  service has to move too, and only the timer API moves both. */
  const pretendItIs = (iso: string) => jest.setSystemTime(day(iso));

  beforeAll(() => jest.useFakeTimers());
  afterAll(() => jest.useRealTimers());

  it('opens on the period we are in, not the one that starts last', async () => {
    pretendItIs('2026-09-04');
    const periods = await serviceAt(PERIODS).periods();
    expect(periods[0].key).toBe('sept-2026-target-list');
  });

  it('puts every period containing today at the top, because a target list and a quarter can overlap', async () => {
    pretendItIs('2026-10-05');
    const periods = await serviceAt(PERIODS).periods();
    expect(periods.slice(0, 2).map((p) => p.key).sort()).toEqual(['q4-2026', 'q4-cycle-1']);
  });

  it('and keeps the rest in time order rather than scattering them', async () => {
    pretendItIs('2026-09-04');
    const rest = (await serviceAt(PERIODS).periods()).slice(1);
    const starts = rest.map((p) => p.startsOn.getTime());
    expect(starts).toEqual([...starts].sort((a, b) => a - b));
  });

  it('and returns everything, so ordering never drops a period', async () => {
    pretendItIs('2027-06-01');
    const periods = await serviceAt(PERIODS).periods();
    expect(periods).toHaveLength(PERIODS.length);
  });
});
