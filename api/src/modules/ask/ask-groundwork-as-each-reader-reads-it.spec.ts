import { askStarters } from '../assistant/ask-name';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { AssistantService } from '../assistant/assistant.service';
import { AskService, Asker, ONLY_YOURS, NOT_IN_IT, NOTHING_WAITING, SWITCHED_OFF, CONFIRM_YOUR_EMAIL, MADE_BY_GROUNDWORK } from './ask.service';
import { AskController } from './ask.controller';
import { whatAParticipantMayRead } from '../reports/the-judgement-is-the-leads';
import { overTimeForThisReader } from '../reports/what-the-record-shows-over-time';
import { whenItWas } from '../../common/a-date-reads-the-same-everywhere';
import {
  A_GUEST_CANNOT_ASK_FOR_THINGS, A_GUEST_ASKS_ONLY_ABOUT_THEIR_CHECK_IN, whatAGuestCanAsk,
} from './a-guest-asks-only-about-their-own-check-in';

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
  /* Kofi works at Harbor Foods and is a guest here, on "Sales team, Q3" only. His address is also on an
     unclaimed entry on this organisation's list, which must never become his. */
  kofi: { userId: 'u-kofi', email: 'kofi@harborfoods.test', organizationId: ORG, role: 'GUEST' },
};

/* The two check-ins' stored reports, as the lead's copy holds them. What a guest reads is cut from these by the served read. */
const STORED_REPORTS: Record<string, any> = {
  'g-sales': {
    theOpening: 'Three people have checked in on the sales pipeline, and two deals are close.',
    sharedPicture: 'SHARED-PICTURE: the long version.',
    agreements: [{ topic: 'Green Mart buys in January' }, 'Deposits come before delivery'],
    centralQuestion: 'Which deals close before 30 September?',
    theJudgement: { theGap: 'LEAD-JUDGEMENT: Miriam is carrying the quarter on her own.' },
    divergences: [{ topic: 'DIVERGENCE-SECRET: who owns Westgate Deli' }],
    findings: [
      { participantId: 'p-miriam', text: 'MIRIAM-FINDING: her own finding.' },
      { participantId: 'p-kofi', text: 'KOFI-FINDING: his own finding.' },
    ],
    inferences: ['INFERENCE-SECRET: nobody said this.'],
    overTime: {
      sessions: 2,
      commitments: [
        { participantId: 'p-kofi', who: 'you', what: 'send the price list', when: 'Friday', statedInSession: 1, restatedIn: [], status: 'OPEN', theySaidIt: true,
          say: 'You said in session 1 that you would send the Harbor Foods price list by Friday.' },
        { participantId: 'p-miriam', who: 'Miriam', what: 'call Westgate Deli', when: null, statedInSession: 1, restatedIn: [], status: 'OPEN', theySaidIt: true,
          say: 'MIRIAM-COMMITMENT: Miriam said she would call Westgate Deli.' },
      ],
      dependencies: [
        { what: 'delivery dates', from: 'you', fromParticipantId: 'p-kofi', on: 'Miriam', onParticipantId: 'p-miriam', sessionsWaiting: 1, chased: false, status: 'OPEN',
          say: 'You are waiting on Miriam for the delivery dates, since session 1.' },
        { what: 'finance sign-off', from: 'Miriam', fromParticipantId: 'p-miriam', on: null, onParticipantId: null, sessionsWaiting: 2, chased: false, status: 'OPEN',
          say: 'MIRIAM-WAIT: Miriam is waiting on finance.' },
      ],
      patterns: [{ participantId: 'p-miriam', say: 'PATTERN-SECRET: seen in three sessions.' }],
      gaps: [],
      stillOpen: ['LEAD-OPEN: the Westgate owner.'],
      cannotTellYou: [],
      toSettleFirst: ['SETTLE-SECRET: ask Miriam first.'],
    },
  },
  'g-lead': {
    theOpening: 'LEADERSHIP-ONLY: the leadership picture.',
    agreements: ['LEADERSHIP-ONLY: an agreement'],
    centralQuestion: 'LEADERSHIP-ONLY: a question?',
    overTime: { sessions: 1, commitments: [], dependencies: [], patterns: [], gaps: [], stillOpen: [], cannotTellYou: [], toSettleFirst: [] },
  },
};

/* Kofi's next check-in opens in three days. */
const KOFI_NEXT = new Date(Date.now() + 3 * 24 * 3600 * 1000);

function fixture(opts: { leakyReport?: boolean; contextInAsk?: boolean } = {}) {
  const db: Record<string, any[]> = {
    organization: [{ id: ORG, name: 'Baridi' }],
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
      { id: 'pe-kofi', organizationId: ORG, externalId: 'x-kofi', email: 'kofi@harborfoods.test', linkedUserId: null, active: true },
    ],
    organizationMembership: Object.values(readers).map((r) => ({ userId: r.userId, organizationId: r.organizationId, role: r.role })),
    user: Object.values(readers).map((r) => ({
      id: r.userId, email: r.email, firstName: r.userId.slice(2, 3).toUpperCase() + r.userId.slice(3), lastName: 'Test',
      isEmailVerified: r.userId !== 'u-uma',
    })),
    ground: [
      { id: 'g-sales', organizationId: ORG, label: 'Sales team, Q3', status: 'ACTIVE', scenario: 'REALIGN_TEAM', toldToParticipants: 'This check-in looks at how the sales pipeline is going this quarter.', brief: 'LEAD-BRIEF: push hard on the missed numbers.', initiatorId: 'u-wairimu', participantUserIds: ['u-wairimu', 'u-miriam', 'u-kofi'], createdAt: new Date(1) },
      { id: 'g-lead', organizationId: ORG, label: 'Leadership, Q3', status: 'ACTIVE', scenario: 'PIP', brief: 'LEADERSHIP-ONLY: the brief.', initiatorId: 'u-grace', participantUserIds: ['u-grace', 'u-wairimu'], createdAt: new Date(2) },
      { id: 'g-old', organizationId: ORG, label: 'Supplier review', status: 'CLOSED', initiatorId: 'u-wairimu', participantUserIds: ['u-wairimu', 'u-miriam'], createdAt: new Date(0) },
    ],
    assistantTurn: [
      { organizationId: ORG, personExternalId: 'x-miriam', role: 'person', content: 'MIRIAM-ASKED: Why is Green Mart next quarter?', createdAt: new Date(10) },
      { organizationId: ORG, personExternalId: 'x-miriam', role: 'assistant', content: 'MIRIAM-TOLD: Green Mart said January, in writing.', createdAt: new Date(11) },
      { organizationId: ORG, personExternalId: 'x-wairimu', role: 'person', content: 'WAIRIMU-ASKED: Will we reach 25?', createdAt: new Date(12) },
    ],
    assistantProposal: [],
    todo: [],
    groundParticipant: [
      { id: 'p-miriam', groundId: 'g-sales', userId: 'u-miriam' },
      { id: 'p-kofi', groundId: 'g-sales', userId: 'u-kofi' },
      { id: 'p-wairimu-lead', groundId: 'g-lead', userId: 'u-wairimu' },
    ],
    checkIn: [
      { id: 'c-kofi-1', participantId: 'p-kofi', sessionNumber: 1, status: 'COMPLETED', availableFrom: new Date(0) },
      { id: 'c-kofi-2', participantId: 'p-kofi', sessionNumber: 2, status: 'NOT_STARTED', availableFrom: KOFI_NEXT },
    ],
    /* What each person said they would do, in the check-in's own record. Kofi's own, Kofi's that the lead set, a finished one, and Miriam's. */
    personObjective: [
      { id: 'o-price', groundId: 'g-sales', participantId: 'p-kofi', kind: 'COMMITMENT', authoredBy: 'self', status: 'OPEN', text: 'Send the Harbor Foods price list', dueSaid: 'Friday', dueDate: null, createdAt: new Date(20) },
      { id: 'o-samples', groundId: 'g-sales', participantId: 'p-kofi', kind: 'TODO', authoredBy: 'self', status: 'OPEN', text: 'Ship the cold-chain samples', dueSaid: null, dueDate: null, createdAt: new Date(21) },
      { id: 'o-lead-set', groundId: 'g-sales', participantId: 'p-kofi', kind: 'TODO', authoredBy: 'lead', status: 'OPEN', text: 'LEAD-SET: reach forty cartons', dueSaid: null, dueDate: null, createdAt: new Date(22) },
      { id: 'o-finished', groundId: 'g-sales', participantId: 'p-kofi', kind: 'TODO', authoredBy: 'self', status: 'MET', text: 'Book the warehouse visit', dueSaid: null, dueDate: null, createdAt: new Date(23) },
      { id: 'o-miriam', groundId: 'g-sales', participantId: 'p-miriam', kind: 'COMMITMENT', authoredBy: 'self', status: 'OPEN', text: 'MIRIAM-COMMITMENT: call Westgate Deli', dueSaid: null, dueDate: null, createdAt: new Date(24) },
    ],
    recordEntry: [
      { participantId: 'p-kofi', checkInId: 'c-kofi-1', disputedAt: null, text: 'We shipped 40 cartons to Harbor Foods in August.', createdAt: new Date(30) },
      { participantId: 'p-kofi', checkInId: 'c-kofi-1', disputedAt: new Date(5), text: 'DISPUTED-LINE: we shipped nothing.', createdAt: new Date(31) },
      { participantId: 'p-kofi', checkInId: 'c-kofi-1', disputedAt: null, text: '[INFERRED: INFERRED-LINE nobody said this]', createdAt: new Date(32) },
      { participantId: 'p-miriam', checkInId: 'c-miriam-1', disputedAt: null, text: 'MIRIAM-LINE: Westgate is slow to pay.', createdAt: new Date(33) },
    ],
    commitment: [],
  };

  const eq = (row: any, where: any): boolean =>
    Object.entries(where ?? {}).every(([k, v]: [string, any]) => {
      if (k === 'OR') return (v as any[]).some((w) => eq(row, w));
      if (k === 'participants') return row.participantUserIds.includes(v.some.userId);
      if (v && typeof v === 'object' && 'notIn' in v) return !v.notIn.includes(row[k]);
      if (v && typeof v === 'object' && 'in' in v) return v.in.includes(row[k]);
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
    findUnique: jest.fn(async ({ where, select }: any) => pick(db[name].find((r) => (where.userId_organizationId
      ? r.userId === where.userId_organizationId.userId && r.organizationId === where.userId_organizationId.organizationId
      : r.id === where.id)) ?? null, select)),
  });
  const prisma: any = Object.fromEntries(Object.keys(db).map((k) => [k, table(k)]));
  /* `release.contextInAskGroundwork` is off as shipped: the line about adding context is read only when it is on. */
  prisma.platformSetting = { findUnique: jest.fn(async ({ where }: any) => (opts.contextInAsk && where.key === 'release.contextInAskGroundwork' ? { value: { on: true } } : null)) };
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
  /*
   * THE TWO READS A GUEST'S ANSWERS ARE BUILT FROM, doubled with the real rule the real reads apply:
   * a party who is not the lead gets the report with the lead's layer taken off and the record over
   * time narrowed to themselves. With `leakyReport` the read hands back the lead's whole row instead,
   * so the guest's own allowlist is tested as well as the read's.
   */
  const partyOf = (groundId: string, userId: string) => db.groundParticipant.find((p) => p.groundId === groundId && p.userId === userId) ?? null;
  const reports = {
    get: jest.fn(async (groundId: string, userId: string, _org?: string) => {
      const ground = db.ground.find((g) => g.id === groundId);
      const party = partyOf(groundId, userId);
      const isLead = ground?.initiatorId === userId;
      if (!ground || (!party && !isLead)) throw new ForbiddenException('You are not a participant in this check-in');
      const row = STORED_REPORTS[groundId];
      if (!row) throw new NotFoundException('Report not found');
      if (opts.leakyReport) return row;
      return {
        ...whatAParticipantMayRead(row, { isLead, participantId: party?.id ?? null }),
        overTime: overTimeForThisReader(row.overTime, { isLead, participantId: party?.id ?? null }),
      };
    }),
  };
  const grounds = {
    getMyCheckinStatus: jest.fn(async (groundId: string, userId: string) => {
      const party = partyOf(groundId, userId);
      if (!party) throw new ForbiddenException('You are not a participant in this check-in');
      const checkIns = db.checkIn.filter((c) => c.participantId === party.id);
      return { participantId: party.id, partyType: null, checkIns, latestStatus: null, latestSessionNumber: null };
    }),
  };
  const ask = new AskService(prisma, assistant, reports as any, grounds as any);
  const controller = new AskController(ask);
  const asUser = (r: typeof readers[string]) => ({
    id: r.userId, email: r.email, organizationId: r.organizationId, role: r.role,
    firstName: '', lastName: '', isPlatformAdmin: !!r.isPlatformAdmin,
  });
  return { db, ask, controller, asUser, prisma, reports, grounds };
}

/* Ask is named for the organisation (decision 100): what every reader of the Baridi organisation is served beside the questions. */
const BARIDI_ASK = {
  askName: 'Ask Baridi',
  caption: 'Ask about the company, your work or your check-ins.',
  /* Left out while `release.contextInAskGroundwork` is off, which is how it ships. */
  addLine: null,
  /* Decision 101: four of the five need a check-in, so a reader with none is left with the one
     that does not. One true starter rather than four invented ones. */
  starters: ["What are the company's priorities right now?", 'Ask for leave, or to spend money.'],
};
/* And the five, in Hafsah's order, for somebody who has a check-in. */
/* As shipped, with the switch for context in Ask off, the starter about adding context is left out. */
const STARTERS_WITH_A_CHECK_IN_AND_CONTEXT = [
  'What did I say I would do?',
  'What is my check-in for, and who reads it?',
  'When is my next check-in?',
  "What are the company's priorities right now?",
  'Add a document or some context to my check-in.',
  'Ask for leave, or to spend money.',
];
const STARTERS_WITH_A_CHECK_IN = STARTERS_WITH_A_CHECK_IN_AND_CONTEXT.filter((l) => !/context/.test(l));
/* As shipped, with adding context hidden (`release.contextInAskGroundwork` off): nothing is offered that cannot be done. */
const BARIDI_WELCOME = 'This is Ask Baridi. I answer about the whole organisation and about your own work, and you can point me at one of your check-ins whenever you want to. Ask me about the company, about your work, or about your check-ins. You can also ask me for leave or to spend money. What you ask me stays private.';
const BARIDI_WELCOME_WITH_CONTEXT = 'This is Ask Baridi. I answer about the whole organisation and about your own work, and you can point me at one of your check-ins whenever you want to. Ask me about the company, about your work, or about your check-ins. You can add context or a document to one of your check-ins here, and ask for leave or to spend money. What you ask me stays private. Anything you choose to add to a check-in works differently. I say it back to you first, it goes in only once you say yes, and from then on it is part of that check-in.';

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
    expect(tom).toEqual({ canAsk: true, about: [], turns: [], ...BARIDI_ASK, welcome: BARIDI_WELCOME });
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
    expect(await controller.mine(asUser(readers.uma))).toEqual({ canAsk: false, why: CONFIRM_YOUR_EMAIL('Ask Baridi'), about: [], turns: [], ...BARIDI_ASK, welcome: null });
    await expect(controller.question(asUser(readers.uma), { message: REQUEST })).rejects.toThrow(new ForbiddenException(CONFIRM_YOUR_EMAIL('Ask Baridi')));
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
      expect(await controller.mine(asUser(readers[who]))).toEqual({ canAsk: false, why: SWITCHED_OFF('Ask Baridi'), about: [], turns: [], ...BARIDI_ASK, welcome: null });
      await expect(controller.question(asUser(readers[who]), { message: REQUEST })).rejects.toThrow(new ForbiddenException(SWITCHED_OFF('Ask Baridi')));
      await expect(controller.answer(asUser(readers[who]), { proposalId: '00000000-0000-4000-8000-000000000999', answer: 'yes' }))
        .rejects.toThrow(new ForbiddenException(SWITCHED_OFF('Ask Baridi')));
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

/*
 * Decision 36: a guest from another organisation is never added to the list, and Ask works only
 * within their check-in.
 *
 * CHANGED 28 SEPTEMBER 2026, AND WHY. This block used to pin a refusal: Kofi was told "You are here
 * as a guest from another organisation, so Ask Groundwork does not answer you here", because the
 * assistant needs an entry on the host's list. The decision says Ask Groundwork works for a guest
 * within their own check-in, so he is now answered, only about "Sales team, Q3", from the reads that
 * check-in already serves him. What the old block protected still holds, and is asserted below: no
 * entry is made or claimed for him, and nothing outside his check-in reaches him.
 */
describe('a guest from another organisation', () => {
  const kofiAsks = async (f: ReturnType<typeof fixture>, message: string, groundId?: string) => {
    const reply: any = await f.controller.question(f.asUser(readers.kofi), { message, groundId });
    return reply.blocks.map((b: any) => b.body).join('\n');
  };

  it('can ask, about his own check-in and nothing else', async () => {
    const { controller, asUser } = fixture();
    /* A guest reads the host organisation's name too: he is a guest in Baridi's Groundwork, and
       the sentence he is already given says "so Ask Baridi can only answer...". (Decision 100.) */
    expect(await controller.mine(asUser(readers.kofi))).toEqual({
      canAsk: true, about: [{ id: 'g-sales', label: 'Sales team, Q3' }], turns: [], ...BARIDI_ASK, starters: STARTERS_WITH_A_CHECK_IN, welcome: BARIDI_WELCOME,
    });
  });

  it('gets real answers about his own check-in, in plain sentences', async () => {
    const f = fixture();
    expect(await kofiAsks(f, 'What did we agree?')).toBe(
      'The report on Sales team, Q3 says you agree on these things.\nGreen Mart buys in January.\nDeposits come before delivery.',
    );
    expect(await kofiAsks(f, 'What did I commit to?')).toBe(
      'This is what you said you would do in Sales team, Q3.\nYou said in session 1 that you would send the Harbor Foods price list by Friday.',
    );
    expect(await kofiAsks(f, 'What is stuck?')).toBe(
      'This is what is waiting in Sales team, Q3, for you or on you.\nYou are waiting on Miriam for the delivery dates, since session 1.',
    );
    expect(await kofiAsks(f, 'When is my next check-in?')).toBe(
      `Your next check-in on Sales team, Q3 opens on ${whenItWas(KOFI_NEXT, 'weekdayAndDay')}.`,
    );
    expect(await kofiAsks(f, 'What does the report say?')).toBe(
      'This is what the report on Sales team, Q3 says.\nThree people have checked in on the sales pipeline, and two deals are close.\nThe question it leaves for everybody is this one. Which deals close before 30 September?',
    );
    expect(await kofiAsks(f, 'hello')).toBe(whatAGuestCanAsk('Sales team, Q3'));
  });

  it('every answer is read as him, never as anybody else, and only about his check-in', async () => {
    const f = fixture();
    for (const q of ['What did we agree?', 'What did I commit to?', 'What is stuck?', 'What does the report say?', 'When is my next check-in?']) {
      await kofiAsks(f, q, 'g-sales');
    }
    for (const [groundId, userId] of f.reports.get.mock.calls) expect([groundId, userId]).toEqual(['g-sales', 'u-kofi']);
    for (const [groundId, userId] of f.grounds.getMyCheckinStatus.mock.calls) expect([groundId, userId]).toEqual(['g-sales', 'u-kofi']);
  });

  it('never reads the lead\'s judgement, a colleague\'s finding, commitment or wait, or the lead\'s own reads', async () => {
    const SECRETS = /LEAD-|MIRIAM-|DIVERGENCE-|INFERENCE-|PATTERN-|SETTLE-|KOFI-FINDING|SHARED-PICTURE|LEADERSHIP-/;
    for (const leakyReport of [false, true]) {
      /* Leaky: the report read hands back the lead's whole row, and the guest's own answer still takes only its four fields. */
      const f = fixture({ leakyReport });
      const said: string[] = [];
      for (const q of ['What did we agree?', 'What did I commit to?', 'What is stuck?', 'What does the report say?', 'How is Miriam doing?', 'What should I do next?']) {
        said.push(await kofiAsks(f, q));
      }
      expect(said.join('\n')).not.toMatch(SECRETS);
      expect(JSON.stringify(await f.controller.mine(f.asUser(readers.kofi)))).not.toMatch(SECRETS);
    }
  });

  it('cannot ask about a check-in he is not in, and nothing of it is read', async () => {
    const f = fixture();
    await expect(f.controller.question(f.asUser(readers.kofi), { message: 'What did we agree?', groundId: 'g-lead' }))
      .rejects.toThrow(new ForbiddenException(NOT_IN_IT));
    expect(f.reports.get).not.toHaveBeenCalled();
    expect(f.grounds.getMyCheckinStatus).not.toHaveBeenCalled();
  });

  it('is told plainly that he cannot ask about the organisation, its people or its other check-ins', async () => {
    const f = fixture();
    for (const q of ['Who works here?', 'What are the other check-ins about?', 'Show me the list of people', 'What is the company working on?']) {
      expect(await kofiAsks(f, q)).toBe(A_GUEST_ASKS_ONLY_ABOUT_THEIR_CHECK_IN('Ask Baridi'));
    }
    expect(f.reports.get).not.toHaveBeenCalled();
    expect(f.prisma.subject.findMany).not.toHaveBeenCalled();
  });

  it('cannot make anything happen on the host: no to-do, no request waiting for a yes, no objective', async () => {
    const f = fixture();
    for (const q of ['remind me to call Kariuki about the deposit', 'Add a to-do for my next check-in', 'Create an objective for Q4', 'Invite my colleague Ama']) {
      expect(await kofiAsks(f, q, 'g-sales')).toBe(A_GUEST_CANNOT_ASK_FOR_THINGS('Ask Baridi'));
    }
    await expect(f.controller.answer(f.asUser(readers.kofi), { proposalId: '00000000-0000-4000-8000-000000000999', answer: 'yes' }))
      .rejects.toThrow(new ConflictException(NOTHING_WAITING));
    expect(f.db.todo).toEqual([]);
    expect(f.db.assistantProposal).toEqual([]);
    /* The only thing written is his own question and its answer, under his own key. */
    expect(new Set(f.db.assistantTurn.slice(3).map((t) => t.personExternalId))).toEqual(new Set(['guest:u-kofi']));
  });

  it('never creates, claims or even looks up an entry on this organisation\'s list, even one with his address', async () => {
    const f = fixture();
    for (const q of ['What did we agree?', 'When is my next check-in?', 'remind me to call Kariuki', 'what is everybody working on?']) await kofiAsks(f, q);
    await f.controller.mine(f.asUser(readers.kofi));
    expect(f.prisma.person.create).not.toHaveBeenCalled();
    expect(f.prisma.person.updateMany).not.toHaveBeenCalled();
    expect(f.prisma.person.findFirst).not.toHaveBeenCalled();
    expect(f.db.person.find((p) => p.id === 'pe-kofi')!.linkedUserId).toBeNull();
    expect(f.db.person.filter((p) => p.linkedUserId === 'u-kofi')).toEqual([]);
  });

  it('reads back his own questions and answers, and nobody else does', async () => {
    const f = fixture();
    await kofiAsks(f, 'KOFI-ASKED what did we agree?');
    const his = await f.controller.mine(f.asUser(readers.kofi));
    expect(his.turns.map((t) => t.from)).toEqual(['you', 'groundwork']);
    expect(his.turns[0].says).toBe('KOFI-ASKED what did we agree?');
    expect(everything(his)).not.toMatch(/MIRIAM-|WAIRIMU-/);
    for (const who of ['wairimu', 'miriam', 'grace', 'sam']) {
      expect(everything(await f.controller.mine(f.asUser(readers[who])))).not.toContain('KOFI-ASKED');
    }
    await expect(f.controller.someone(f.asUser(readers.wairimu), 'u-kofi')).rejects.toThrow(new ForbiddenException(ONLY_YOURS));
  });

  it('and an entry somebody gave his key to reads none of it, and keeps nothing under it', async () => {
    const f = fixture();
    await kofiAsks(f, 'KOFI-ASKED what is stuck?');
    /* Mallory is a member whose entry the directory gave the external id "guest:u-kofi". */
    f.db.organizationMembership.push({ userId: 'u-mallory', organizationId: ORG, role: 'MEMBER' });
    f.db.user.push({ id: 'u-mallory', email: 'mallory@baridi.test', firstName: 'Mallory', lastName: 'Test', isEmailVerified: true });
    f.db.person.push({ id: 'pe-mallory', organizationId: ORG, externalId: 'guest:u-kofi', email: 'mallory@baridi.test', linkedUserId: 'u-mallory', active: true });
    const mallory = { userId: 'u-mallory', email: 'mallory@baridi.test', organizationId: ORG, role: 'MEMBER' };
    expect(everything(await f.controller.mine(f.asUser(mallory)))).not.toContain('KOFI-ASKED');
    const before = f.db.assistantTurn.length;
    await f.controller.question(f.asUser(mallory), { message: 'what did I say about the deposit' }).catch(() => null);
    expect(f.db.assistantTurn.length).toBe(before);
  });

  it('while a member of the organisation with no entry still gets one made, and the assistant answers him, as before', async () => {
    const { controller, asUser, db, reports } = fixture();
    const reply: any = await controller.question(asUser(readers.tom), { message: 'remind me to call Kariuki about the deposit' });
    expect(reply.blocks.some((b: any) => b.type === 'proposal')).toBe(true);
    expect(db.person.filter((p) => p.linkedUserId === 'u-tom')).toHaveLength(1);
    expect(reports.get).not.toHaveBeenCalled();
  });
});

/*
 * WEEK 24 (decision 36): everything a guest can reach is scoped to their own check-in and their own
 * work in it. Each lane the guest may use is read below as Kofi reads it, with the words he is shown,
 * and each lane he may not use is refused. The host's member is checked last, to show nothing moved.
 */
describe('a guest asks about their own work in their own check-in (week 24)', () => {
  const kofiAsks = async (f: ReturnType<typeof fixture>, message: string, groundId?: string) => {
    const reply: any = await f.controller.question(f.asUser(readers.kofi), { message, groundId });
    return reply.blocks.map((b: any) => b.body ?? b.summary).join('\n');
  };
  const kofiAnswers = async (f: ReturnType<typeof fixture>, proposalId: string, answer: 'yes' | 'no') =>
    ((await f.controller.answer(f.asUser(readers.kofi), { proposalId, answer })) as any).blocks.map((b: any) => b.body).join('\n');
  const proposalOf = async (f: ReturnType<typeof fixture>, message: string) => {
    const reply: any = await f.controller.question(f.asUser(readers.kofi), { message });
    return { reply, said: reply.blocks[0].body as string, id: reply.blocks.find((b: any) => b.type === 'proposal')?.proposalId as string };
  };
  const LEAKS = /MIRIAM-|LEAD-BRIEF|LEAD-SET|DISPUTED-LINE|INFERRED-LINE|LEADERSHIP-|LEAD-JUDGEMENT/;

  describe('what he said', () => {
    it('reads his own lines back, never a line he disputed, one the product only inferred, or anybody else\'s', async () => {
      const f = fixture();
      const said = await kofiAsks(f, 'What did I say?');
      expect(said).toBe('This is what you said in Sales team, Q3, as it is on your record.\nWe shipped 40 cartons to Harbor Foods in August.');
      expect(said).not.toMatch(LEAKS);
    });

    it('says plainly when there is nothing yet', async () => {
      const f = fixture();
      f.db.recordEntry.length = 0;
      expect(await kofiAsks(f, 'what have I said so far?')).toBe(
        'There is nothing from you on the record for Sales team, Q3 yet. What you say in a check-in is added once you have finished it.',
      );
    });
  });

  describe('what the check-in is for, and who reads what he says', () => {
    it('tells him what a participant is told, never the lead\'s own brief', async () => {
      const f = fixture();
      const said = await kofiAsks(f, 'What is this check-in for?');
      expect(said).toBe('This is what you were told about Sales team, Q3.\nThis check-in looks at how the sales pipeline is going this quarter.');
      expect(said).not.toMatch(LEAKS);
    });

    it('where the lead wrote nothing for participants, says only what it has', async () => {
      const f = fixture();
      f.db.ground.find((g) => g.id === 'g-sales')!.toldToParticipants = null;
      f.db.ground.find((g) => g.id === 'g-sales')!.brief = null;
      expect(await kofiAsks(f, 'what was I told about this check-in?')).toBe(
        'You were not given anything more about Sales team, Q3 than its name. If you want to know more, ask the person who invited you.',
      );
    });

    it('tells him who reads it, in the words the join page uses, with the admins sentence only where it is true', async () => {
      const f = fixture();
      const said = await kofiAsks(f, 'Who reads what I say?');
      expect(said).toBe(
        'The people in Sales team, Q3, including the person who runs it, can see what you say in it. Admins of the organisation that runs this check-in can read every check-in. '
        + 'Your own report and your questions to Ask Baridi stay private. '
        + 'What you say is used to build the shared picture for this check-in and nothing else, and it does not train a model. '
        + 'Your answers are stored on our servers, and they are processed by Google\'s models to build the record.',
      );
      /* A performance plan: admins do not read it. */
      f.db.ground.find((g) => g.id === 'g-sales')!.scenario = 'PIP';
      expect(await kofiAsks(f, 'what happens with what I say?')).not.toContain('Admins');
      /* A kind not known reads as the more private one. */
      f.db.ground.find((g) => g.id === 'g-sales')!.scenario = undefined;
      expect(await kofiAsks(f, 'is what I say private?')).not.toContain('Admins');
    });

    it('does not turn "does the organisation read it" into a refusal, and still refuses "who are the other people here"', async () => {
      const f = fixture();
      expect(await kofiAsks(f, 'Does the organisation see what I say?')).toContain('can see what you say in it');
      expect(await kofiAsks(f, 'Who else can see the other check-ins?')).toBe(A_GUEST_ASKS_ONLY_ABOUT_THEIR_CHECK_IN('Ask Baridi'));
    });
  });

  describe('what to do next', () => {
    it('is one of his own commitments, with the rest counted, and never somebody else\'s or one the lead set', async () => {
      const f = fixture();
      const said = await kofiAsks(f, 'What should I do next?');
      expect(said).toBe(
        'Start with "Send the Harbor Foods price list". You said you would do it, and you said Friday. After that, one more thing is still open in Sales team, Q3. Ask me what you said you would do to see them.\n\n'
        + 'This is from the commitments you have made in Sales team, Q3.',
      );
      expect(said).not.toMatch(LEAKS);
    });

    it('says so when nothing of his is open', async () => {
      const f = fixture();
      f.db.personObjective.filter((o) => o.participantId === 'p-kofi').forEach((o) => { o.status = 'MET'; });
      expect(await kofiAsks(f, 'What should I do next?')).toBe(
        'You have not said you would do anything in Sales team, Q3 that is still open, so I have nothing to put first.',
      );
    });
  });

  describe('marking his own commitment done, said back and written only on a yes', () => {
    it('says it back first, and writes nothing until he says yes', async () => {
      const f = fixture();
      const { said, id } = await proposalOf(f, 'Mark the price list as done');
      expect(said).toBe('Shall I mark "Send the Harbor Foods price list" as done?');
      expect(f.db.personObjective.find((o) => o.id === 'o-price')!.status).toBe('OPEN');
      expect(f.db.assistantProposal).toHaveLength(1);
      expect(f.db.assistantProposal[0]).toMatchObject({ personExternalId: 'guest:u-kofi', organizationId: ORG, state: 'PARKED' });
      expect(await kofiAnswers(f, id, 'yes')).toBe('I have marked "Send the Harbor Foods price list" as done.');
      expect(f.db.personObjective.find((o) => o.id === 'o-price')!.status).toBe('MET');
      expect(f.db.assistantProposal[0].state).toBe('ACCEPTED');
    });

    it('a no leaves it as it was', async () => {
      const f = fixture();
      const { id } = await proposalOf(f, 'done: the price list');
      expect(await kofiAnswers(f, id, 'no')).toBe('I have left it as it was. Nothing was changed.');
      expect(f.db.personObjective.find((o) => o.id === 'o-price')!.status).toBe('OPEN');
    });

    it('a yes cannot be used twice, nor after he asks something else', async () => {
      const f = fixture();
      const first = await proposalOf(f, 'Mark the price list as done');
      await kofiAsks(f, 'When is my next check-in?');
      await expect(kofiAnswers(f, first.id, 'yes')).rejects.toThrow(new ConflictException(NOTHING_WAITING));
      expect(f.db.personObjective.find((o) => o.id === 'o-price')!.status).toBe('OPEN');
      const second = await proposalOf(f, 'Mark the price list as done');
      await kofiAnswers(f, second.id, 'yes');
      await expect(kofiAnswers(f, second.id, 'yes')).rejects.toThrow(ConflictException);
    });

    it('reaches only what he said himself: not Miriam\'s, not one the lead set, not one already finished', async () => {
      const f = fixture();
      for (const q of ['Mark call Westgate Deli as done', 'Mark reach forty cartons as done', 'Mark book the warehouse visit as done']) {
        const said = await kofiAsks(f, q);
        expect(said).toMatch(/^Nothing you said you would do in Sales team, Q3 reads like/);
        expect(said).not.toMatch(LEAKS);
      }
      expect(f.db.assistantProposal).toEqual([]);
      expect(f.db.personObjective.map((o) => o.status)).toEqual(['OPEN', 'OPEN', 'OPEN', 'MET', 'OPEN']);
    });

    it('is dropped, and writes nothing, if the commitment is no longer his to close when he says yes', async () => {
      const f = fixture();
      const { id } = await proposalOf(f, 'Mark the price list as done');
      f.db.personObjective.find((o) => o.id === 'o-price')!.status = 'DROPPED';
      expect(await kofiAnswers(f, id, 'yes')).toBe('"Send the Harbor Foods price list" is no longer open for you here, so I have changed nothing.');
      expect(f.db.personObjective.find((o) => o.id === 'o-price')!.status).toBe('DROPPED');
    });

    it('asks which, when more than one could be meant', async () => {
      const f = fixture();
      f.db.personObjective.push({ id: 'o-price-2', groundId: 'g-sales', participantId: 'p-kofi', kind: 'TODO', authoredBy: 'self', status: 'OPEN', text: 'Send the Westgate price list', dueSaid: null, dueDate: null, createdAt: new Date(25) });
      const said = await kofiAsks(f, 'Mark the price list as done');
      expect(said).toBe('More than one of these could be it. Which?\n- Send the Harbor Foods price list\n- Send the Westgate price list');
    });
  });

  describe('moving the day on his own commitment, said back and written only on a yes', () => {
    it('says the exact change back, and moves it only on a yes', async () => {
      const f = fixture();
      const { said, id } = await proposalOf(f, 'Move the price list to Friday');
      expect(said).toMatch(/^Shall I move "Send the Harbor Foods price list" from "Friday" to [A-Z][a-z]+ \d{1,2} [A-Z][a-z]+( \d{4})?\?$/);
      expect(f.db.personObjective.find((o) => o.id === 'o-price')!.dueDate).toBeNull();
      const done = await kofiAnswers(f, id, 'yes');
      expect(done).toMatch(/^I have moved "Send the Harbor Foods price list" to /);
      const row = f.db.personObjective.find((o) => o.id === 'o-price')!;
      expect(row.dueDate).toBeInstanceOf(Date);
      expect(row.dueSaid).toBe('Friday');
    });

    it('asks for the day when it cannot be read, and never writes a guess', async () => {
      const f = fixture();
      expect(await kofiAsks(f, 'Move the price list to soon')).toBe('I could not read a date from "soon". Which day do you mean? For example, Tuesday 7 October.');
      expect(await kofiAsks(f, 'Move the price list to 1 January 2020')).toMatch(/has already passed\. Which day do you mean\?$/);
      expect(f.db.assistantProposal).toEqual([]);
    });

    it('cannot move a colleague\'s commitment', async () => {
      const f = fixture();
      expect(await kofiAsks(f, 'Move call Westgate Deli to Friday')).toMatch(/^Nothing you said you would do in Sales team, Q3 reads like/);
      expect(f.db.assistantProposal).toEqual([]);
    });
  });

  describe('whatever a guest does, it stays inside their own check-in and their own key', () => {
    it('refuses, with one plain sentence that says what he can ask about, everything outside', async () => {
      const f = fixture();
      for (const q of ['Who works here?', 'What are the other check-ins about?', 'Show me the list of people', 'What is the company working on?', 'What did Miriam say?', 'What does the organisation remember about Westgate?']) {
        const said = await kofiAsks(f, q);
        expect(said === A_GUEST_ASKS_ONLY_ABOUT_THEIR_CHECK_IN('Ask Baridi') || said === whatAGuestCanAsk('Sales team, Q3')).toBe(true);
        expect(said).not.toMatch(LEAKS);
      }
      expect(A_GUEST_ASKS_ONLY_ABOUT_THEIR_CHECK_IN('Ask Baridi')).toContain('what you said');
      expect(A_GUEST_ASKS_ONLY_ABOUT_THEIR_CHECK_IN('Ask Baridi')).toContain('who reads what you say');
      expect(A_GUEST_ASKS_ONLY_ABOUT_THEIR_CHECK_IN('Ask Baridi').split(/(?<=[.!?])\s/)).toHaveLength(1);
    });

    it('refuses to add things or change targets, and says what he can do instead', async () => {
      const f = fixture();
      for (const q of ['Add a to-do for my next check-in', 'Create an objective for Q4', 'Change the target to 30']) {
        expect(await kofiAsks(f, q, 'g-sales')).toBe(A_GUEST_CANNOT_ASK_FOR_THINGS('Ask Baridi'));
      }
      expect(A_GUEST_CANNOT_ASK_FOR_THINGS('Ask Baridi')).toContain('mark one of your own commitments as done or move its day');
      expect(f.db.todo).toEqual([]);
      expect(f.db.assistantProposal).toEqual([]);
    });

    it('cannot reach another check-in for any of the new questions, and nothing of it is read', async () => {
      const f = fixture();
      for (const q of ['What did I say?', 'What is this check-in for?', 'Who reads what I say?', 'What should I do next?', 'Mark the price list as done', 'Move the price list to Friday']) {
        await expect(f.controller.question(f.asUser(readers.kofi), { message: q, groundId: 'g-lead' })).rejects.toThrow(new ForbiddenException(NOT_IN_IT));
      }
      expect(f.prisma.personObjective.findMany).not.toHaveBeenCalled();
      expect(f.prisma.recordEntry.findMany).not.toHaveBeenCalled();
    });

    it('reads every record only with his own participant, in his own check-in', async () => {
      const f = fixture();
      for (const q of ['What did I say?', 'What should I do next?', 'Mark the price list as done']) await kofiAsks(f, q);
      for (const [arg] of f.prisma.personObjective.findMany.mock.calls) expect(arg.where).toMatchObject({ groundId: 'g-sales', participantId: 'p-kofi', authoredBy: 'self' });
      for (const [arg] of f.prisma.recordEntry.findMany.mock.calls) expect(arg.where).toMatchObject({ participantId: 'p-kofi', disputedAt: null });
    });

    it('reads nothing on the host\'s list, in the host\'s to-dos, commitments or subjects, and makes no entry for him', async () => {
      const f = fixture();
      const { id } = await proposalOf(f, 'Mark the price list as done');
      await kofiAnswers(f, id, 'yes');
      for (const q of ['What did I say?', 'What is this check-in for?', 'Who reads what I say?', 'What should I do next?']) await kofiAsks(f, q);
      expect(f.prisma.person.create).not.toHaveBeenCalled();
      expect(f.prisma.person.findFirst).not.toHaveBeenCalled();
      expect(f.prisma.person.findMany).not.toHaveBeenCalled();
      expect(f.prisma.todo.create).not.toHaveBeenCalled();
      expect(f.prisma.todo.findMany).not.toHaveBeenCalled();
      expect(f.prisma.subject.findMany).not.toHaveBeenCalled();
      expect(f.db.person.filter((p) => p.linkedUserId === 'u-kofi')).toEqual([]);
    });

    it('keeps every question, every answer and every waiting request under his own key, and nobody else reads them', async () => {
      const f = fixture();
      const before = f.db.assistantTurn.length;
      const { id } = await proposalOf(f, 'Mark the price list as done');
      await kofiAnswers(f, id, 'yes');
      await kofiAsks(f, 'KOFI-ASKED what did I say?');
      expect(new Set(f.db.assistantTurn.slice(before).map((t) => t.personExternalId))).toEqual(new Set(['guest:u-kofi']));
      expect(new Set(f.db.assistantProposal.map((r) => r.personExternalId))).toEqual(new Set(['guest:u-kofi']));
      for (const who of ['wairimu', 'miriam', 'grace', 'sam']) {
        expect(everything(await f.controller.mine(f.asUser(readers[who])))).not.toMatch(/KOFI-ASKED|Send the Harbor Foods price list/);
      }
    });

    it('a request waiting for a guest\'s yes cannot be answered by anybody else, and a guest cannot answer anybody else\'s', async () => {
      const f = fixture();
      const { id } = await proposalOf(f, 'Mark the price list as done');
      await expect(f.controller.answer(f.asUser(readers.miriam), { proposalId: id, answer: 'yes' })).rejects.toThrow(ConflictException);
      await expect(f.controller.answer(f.asUser(readers.wairimu), { proposalId: id, answer: 'yes' })).rejects.toThrow(ConflictException);
      expect(f.db.personObjective.find((o) => o.id === 'o-price')!.status).toBe('OPEN');
      /* Miriam's own waiting request, which Kofi cannot answer. */
      const reply: any = await f.controller.question(f.asUser(readers.miriam), { message: 'remind me to call Kariuki about the deposit' });
      const hers = reply.blocks.find((b: any) => b.type === 'proposal').proposalId;
      await expect(f.controller.answer(f.asUser(readers.kofi), { proposalId: hers, answer: 'yes' })).rejects.toThrow(new ConflictException(NOTHING_WAITING));
    });

    it('a guest whose place in the check-in has gone writes nothing on a yes', async () => {
      const f = fixture();
      const { id } = await proposalOf(f, 'Mark the price list as done');
      f.db.ground.find((g) => g.id === 'g-sales')!.status = 'CLOSED';
      await expect(kofiAnswers(f, id, 'yes')).resolves.toContain('no longer open for you here');
      expect(f.db.personObjective.find((o) => o.id === 'o-price')!.status).toBe('OPEN');
    });
  });

  describe('a member of the host organisation is unaffected', () => {
    it('Miriam is still answered by the assistant, with no guest lane, and her own yes still works', async () => {
      const f = fixture();
      const reply: any = await f.controller.question(f.asUser(readers.miriam), { message: 'remind me to call Kariuki about the deposit' });
      expect(reply.lane).not.toMatch(/^guest_/);
      const id = reply.blocks.find((b: any) => b.type === 'proposal').proposalId;
      const done: any = await f.controller.answer(f.asUser(readers.miriam), { proposalId: id, answer: 'yes' });
      expect(done.lane).not.toMatch(/^guest_/);
      expect(f.reports.get).not.toHaveBeenCalled();
      expect(f.db.assistantProposal.every((r) => r.personExternalId !== 'guest:u-miriam')).toBe(true);
    });

    it('and the words that mean something to a guest still reach the assistant for a member', async () => {
      const f = fixture();
      for (const q of ['What should I do next?', 'What did I say?']) {
        await f.controller.question(f.asUser(readers.miriam), { message: q }).catch(() => null);
      }
      expect(f.prisma.personObjective.findMany).not.toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ participantId: 'p-kofi' }) }));
      expect(f.db.assistantTurn.filter((t) => t.personExternalId === 'guest:u-miriam')).toEqual([]);
    });
  });
});

/* The detectors read what people asked Ask Groundwork. A guest is not on the list, so theirs is left out. */
describe('the detectors', () => {
  it('leave a guest\'s questions out of what they read', () => {
    const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    const src = strip(readFileSync(join(__dirname, '..', 'detectors', 'detectors.service.ts'), 'utf8'));
    const read = src.match(/assistantTurn\.findMany\(\{[\s\S]*?where:\s*\{([^}]*\}[^}]*\}[^}]*)\}/);
    expect(read?.[1]).toMatch(/NOT:\s*\{\s*personExternalId:\s*\{\s*startsWith:\s*A_GUESTS_KEY_BEGINS\s*\}/);
  });
});


describe('Ask is named for the organisation, and tells a person what it can do the first time (decision 100)', () => {
  it('a member with no questions yet reads the name, the caption, the one line and the welcome', async () => {
    const { controller, asUser } = fixture({ contextInAsk: true });
    const tom: any = await controller.mine(asUser(readers.tom));
    expect(tom.askName).toBe('Ask Baridi');
    expect(tom.caption).toBe('Ask about the company, your work or your check-ins.');
    expect(tom.addLine).toBe('You can also add context or documents to your check-ins here.');
    expect(tom.welcome).toBe(BARIDI_WELCOME_WITH_CONTEXT);
  });

  it('while the switch for context in Ask is off, nobody is told they can add context or documents here', async () => {
    const { controller, asUser } = fixture();
    const tom: any = await controller.mine(asUser(readers.tom));
    expect(tom.addLine).toBeNull();
    expect(JSON.stringify(tom)).not.toContain('add context or documents');
    expect(tom.welcome).not.toContain('add context');
    expect(tom.welcome).toBe(BARIDI_WELCOME);
  });

  it('the starter about adding a document or context is offered only while that part is on', () => {
    const line = 'Add a document or some context to my check-in.';
    expect(askStarters(true, false)).not.toContain(line);
    expect(askStarters(true, true)).toContain(line);
    expect(askStarters(true, false)).toHaveLength(askStarters(true, true).length - 1);
  });

  it('a member who has already asked is not welcomed again, and still reads the name', async () => {
    const { controller, asUser } = fixture();
    const miriam: any = await controller.mine(asUser(readers.miriam));
    expect(miriam.askName).toBe('Ask Baridi');
    expect(miriam.welcome).toBeNull();
  });

  it('an admin with no questions yet is welcomed in the same words', async () => {
    const { controller, asUser } = fixture();
    const grace: any = await controller.mine(asUser(readers.grace));
    expect(grace.askName).toBe('Ask Baridi');
    expect(grace.welcome).toBe(BARIDI_WELCOME);
  });

  it('a guest reads the host organisation\'s Ask name, and what a guest is refused reads it too', async () => {
    const { controller, asUser } = fixture();
    const kofi: any = await controller.mine(asUser(readers.kofi));
    expect(kofi.askName).toBe('Ask Baridi');
    const said: any = await controller.question(asUser(readers.kofi), { message: 'Who works here?' });
    expect(JSON.stringify(said)).toContain('Ask Baridi can only answer questions about your own check-in');
    expect(JSON.stringify(said)).not.toContain('Ask Groundwork');
  });

  it('a person whose organisation has no name yet reads Ask Groundwork', async () => {
    const { controller, asUser, db } = fixture();
    db.organization[0].name = '   ';
    const tom: any = await controller.mine(asUser(readers.tom));
    expect(tom.askName).toBe('Ask Groundwork');
    expect(tom.welcome).toBe(BARIDI_WELCOME.replace('Ask Baridi', 'Ask Groundwork'));
  });
});
