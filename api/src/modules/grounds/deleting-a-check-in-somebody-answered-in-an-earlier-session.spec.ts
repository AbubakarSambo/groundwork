import { BadRequestException } from '@nestjs/common';
import { GroundsService } from './grounds.service';
import { readPeopleAndSetup, whoElseHasAnswered } from './people-and-setup';
import { aHiddenCheckInIsOnNoList } from '../prisma/a-hidden-check-in-is-on-no-list';

/**
 * BUG N6 (release test, 22 November 2026). Baraka runs "Imani Hassan, first ninety days". Imani answered session 1. It is now
 * session 2, and she has not answered that one yet. People and setup told Baraka "Nobody else has answered yet, so this can still be
 * deleted as a test", offered "Delete this test", and after "Yes, delete it" the check-in stayed in every list.
 *
 * Two causes, proved here against an in-memory database that runs every query through the real rule on the database client
 * (aHiddenCheckInIsOnNoList, registered with $use in prisma.service.ts), the way Prisma would:
 *
 *  1. The page decided "nobody else has answered" from who had answered the clock's current session. The server's delete counts every
 *     session, so it refused, and nothing changed. Now the server serves its own answer (`stillATest`, from whoElseHasAnswered, the
 *     rule the delete itself asks), so the page offers "Delete this test" exactly when the delete works, and otherwise the delete that
 *     takes it off every list and keeps the record.
 *  2. Once taken off the lists, a check-in must be on none of them, including the lists read through the people on it (my check-ins,
 *     Today, reminders, WhatsApp replies), not only lists of grounds.
 */
type Row = Record<string, any>;

function aDatabase() {
  const t: Record<string, Row[]> = {
    Ground: [
      { id: 'g-imani', organizationId: 'o-msingi', initiatorId: 'u-baraka', label: 'Imani Hassan, first ninety days', status: 'ACTIVE', hiddenAt: null },
      { id: 'g-other', organizationId: 'o-msingi', initiatorId: 'u-baraka', label: 'Depot team', status: 'ACTIVE', hiddenAt: null },
    ],
    GroundParticipant: [
      { id: 'p-baraka', groundId: 'g-imani', userId: 'u-baraka', email: 'baraka@msingi.test', nameGiven: null, partyType: 'INITIATOR', user: { firstName: 'Baraka', lastName: 'Otieno' } },
      { id: 'p-imani', groundId: 'g-imani', userId: 'u-imani', email: 'imani@msingi.test', nameGiven: null, partyType: 'PARTICIPANT', user: { firstName: 'Imani', lastName: 'Hassan' } },
      { id: 'p-imani-2', groundId: 'g-other', userId: 'u-imani', email: 'imani@msingi.test', nameGiven: null, partyType: 'PARTICIPANT', user: { firstName: 'Imani', lastName: 'Hassan' } },
    ],
    CheckIn: [
      { id: 'c1', groundId: 'g-imani', participantId: 'p-imani', sessionNumber: 1, status: 'COMPLETED' },
      { id: 'c2', groundId: 'g-imani', participantId: 'p-imani', sessionNumber: 2, status: 'PENDING' },
      { id: 'c3', groundId: 'g-other', participantId: 'p-imani-2', sessionNumber: 1, status: 'PENDING' },
    ],
    User: [
      { id: 'u-baraka', organizationId: 'o-msingi', role: 'LEAD' },
      { id: 'u-imani', organizationId: 'o-msingi', role: 'MEMBER' },
    ],
  };
  const relation: Record<string, Record<string, (r: Row) => Row | undefined>> = {
    CheckIn: { ground: (r) => t.Ground.find((g) => g.id === r.groundId), participant: (r) => t.GroundParticipant.find((p) => p.id === r.participantId) },
    GroundParticipant: { ground: (r) => t.Ground.find((g) => g.id === r.groundId) },
  };
  const matches = (model: string, r: Row, where: any): boolean => {
    if (!where) return true;
    return Object.entries(where).every(([k, v]: [string, any]) => {
      if (k === 'AND') return (v as any[]).every((w) => matches(model, r, w));
      if (k === 'OR') return (v as any[]).some((w) => matches(model, r, w));
      const rel = relation[model]?.[k];
      if (rel) { const other = rel(r); return !!other && matches(k === 'ground' ? 'Ground' : 'GroundParticipant', other, v); }
      if (v === null) return r[k] == null;
      if (v && typeof v === 'object' && !(v instanceof Date)) {
        if ('in' in v) return v.in.includes(r[k]);
        if ('notIn' in v) return !v.notIn.includes(r[k]);
        if ('not' in v) return v.not === null ? r[k] != null : r[k] !== v.not;
        return true;
      }
      return r[k] === v;
    });
  };
  const whole = (model: string, r: Row) => (model === 'Ground'
    ? { ...r, participants: t.GroundParticipant.filter((p) => p.groundId === r.id), checkIns: t.CheckIn.filter((c) => c.groundId === r.id), initiator: { firstName: 'Baraka', lastName: 'Otieno' }, organization: { name: 'Msingi', timeZone: 'Africa/Nairobi' } }
    : r);
  const seen: string[] = [];
  const delegate = (model: string) => {
    const impl: Record<string, (a: any) => any> = {
      findMany: (a) => t[model].filter((r) => matches(model, r, a?.where)).map((r) => whole(model, r)),
      findFirst: (a) => { const r = t[model].find((x) => matches(model, x, a?.where)); return r ? whole(model, r) : null; },
      findUnique: (a) => impl.findFirst(a),
      count: (a) => t[model].filter((r) => matches(model, r, a?.where)).length,
      update: (a) => { const r = t[model].find((x) => matches(model, x, a.where))!; Object.assign(r, a.data); return r; },
      delete: (a) => { const r = t[model].find((x) => matches(model, x, a.where))!; t[model] = t[model].filter((x) => x !== r); return r; },
    };
    /* Every query goes through the rule on the database client first, as $use runs it in prisma.service.ts. */
    return new Proxy({}, {
      get: (_o, action: string) => async (args: any) => {
        seen.push(`${model}.${action}`);
        const p = aHiddenCheckInIsOnNoList({ model, action, args });
        return impl[action](p.args);
      },
    });
  };
  const prisma: any = { ground: delegate('Ground'), groundParticipant: delegate('GroundParticipant'), checkIn: delegate('CheckIn'), user: delegate('User') };
  return { prisma, t, seen };
}

const service = (prisma: any) => new GroundsService(prisma, {} as any, {} as any, { emit: jest.fn() } as any, {} as any, {} as any, {} as any);

describe('bug N6: whether a check-in is still a test is one answer, counted over every session', () => {
  it('Imani answered session 1 and not session 2, so she has answered', () => {
    const { t } = aDatabase();
    expect(whoElseHasAnswered(t.GroundParticipant.filter((p) => p.groundId === 'g-imani') as any[], t.CheckIn as any[], 'u-baraka')).toEqual(['p-imani']);
  });

  it('the lead\'s own sessions and a decline do not count', () => {
    const people = [{ id: 'p-lead', userId: 'u-lead' }, { id: 'p-a', userId: 'u-a' }];
    expect(whoElseHasAnswered(people, [{ participantId: 'p-lead', status: 'COMPLETED' }, { participantId: 'p-a', status: 'DECLINED' }], 'u-lead')).toEqual([]);
  });

  it('People and setup serves Baraka "not a test any more", the same answer the delete gives', async () => {
    const { prisma } = aDatabase();
    const served: any = await readPeopleAndSetup(prisma, { groundId: 'g-imani', organizationId: 'o-msingi', userId: 'u-baraka' }, new Date('2026-11-22T09:00:00Z'));
    expect(served.view).toBe('lead');
    expect(served.stillATest).toBe(false);
  });

  it('"Delete this test" on a check-in Imani answered refuses, names her, and deletes nothing', async () => {
    const { prisma, t } = aDatabase();
    const tried = service(prisma).deleteWhileItIsStillATest('g-imani', 'u-baraka');
    await expect(tried).rejects.toBeInstanceOf(BadRequestException);
    await expect(service(prisma).deleteWhileItIsStillATest('g-imani', 'u-baraka')).rejects.toThrow(
      'Imani Hassan has already answered here, so this is not a test any more, and deleting it would destroy what they wrote with no way to get it back. Close the check-in instead, and everybody keeps their record.',
    );
    expect(t.Ground.map((g) => g.id)).toContain('g-imani');
    expect(t.CheckIn.filter((c) => c.groundId === 'g-imani')).toHaveLength(2);
  });

  it('before anybody else answers, People and setup says it is still a test and the delete removes it', async () => {
    const { prisma, t } = aDatabase();
    t.CheckIn = t.CheckIn.filter((c) => c.status !== 'COMPLETED');
    const served: any = await readPeopleAndSetup(prisma, { groundId: 'g-imani', organizationId: 'o-msingi', userId: 'u-baraka' }, new Date('2026-11-22T09:00:00Z'));
    expect(served.stillATest).toBe(true);
    await expect(service(prisma).deleteWhileItIsStillATest('g-imani', 'u-baraka')).resolves.toEqual({ deleted: true, label: 'Imani Hassan, first ninety days' });
    expect(t.Ground.map((g) => g.id)).toEqual(['g-other']);
  });
});

describe('bug N6: a check-in taken off every list is on none of them, and its record still reads whole', () => {
  it('after Baraka deletes it, no list of check-ins, sessions or people across check-ins has it', async () => {
    const { prisma, t } = aDatabase();
    await expect(service(prisma).takeOffEveryList('g-imani', 'u-baraka')).resolves.toEqual({ groundId: 'g-imani', hidden: true });
    expect(t.Ground.find((g) => g.id === 'g-imani')!.hiddenAt).toBeInstanceOf(Date);

    /* The check-in list, the Desk and Today read grounds by organisation, or by ids. */
    expect((await prisma.ground.findMany({ where: { organizationId: 'o-msingi' } })).map((g: Row) => g.id)).toEqual(['g-other']);
    expect((await prisma.ground.findMany({ where: { id: { in: ['g-imani', 'g-other'] } } })).map((g: Row) => g.id)).toEqual(['g-other']);
    expect(await prisma.ground.count({ where: { initiatorId: 'u-baraka' } })).toBe(1);
    expect((await prisma.ground.findFirst({ where: { initiatorId: 'u-baraka', status: 'ACTIVE' } }))?.id).toBe('g-other');
    /* Imani's own lists read through the people and sessions she is on. */
    expect((await prisma.groundParticipant.findMany({ where: { userId: 'u-imani' } })).map((p: Row) => p.groundId)).toEqual(['g-other']);
    expect((await prisma.checkIn.findMany({ where: { participant: { userId: 'u-imani' } } })).map((c: Row) => c.groundId)).toEqual(['g-other']);
    expect((await prisma.checkIn.findFirst({ where: { status: 'PENDING', participant: { userId: 'u-imani' } } }))?.groundId).toBe('g-other');
    expect(await prisma.checkIn.count({ where: { status: 'COMPLETED' } })).toBe(0);
  });

  it('nothing is deleted: opening it by its id, and reading inside it, still read the whole record', async () => {
    const { prisma, t } = aDatabase();
    await service(prisma).takeOffEveryList('g-imani', 'u-baraka');
    expect(t.Ground.map((g) => g.id)).toEqual(['g-imani', 'g-other']);
    expect((await prisma.ground.findUnique({ where: { id: 'g-imani' } }))?.label).toBe('Imani Hassan, first ninety days');
    expect((await prisma.ground.findFirst({ where: { id: 'g-imani' } }))?.id).toBe('g-imani');
    expect(await prisma.checkIn.findMany({ where: { groundId: 'g-imani' } })).toHaveLength(2);
    expect(await prisma.checkIn.findMany({ where: { participantId: 'p-imani' } })).toHaveLength(2);
    expect(await prisma.groundParticipant.findMany({ where: { groundId: 'g-imani' } })).toHaveLength(2);
    const served: any = await readPeopleAndSetup(prisma, { groundId: 'g-imani', organizationId: 'o-msingi', userId: 'u-baraka' }, new Date('2026-11-22T09:00:00Z'));
    expect(served.stillATest).toBe(false);
  });

  it('a member who does not run it cannot take it off the lists', async () => {
    const { prisma, t } = aDatabase();
    await expect(service(prisma).takeOffEveryList('g-imani', 'u-imani')).rejects.toThrow('Only the person running this check-in, or an admin here, can delete it, so ask one of them.');
    expect(t.Ground.find((g) => g.id === 'g-imani')!.hiddenAt).toBeNull();
  });
});
