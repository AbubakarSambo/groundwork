import { ConflictException, ForbiddenException } from '@nestjs/common';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { AssistantService } from '../assistant/assistant.service';
import { AskService, Asker, ONLY_YOURS, NOT_IN_IT, NOTHING_WAITING, SWITCHED_OFF, CONFIRM_YOUR_EMAIL, MADE_BY_GROUNDWORK } from './ask.service';
import { AskController } from './ask.controller';

/**
 * ASK GROUNDWORK, AS EACH PERSON IS SERVED IT (D1, U.14).
 *
 * One organisation. Wairimu runs "Sales team, Q3". Miriam takes part in it. Grace is an admin who is
 * not in it. Sam is Groundwork staff with an account in the organisation. Tom has signed in but is
 * not on the organisation's list of people. The assistant is the real one; only the database is
 * pretend.
 *
 * The rules under test: questions to Ask Groundwork are read only by the person who asked them; a
 * question can be about a check-in only when the person is in it; and nothing Ask Groundwork offers
 * to do happens until the person who asked says yes to that one request.
 */

const ORG = 'org-baridi';

const readers: Record<string, Asker & { role: string; isPlatformAdmin?: boolean }> = {
  wairimu: { userId: 'u-wairimu', email: 'wairimu@baridi.test', organizationId: ORG, role: 'LEAD' },
  miriam: { userId: 'u-miriam', email: 'miriam@baridi.test', organizationId: ORG, role: 'MEMBER' },
  grace: { userId: 'u-grace', email: 'grace@baridi.test', organizationId: ORG, role: 'ADMIN' },
  sam: { userId: 'u-sam', email: 'sam@groundwork.test', organizationId: ORG, role: 'ADMIN', isPlatformAdmin: true },
  tom: { userId: 'u-tom', email: 'tom@baridi.test', organizationId: ORG, role: 'MEMBER' },
  /* Has an unclaimed entry with her address, and has not confirmed that address. */
  uma: { userId: 'u-uma', email: 'uma@baridi.test', organizationId: ORG, role: 'MEMBER' },
  /* His address is on an unclaimed entry in ANOTHER organisation, and on nothing in this one. */
  olu: { userId: 'u-olu', email: 'olu@baridi.test', organizationId: ORG, role: 'MEMBER' },
  /* Switched off by the directory: Sid's entry is linked to him, Sue's carries her address. */
  sid: { userId: 'u-sid', email: 'sid@baridi.test', organizationId: ORG, role: 'MEMBER' },
  sue: { userId: 'u-sue', email: 'sue@baridi.test', organizationId: ORG, role: 'MEMBER' },
};

function fixture() {
  const db: Record<string, any[]> = {
    person: [
      { id: 'pe-wairimu', organizationId: ORG, externalId: 'x-wairimu', email: 'wairimu@baridi.test', linkedUserId: 'u-wairimu', active: true },
      { id: 'pe-miriam', organizationId: ORG, externalId: 'x-miriam', email: 'miriam@baridi.test', linkedUserId: 'u-miriam', active: true },
      { id: 'pe-grace', organizationId: ORG, externalId: 'x-grace', email: 'grace@baridi.test', linkedUserId: null, active: true },
      /* Tom's address, on an entry somebody else's account has claimed. It is not Tom's. */
      { id: 'pe-other', organizationId: ORG, externalId: 'x-other', email: 'tom@baridi.test', linkedUserId: 'u-someone-else', active: true },
      { id: 'pe-uma', organizationId: ORG, externalId: 'x-uma', email: 'uma@baridi.test', linkedUserId: null, active: true },
      { id: 'pe-olu-elsewhere', organizationId: 'org-elsewhere', externalId: 'x-olu', email: 'olu@baridi.test', linkedUserId: null, active: true },
      { id: 'pe-sid', organizationId: ORG, externalId: 'x-sid', email: 'sid@baridi.test', linkedUserId: 'u-sid', active: false },
      { id: 'pe-sue', organizationId: ORG, externalId: 'x-sue', email: 'SUE@baridi.test', linkedUserId: null, active: false },
    ],
    user: Object.values(readers).map((r) => ({
      id: r.userId, email: r.email, firstName: r.userId.slice(2, 3).toUpperCase() + r.userId.slice(3), lastName: 'Test',
      isEmailVerified: r.userId !== 'u-uma',
    })),
    ground: [
      { id: 'g-sales', organizationId: ORG, label: 'Sales team, Q3', status: 'ACTIVE', initiatorId: 'u-wairimu', participantUserIds: ['u-wairimu', 'u-miriam'], createdAt: new Date(1) },
      { id: 'g-lead', organizationId: ORG, label: 'Leadership, Q3', status: 'ACTIVE', initiatorId: 'u-grace', participantUserIds: ['u-grace', 'u-wairimu'], createdAt: new Date(2) },
      { id: 'g-old', organizationId: ORG, label: 'Supplier review', status: 'CLOSED', initiatorId: 'u-wairimu', participantUserIds: ['u-wairimu', 'u-miriam'], createdAt: new Date(0) },
    ],
    assistantTurn: [
      { organizationId: ORG, personExternalId: 'x-miriam', role: 'person', content: 'MIRIAM-ASKED: Why is Green Mart next quarter?', createdAt: new Date(10) },
      { organizationId: ORG, personExternalId: 'x-miriam', role: 'assistant', content: 'MIRIAM-TOLD: Green Mart said January, in writing.', createdAt: new Date(11) },
      { organizationId: ORG, personExternalId: 'x-wairimu', role: 'person', content: 'WAIRIMU-ASKED: Will we reach 25?', createdAt: new Date(12) },
    ],
    assistantProposal: [],
    todo: [],
  };

  const eq = (row: any, where: any): boolean =>
    Object.entries(where ?? {}).every(([k, v]: [string, any]) => {
      if (k === 'OR') return (v as any[]).some((w) => eq(row, w));
      if (k === 'participants') return row.participantUserIds.includes(v.some.userId);
      if (v && typeof v === 'object' && 'notIn' in v) return !v.notIn.includes(row[k]);
      if (v && typeof v === 'object' && 'equals' in v) return String(row[k] ?? '').toLowerCase() === String(v.equals).toLowerCase();
      return row[k] === v;
    });
  const pick = (row: any, select?: any) =>
    row && select ? Object.fromEntries(Object.keys(select).map((k) => [k, row[k]])) : row;
  const sorted = (rows: any[], orderBy?: any) => {
    if (!orderBy) return rows;
    const [[k, dir]] = Object.entries(orderBy) as [string, string][];
    return [...rows].sort((a, b) => (a[k] < b[k] ? -1 : a[k] > b[k] ? 1 : 0) * (dir === 'desc' ? -1 : 1));
  };
  let n = 0;
  const table = (name: string) => ({
    findFirst: jest.fn(async ({ where, select, orderBy }: any = {}) => pick(sorted(db[name].filter((r) => eq(r, where)), orderBy)[0] ?? null, select)),
    findMany: jest.fn(async ({ where, select, orderBy, take }: any = {}) =>
      sorted(db[name].filter((r) => eq(r, where)), orderBy).slice(0, take ?? Infinity).map((r) => pick(r, select))),
    create: jest.fn(async ({ data, select }: any) => {
      /* The database's own unique key on a person: organisation, source, external id. */
      if (name === 'person' && db.person.some((p) => p.organizationId === data.organizationId && p.sourceSystem === data.sourceSystem && p.externalId === data.externalId)) {
        throw Object.assign(new Error('Unique constraint failed'), { code: 'P2002' });
      }
      const row = { id: `00000000-0000-4000-8000-00000000000${++n}`, state: name === 'assistantProposal' ? 'PARKED' : 'OPEN', createdAt: new Date(100 + n), ...data };
      db[name].push(row);
      return pick(row, select);
    }),
    createMany: jest.fn(async ({ data }: any) => {
      for (const d of data) db[name].push({ createdAt: new Date(100 + ++n), ...d });
      return { count: data.length };
    }),
    update: jest.fn(async ({ where, data }: any) => {
      const row = db[name].find((r) => r.id === where.id);
      Object.assign(row, data);
      return row;
    }),
    count: jest.fn(async ({ where }: any = {}) => db[name].filter((r) => eq(r, where)).length),
    /* One statement: the rows that still match are changed, and only those, as the database does it. */
    updateMany: jest.fn(async ({ where, data }: any) => {
      const hit = db[name].filter((r) => eq(r, where));
      for (const r of hit) Object.assign(r, data);
      return { count: hit.length };
    }),
    findUnique: jest.fn(async ({ where, select }: any) => pick(db[name].find((r) => r.id === where.id) ?? null, select)),
  });
  const prisma: any = Object.fromEntries(Object.keys(db).map((k) => [k, table(k)]));
  prisma.subject = { findMany: jest.fn(async () => []), count: jest.fn(async () => 0) };
  prisma.detectionQuietPeriod = { findMany: jest.fn(async () => []) };

  const refuse = (what: string) => async () => { throw new Error(`no ${what} in these tests`); };
  const assistant = new AssistantService(
    prisma,
    { respond: refuse('model') } as any,
    { retrieve: async () => ({ cards: [], truncated: false }) } as any,
    { waitingAcrossTheOrg: async () => ({ waiting: [], waitedOn: [] }) } as any,
    { statusFor: async () => ({ roleName: null, gates: [], left: [] }) } as any,
    { pendingFor: async () => [], decide: refuse('suggestions') } as any,
    { start: refuse('drafting') } as any,
    { forPerson: refuse('assembly') } as any,
    { read: async () => ({ read: false, because: 'no reading in these tests' }) } as any,
    { sendRoundDigest: refuse('mail') } as any,
    { create: refuse('ground creation'), addParticipant: refuse('ground creation') } as any,
  );
  const ask = new AskService(prisma, assistant);
  const controller = new AskController(ask);
  const asUser = (r: typeof readers[string]) => ({
    id: r.userId, email: r.email, organizationId: r.organizationId, role: r.role,
    firstName: '', lastName: '', isPlatformAdmin: !!r.isPlatformAdmin,
  });
  return { db, ask, controller, asUser, prisma };
}

const everything = (x: unknown) => JSON.stringify(x);

describe('the person who asked reads their own questions and answers', () => {
  it('Miriam reads what she asked and what Groundwork answered, in order', async () => {
    const { controller, asUser } = fixture();
    const mine = await controller.mine(asUser(readers.miriam));
    expect(mine.canAsk).toBe(true);
    expect(mine.turns.map((t) => [t.from, t.says])).toEqual([
      ['you', 'MIRIAM-ASKED: Why is Green Mart next quarter?'],
      ['groundwork', 'MIRIAM-TOLD: Green Mart said January, in writing.'],
    ]);
    expect(everything(mine)).not.toContain('WAIRIMU-ASKED');
  });

  it('and may ask about the check-ins she is in, not the ones that ended', async () => {
    const { controller, asUser } = fixture();
    expect((await controller.mine(asUser(readers.miriam))).about).toEqual([{ id: 'g-sales', label: 'Sales team, Q3' }]);
    expect((await controller.mine(asUser(readers.wairimu))).about.map((g) => g.label)).toEqual(['Sales team, Q3', 'Leadership, Q3']);
  });
});

describe.each([
  ['the lead of her check-in', 'wairimu'],
  ['an admin', 'grace'],
  ['Groundwork staff', 'sam'],
])('%s asking for Miriam\'s questions', (_who, key) => {
  it('is refused, by address and by parameter', async () => {
    const { controller, asUser } = fixture();
    await expect(controller.someone(asUser(readers[key]), 'u-miriam')).rejects.toThrow(new ForbiddenException(ONLY_YOURS));
    await expect(controller.mine(asUser(readers[key]), 'u-miriam')).rejects.toThrow(ForbiddenException);
  });

  it('and reads none of them on their own page either', async () => {
    const { controller, asUser } = fixture();
    const theirs = await controller.mine(asUser(readers[key]));
    expect(everything(theirs)).not.toMatch(/MIRIAM-/);
  });
});

describe('what a question may be about', () => {
  it('an admin who is not in a check-in cannot ask about it', async () => {
    const { controller, asUser } = fixture();
    expect((await controller.mine(asUser(readers.grace))).about.map((g) => g.id)).not.toContain('g-sales');
    await expect(controller.question(asUser(readers.grace), { message: 'what is stuck?', groundId: 'g-sales' }))
      .rejects.toThrow(new ForbiddenException(NOT_IN_IT));
  });

  it('nor about a check-in that has ended', async () => {
    const { controller, asUser } = fixture();
    await expect(controller.question(asUser(readers.miriam), { message: 'what is stuck?', groundId: 'g-old' }))
      .rejects.toThrow(new ForbiddenException(NOT_IN_IT));
  });
});

/*
 * SOMEBODY SIGNED IN WHO IS ON NO LIST YET. This used to pin a refusal ("Ask Groundwork can answer
 * you once your organisation has connected its list of people"), which answered almost nobody: only
 * the directory and the panel ever put people on the list. The user decided Ask Groundwork must work
 * before deployment, so they are put on it now, and the rest of this block is what must still hold.
 */
describe('somebody signed in who is on no list yet', () => {
  const REQUEST = 'remind me to call Kariuki about the deposit';

  it('can ask, and opening the panel writes nothing', async () => {
    const { controller, asUser, prisma } = fixture();
    const tom = await controller.mine(asUser(readers.tom));
    expect(tom).toEqual({ canAsk: true, about: [], turns: [] });
    expect(prisma.person.create).not.toHaveBeenCalled();
    expect(prisma.person.updateMany).not.toHaveBeenCalled();
  });

  it('gets an entry of their own on the first question, and an answer, and never somebody else\'s', async () => {
    const { controller, asUser, db } = fixture();
    const reply: any = await controller.question(asUser(readers.tom), { message: REQUEST });
    expect(reply.blocks.some((b: any) => b.type === 'proposal')).toBe(true);
    const his = db.person.filter((p) => p.linkedUserId === 'u-tom');
    expect(his).toHaveLength(1);
    expect(his[0]).toMatchObject({
      organizationId: ORG, sourceSystem: MADE_BY_GROUNDWORK, externalId: 'u-tom', email: 'tom@baridi.test', active: true,
    });
    expect(his[0].department).toBeUndefined();
    expect(his[0].managerExternalId).toBeUndefined();
    /* Kept against him, and the entry with his address that is somebody else's is untouched. */
    expect(db.assistantTurn.filter((t) => t.personExternalId === 'u-tom').length).toBeGreaterThan(0);
    expect(db.assistantTurn.filter((t) => t.personExternalId === 'x-other')).toEqual([]);
    expect(db.person.find((p) => p.id === 'pe-other')!.linkedUserId).toBe('u-someone-else');
  });

  it('two questions at once make one entry', async () => {
    const { controller, asUser, db, prisma } = fixture();
    await Promise.all([
      controller.question(asUser(readers.tom), { message: REQUEST }),
      controller.question(asUser(readers.tom), { message: 'remind me to send the Green Mart quote' }),
    ]);
    expect(db.person.filter((p) => p.linkedUserId === 'u-tom')).toHaveLength(1);
    /* Both really tried: the second met the unique key and read the first's back. */
    expect(prisma.person.create).toHaveBeenCalledTimes(2);
  });
});

describe('an entry with their address that nobody has claimed', () => {
  const REQUEST = 'remind me to call Kariuki about the deposit';

  it('is theirs to ask with, and opening the panel does not claim it', async () => {
    const { controller, asUser, db } = fixture();
    expect((await controller.mine(asUser(readers.grace))).canAsk).toBe(true);
    expect(db.person.find((p) => p.id === 'pe-grace')!.linkedUserId).toBeNull();
  });

  it('is claimed on the first question, with a confirmed address, and no second entry is made', async () => {
    const { controller, asUser, db } = fixture();
    await controller.question(asUser(readers.grace), { message: REQUEST });
    expect(db.person.find((p) => p.id === 'pe-grace')!.linkedUserId).toBe('u-grace');
    expect(db.person.filter((p) => p.linkedUserId === 'u-grace')).toHaveLength(1);
  });

  it('and two questions at once claim it once', async () => {
    const { controller, asUser, db, prisma } = fixture();
    await Promise.all([
      controller.question(asUser(readers.grace), { message: REQUEST }),
      controller.question(asUser(readers.grace), { message: 'remind me to send the Green Mart quote' }),
    ]);
    expect(db.person.filter((p) => p.linkedUserId === 'u-grace').map((p) => p.id)).toEqual(['pe-grace']);
    /* Both really tried to claim it, and the second changed nothing. */
    expect(prisma.person.updateMany).toHaveBeenCalledTimes(2);
    expect(prisma.person.create).not.toHaveBeenCalled();
    /* The claim only ever changes a row that is still unclaimed. */
    for (const [args] of (prisma.person.updateMany as jest.Mock).mock.calls) expect(args.where).toMatchObject({ linkedUserId: null });
  });

  it('is never claimed with an address nobody confirmed, and nothing is made instead', async () => {
    const { controller, asUser, db, prisma } = fixture();
    expect(await controller.mine(asUser(readers.uma))).toEqual({ canAsk: false, why: CONFIRM_YOUR_EMAIL, about: [], turns: [] });
    await expect(controller.question(asUser(readers.uma), { message: REQUEST })).rejects.toThrow(new ForbiddenException(CONFIRM_YOUR_EMAIL));
    expect(db.person.find((p) => p.id === 'pe-uma')!.linkedUserId).toBeNull();
    expect(prisma.person.create).not.toHaveBeenCalled();
    expect(prisma.person.updateMany).not.toHaveBeenCalled();
    expect(db.assistantTurn.filter((t) => t.personExternalId === 'x-uma')).toEqual([]);
  });

  it('in another organisation is never read or claimed, and they get their own entry here', async () => {
    const { controller, asUser, db, prisma } = fixture();
    await controller.question(asUser(readers.olu), { message: REQUEST });
    expect(db.person.find((p) => p.id === 'pe-olu-elsewhere')!.linkedUserId).toBeNull();
    expect(db.person.filter((p) => p.linkedUserId === 'u-olu').map((p) => p.organizationId)).toEqual([ORG]);
    for (const [args] of (prisma.person.findFirst as jest.Mock).mock.calls) expect(args.where.organizationId).toBe(ORG);
    for (const [args] of (prisma.person.updateMany as jest.Mock).mock.calls) expect(args.where.organizationId).toBe(ORG);
  });
});

describe('somebody the directory switched off', () => {
  const REQUEST = 'remind me to call Kariuki about the deposit';

  for (const [who, how] of [['sid', 'whose entry is linked to them'], ['sue', 'whose address is on it']] as const) {
    it(`${who}, ${how}, is refused and nothing is written`, async () => {
      const { controller, asUser, db, prisma } = fixture();
      expect(await controller.mine(asUser(readers[who]))).toEqual({ canAsk: false, why: SWITCHED_OFF, about: [], turns: [] });
      await expect(controller.question(asUser(readers[who]), { message: REQUEST })).rejects.toThrow(new ForbiddenException(SWITCHED_OFF));
      await expect(controller.answer(asUser(readers[who]), { proposalId: '00000000-0000-4000-8000-000000000999', answer: 'yes' }))
        .rejects.toThrow(new ForbiddenException(SWITCHED_OFF));
      expect(prisma.person.create).not.toHaveBeenCalled();
      expect(prisma.person.updateMany).not.toHaveBeenCalled();
      expect(db.assistantTurn.filter((t) => t.personExternalId === `u-${who}` || t.personExternalId === `x-${who}`)).toEqual([]);
    });
  }
});

describe('nothing is done until the person who asked says yes to that request', () => {
  const REQUEST = 'remind me to call Kariuki about the deposit';

  it('a request is said back, and nothing is created', async () => {
    const { controller, asUser, db } = fixture();
    const reply: any = await controller.question(asUser(readers.miriam), { message: REQUEST, groundId: 'g-sales' });
    const offer = reply.blocks.find((b: any) => b.type === 'proposal');
    expect(offer).toBeTruthy();
    expect(db.todo).toEqual([]);
    expect(db.assistantProposal).toHaveLength(1);
    expect(db.assistantProposal[0]).toMatchObject({ personExternalId: 'x-miriam', state: 'PARKED' });
  });

  it('somebody else\'s yes, a yes to the wrong request, and a second yes do nothing', async () => {
    const { controller, asUser, db } = fixture();
    const reply: any = await controller.question(asUser(readers.miriam), { message: REQUEST });
    const { proposalId } = reply.blocks.find((b: any) => b.type === 'proposal');

    await expect(controller.answer(asUser(readers.wairimu), { proposalId, answer: 'yes' }))
      .rejects.toThrow(new ConflictException(NOTHING_WAITING));
    await expect(controller.answer(asUser(readers.grace), { proposalId, answer: 'yes' }))
      .rejects.toThrow(ConflictException);
    await expect(controller.answer(asUser(readers.miriam), { proposalId: '00000000-0000-4000-8000-000000000999', answer: 'yes' }))
      .rejects.toThrow(ConflictException);
    expect(db.todo).toEqual([]);

    await controller.answer(asUser(readers.miriam), { proposalId, answer: 'yes' });
    expect(db.todo).toHaveLength(1);
    expect(db.todo[0]).toMatchObject({ personExternalId: 'x-miriam' });

    await expect(controller.answer(asUser(readers.miriam), { proposalId, answer: 'yes' }))
      .rejects.toThrow(ConflictException);
    expect(db.todo).toHaveLength(1);
  });

  it('a no leaves it undone', async () => {
    const { controller, asUser, db } = fixture();
    const reply: any = await controller.question(asUser(readers.miriam), { message: REQUEST });
    const { proposalId } = reply.blocks.find((b: any) => b.type === 'proposal');
    await controller.answer(asUser(readers.miriam), { proposalId, answer: 'no' });
    expect(db.todo).toEqual([]);
    expect(db.assistantProposal[0].state).toBe('DECLINED');
  });

  it('what she asked is kept against her alone, and the lead reads none of it', async () => {
    const { controller, asUser, db } = fixture();
    await controller.question(asUser(readers.miriam), { message: `${REQUEST} MIRIAM-NEW` });
    const kept = db.assistantTurn.filter((t) => /MIRIAM-NEW/.test(t.content));
    expect(kept.length).toBeGreaterThan(0);
    expect(new Set(kept.map((t) => t.personExternalId))).toEqual(new Set(['x-miriam']));
    expect(everything(await controller.mine(asUser(readers.wairimu)))).not.toMatch(/MIRIAM-/);
  });
});

describe('the staff consoles', () => {
  it('read nobody\'s questions to Ask Groundwork', () => {
    const MODULES = join(__dirname, '..');
    const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    const every = (dir: string): string[] => readdirSync(dir).flatMap((name) => {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) return every(p);
      return p.endsWith('.ts') && !p.endsWith('.spec.ts') ? [p] : [];
    });
    const faults = ['ops', 'admin', 'back-office']
      .flatMap((area) => every(join(MODULES, area)))
      .filter((file) => /assistantTurn|assistant_turns/.test(strip(readFileSync(file, 'utf8'))));
    expect(faults).toEqual([]);
  });
});

/* Decision 35: a bank or card number typed into a question is hidden before it is kept or read. */
describe('a bank or card number typed into a question', () => {
  it('is kept as the placeholder, never as the number', async () => {
    const { controller, asUser, db } = fixture();
    await controller.question(asUser(readers.miriam), { message: 'remind me to pay Kariuki into account number 0123456789 by Friday' });
    const kept = JSON.stringify([db.assistantTurn, db.assistantProposal, db.todo]);
    expect(kept).not.toContain('0123456789');
    expect(kept).toContain('[account number hidden]');
  });
});
