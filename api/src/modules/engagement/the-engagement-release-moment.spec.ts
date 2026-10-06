import { theEngagementMoment, ENGAGEMENT_MOMENT_KEY } from './the-engagement-release-moment';
import { sendTheTestCheckInMessages } from './a-test-check-in-moves-on';
import { RELEASE_MOMENT_KEY } from '../grounds/the-release-moment';

/**
 * THE ENGAGEMENT MESSAGES HAVE A MOMENT OF THEIR OWN (decision 109, review).
 *
 * An earlier build already wrote `release.time_running_out_warnings_from`. If the engagement messages read that row, their "only after the release" would
 * be a date before this code existed, and an existing client's check-in made after it would be written to by surprise.
 */
const OLD = new Date('2026-09-01T00:00:00Z');
const NOW = new Date('2026-10-20T09:00:00Z');

function store(rows: Record<string, any> = {}, unreadable = false) {
  return {
    rows,
    platformSetting: {
      findUnique: jest.fn(async ({ where }: any) => { if (unreadable) throw new Error('down'); return rows[where.key] ? { value: rows[where.key] } : null; }),
      create: jest.fn(async ({ data }: any) => { if (unreadable) throw new Error('down'); rows[data.key] = data.value; return data; }),
    },
  };
}

describe('the moment', () => {
  it('is its own row, written once by this code, and not the older one', async () => {
    const s = store({ [RELEASE_MOMENT_KEY]: { at: OLD.toISOString() } });
    expect(await theEngagementMoment(s, NOW)).toEqual(NOW);
    expect(s.rows[ENGAGEMENT_MOMENT_KEY]).toEqual({ at: NOW.toISOString() });
    expect(s.rows[RELEASE_MOMENT_KEY]).toEqual({ at: OLD.toISOString() });
    expect(await theEngagementMoment(s, new Date('2026-12-01T00:00:00Z'))).toEqual(NOW);
  });
  it('unreadable means nothing is sent, never a guess', async () => {
    const s = store({}, true);
    await expect(theEngagementMoment(s, NOW)).rejects.toThrow();
    const prisma: any = { ...s, ground: { findMany: jest.fn() } };
    expect(await sendTheTestCheckInMessages({ prisma, email: { sendTestCheckInMovesOn: jest.fn() }, frontendUrl: '' }, NOW)).toEqual({ tried: 0 });
    expect(prisma.ground.findMany).not.toHaveBeenCalled();
  });
  it('a check-in made after the older moment and before this code is not written about', async () => {
    const s = store({ [RELEASE_MOMENT_KEY]: { at: OLD.toISOString() }, [ENGAGEMENT_MOMENT_KEY]: { at: NOW.toISOString() } });
    const find = jest.fn(async () => []);
    await sendTheTestCheckInMessages({ prisma: { ...s, ground: { findMany: find } } as any, email: { sendTestCheckInMovesOn: jest.fn() }, frontendUrl: '' }, new Date(NOW.getTime() + 10 * 86_400_000));
    expect((find.mock.calls[0] as any)[0].where.createdAt.gte).toEqual(NOW);
  });
});
