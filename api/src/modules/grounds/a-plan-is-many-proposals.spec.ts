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

  it('a goal confirmed with the lead\'s answer to "Is 25 something to reach, or a limit not to go over?" is written with it (decision 69)', async () => {
    const { svc, board } = aService();
    const got = await svc.read('g1', 'u-lead', { text: PLAN });
    expect(got.proposals[0].whichWay).toBe('What kind of number is 25? It can be something to reach, a limit not to go over, a share to keep at or above, a date to meet, or a count to keep at zero.');
    expect(got.proposals[0].directionSuggested).toBe('AIM');
    await svc.confirm('g1', 'u-lead', 'pp-1', { direction: 'LIMIT' });
    expect(board.createObjective).toHaveBeenCalledWith('g1', 'u-lead', { name: 'freezer sales', target: 25, ownerParticipantId: null, direction: 'LIMIT' });
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
    /* No direction sent with the confirm, so none is set (decision 69): the suggestion stays a suggestion. */
    expect(board.createObjective).toHaveBeenCalledWith('g1', 'u-lead', { name: 'freezer sales', target: 25, ownerParticipantId: null, direction: null });
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


/*
 * DUMPS AND DOCUMENTS (4 October 2026): the day of a date was kept as a target. "Racking installed by
 * 24 October" came back from the model as a goal with the number 24, and 24 is in the quote, so the
 * check let it through and the board showed a target of 24 on the person who owns the racking.
 */
describe('the day of a date is not a number to reach', () => {
  const PROJECT = 'Ibrahim Danjuma: racking installed by 24 October, power backup tested by 31 October. Zainab Musa counts 4,200 SKUs by 20 October.';
  const people = [{ id: 'pI', name: 'Ibrahim Danjuma' }, { id: 'pZ', name: 'Zainab Musa' }];
  it('reads a goal whose number is only the day of the date as a commitment with no number, and keeps a number that is in the quote beside it', () => {
    const out = proposalsFromAPlan(PROJECT, [
      { kind: 'goal', says: 'Ibrahim Danjuma is to have the racking installed by 24 October.', fromThePlan: 'racking installed by 24 October', personName: 'Ibrahim Danjuma', what: 'racking installed', number: 24, date: '24 October' },
      { kind: 'goal', says: 'Zainab Musa is to count 4,200 SKUs by 20 October.', fromThePlan: 'Zainab Musa counts 4,200 SKUs by 20 October', personName: 'Zainab Musa', what: 'SKUs counted', number: 4200, date: '20 October' },
    ], people);
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({ kind: 'commitment', landsIn: 'Commitments', fields: { personName: 'Ibrahim Danjuma', date: '24 October' } });
    expect(out[0].fields.number).toBeUndefined();
    expect(out[0].whichWay).toBeUndefined();
    expect(out[1]).toMatchObject({ kind: 'goal', fields: { personName: 'Zainab Musa', number: 4200, date: '20 October' } });
  });
});

/*
 * DECISION 92: THE PLAN PAGE TAKES QUESTIONS, DECISIONS AND DATES, the way the setup chat's paste reader does.
 * Said back as a card, stored only after a yes, on the right person, with nothing invented.
 */
describe('a plan also holds questions, decisions and dates', () => {
  const PLAN2 = `Planning notes for Q4.
The quarter ends 31 December.
Aisha - which accounts actually have a buying process?
Still to decide whether the Lagos target stays at 12m.
Kemi - how many of the Abuja shops have signed?
Who should we ask about pricing?`;
  const READ2: PlanRead[] = [
    { kind: 'date', says: 'ignored', fromThePlan: 'The quarter ends 31 December.', what: 'The quarter ends', date: '31 December' },
    { kind: 'question', says: 'ignored', fromThePlan: 'Aisha - which accounts actually have a buying process?', personName: 'Aisha', what: 'Aisha - which accounts actually have a buying process?' },
    { kind: 'decision', says: 'It is not decided yet whether the Lagos target stays at 12m.', fromThePlan: 'Still to decide whether the Lagos target stays at 12m.', what: 'whether the Lagos target stays at 12m' },
    { kind: 'question', says: 'x', fromThePlan: 'Kemi - how many of the Abuja shops have signed?', personName: 'Kemi', what: 'how many of the Abuja shops have signed?' },
  ];
  const out = proposalsFromAPlan(PLAN2, READ2, PEOPLE, { from: 'Q4 notes.pdf' });

  it('says each one back as the lead reads it, with where it would go', () => {
    expect(out.map((p) => p.kind)).toEqual(['date', 'question', 'decision', 'question']);
    expect(out[0].says).toBe('The quarter ends on 31 December.');
    expect(out[0].heading).toBe('A date, from Q4 notes.pdf. It would go in notes.');
    expect(out[1].says).toBe('Groundwork will ask Aisha: "Which accounts actually have a buying process?"');
    expect(out[1].heading).toBe('A question, from Q4 notes.pdf. It would go in questions you want asked.');
    expect(out[1].note).toBe('This question is not asked until you confirm it. You can confirm it, change it or leave it out.');
    expect(out[2].says).toBe('It is not decided yet whether the Lagos target stays at 12m.');
    expect(out[2].heading).toBe('A decision, from Q4 notes.pdf. It would go in still to decide.');
  });

  it('puts a question on the person it names, and a person who is not on the check-in is said, never guessed onto somebody else', () => {
    expect(out[1].fields.participantId).toBe('p-aisha');
    expect(out[3].fields.participantId).toBeUndefined();
    expect(out[3].note).toBe('One name in it, Kemi, is not on this check-in. Add them, and this will go on too.');
  });

  it('invents nothing: a question that is not in the plan, a question for nobody, and a date not as written are dropped', () => {
    const none = proposalsFromAPlan(PLAN2, [
      { kind: 'question', says: '', fromThePlan: 'Aisha - which accounts actually have a buying process?', personName: 'Aisha', what: 'Which accounts have signed a contract?' },
      { kind: 'question', says: '', fromThePlan: 'Who should we ask about pricing?', what: 'Who should we ask about pricing?' },
      { kind: 'date', says: '', fromThePlan: 'The quarter ends 31 December.', what: 'The quarter ends', date: '2026-12-31' },
      { kind: 'date', says: '', fromThePlan: 'The quarter ends 31 December.', what: 'The quarter ends' },
      { kind: 'question', says: '', fromThePlan: 'Still to decide whether the Lagos target stays at 12m.', personName: 'Aisha', what: 'Whether the Lagos target stays at 12m' },
    ], PEOPLE);
    expect(none).toEqual([]);
  });

  describe('through the routes', () => {
    it('are kept as waiting, written nowhere, and written once, on a yes, in the right place', async () => {
      const { svc, writes, stored, prisma } = aService({ read: READ2 });
      const got = await svc.read('g1', 'u-lead', { text: PLAN2 });
      expect(got.proposals).toHaveLength(4);
      expect(stored.map((r) => r.kind)).toEqual(['DATE', 'QUESTION', 'DECISION', 'QUESTION']);
      expect(writes).toEqual([]);
      await svc.confirm('g1', 'u-lead', 'pp-2');
      await svc.confirm('g1', 'u-lead', 'pp-3');
      await svc.confirm('g1', 'u-lead', 'pp-1');
      const made = prisma.groundContextItem.create.mock.calls.map((c: any) => c[0].data);
      expect(made[0]).toMatchObject({ kind: 'QUESTION_FOR_PERSON', aboutParticipantId: 'p-aisha', exactQuestion: 'Which accounts actually have a buying process?', audience: 'LEAD_ONLY' });
      expect(made[0].questionConfirmedAt).toBeUndefined();
      expect(made[1]).toMatchObject({ kind: 'DECISION', audience: 'EVERYONE', text: 'It is not decided yet whether the Lagos target stays at 12m.' });
      expect(made[2]).toMatchObject({ kind: 'NOTE', audience: 'EVERYONE', text: 'The quarter ends on 31 December.' });
    });
    it('a question for somebody not on the check-in is not written on anybody', async () => {
      const { svc, writes } = aService({ read: READ2 });
      await svc.read('g1', 'u-lead', { text: PLAN2 });
      await expect(svc.confirm('g1', 'u-lead', 'pp-4')).rejects.toThrow('Kemi is not on this check-in yet. Add them first, then confirm this.');
      expect(writes).toEqual([]);
    });
    it('a participant cannot read or confirm them', async () => {
      const { svc } = aService({ read: READ2 });
      await svc.read('g1', 'u-lead', { text: PLAN2 });
      await expect(svc.waiting('g1', 'u-samuel')).rejects.toBeInstanceOf(ForbiddenException);
      await expect(svc.confirm('g1', 'u-samuel', 'pp-2')).rejects.toBeInstanceOf(ForbiddenException);
    });
  });
});

describe('a private document is turned into shared notes only by the person who added it (decision 92)', () => {
  it('the plan page refuses a lead-only document that somebody else added, and says why', async () => {
    const { svc, prisma, writes } = aService();
    prisma.groundDocument.findFirst = jest.fn(async () => ({ content: PLAN, fileName: 'Q4 plan.pdf', participantId: 'p-aisha', visibility: 'CLOSED' }));
    await expect(svc.read('g1', 'u-lead', { documentId: 'd1' })).rejects.toThrow('Only the person who added this document can share what is in it, so nothing was shared.');
    expect(writes).toEqual([]);
  });
  it('and reads one the lead added, and one that is open to everyone', async () => {
    const { svc, prisma } = aService();
    prisma.ground.findUnique = jest.fn(async () => ({ id: 'g1', initiatorId: 'u-lead', status: 'OPEN', endState: null, participants: [...ROSTER, { id: 'p-lead', email: 'l@x.test', nameGiven: 'Wairimu', managingOnly: false, userId: 'u-lead', leftAt: null, user: { firstName: 'Wairimu', lastName: 'K' } }] }));
    prisma.groundDocument.findFirst = jest.fn(async () => ({ content: PLAN, fileName: 'Q4 plan.pdf', participantId: 'p-lead', visibility: 'CLOSED' }));
    expect((await svc.read('g1', 'u-lead', { documentId: 'd1' })).proposals).toHaveLength(5);
    prisma.groundDocument.findFirst = jest.fn(async () => ({ content: PLAN, fileName: 'Q4 plan.pdf', participantId: 'p-aisha', visibility: 'OPEN' }));
    expect((await svc.read('g1', 'u-lead', { documentId: 'd1' })).proposals).toHaveLength(5);
  });
});
