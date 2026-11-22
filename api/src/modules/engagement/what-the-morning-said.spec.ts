import { whatTheMorningSaid, rememberWhatTheMorningSaid, saidYesterday, stillOpenFromYesterday, theDayBefore } from './what-the-morning-said';
import { hasBeenToldOnce, nowToldOnce } from './a-message-sent-once';
import { aNumberInWords } from './a-number-in-words';

/**
 * WHAT YESTERDAY'S MORNING SAID (release test, 22 November 2026, bug 34). Wairimu read the same words four mornings running. Each morning
 * keeps the lines it said on its own record of the day; the next morning leaves out what was said word for word and says how many are
 * still open.
 */
function aStore() {
  const rows = new Map<string, any>();
  return {
    platformSetting: {
      findUnique: jest.fn(async ({ where }: any) => (rows.has(where.key) ? { key: where.key, value: rows.get(where.key) } : null)),
      create: jest.fn(async ({ data }: any) => { if (rows.has(data.key)) throw new Error('exists'); rows.set(data.key, data.value); return data; }),
      update: jest.fn(async ({ where, data }: any) => { rows.set(where.key, data.value); return data; }),
    },
  };
}

describe('what yesterday\'s morning said', () => {
  it('is kept on that day\'s own record, which still says the morning went, and is read back the next day', async () => {
    const prisma = aStore();
    const monday = 'direct-morning.u-wairimu.2026-11-23';
    await nowToldOnce(prisma, monday, 'sent');
    await rememberWhatTheMorningSaid(prisma, monday, ['People said different things about Kilimani Fresh, so settle it with them.', 'Amani is waiting on Baraka.']);
    expect(await hasBeenToldOnce(prisma, monday)).toBe(true);
    const said = await whatTheMorningSaid(prisma, `direct-morning.u-wairimu.${theDayBefore('2026-11-24')}`);
    expect(saidYesterday(said, 'People said different things about Kilimani Fresh, so settle it with them.')).toBe(true);
    expect(saidYesterday(said, 'Amani is waiting on Baraka')).toBe(true);
    /* Changed since yesterday is new. */
    expect(saidYesterday(said, 'Amani has been waiting on Baraka for 6 days.')).toBe(false);
  });

  it('nothing recorded means nothing was said, so everything is new', async () => {
    expect((await whatTheMorningSaid(aStore(), 'direct-morning.u-x.2026-11-22')).size).toBe(0);
  });

  it('says how many from yesterday are still open, in one plain sentence', () => {
    expect(stillOpenFromYesterday(0, aNumberInWords)).toBeNull();
    expect(stillOpenFromYesterday(1, aNumberInWords)).toBe('One thing from yesterday is still open, and your board has it.');
    expect(stillOpenFromYesterday(3, aNumberInWords)).toBe('Three things from yesterday are still open, and your board has them all.');
  });
});
