import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { LeavingBoardService, LEAVING_REFUSED } from './the-leaving-board.service';

/**
 * WHEN SOMEONE LEAVES, AS EACH PERSON IS SERVED IT (E5, U.17).
 *
 * Baridi Appliances, 27 September 2026. Tom leaves on 9 October; Wairimu is his manager. The admin
 * named Grace for removing access and for final pay, and Kamau looks after equipment. Samuel left on
 * 15 September through the developer API, and Aisha took over his role, so the product already has a
 * handover brief for her, which holds something Samuel said and must never be read or served here.
 * The engine has written two signs of strain: one for Operations as a team, one naming a person.
 *
 * The rules under test, each read from what the server actually hands each reader:
 *   - nobody reads anything while the suite is off;
 *   - only an admin reads or changes the board; a lead, the person leaving, a colleague and a guest
 *     are refused, and nothing changes;
 *   - each step gets the owner the organisation named, and is done or not, with undo;
 *   - the product's handover is linked only by who took over and when, never by what is in it;
 *   - a sign of strain is served for a team, never one that names a person;
 *   - no labels on people, and nothing on this board reaches a check-in or its report.
 */

const ORG = 'org-baridi';
const TODAY = new Date('2026-09-27T09:00:00Z');
const roles: Record<string, string> = {
  'u-grace': 'ADMIN', 'u-wairimu': 'LEAD', 'u-tom': 'MEMBER', 'u-miriam': 'MEMBER', 'u-kamau': 'MEMBER', 'u-aisha': 'MEMBER', 'u-tomas': 'GUEST',
};
const users: Record<string, [string, string]> = {
  'u-grace': ['Grace', 'Achieng'], 'u-wairimu': ['Wairimu', 'Kamau'], 'u-tom': ['Tom', 'Odhiambo'], 'u-miriam': ['Miriam', 'Wanjiku'],
  'u-kamau': ['Kamau', 'Njenga'], 'u-aisha': ['Aisha', 'Otieno'], 'u-tomas': ['Tomas', 'Guest'],
};
const person = (u: string | null, ext: string, name: string, manager: string | null = null) => {
  const [givenName, familyName] = name.split(' ');
  return { externalId: ext, linkedUserId: u, displayName: name, givenName, familyName, managerExternalId: manager };
};
const directory = [
  person('u-grace', 'p-grace', 'Grace Achieng'), person('u-wairimu', 'p-wairimu', 'Wairimu Kamau'),
  person('u-tom', 'p-tom', 'Tom Odhiambo', 'p-wairimu'), person('u-miriam', 'p-miriam', 'Miriam Wanjiku', 'p-wairimu'),
  person('u-kamau', 'p-kamau', 'Kamau Njenga'), person('u-aisha', 'p-aisha', 'Aisha Otieno', 'p-wairimu'),
  person(null, 'p-samuel', 'Samuel Njoroge', 'p-wairimu'),
];
const d = (s: string) => new Date(`${s}T00:00:00.000Z`);

function setup(opts: { on?: boolean } = {}) {
  const lists: any[] = [];
  let n = 0;
  const briefRead = { count: 0 };
  const assignments = [
    { id: 'a-samuel', organizationId: ORG, personExternalId: 'p-samuel', predecessorAssignmentId: null, handoverReadyAt: null },
    {
      id: 'a-aisha', organizationId: ORG, personExternalId: 'p-aisha', predecessorAssignmentId: 'a-samuel', handoverReadyAt: d('2026-09-15'),
      get handoverBrief() { briefRead.count++; return { said: 'Samuel said the Westgate owner is difficult.' }; },
    },
  ];
  const prisma: any = {
    organizationSuite: { findUnique: jest.fn(async ({ where }: any) => {
      const { organizationId, suite } = where.organizationId_suite;
      if (organizationId !== ORG) return null;
      if (suite === 'leaving') return { isOn: opts.on ?? true, answers: { access: 'u-grace', pay: 'u-grace' } };
      if (suite === 'equipment') return { isOn: false, answers: { keeper: 'u-kamau' } };
      return null;
    }) },
    organizationMembership: {
      findUnique: jest.fn(async ({ where }: any) => {
        const { userId, organizationId } = where.userId_organizationId;
        return organizationId === ORG && roles[userId] ? { role: roles[userId] } : null;
      }),
      findMany: jest.fn(async () => Object.keys(roles).filter((u) => roles[u] !== 'GUEST').map((u) => ({ userId: u, user: { firstName: users[u][0], lastName: users[u][1] } }))),
    },
    person: { findMany: jest.fn(async () => directory) },
    leavingChecklist: {
      findMany: jest.fn(async () => lists),
      findUnique: jest.fn(async ({ where }: any) => (where.id
        ? lists.find((l) => l.id === where.id)
        : lists.find((l) => l.personExternalId === where.organizationId_personExternalId_lastDay.personExternalId
            && l.lastDay.getTime() === where.organizationId_personExternalId_lastDay.lastDay.getTime())) ?? null),
      create: jest.fn(async ({ data }: any) => {
        const l = { id: `l-${++n}`, organizationId: data.organizationId, personExternalId: data.personExternalId, lastDay: data.lastDay, steps: data.steps.create.map((s: any) => ({ ...s, doneAt: null, doneById: null })) };
        lists.push(l);
        return l;
      }),
    },
    leavingStep: { upsert: jest.fn(async ({ where, create, update }: any) => {
      const l = lists.find((x) => x.id === where.checklistId_step.checklistId);
      const s = l.steps.find((x: any) => x.step === where.checklistId_step.step);
      if (s) Object.assign(s, update); else l.steps.push(create);
    }) },
    departureRecord: { findMany: jest.fn(async () => [{ personExternalId: 'p-samuel', departedAt: d('2026-09-15') }]) },
    roleAssignment: {
      findMany: jest.fn(async ({ where }: any) => assignments.filter((a) => a.personExternalId === where.personExternalId).map((a) => ({ id: a.id }))),
      findFirst: jest.fn(async ({ where }: any) => {
        const a = assignments.find((x) => where.predecessorAssignmentId.in.includes(x.predecessorAssignmentId) && x.handoverReadyAt);
        return a ? { personExternalId: a.personExternalId, handoverReadyAt: a.handoverReadyAt } : null;
      }),
    },
    teamStrainSign: { findMany: jest.fn(async () => [
      { team: 'Operations', says: 'For 3 check-ins in a row, two people in Operations said their workload is too high.' },
      { team: 'Sales', says: 'Miriam Wanjiku said her workload is too high.' },
    ]) },
  };
  const svc = new LeavingBoardService(prisma);
  const as = (userId: string) => ({ userId, organizationId: ORG });
  return { svc, as, lists, briefRead };
}

const LABELS = /\b(PIP|exit|at[- ]risk|low[- ]performer|flight risk|resigned|fired|score|rating)\b/i;

describe('while the suite is off', () => {
  it('nobody reads or changes anything', async () => {
    const { svc, as } = setup({ on: false });
    await expect(svc.board(as('u-grace'), TODAY)).rejects.toThrow(new NotFoundException(LEAVING_REFUSED.notOn));
    await expect(svc.start(as('u-grace'), { personId: 'p-tom', lastDay: '2026-10-09' })).rejects.toThrow(NotFoundException);
  });
});

describe('only an admin', () => {
  for (const [who, userId] of [['Wairimu, a lead and Tom’s manager', 'u-wairimu'], ['Tom, who is leaving', 'u-tom'], ['Miriam, a colleague', 'u-miriam'], ['a guest', 'u-tomas'], ['somebody outside', 'u-nobody']]) {
    it(`${who} is refused the board and every change, and nothing changes`, async () => {
      const { svc, as, lists } = setup();
      await expect(svc.board(as(userId), TODAY)).rejects.toThrow(new ForbiddenException(LEAVING_REFUSED.onlyAnAdmin));
      /* Reading and changing are told apart (request 181 item 5). */
      await expect(svc.start(as(userId), { personId: 'p-tom', lastDay: '2026-10-09' })).rejects.toThrow(new ForbiddenException('Only an admin can change this list.'));
      expect(lists).toHaveLength(0);
    });
  }
});

describe('Grace, an admin', () => {
  it('starts Tom’s list, and each step gets the owner the organisation named', async () => {
    const { svc, as } = setup();
    const b = await svc.start(as('u-grace'), { personId: 'p-tom', lastDay: '2026-10-09' }, TODAY);
    expect(b.lists).toHaveLength(1);
    expect(b.lists[0]).toMatchObject({ name: 'Tom Odhiambo', firstName: 'Tom', lastDay: '2026-10-09', done: 0, of: 4, handover: null });
    expect(b.lists[0].steps).toEqual([
      { step: 'handover', ownerId: 'u-wairimu', ownerName: 'Wairimu Kamau', done: false },
      { step: 'equipment', ownerId: 'u-kamau', ownerName: 'Kamau Njenga', done: false },
      { step: 'access', ownerId: 'u-grace', ownerName: 'Grace Achieng', done: false },
      { step: 'pay', ownerId: 'u-grace', ownerName: 'Grace Achieng', done: false },
    ]);
    await expect(svc.start(as('u-grace'), { personId: 'p-tom', lastDay: '2026-10-09' }, TODAY)).rejects.toThrow(new BadRequestException(LEAVING_REFUSED.alreadyStarted));
  });

  it('marks a step done and undoes it, and changes its owner, but never to the person leaving or a guest', async () => {
    const { svc, as } = setup();
    const { lists: [l] } = await svc.start(as('u-grace'), { personId: 'p-tom', lastDay: '2026-10-09' }, TODAY);
    let b = await svc.step(as('u-grace'), l.id, 'equipment', { done: true }, TODAY);
    expect(b.lists[0]).toMatchObject({ done: 1 });
    b = await svc.step(as('u-grace'), l.id, 'equipment', { done: false }, TODAY);
    expect(b.lists[0].done).toBe(0);
    b = await svc.step(as('u-grace'), l.id, 'handover', { ownerUserId: 'u-miriam' }, TODAY);
    expect(b.lists[0].steps[0]).toMatchObject({ ownerName: 'Miriam Wanjiku' });
    await expect(svc.step(as('u-grace'), l.id, 'handover', { ownerUserId: 'u-tom' }, TODAY)).rejects.toThrow(new BadRequestException(LEAVING_REFUSED.badOwner));
    await expect(svc.step(as('u-grace'), l.id, 'handover', { ownerUserId: 'u-tomas' }, TODAY)).rejects.toThrow(BadRequestException);
    await expect(svc.step(as('u-grace'), l.id, 'party', { done: true }, TODAY)).rejects.toThrow(new BadRequestException(LEAVING_REFUSED.noSuchStep));
    await expect(svc.step(as('u-wairimu'), l.id, 'pay', { done: true }, TODAY)).rejects.toThrow(ForbiddenException);
  });

  it('is offered a list for Samuel, who already left, and his list says who took over and when, and nothing of what was handed over', async () => {
    const { svc, as, briefRead } = setup();
    const before = await svc.board(as('u-grace'), TODAY);
    expect(before.departures).toEqual([{ personId: 'p-samuel', name: 'Samuel Njoroge', departedOn: '2026-09-15' }]);
    const b = await svc.start(as('u-grace'), { personId: 'p-samuel', lastDay: '2026-09-15' }, TODAY);
    const samuel = b.lists.find((l) => l.name === 'Samuel Njoroge')!;
    expect(samuel.handover).toEqual({ to: 'Aisha Otieno', on: '2026-09-15' });
    expect(b.departures).toEqual([]);
    expect(JSON.stringify(b)).not.toMatch(/Westgate|difficult/i);
    expect(briefRead.count).toBe(0);
  });

  it('reads a sign of strain for a team, and never one that names a person', async () => {
    const { svc, as } = setup();
    expect((await svc.board(as('u-grace'), TODAY)).strain).toEqual([
      { team: 'Operations', says: 'For 3 check-ins in a row, two people in Operations said their workload is too high.' },
    ]);
  });

  it('refuses somebody not in the directory, and a day that is not a day', async () => {
    const { svc, as } = setup();
    await expect(svc.start(as('u-grace'), { personId: 'p-nobody', lastDay: '2026-10-09' })).rejects.toThrow(new BadRequestException(LEAVING_REFUSED.noSuchPerson));
    await expect(svc.start(as('u-grace'), { personId: 'p-tom', lastDay: 'soon' })).rejects.toThrow(new BadRequestException(LEAVING_REFUSED.badDay));
  });
});

describe('what the board never holds', () => {
  it('no label on anybody, and no email address', async () => {
    const { svc, as } = setup();
    const b = await svc.start(as('u-grace'), { personId: 'p-tom', lastDay: '2026-10-09' }, TODAY);
    expect(JSON.stringify(b)).not.toMatch(LABELS);
    expect(JSON.stringify(b)).not.toMatch(/@/);
  });

  it('nothing outside the suites reads a leaving list or a sign of strain, so none reaches a check-in or report', () => {
    const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    const root = join(__dirname, '..');
    const faults: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const p = join(dir, name);
        if (statSync(p).isDirectory()) { if (name !== 'suites') walk(p); }
        else if (/\.ts$/.test(name) && !/\.spec\.ts$/.test(name) && /\b(leavingChecklist|leavingStep)\b/.test(strip(readFileSync(p, 'utf8')))) faults.push(p);
      }
    };
    walk(root);
    expect(faults).toEqual([]);
    const own = strip(readFileSync(join(__dirname, 'the-leaving-board.service.ts'), 'utf8'));
    expect(own).toMatch(/\bleavingChecklist\b/);
    /* And the board never reads the handover brief, so what anybody said cannot travel through it. */
    expect(own).not.toMatch(/handoverBrief/);
  });
});
