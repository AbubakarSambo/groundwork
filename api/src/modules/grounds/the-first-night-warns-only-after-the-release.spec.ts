import { GroundsCron } from './grounds.cron';
import { RELEASE_MOMENT_KEY, theReleaseMoment, theMomentIn, reachedTheWarningPointBefore } from './the-release-moment';
import { CompanyPictureService } from './the-company-picture.service';

/**
 * THE FIRST NIGHT (decision 74, item 7, part a). No "time running out" email for a check-in that was
 * already that close to its end, or past it, before the release. Only a check-in reaching that
 * point after the release gets one. The release moment is written by the first start of this
 * version and never changed after.
 */
const DAY = 86_400_000;
const NOW = new Date('2026-10-12T02:00:00Z');
const daysFromNow = (n: number) => new Date(NOW.getTime() + n * DAY);

/** A ground whose deadline falls `inDays` from now: created `90 - inDays` days ago on a 90-day clock. */
const aGround = (id: string, inDays: number) => ({
  id, label: `Check-in ${id}`, createdAt: daysFromNow(inDays - 90), startsAt: null, timelineDays: 90, runsUntilEnded: false,
  initiator: { email: `${id}@lead.test` },
});

function theCron(opts: { release: Date | null | 'unreadable'; grounds: any[] }) {
  const settings = new Map<string, any>();
  if (opts.release instanceof Date) settings.set(RELEASE_MOMENT_KEY, { value: { at: opts.release.toISOString() } });
  const stamped: string[] = [];
  const sent: string[] = [];
  const prisma: any = {
    withAdvisoryLock: async (_k: number, fn: () => Promise<void>) => { await fn(); return true; },
    platformSetting: {
      findUnique: jest.fn(async (a: any) => {
        if (opts.release === 'unreadable') throw new Error('the database is not answering');
        return settings.get(a.where.key) ?? null;
      }),
      create: jest.fn(async (a: any) => { settings.set(a.data.key, { value: a.data.value }); return a.data; }),
    },
    ground: {
      findMany: jest.fn(async () => opts.grounds),
      update: jest.fn(async (a: any) => { stamped.push(a.where.id); return {}; }),
    },
  };
  const email: any = { sendTimeRunningOut: jest.fn(async (to: string) => { sent.push(to); }) };
  const config: any = { get: () => 'https://app.test' };
  const cron = new GroundsCron(prisma, email, config, {} as any, {} as any, {} as any, {} as any);
  return { cron, prisma, stamped, sent, settings };
}

beforeAll(() => { jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] }); jest.setSystemTime(NOW); });
afterAll(() => { jest.useRealTimers(); });

describe('the warning that a check-in is about to run out of time, on the first night', () => {
  it('is not sent, or stamped, for a check-in that was already inside its last week at the release', async () => {
    /* Released yesterday. A ends in 3 days, so it entered its last week 4 days ago, before the release. */
    const t = theCron({ release: daysFromNow(-1), grounds: [aGround('a', 3)] });
    await t.cron.warnBeforeTimeRunsOut();
    expect(t.sent).toEqual([]);
    expect(t.stamped).toEqual([]);
  });

  it('is not sent for a check-in already past its end at the release, and it is not stalled either', async () => {
    const t = theCron({ release: daysFromNow(-1), grounds: [aGround('late', -5)] });
    await t.cron.warnBeforeTimeRunsOut();
    expect(t.sent).toEqual([]);
    /* No stamp means the stall sweep, which stalls only what somebody was warned about, leaves it alone. */
    expect(t.stamped).toEqual([]);
  });

  it('is sent, once, to a check-in that reaches its last week after the release', async () => {
    /* Released ten days ago. B ends in 5 days, so it entered its last week 2 days ago, after the release. */
    const t = theCron({ release: daysFromNow(-10), grounds: [aGround('b', 5), aGround('a', 3), aGround('far', 30)] });
    await t.cron.warnBeforeTimeRunsOut();
    expect(t.sent).toEqual(['b@lead.test', 'a@lead.test']);
    expect(t.stamped).toEqual(['b', 'a']);
  });

  it('on a database with no release moment yet, writes it now, and so warns nobody already close', async () => {
    const t = theCron({ release: null, grounds: [aGround('a', 3), aGround('late', -2)] });
    await t.cron.warnBeforeTimeRunsOut();
    expect(t.sent).toEqual([]);
    expect(theMomentIn(t.settings.get(RELEASE_MOMENT_KEY))).toEqual(NOW);
  });

  it('sends nothing at all when the release moment cannot be read', async () => {
    const t = theCron({ release: 'unreadable', grounds: [aGround('b', 5)] });
    await t.cron.warnBeforeTimeRunsOut();
    expect(t.sent).toEqual([]);
    expect(t.stamped).toEqual([]);
  });

  it('the first start writes the moment, and a later start leaves it as it was', async () => {
    const t = theCron({ release: null, grounds: [] });
    await t.cron.onApplicationBootstrap();
    const first = theMomentIn(t.settings.get(RELEASE_MOMENT_KEY));
    expect(first).toEqual(NOW);
    jest.setSystemTime(daysFromNow(3));
    await t.cron.onApplicationBootstrap();
    expect(theMomentIn(t.settings.get(RELEASE_MOMENT_KEY))).toEqual(first);
    jest.setSystemTime(NOW);
  });
});

describe('the release moment, on its own', () => {
  it('two starts together write it once: the second reads what the first wrote', async () => {
    const stored: any = { value: { at: '2026-10-01T09:00:00.000Z' } };
    let reads = 0;
    const prisma: any = {
      platformSetting: {
        findUnique: jest.fn(async () => (reads++ === 0 ? null : stored)),
        create: jest.fn(async () => { throw new Error('Unique constraint failed on the fields: (`key`)'); }),
      },
    };
    await expect(theReleaseMoment(prisma, NOW)).resolves.toEqual(new Date('2026-10-01T09:00:00.000Z'));
  });

  it('the last week is counted from the end as it stands now', () => {
    const release = new Date('2026-10-01T00:00:00Z');
    expect(reachedTheWarningPointBefore(new Date('2026-10-07T00:00:00Z'), 7, release)).toBe(true);
    expect(reachedTheWarningPointBefore(new Date('2026-10-08T00:00:00Z'), 7, release)).toBe(true);
    expect(reachedTheWarningPointBefore(new Date('2026-10-08T00:00:01Z'), 7, release)).toBe(false);
  });
});

/*
 * PART B: THE PER-ORGANISATION MODEL CALLS ARE SPREAD OUT. The company picture's nightly look builds
 * one organisation at a time, and waits after each one that made a model call.
 */
describe('the company picture, on the first night', () => {
  it('builds one organisation at a time, never two at once, once across copies', async () => {
    jest.useRealTimers();
    const prisma: any = { subject: { findMany: jest.fn(async () => [{ organizationId: 'o1' }, { organizationId: 'o2' }, { organizationId: 'o3' }]) } };
    const svc = new CompanyPictureService(prisma, {} as any, {} as any);
    let running = 0;
    let most = 0;
    const order: string[] = [];
    (svc as any).rebuild = jest.fn(async (id: string) => {
      running += 1; most = Math.max(most, running); order.push(id);
      await new Promise((r) => setImmediate(r));
      running -= 1;
      return 'unchanged';
    });
    await svc.nightly();
    expect(order).toEqual(['o1', 'o2', 'o3']);
    expect(most).toBe(1);
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] });
    jest.setSystemTime(NOW);
  });

  it('a second copy of the API finds the night already claimed and builds nothing', async () => {
    jest.useRealTimers();
    let claimed: string | null = null;
    const prisma: any = {
      $executeRaw: jest.fn(async (_s: any, _key: string, value: string) => { if (claimed === value) return 0; claimed = value; return 1; }),
      subject: { findMany: jest.fn(async () => [{ organizationId: 'o1' }]) },
    };
    const first = new CompanyPictureService(prisma, {} as any, {} as any);
    const second = new CompanyPictureService(prisma, {} as any, {} as any);
    const built = jest.fn(async () => 'unchanged');
    (first as any).rebuild = built;
    (second as any).rebuild = built;
    await first.nightly();
    await second.nightly();
    expect(built).toHaveBeenCalledTimes(1);
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] });
    jest.setSystemTime(NOW);
  });
});

/* PART C: TWO COPIES OF THE API, ONE WARNING. */
describe('two copies of the API at two o’clock', () => {
  it('send the warning once between them', async () => {
    const a = theCron({ release: daysFromNow(-10), grounds: [aGround('b', 5)] });
    let claimed: string | null = null;
    const $executeRaw = jest.fn(async (_s: any, _key: string, value: string) => { if (claimed === value) return 0; claimed = value; return 1; });
    a.prisma.$executeRaw = $executeRaw;
    const second = new GroundsCron(a.prisma, (a.cron as any).email, (a.cron as any).config, {} as any, {} as any, {} as any, {} as any);
    await Promise.all([a.cron.warnBeforeTimeRunsOut(), second.warnBeforeTimeRunsOut()]);
    expect(a.sent).toEqual(['b@lead.test']);
  });
});
