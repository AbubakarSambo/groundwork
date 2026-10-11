import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { LeaveBoardService, LEAVE_REFUSED, workingDays } from './the-leave-board.service';

/**
 * THE LEAVE BOARD, AS EACH PERSON IS SERVED IT (E2, U.17).
 *
 * Baridi Appliances, on Monday 28 September 2026. Each person has 21 days a year, and "Their manager"
 * approves. Grace is an admin. Wairimu leads Sales and manages Aisha, Samuel and Brian. Kamau leads
 * Operations. Miriam is in Sales too, with no request. Tomas is a guest.
 *   - Aisha asks for Thursday 1 and Friday 2 October, with Miriam standing in. Nobody else in Sales is
 *     off then. She already took 5 days in March.
 *   - Samuel asks for Monday 5 October. Brian, in Sales, is off that day (approved).
 *   - Otieno, in Operations, asks for Tuesday 6 October.
 *   - Kamau himself is off on Thursday 8 and Friday 9 October (approved).
 *
 * The rules under test, each read from what the server actually hands each reader:
 *   - nobody reads anything while the leave suite is off;
 *   - an admin reads every request and everybody off; a lead only their own team's, with only what is
 *     needed to decide: the days left and who else in the team is off those days;
 *   - the manager decides when "Their manager" approves; an admin only where there is no such manager;
 *     nobody decides their own; a decision is kept with who made it and when;
 *   - each person reads only their own requests and days left; a colleague reads nobody else's; a
 *     guest reads nothing;
 *   - nothing about leave reaches a check-in or its report, and no reason is kept at all.
 */

const ORG = 'org-baridi';
const TODAY = new Date('2026-09-28T09:00:00Z');
const roles: Record<string, string> = {
  'u-grace': 'ADMIN', 'u-omar': 'ADMIN', 'u-wairimu': 'LEAD', 'u-kamau': 'LEAD',
  'u-aisha': 'MEMBER', 'u-samuel': 'MEMBER', 'u-brian': 'MEMBER', 'u-miriam': 'MEMBER', 'u-otieno': 'MEMBER', 'u-tomas': 'GUEST', 'u-lone': 'MEMBER',
};
const first: Record<string, [string, string]> = {
  'u-grace': ['Grace', 'Achieng'], 'u-omar': ['Omar', 'Hassan'], 'u-wairimu': ['Wairimu', 'Kamau'], 'u-kamau': ['Kamau', 'Njenga'],
  'u-aisha': ['Aisha', 'Otieno'], 'u-samuel': ['Samuel', 'Njoroge'], 'u-brian': ['Brian', 'Mwangi'], 'u-miriam': ['Miriam', 'Wanjiku'],
  'u-otieno': ['Otieno', 'Ouma'], 'u-tomas': ['Tomas', 'Guest'], 'u-lone': ['Lola', 'Nyambura'],
};
const person = (u: string, department: string | null, manager: string | null) =>
  ({ linkedUserId: u, externalId: `p-${u.slice(2)}`, department, managerExternalId: manager, active: true });
const directory = [
  person('u-grace', 'Finance', null),
  person('u-wairimu', 'Sales', null),
  person('u-kamau', 'Operations', null),
  person('u-aisha', 'Sales', 'p-wairimu'),
  person('u-samuel', 'Sales', 'p-wairimu'),
  person('u-brian', 'Sales', 'p-wairimu'),
  person('u-miriam', 'Sales', 'p-wairimu'),
  person('u-otieno', 'Operations', null),
  /* In the directory with no department: nobody's teammate. */
  person('u-lone', null, null),
];
const d = (s: string) => new Date(`${s}T00:00:00.000Z`);
const request = (id: string, userId: string, from: string, to: string, status: string, standInUserId: string | null = null) =>
  ({ id, organizationId: ORG, userId, startsOn: d(from), endsOn: d(to), kind: 'annual', standInUserId, status, decidedById: null, decidedAt: null });

function setup(opts: { on?: boolean; approver?: string } = {}) {
  const rows: any[] = [
    request('r-aisha', 'u-aisha', '2026-10-01', '2026-10-02', 'waiting', 'u-miriam'),
    request('r-aisha-march', 'u-aisha', '2026-03-02', '2026-03-06', 'approved'),
    request('r-samuel', 'u-samuel', '2026-10-05', '2026-10-05', 'waiting'),
    request('r-brian', 'u-brian', '2026-10-05', '2026-10-05', 'approved'),
    request('r-otieno', 'u-otieno', '2026-10-06', '2026-10-06', 'waiting'),
    request('r-kamau', 'u-kamau', '2026-10-08', '2026-10-09', 'approved'),
    request('r-miriam-old', 'u-miriam', '2026-02-02', '2026-02-02', 'declined'),
  ];
  let n = 0;
  const prisma: any = {
    organizationSuite: { findUnique: jest.fn(async ({ where }: any) =>
      where.organizationId_suite.organizationId === ORG && where.organizationId_suite.suite === 'leave'
        ? { isOn: opts.on ?? true, answers: { days: 21, approver: opts.approver ?? 'Their manager' } } : null) },
    organizationMembership: { findUnique: jest.fn(async ({ where }: any) => {
      const { userId, organizationId } = where.userId_organizationId;
      return organizationId === ORG && roles[userId] ? { role: roles[userId] } : null;
    }) },
    person: {
      findFirst: jest.fn(async ({ where }: any) => directory.find((p) =>
        (where.linkedUserId ? p.linkedUserId === where.linkedUserId : true) && (where.externalId ? p.externalId === where.externalId : true)) ?? null),
      findMany: jest.fn(async ({ where }: any) => directory.filter((p) => where.linkedUserId.in.includes(p.linkedUserId))),
    },
    user: { findMany: jest.fn(async ({ where }: any) => where.id.in.filter((id: string) => first[id]).map((id: string) => ({ id, firstName: first[id][0], lastName: first[id][1] }))) },
    leaveRequest: {
      findMany: jest.fn(async ({ where, orderBy }: any) => rows.filter((r) => r.organizationId === where.organizationId
        && (!where.userId || r.userId === where.userId) && (!where.status || where.status.in.includes(r.status)))
        .sort((a, b) => (orderBy?.startsOn === 'desc' ? b.startsOn - a.startsOn : a.startsOn - b.startsOn))),
      findUnique: jest.fn(async ({ where }: any) => rows.find((r) => r.id === where.id) ?? null),
      update: jest.fn(async ({ where, data }: any) => Object.assign(rows.find((r) => r.id === where.id), data)),
      create: jest.fn(async ({ data }: any) => { const r = { id: `r-new-${++n}`, status: 'waiting', kind: 'annual', ...data }; rows.push(r); return { id: r.id }; }),
    },
  };
  const svc = new LeaveBoardService(prisma);
  const as = (userId: string) => ({ userId, organizationId: ORG });
  return { svc, as, rows };
}

describe('while the leave suite is off', () => {
  it('nobody reads the board or their own leave, and nothing can be decided', async () => {
    const { svc, as } = setup({ on: false });
    await expect(svc.board(as('u-grace'), TODAY)).rejects.toThrow(new NotFoundException(LEAVE_REFUSED.notOn));
    await expect(svc.mine(as('u-aisha'), TODAY)).rejects.toThrow(NotFoundException);
    await expect(svc.decide(as('u-wairimu'), 'r-aisha', 'approved')).rejects.toThrow(NotFoundException);
  });
});

describe('Grace, an admin, reads the whole board', () => {
  it('every request waiting, with days left and who else in the team is off those days', async () => {
    const { svc, as } = setup();
    const { waiting } = await svc.board(as('u-grace'), TODAY);
    expect(waiting.map((w) => w.name)).toEqual(['Aisha Otieno', 'Samuel Njoroge', 'Otieno Ouma']);
    expect(waiting[0]).toEqual({
      id: 'r-aisha', name: 'Aisha Otieno', startsOn: '2026-10-01', endsOn: '2026-10-02', days: 2, daysLeft: 16,
      team: 'Sales', alsoOff: [], clash: null /* Added by item 5 of the suites at scale: nobody is off, so nothing to say. */, standIn: 'Miriam Wanjiku', mayDecide: false,
      /* Where it is, in a full sentence (decision 85, build step 4): one step, waiting for her manager. */
      where: 'It is waiting for Wairimu.',
      /* The manager's view in full sentences (decision 85, build step 7). */
      owns: ['Groundwork found nothing Aisha owns that is due on those days.'],
      questions: [],
      /* No kinds of leave and no rules set (build step 8): none said. */
      leaveKind: null,
      rules: [],
      said: [
        'Aisha asked for leave from Thursday 1 October to Friday 2 October, which is 2 working days.',
        'Aisha has 16 days left.',
        'Nobody else in Sales is off those days.',
        'Miriam Wanjiku will stand in for Aisha.',
        'Groundwork found nothing Aisha owns that is due on those days.',
      ],
    });
    expect(waiting[1]).toMatchObject({ name: 'Samuel Njoroge', daysLeft: 21, team: 'Sales', alsoOff: ['Brian'] });
  });

  it('decides only where there is no manager who can: Otieno’s, not Aisha’s', async () => {
    const { svc, as } = setup();
    const { waiting } = await svc.board(as('u-grace'), TODAY);
    expect(waiting.map((w) => [w.name, w.mayDecide])).toEqual([['Aisha Otieno', false], ['Samuel Njoroge', false], ['Otieno Ouma', true]]);
    await expect(svc.decide(as('u-grace'), 'r-aisha', 'approved')).rejects.toThrow(new ForbiddenException(LEAVE_REFUSED.notYours));
  });

  it('follows the line manager even when the organisation once said "An admin" approves (decided 1 October 2026: the line manager, or an admin where there is none)', async () => {
    const { svc, as } = setup({ approver: 'An admin' });
    const { waiting } = await svc.board(as('u-grace'), TODAY);
    expect(waiting.map((w) => [w.name, w.mayDecide])).toEqual([['Aisha Otieno', false], ['Samuel Njoroge', false], ['Otieno Ouma', true]]);
    await expect(svc.decide(as('u-wairimu'), 'r-aisha', 'approved')).resolves.toBeDefined();
  });

  it('reads everybody off in the next two weeks, as annual leave', async () => {
    const { svc, as } = setup();
    const { off } = await svc.board(as('u-grace'), TODAY);
    expect(off).toEqual([
      { id: 'r-brian', name: 'Brian Mwangi', startsOn: '2026-10-05', endsOn: '2026-10-05', kind: 'annual' },
      { id: 'r-kamau', name: 'Kamau Njenga', startsOn: '2026-10-08', endsOn: '2026-10-09', kind: 'annual' },
    ]);
  });
});

describe('Wairimu, the Sales lead, reads only her team', () => {
  it('Sales’ requests and who in Sales is off, never Operations’', async () => {
    const { svc, as } = setup();
    const board = await svc.board(as('u-wairimu'), TODAY);
    expect(board.waiting.map((w) => w.name)).toEqual(['Aisha Otieno', 'Samuel Njoroge']);
    expect(board.off.map((o) => o.name)).toEqual(['Brian Mwangi']);
    expect(JSON.stringify(board)).not.toMatch(/Otieno Ouma|Kamau/);
  });

  it('decides for the people she manages, and the decision is kept with who and when', async () => {
    const { svc, as, rows } = setup();
    const { waiting } = await svc.board(as('u-wairimu'), TODAY);
    expect(waiting.every((w) => w.mayDecide)).toBe(true);
    const after = await svc.decide(as('u-wairimu'), 'r-aisha', 'approved');
    expect(after.waiting.map((w) => w.name)).toEqual(['Samuel Njoroge']);
    const r = rows.find((x) => x.id === 'r-aisha');
    expect(r.status).toBe('approved');
    expect(r.decidedById).toBe('u-wairimu');
    expect(r.decidedAt).toBeInstanceOf(Date);
    await expect(svc.decide(as('u-wairimu'), 'r-aisha', 'declined')).rejects.toThrow(new BadRequestException(LEAVE_REFUSED.alreadyDecided));
  });

  it('cannot decide a request outside her team', async () => {
    const { svc, as } = setup();
    await expect(svc.decide(as('u-wairimu'), 'r-otieno', 'approved')).rejects.toThrow(ForbiddenException);
  });
});

describe('Kamau, the Operations lead', () => {
  it('reads Otieno’s request, and his own leave among who is off, but does not decide Otieno’s: nobody made him Otieno’s manager', async () => {
    const { svc, as } = setup();
    const board = await svc.board(as('u-kamau'), TODAY);
    expect(board.waiting.map((w) => [w.name, w.mayDecide])).toEqual([['Otieno Ouma', false]]);
    expect(board.off.map((o) => o.name)).toEqual(['Kamau Njenga']);
  });
});

describe('each person reads only their own leave', () => {
  it('Aisha reads her own requests and her days left, and nobody else’s', async () => {
    const { svc, as } = setup();
    const mine = await svc.mine(as('u-aisha'), TODAY);
    expect(mine.perYear).toBe(21);
    expect(mine.daysLeft).toBe(16);
    expect(mine.requests.map((r) => [r.startsOn, r.status, r.standIn])).toEqual([
      ['2026-10-01', 'waiting', 'Miriam Wanjiku'],
      ['2026-03-02', 'approved', null],
    ]);
    expect(JSON.stringify(mine)).not.toMatch(/Brian|Samuel|decidedBy/);
  });

  it('Aisha, a colleague to the others, is refused the board, and cannot decide anything, even her own', async () => {
    const { svc, as } = setup();
    await expect(svc.board(as('u-aisha'), TODAY)).rejects.toThrow(new ForbiddenException(LEAVE_REFUSED.onlyAdminsAndLeads));
    await expect(svc.decide(as('u-aisha'), 'r-aisha', 'approved')).rejects.toThrow(ForbiddenException);
    await expect(svc.decide(as('u-miriam'), 'r-samuel', 'approved')).rejects.toThrow(ForbiddenException);
  });

  it('a guest reads nothing, and a request from another organisation is not found', async () => {
    const { svc, as } = setup();
    await expect(svc.mine(as('u-tomas'), TODAY)).rejects.toThrow(new ForbiddenException(LEAVE_REFUSED.notInIt));
    await expect(svc.board(as('u-tomas'), TODAY)).rejects.toThrow(ForbiddenException);
    await expect(svc.decide({ userId: 'u-grace', organizationId: 'org-other' }, 'r-aisha', 'approved')).rejects.toThrow(NotFoundException);
  });
});

describe('asking, as the engine will once the person confirms (request 21)', () => {
  it('keeps the days and the stand-in, and nothing else', async () => {
    const { svc, rows } = setup();
    const { id } = await svc.ask(ORG, 'u-miriam', { startsOn: '2026-10-12', endsOn: '2026-10-13', standInUserId: 'u-aisha' });
    expect(rows.find((r) => r.id === id)).toMatchObject({ userId: 'u-miriam', standInUserId: 'u-aisha', status: 'waiting' });
  });

  it('refuses a last day before the first, a stand-in who is the person or a guest, and a guest asking', async () => {
    const { svc } = setup();
    await expect(svc.ask(ORG, 'u-miriam', { startsOn: '2026-10-13', endsOn: '2026-10-12' })).rejects.toThrow(new BadRequestException(LEAVE_REFUSED.badDates));
    await expect(svc.ask(ORG, 'u-miriam', { startsOn: 'next week', endsOn: '2026-10-12' })).rejects.toThrow(BadRequestException);
    await expect(svc.ask(ORG, 'u-miriam', { startsOn: '2026-10-12', endsOn: '2026-10-12', standInUserId: 'u-miriam' })).rejects.toThrow(new BadRequestException(LEAVE_REFUSED.badStandIn));
    await expect(svc.ask(ORG, 'u-miriam', { startsOn: '2026-10-12', endsOn: '2026-10-12', standInUserId: 'u-tomas' })).rejects.toThrow(BadRequestException);
    await expect(svc.ask(ORG, 'u-tomas', { startsOn: '2026-10-12', endsOn: '2026-10-12' })).rejects.toThrow(ForbiddenException);
  });
});

describe('working days', () => {
  it('count Monday to Friday, both ends included', () => {
    expect(workingDays(d('2026-10-01'), d('2026-10-02'))).toBe(2);
    expect(workingDays(d('2026-10-02'), d('2026-10-05'))).toBe(2);
    expect(workingDays(d('2026-10-03'), d('2026-10-04'))).toBe(0);
  });
});

/** Code only: a comment that names the table is not a read of it. */
const withoutComments = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('leave never reaches a check-in or its report', () => {
  it('nothing outside the suites reads leave requests', () => {
    const root = join(__dirname, '..');
    const faults: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const p = join(dir, name);
        if (statSync(p).isDirectory()) { if (name !== 'suites') walk(p); }
        else if (/\.ts$/.test(name) && !/\.spec\.ts$/.test(name) && /leaveRequest\b/.test(withoutComments(readFileSync(p, 'utf8')))) faults.push(p);
      }
    };
    walk(root);
    expect(faults).toEqual([]);
    /* The pattern does find a real read: the suite's own service. A scan that matches nothing proves nothing. */
    expect(/leaveRequest\b/.test(withoutComments(readFileSync(join(__dirname, 'the-leave-board.service.ts'), 'utf8')))).toBe(true);
  });

  it('and no reason is kept, so none can be served', async () => {
    const { svc, as } = setup();
    const served = JSON.stringify([await svc.board(as('u-grace'), TODAY), await svc.mine(as('u-aisha'), TODAY)]);
    expect(served).not.toMatch(/reason|sick|PIP|at[- ]risk|score|@/i);
  });
});

/**
 * DECISION 93, ROW 25 (5 October 2026): "WHO IS OFF", FOR A MEMBER. Ask Groundwork tells a member who in their own team is off, from
 * approved leave. Miriam is in Sales with Aisha, Samuel and Brian; Brian is off on Monday 5 October (approved), Aisha's March leave
 * is approved, Samuel's request waits, and Miriam's old one was declined. Kamau and Otieno are in Operations; Kamau is off on 8 and
 * 9 October. Dates only, by first name: never the kind of leave, and never anything that waits or was declined.
 */
describe('decision 93, row 25: the days teammates are off', () => {
  it('Miriam reads Brian and Aisha, her teammates in Sales, by first name and dates, and nobody in Operations', async () => {
    const { svc, as } = setup();
    expect(await svc.teammatesOff(as('u-miriam'))).toEqual([
      { name: 'Aisha', startsOn: '2026-03-02', endsOn: '2026-03-06' },
      { name: 'Brian', startsOn: '2026-10-05', endsOn: '2026-10-05' },
    ]);
  });

  it('Otieno, in Operations, reads Kamau and nobody in Sales', async () => {
    const { svc, as } = setup();
    expect(await svc.teammatesOff(as('u-otieno'))).toEqual([{ name: 'Kamau', startsOn: '2026-10-08', endsOn: '2026-10-09' }]);
  });

  it('is dates and a first name only: no kind of leave, no reason, no request that waits or was declined, no stand-in', async () => {
    const { svc, as } = setup();
    const said = JSON.stringify(await svc.teammatesOff(as('u-miriam')));
    expect(said).not.toMatch(/annual|kind|reason|waiting|declined|standIn|Miriam|Samuel|Njoroge|Mwangi|Otieno Ouma/);
  });

  it('a guest, and a member with no department in the directory, are given nothing to say', async () => {
    const { svc, as } = setup();
    expect(await svc.teammatesOff(as('u-tomas'))).toBeNull();
    expect(await svc.teammatesOff(as('u-lone'))).toBeNull();
    /* Nor does anybody from another organisation find a suite switched on here. */
    await expect(svc.teammatesOff({ userId: 'u-miriam', organizationId: 'org-other' })).rejects.toThrow(NotFoundException);
  });

  it('while the suite is off, nobody reads anything', async () => {
    const { svc, as } = setup({ on: false });
    await expect(svc.teammatesOff(as('u-miriam'))).rejects.toThrow(NotFoundException);
  });
});

