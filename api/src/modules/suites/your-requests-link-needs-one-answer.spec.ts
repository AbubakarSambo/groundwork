import { SuitesService } from './suites.service';
import { SuitesController } from './suites.controller';

/**
 * S2 (nothing-removed audit): TODAY'S LINK TO YOUR OWN REQUESTS NEEDS ONE ANSWER, NOT THREE THAT CAN HIDE EACH OTHER.
 *
 * The screens asked /suites/leave/mine, /suites/spend/mine and /suites/time/mine, and one 404 (a suite off) switched the link
 * off for all three. GET /suites/mine says which are on for the person asking, in one call, and a suite that is off is a
 * false, never an error. Read here as each person is served it.
 */
const ORG = 'org-baridi';
const roles: Record<string, string> = { 'u-grace': 'ADMIN', 'u-wairimu': 'LEAD', 'u-miriam': 'MEMBER', 'u-tomas': 'GUEST' };

function world(on: string[]) {
  const prisma: any = {
    organizationMembership: {
      findUnique: jest.fn(async ({ where }: any) => {
        const { userId, organizationId } = where.userId_organizationId;
        return organizationId === ORG && roles[userId] ? { role: roles[userId] } : null;
      }),
    },
    organizationSuite: {
      findMany: jest.fn(async ({ where }: any) => (where.organizationId === ORG ? on.map((suite) => ({ suite, isOn: true, answers: { secret: 'never served' } })) : [])),
    },
  };
  const svc = new SuitesService(prisma);
  return { svc, as: (userId: string, organizationId = ORG) => ({ userId, organizationId }) };
}

describe('one call says which request suites are on', () => {
  it('leave on and spending off: Miriam is told leave is on, spending and hours are off, and there is a link to show', async () => {
    const w = world(['leave']);
    const got = await w.svc.forYourRequests(w.as('u-miriam'));
    expect(got).toMatchObject({ leave: true, spend: false, time: false, any: true });
    expect(got.says).toBe('These are the requests you can make in your organisation.');
  });

  it('only hours on: still a link', async () => {
    const w = world(['time']);
    expect(await w.svc.forYourRequests(w.as('u-miriam'))).toMatchObject({ leave: false, spend: false, time: true, any: true });
  });

  it('none on: no link, and a sentence that says what to do', async () => {
    const w = world([]);
    const got = await w.svc.forYourRequests(w.as('u-miriam'));
    expect(got).toMatchObject({ leave: false, spend: false, time: false, any: false });
    expect(got.says).toBe('No requests for leave, spending or hours are switched on in your organisation yet. An admin switches them on under Suites.');
  });

  it('is the same for a lead and an admin as for a member', async () => {
    const w = world(['spend', 'leave']);
    for (const u of ['u-wairimu', 'u-grace', 'u-miriam']) {
      expect(await w.svc.forYourRequests(w.as(u))).toMatchObject({ leave: true, spend: true, time: false, any: true });
    }
  });

  it('a guest, and somebody from another organisation, are answered with nothing on, not refused', async () => {
    const w = world(['leave', 'spend', 'time']);
    expect(await w.svc.forYourRequests(w.as('u-tomas'))).toMatchObject({ leave: false, spend: false, time: false, any: false });
    expect(await w.svc.forYourRequests(w.as('u-miriam', 'org-other'))).toMatchObject({ any: false });
  });

  it('serves yes and no and one sentence, and nothing of the suites\' answers or of anybody else', async () => {
    const w = world(['leave', 'spend']);
    const read = JSON.stringify(await w.svc.forYourRequests(w.as('u-miriam')));
    expect(read).not.toMatch(/secret|never served|u-|org-/);
    expect(Object.keys(JSON.parse(read)).sort()).toEqual(['any', 'leave', 'says', 'spend', 'time']);
  });
});

describe('the route exists, is read by anybody signed in, and is not taken by a longer route', () => {
  it('GET suites/mine reaches forYourRequests', async () => {
    const calls: any[] = [];
    const c = new (SuitesController as any)({ forYourRequests: async (r: any) => { calls.push(r); return { any: true }; } });
    await c.whichAreOnForYou({ id: 'u-miriam', organizationId: ORG } as any);
    expect(calls).toEqual([{ userId: 'u-miriam', organizationId: ORG }]);
    expect(Reflect.getMetadata('path', SuitesController.prototype.whichAreOnForYou)).toBe('mine');
    expect(Reflect.getMetadata('roles', SuitesController.prototype.whichAreOnForYou)).toBeUndefined();
  });
});
