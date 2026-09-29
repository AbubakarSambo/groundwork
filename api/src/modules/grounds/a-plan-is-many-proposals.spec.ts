import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { proposalsFromAPlan, numbersIn, type PlanRead } from './a-plan-is-many-proposals';
import { APlanIsManyProposalsService } from './a-plan-is-many-proposals.service';
import { BoardService } from '../board/board.service';

/**
 * A PLAN IS MANY PROPOSALS, EACH CONFIRMED ON ITS OWN (week 13, screens request 6a).
 *
 * Checked on what the lead reads: the sentence on each card, the words it quotes, and the note when
 * a name is not on the check-in. And on what is written: nothing on the read, one thing on a yes.
 */

const PLAN = `Q4 plan for the freezer team.
Twenty-five freezer sales by 31 December, mostly butcheries and supermarkets.
Aisha looks after the Lagos supermarkets.
Samuel will call every butchery in Ikeja by Friday 10 October.
Musa Bello will open the Abuja list by end of October.
If they haven't replied after three calls, drop it and move on.`;

const ROSTER = [
  { id: 'p-aisha', email: 'aisha@x.test', nameGiven: 'Aisha Bello', managingOnly: false, userId: 'u-aisha', leftAt: null, user: { firstName: 'Aisha', lastName: 'Bello' } },
  { id: 'p-samuel', email: 'samuel@x.test', nameGiven: 'Samuel Okoro', managingOnly: false, userId: 'u-samuel', leftAt: null, user: { firstName: 'Samuel', lastName: 'Okoro' } },
];

const READ: PlanRead[] = [
  { kind: 'goal', says: 'The team is to make 25 freezer sales by 31 December.', fromThePlan: 'Twenty-five freezer sales by 31 December', what: 'freezer sales', number: 25, date: '31 December' },
  { kind: 'role', says: 'Aisha looks after the Lagos supermarkets.', fromThePlan: 'Aisha looks after the Lagos supermarkets.', personName: 'Aisha', what: 'the Lagos supermarkets' },
  { kind: 'commitment', says: 'Samuel will call every butchery in Ikeja by Friday 10 October.', fromThePlan: 'Samuel will call every butchery in Ikeja by Friday 10 October.', personName: 'Samuel', what: 'call every butchery in Ikeja', date: 'Friday 10 October' },
  { kind: 'commitment', says: 'Musa Bello will open the Abuja list by the end of October.', fromThePlan: 'Musa Bello will open the Abuja list by end of October.', personName: 'Musa Bello', what: 'open the Abuja list', date: 'end of October' },
  { kind: 'rule', says: 'Drop a lead after three calls with no reply.', fromThePlan: "If they haven't replied after three calls, drop it and move on.", what: 'drop a lead after three calls with no reply' },
];

const PEOPLE = [{ id: 'p-aisha', name: 'Aisha Bello' }, { id: 'p-samuel', name: 'Samuel Okoro' }];

describe('reading a plan into proposals (pure)', () => {
  const out = proposalsFromAPlan(PLAN, READ, PEOPLE, { from: 'Q4 plan.pdf' });

  it('gives one proposal per thing, each with a card sentence the lead reads', () => {
    expect(out.map((p) => p.kind)).toEqual(['goal', 'role', 'commitment', 'commitment', 'rule']);
    expect(out.map((p) => p.heading)).toEqual([
      'A goal, from Q4 plan.pdf. It would go in targets.',
      'A role, from Q4 plan.pdf. It would go in people and roles.',
      'A commitment, from Q4 plan.pdf. It would go in commitments.',
      'A commitment, from Q4 plan.pdf. It would go in commitments.',
      'A rule, from Q4 plan.pdf. It would go in how we work.',
    ]);
    expect(out[0].says).toBe('The team is to make 25 freezer sales by 31 December.');
    expect(out[4].says).toBe('Drop a lead after three calls with no reply.');
    expect(out[4].saidAs).toBe("If they haven't replied after three calls, drop it and move on.");
  });

  it('keeps dates exactly as written', () => {
    expect(out[0].fields.date).toBe('31 December');
    expect(out[2].fields.date).toBe('Friday 10 October');
    expect(out[3].fields.date).toBe('end of October');
  });

  it('keeps a name that is not on the check-in, and says so', () => {
    expect(out[3].fields.personName).toBe('Musa Bello');
    expect(out[3].fields.participantId).toBeUndefined();
    expect(out[3].note).toBe('One name in it, Musa Bello, is not on this check-in. Add them, and this will go on too.');
    expect(out[1].fields.participantId).toBe('p-aisha');
    expect(out[1].note).toBeUndefined();
  });

  it('drops a proposal whose words are not in the plan', () => {
    const got = proposalsFromAPlan(PLAN, [{ kind: 'goal', says: 'Thirty sales.', fromThePlan: 'Thirty freezer sales by 30 November', what: 'freezer sales', number: 30 }], PEOPLE);
    expect(got).toEqual([]);
  });

  it('drops a number or a date the quote does not hold, and never invents one', () => {
    const wrongNumber = proposalsFromAPlan(PLAN, [{ ...READ[0], number: 30 }], PEOPLE);
    const wrongDate = proposalsFromAPlan(PLAN, [{ ...READ[0], date: '2026-12-31' }], PEOPLE);
    expect(wrongNumber).toEqual([]);
    expect(wrongDate).toEqual([]);
  });

  it('rewrites a card sentence that carries a figure the plan never said', () => {
    const [p] = proposalsFromAPlan(PLAN, [{ ...READ[0], says: 'The team is to make 40 freezer sales by 31 December.' }], PEOPLE);
    expect(p.says).toBe('The goal for freezer sales is 25 by 31 December.');
  });

  it('drops a name that is nowhere in the plan', () => {
    expect(proposalsFromAPlan(PLAN, [{ ...READ[2], personName: 'Kemi' }], PEOPLE)).toEqual([]);
  });

  it('reads the ways a plan writes a number', () => {
    expect(numbersIn('N45m and 3.5k and twenty-five').has(45_000_000)).toBe(true);
    expect(numbersIn('N45m and 3.5k and twenty-five').has(3_500)).toBe(true);
    expect(numbersIn('N45m and 3.5k and twenty-five').has(25)).toBe(true);
  });
});

function aService(opts: { read?: PlanRead[] } = {}) {
  const writes: string[] = [];
  const write = (name: string) => jest.fn(async () => { writes.push(name); return { id: `${name}-1` }; });
  const stored: any[] = [];
  let n = 0;
  const planProposal = {
    create: jest.fn(async ({ data }: any) => { const row = { id: `pp-${++n}`, editedAt: null, decidedAt: null, decidedByUserId: null, becameId: null, createdAt: new Date(n), ...data }; stored.push(row); return row; }),
    findMany: jest.fn(async ({ where }: any) => stored.filter((r) => r.groundId === where.groundId && r.status === where.status)),
    findFirst: jest.fn(async ({ where }: any) => stored.find((r) => r.id === where.id && r.groundId === where.groundId) ?? null),
    update: jest.fn(async ({ where, data }: any) => { const r = stored.find((x) => x.id === where.id); Object.assign(r, data); return r; }),
    updateMany: jest.fn(async ({ where, data }: any) => { const r = stored.find((x) => x.id === where.id && x.status === where.status); if (!r) return { count: 0 }; Object.assign(r, data); return { count: 1 }; }),
  };
  const prisma: any = {
    ground: { findUnique: jest.fn(async () => ({ id: 'g1', initiatorId: 'u-lead', status: 'OPEN', endState: null, participants: ROSTER })) },
    groundDocument: { findFirst: jest.fn(async () => ({ content: PLAN, fileName: 'Q4 plan.pdf', participantId: null, visibility: 'CLOSED' })) },
    groundParticipant: { update: write('GroundParticipant') },
    groundCommitment: { create: write('GroundCommitment') },
    groundContextItem: { create: write('GroundContextItem') },
    planProposal,
  };
  const board = { createObjective: jest.fn(async () => { writes.push('GroundObjective'); return { id: 'GroundObjective-1' }; }) };
  const moduleRef: any = { get: jest.fn((t: any) => (t === BoardService ? board : null)) };
  const anthropic: any = { extract: jest.fn(async () => ({ proposals: opts.read ?? READ })) };
  const config: any = { get: jest.fn(() => true) };
  return { svc: new APlanIsManyProposalsService(prisma, anthropic, config, moduleRef), writes, stored, prisma, board };
}

describe('the plan routes', () => {
  it('keep each proposal as waiting, serve it with its stored id, and write nothing else', async () => {
    const { svc, writes, stored } = aService();
    const got = await svc.read('g1', 'u-lead', { text: PLAN });
    expect(got.proposals).toHaveLength(5);
    expect(got.says).toBe("That's 5 things to confirm. Nothing goes into Context until you do.");
    expect(got.proposals.map((p) => p.id)).toEqual(['pp-1', 'pp-2', 'pp-3', 'pp-4', 'pp-5']);
    expect(stored.map((r) => [r.kind, r.status])).toEqual([['GOAL', 'PENDING'], ['ROLE', 'PENDING'], ['COMMITMENT', 'PENDING'], ['COMMITMENT', 'PENDING'], ['RULE', 'PENDING']]);
    expect(got.proposals[0].from).toBe('the plan you pasted');
    expect(stored[0].fromDocument).toBeNull();
    expect(writes).toEqual([]);
  });

  it('read an uploaded document the same way, and remember its name', async () => {
    const { svc, writes, stored } = aService();
    const got = await svc.read('g1', 'u-lead', { documentId: 'd1' });
    expect(got.proposals[0].heading).toBe('A goal, from Q4 plan.pdf. It would go in targets.');
    expect(stored[0].fromDocument).toBe('Q4 plan.pdf');
    expect(writes).toEqual([]);
  });

  it('list what is waiting, as the lead reads it', async () => {
    const { svc } = aService();
    await svc.read('g1', 'u-lead', { documentId: 'd1' });
    const { proposals } = await svc.waiting('g1', 'u-lead');
    expect(proposals).toHaveLength(5);
    expect(proposals[4]).toMatchObject({
      id: 'pp-5', kind: 'rule', status: 'PENDING',
      heading: 'A rule, from Q4 plan.pdf. It would go in how we work.',
      says: 'Drop a lead after three calls with no reply.',
      saidAs: "If they haven't replied after three calls, drop it and move on.",
    });
    expect(proposals[3].note).toBe('One name in it, Musa Bello, is not on this check-in. Add them, and this will go on too.');
  });

  it('refuse a participant and an admin who only reads, on every route', async () => {
    const { svc, writes } = aService();
    await svc.read('g1', 'u-lead', { text: PLAN });
    for (const who of ['u-samuel', 'u-admin']) {
      await expect(svc.read('g1', who, { text: PLAN })).rejects.toBeInstanceOf(ForbiddenException);
      await expect(svc.waiting('g1', who)).rejects.toBeInstanceOf(ForbiddenException);
      await expect(svc.confirm('g1', who, 'pp-5')).rejects.toBeInstanceOf(ForbiddenException);
      await expect(svc.notNow('g1', who, 'pp-5')).rejects.toBeInstanceOf(ForbiddenException);
      await expect(svc.edit('g1', who, 'pp-5', { says: 'Anything.' })).rejects.toBeInstanceOf(ForbiddenException);
    }
    expect(writes).toEqual([]);
  });

  it('confirm writes exactly one row, in the table each kind belongs in, and marks the proposal', async () => {
    const tables: string[] = [];
    for (const pid of ['pp-1', 'pp-2', 'pp-3', 'pp-5']) {
      const { svc, writes, stored } = aService();
      await svc.read('g1', 'u-lead', { text: PLAN });
      const got = await svc.confirm('g1', 'u-lead', pid);
      expect(writes).toHaveLength(1);
      const row = stored.find((r) => r.id === pid);
      expect(row).toMatchObject({ status: 'CONFIRMED', decidedByUserId: 'u-lead', becameId: got.wrote.id });
      expect(row.decidedAt).toBeInstanceOf(Date);
      tables.push(got.wrote.table);
    }
    expect(tables).toEqual(['GroundObjective', 'GroundParticipant', 'GroundCommitment', 'GroundContextItem']);
  });

  it('a second confirm is refused and writes nothing more', async () => {
    const { svc, writes } = aService();
    await svc.read('g1', 'u-lead', { text: PLAN });
    await svc.confirm('g1', 'u-lead', 'pp-5');
    await expect(svc.confirm('g1', 'u-lead', 'pp-5')).rejects.toThrow('That one is already confirmed.');
    expect(writes).toEqual(['GroundContextItem']);
  });

  it('writes the goal through the board with its number, and the commitment with its date as written', async () => {
    const { svc, board, prisma } = aService();
    await svc.read('g1', 'u-lead', { text: PLAN });
    await svc.confirm('g1', 'u-lead', 'pp-1');
    expect(board.createObjective).toHaveBeenCalledWith('g1', 'u-lead', { name: 'freezer sales', target: 25, ownerParticipantId: null });
    await svc.confirm('g1', 'u-lead', 'pp-3');
    expect(prisma.groundCommitment.create.mock.calls[0][0].data).toMatchObject({ participantId: 'p-samuel', text: 'call every butchery in Ikeja', whenSaid: 'Friday 10 October', explicit: false });
  });

  it('not now takes it off the waiting list, writes nothing, and it cannot then be confirmed', async () => {
    const { svc, writes, stored } = aService();
    await svc.read('g1', 'u-lead', { text: PLAN });
    const got = await svc.notNow('g1', 'u-lead', 'pp-2');
    expect(got.status).toBe('NOT_NOW');
    expect(stored[1]).toMatchObject({ status: 'NOT_NOW', decidedByUserId: 'u-lead' });
    expect((await svc.waiting('g1', 'u-lead')).proposals.map((p) => p.id)).toEqual(['pp-1', 'pp-3', 'pp-4', 'pp-5']);
    await expect(svc.confirm('g1', 'u-lead', 'pp-2')).rejects.toBeInstanceOf(BadRequestException);
    expect(writes).toEqual([]);
  });

  it('an edit is checked again against the plan\'s own words, and stays waiting', async () => {
    const { svc, writes, stored } = aService();
    await svc.read('g1', 'u-lead', { text: PLAN });
    const edited = await svc.edit('g1', 'u-lead', 'pp-5', { says: 'Drop a lead after three calls that get no reply.' });
    expect(edited).toMatchObject({ status: 'PENDING', says: 'Drop a lead after three calls that get no reply.' });
    expect(stored[4].editedAt).toBeInstanceOf(Date);
    await expect(svc.edit('g1', 'u-lead', 'pp-1', { fields: { number: 30 } })).rejects.toThrow("The number or the date is not in the plan's own words, so it was not changed.");
    await expect(svc.edit('g1', 'u-lead', 'pp-1', { fields: { date: '30 November' } })).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.edit('g1', 'u-lead', 'pp-1', { says: 'The team is to make 40 freezer sales by 31 December.' })).rejects.toThrow('Write it as one full sentence, with only the numbers the plan says, and try again.');
    expect(stored[0].says).toBe('The team is to make 25 freezer sales by 31 December.');
    /* An edited proposal is confirmed as edited. */
    await svc.confirm('g1', 'u-lead', 'pp-5');
    expect(writes).toEqual(['GroundContextItem']);
  });

  it('will not put somebody who is not on the check-in onto anybody else', async () => {
    const { svc, writes } = aService();
    await svc.read('g1', 'u-lead', { text: PLAN });
    await expect(svc.confirm('g1', 'u-lead', 'pp-4')).rejects.toThrow('Musa Bello is not on this check-in yet. Add them first, then confirm this.');
    expect(writes).toEqual([]);
  });
});

describe('the sentences the code writes when the model\'s cannot be trusted', () => {
  it('for a role and a commitment, as the lead reads them', () => {
    const [role, mine, nobodys] = proposalsFromAPlan(PLAN, [
      { ...READ[1], says: 'Aisha: Lagos supermarkets' },
      { ...READ[2], says: '' },
      { kind: 'commitment', says: '', fromThePlan: 'Samuel will call every butchery in Ikeja', what: 'call every butchery in Ikeja' },
    ], PEOPLE);
    expect(role.says).toBe('Aisha is responsible for the Lagos supermarkets.');
    expect(mine.says).toBe('Samuel will call every butchery in Ikeja by Friday 10 October.');
    expect(nobodys.says).toBe('Somebody will call every butchery in Ikeja.');
  });
});
