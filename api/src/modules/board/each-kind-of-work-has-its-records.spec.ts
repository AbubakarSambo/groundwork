import { BoardService } from './board.service';
import { BoardListener } from './board.listener';
import { ReportsService } from '../reports/reports.service';
import { GroundMode, GroundScenario, PartyType } from '@prisma/client';
import { onlyRecordsTheLinesSay, theRecordSections } from './the-kind-of-work';

/**
 * EACH KIND OF WORK HAS ITS OWN RECORDS ON THE BOARD, AND EACH READER IS SERVED ONLY WHAT THEY MAY READ.
 *
 * Request 76, Hafsah's ruling of 29 September 2026. A sales board holds deals and their stages, an
 * engineering board holds releases and tasks, a law firm matter holds its deadlines and its parties.
 * Each section is served under the switchboard's own name, and says "filled", "none-yet" (Groundwork
 * keeps this record and there is none yet) or "not-known" (Groundwork does not keep this record).
 *
 * Read as three people: Amina, who runs the check-in; Baraka, who checks in; and Juma, an admin of
 * the organisation who only reads it.
 */
const person = (id: string, userId: string, first: string, last: string, partyType: PartyType = PartyType.PARTICIPANT) => ({
  id, userId, partyType, email: `${id}@baridi.test`, roleAsDescribed: 'the team', nameGiven: null, organisationGiven: null,
  remitAsGiven: null, managingOnly: partyType === PartyType.INITIATOR, signedOffAt: null,
  createdAt: new Date(partyType === PartyType.INITIATOR ? '2026-09-01T09:00:00Z' : '2026-09-01T10:00:00Z'),
  user: { firstName: first, lastName: last },
});
const PEOPLE = [
  person('p-amina', 'u-amina', 'Amina', 'Wanjiru', PartyType.INITIATOR),
  person('p-rukia', 'u-rukia', 'Rukia', 'Mwangi'),
  person('p-baraka', 'u-baraka', 'Baraka', 'Otieno'),
];
const CHECK_INS = [1].flatMap((n) => ['p-rukia', 'p-baraka'].map((pid) => ({
  id: `c${n}-${pid}`, participantId: pid, sessionNumber: n, status: 'COMPLETED', isSetup: false,
  completedAt: new Date('2026-09-02T16:00:00Z'), specificityLevel: 'specific', specificityDimensions: { checkable: 'specific' },
})));

interface Setup {
  kindOfWork: string | null;
  workStages?: string[] | null;
  peersVisibleToEachOther?: boolean;
  items: any[];
  lines: { id: string; participantId: string; text: string; disputedAt?: Date | null }[];
  objectives?: any[];
  /** Release 1's sales board, switched on for the organisation (release-one-sales-board). Off unless set. */
  releaseOneSalesBoard?: boolean;
}

const item = (id: string, kind: string, name: string, more: Record<string, any> = {}) => ({
  id, groundId: 'g-1', kind, name, stage: null, ownerParticipantId: null, dueAt: null, fields: null, sourceEntryId: null,
  addedByUserId: null, createdAt: new Date('2026-09-02T17:00:00Z'), updatedAt: new Date('2026-09-02T17:00:00Z'), ...more,
});

function boardAs(setup: Setup, userId: string, role: string) {
  const ground: any = {
    id: 'g-1', scenario: GroundScenario.OKR_ALIGNMENT, mode: GroundMode.SHARED,
    initiatorId: 'u-amina', createdByUserId: 'u-amina', organizationId: 'org-1',
    peopleWorkTogether: true, peersVisibleToEachOther: setup.peersVisibleToEachOther ?? true, timelineDays: 28, cadence: 'WEEKLY',
    whoSeesTargets: 'THEIR_OWN', label: 'The team, Q3', participants: PEOPLE, checkIns: CHECK_INS, report: null, dependencies: [], poll: null,
    objectives: setup.objectives ?? [],
    kindOfWork: setup.kindOfWork, workStages: setup.workStages ?? null,
  };
  const reads = {
    findMany: jest.fn(async () => []), findFirst: jest.fn(async () => null), findUnique: jest.fn(async () => null),
    count: jest.fn(async () => 0), aggregate: jest.fn(async () => ({ _max: { sessionNumber: 1 } })),
  };
  const model = (own: Record<string, any> = {}) => ({ ...reads, ...own });
  const prisma = new Proxy({
    ground: model({ findUnique: jest.fn(async () => JSON.parse(JSON.stringify(ground))) }),
    user: model({ findUnique: jest.fn(async () => ({ role, organizationId: 'org-1' })) }),
    organization: model({ findUnique: jest.fn(async () => (setup.releaseOneSalesBoard ? { id: 'org-1', release1SalesBoardOn: true, timeZone: null } : null)) }),
    checkIn: model({ findMany: jest.fn(async () => JSON.parse(JSON.stringify(CHECK_INS))) }),
    recordEntry: model({
      findMany: jest.fn(async (args: any) => {
        const ids: string[] | undefined = args?.where?.id?.in;
        return ids ? setup.lines.filter((l) => ids.includes(l.id) && (args?.where?.disputedAt !== null || !l.disputedAt)).map((l) => ({ disputedAt: null, ...l })) : [];
      }),
    }),
    workItem: model({ findMany: jest.fn(async () => setup.items.map((i) => ({ ...i }))) }),
  } as any, {
    get(target: any, prop: string) {
      if (!(prop in target) && typeof prop === 'string' && !prop.startsWith('$')) target[prop] = model();
      return target[prop];
    },
  });
  const reports = Object.create(ReportsService.prototype) as ReportsService;
  return new BoardService(prisma, { respond: jest.fn(async () => null) } as any, { getSessionProgress: async () => null } as any, reports)
    .get('g-1', userId) as Promise<any>;
}

const AMINA = ['u-amina', 'MEMBER'] as const;
const BARAKA = ['u-baraka', 'MEMBER'] as const;
const JUMA = ['u-juma', 'ADMIN'] as const;
const section = (board: any, name: string) => (board.workRecords as any[]).find((s) => s.section === name);
const names = (s: any) => (s?.rows ?? []).map((r: any) => r.name);

// --- Sales ---------------------------------------------------------------------------------------

const SALES: Setup = {
  kindOfWork: 'sales org',
  lines: [
    { id: 'e-rukia', participantId: 'p-rukia', text: 'Nyama Choma Palace paid KES 90K on 22 September, so that one is won.' },
    { id: 'e-baraka', participantId: 'p-baraka', text: 'Eastside Foods wants a second freezer and the owner has agreed the budget.' },
  ],
  items: [
    item('w-1', 'deal', 'Nyama Choma Palace', { stage: 'Won', ownerParticipantId: 'p-rukia', fields: { Value: 'KES 90K' }, sourceEntryId: 'e-rukia' }),
    item('w-2', 'deal', 'Eastside Foods', { stage: 'Qualified', ownerParticipantId: 'p-baraka', sourceEntryId: 'e-baraka' }),
    item('w-3', 'deal', 'Karen Butchery', { stage: 'Contacted', addedByUserId: 'u-amina' }),
  ],
};

/* Since Hafsah's answer to Needs Hafsah 7 (17 October), with Release 1's sales board on, each deal carries its four criteria ticked as the kit ticks them and the stages its record meets (a-deals-four-criteria). */
const NONE_OF_THE_FOUR = {
  criteria: [
    { criterion: 'need', label: 'Need', met: false, says: 'Not on record yet.' },
    { criterion: 'budget', label: 'Budget the customer stated', met: false, says: 'Not on record yet.' },
    { criterion: 'decision maker', label: 'Decision maker', met: false, says: 'Not on record yet.' },
    { criterion: 'buying date', label: 'Buying date', met: false, says: 'Not on record yet.' },
  ],
  criteriaSays: 'None of the four criteria is on record yet.',
  paymentRecord: false,
  /* Added 18 October with Hafsah's answer 2 (Won is a signed order or a payment): each deal also says whether a signed order backs it. */
  signedOrder: false,
};

describe('a sales check-in: deals and their stages', () => {
  it('with Release 1\'s sales board switched off, Amina reads the sentence the board had before it, since nothing counts from the deals', async () => {
    const board = await boardAs(SALES, ...AMINA);
    expect(section(board, 'Deal grid').groups.find((g: any) => g.group === 'said-won').reason)
      .toBe('Somebody said each of these was won, in their own words. Nothing has been shown to back them yet, so they are not counted as won.');
  });

  it('Amina, who runs it, is served kindOfWork, every deal with its stage and whose it is, and the forecast as not known', async () => {
    /* With Release 1's sales board switched on, where a deal said to be won counts in what is sold as their word (release-one-sales-board).
       Since Hafsah's points 4 and 6 (17 October), each deal says its buying date (the customer's) and whether a next step is booked. */
    const board = await boardAs({ ...SALES, releaseOneSalesBoard: true }, ...AMINA);
    expect(board.kindOfWork).toBe('sales org');
    expect(section(board, 'Deal grid')).toEqual({
      section: 'Deal grid',
      holds: 'deals',
      state: 'filled',
      stages: ['Contacted', 'Need established', 'Pitched', 'Qualified', 'Quoted', 'Won'],
      rows: [
        {
          id: 'w-1', kind: 'deal', name: 'Nyama Choma Palace', stage: 'Won', owner: 'Rukia Mwangi', ownerParticipantId: 'p-rukia',
          /* Since 12 October a deal said to be won with nothing behind it says so beside its stage (baefa3f50). */
          stageSays: 'Said to be won, not shown yet',
          due: null, evidence: [], fields: { Value: 'KES 90K' }, from: 'said', said: 'Nyama Choma Palace paid KES 90K on 22 September, so that one is won.',
          saidBy: 'Rukia', saidByParticipantId: 'p-rukia', saidByLine: "In Rukia's words,",
          known: 'said', knownSays: 'Someone said it.', mark: 'memory', next: null, nextKnown: null, nextSays: 'Nobody has said what happens next.',
          lastSaidOn: null, group: 'said-won', groupSays: 'None of the four criteria is on record yet. Nobody has spoken about it in a check-in yet. No next step is booked.',
          ...NONE_OF_THE_FOUR, stagesMet: ['Contacted'], stageMet: 'Contacted',
          /* Request 115 (b): its value as said, the days it was spoken about, and the owner's own read where there is one. */
          value: 'KES 90K', valueSays: null, buyingDate: null, contactHistory: [], contactHistorySays: 'Each date is a day this deal came up in a check-in.', notAnsweringSince: null, theirRead: null,
        },
        {
          id: 'w-2', kind: 'deal', name: 'Eastside Foods', stage: 'Qualified', owner: 'Baraka Otieno', ownerParticipantId: 'p-baraka',
          due: null, evidence: [], fields: {}, from: 'said', said: 'Eastside Foods wants a second freezer and the owner has agreed the budget.',
          saidBy: 'Baraka', saidByParticipantId: 'p-baraka', saidByLine: "In Baraka's words,",
          known: 'said', knownSays: 'Someone said it.', mark: 'said', next: null, nextKnown: null, nextSays: 'Nobody has said what happens next.',
          lastSaidOn: null, group: 'possible', groupSays: 'None of the four criteria is on record yet. Nobody has spoken about it in a check-in yet. No next step is booked.',
          ...NONE_OF_THE_FOUR, stagesMet: ['Contacted'], stageMet: 'Contacted',
          value: null, valueSays: 'Nobody has said what this deal is worth yet.', buyingDate: null, contactHistory: [], contactHistorySays: 'Each date is a day this deal came up in a check-in.', notAnsweringSince: null, theirRead: null,
        },
        {
          id: 'w-3', kind: 'deal', name: 'Karen Butchery', stage: 'Contacted', owner: null, ownerParticipantId: null, due: null, evidence: [], fields: {}, from: 'lead', saidBy: null, saidByParticipantId: null, saidByLine: null,
          known: 'lead', knownSays: 'You added it on the board.', mark: 'none', next: null, nextKnown: null, nextSays: 'Nobody has said what happens next.',
          lastSaidOn: null, group: 'possible', groupSays: 'None of the four criteria is on record yet. Nobody has spoken about it in a check-in yet. No next step is booked.',
          ...NONE_OF_THE_FOUR, stagesMet: [], stageMet: null,
          value: null, valueSays: 'Nobody has said what this deal is worth yet.', buyingDate: null, contactHistory: [], contactHistorySays: 'Each date is a day this deal came up in a check-in.', notAnsweringSince: null, theirRead: null,
        },
      ],
      /* Request 112 (a): each deal in its group, from its own record. This check-in has no end date. */
      groups: [
        { group: 'possible', heading: 'Possible', reason: 'Each of these is still open. This check-in has no end date, so none can be said to be likely before the end.', rowIds: ['w-2', 'w-3'] },
        /* Night quality run 1, problem 3: a deal at Won on somebody's word alone is their claim, never counted as won. */
        { group: 'said-won', heading: 'Said to be won, not shown yet', reason: 'Somebody said each of these was won, in their own words. Nothing has been shown to back them yet, so they count in what is sold as their word, not as sales with proof of payment.', rowIds: ['w-1'] },
      ],
      groupsNote: [
        /* The stage rules are on record now (Needs Hafsah 7), so the note that no criterion is checked is not said with the switch on. */
        /* Changed 18 October (Hafsah's standing decision 4): this run has no stall rule set by the lead, so none is applied, and the note says so. */
        'No stall rule set yet, so no deal is marked cold for going quiet.',
        'This check-in has no end date, so no deal can be said to be likely by the end, or to fall after it.',
      ],
    });
    expect(section(board, 'Forecast')).toEqual({
      section: 'Forecast',
      holds: 'where the sales numbers are likely to end up',
      state: 'not-known',
      why: '',
    });
  });

  it('Juma, an admin who only reads, is served the same deals, with names', async () => {
    const board = await boardAs(SALES, ...JUMA);
    expect(names(section(board, 'Deal grid'))).toEqual(['Nyama Choma Palace', 'Eastside Foods', 'Karen Butchery']);
    expect(section(board, 'Deal grid').rows.map((r: any) => r.owner)).toEqual(['Rukia Mwangi', 'Baraka Otieno', null]);
  });

  /* Request 105 (the prototype's B5, "Your deals, day by day. Only yours."): a person who checks in is served
     only their own records. Before, Baraka was served every deal where people see each other, and his own and
     the lead's where they do not. */
  it('Baraka, who checks in, is served only his own deal, even where people see each other', async () => {
    const board = await boardAs(SALES, ...BARAKA);
    expect(names(section(board, 'Deal grid'))).toEqual(['Eastside Foods']);
    expect(section(board, 'Deal grid').onlyYours).toBe('Only yours.');
    expect(JSON.stringify(board.workRecords)).not.toMatch(/Nyama|Karen|Rukia/);
  });

  it('where people see only themselves, Baraka is served his own deal, and nothing of Rukia\'s', async () => {
    const walled = { ...SALES, peersVisibleToEachOther: false };
    const board = await boardAs(walled, ...BARAKA);
    expect(names(section(board, 'Deal grid'))).toEqual(['Eastside Foods']);
    expect(JSON.stringify(board.workRecords)).not.toMatch(/Nyama|Rukia/);
    /* The lead and the admin still read every deal. */
    expect(names(section(await boardAs(walled, ...AMINA), 'Deal grid'))).toHaveLength(3);
    expect(names(section(await boardAs(walled, ...JUMA), 'Deal grid'))).toHaveLength(3);
  });

  it('where people see only themselves and Baraka has no deal, his section says none yet, not missing', async () => {
    const board = await boardAs({ ...SALES, peersVisibleToEachOther: false, items: [SALES.items[0]] }, ...BARAKA);
    expect(section(board, 'Deal grid')).toMatchObject({ state: 'none-yet', rows: [] });
  });

  it("what Rukia said stays word for word for Juma, even with her hidden target's number in it", async () => {
    const hers: Setup = {
      ...SALES,
      objectives: [{ id: 'o-1', name: 'Freezers sold', target: 4, count: 1, prevCount: 1, ownerParticipantId: 'p-rukia', sortOrder: 1, assumes: [],
        createdAt: new Date('2026-09-01T09:00:00Z'), updatedAt: new Date('2026-09-02T09:00:00Z') }],
      lines: [{ id: 'e-rukia', participantId: 'p-rukia', text: 'Four freezers for me: Nyama Choma Palace paid for one.' }],
      items: [item('w-1', 'deal', 'Nyama Choma Palace', { stage: 'Won', ownerParticipantId: 'p-rukia', sourceEntryId: 'e-rukia' })],
    };
    const row = section(await boardAs(hers, ...JUMA), 'Deal grid').rows[0];
    expect(row.said).toBe('Four freezers for me: Nyama Choma Palace paid for one.');
  });
});

// --- Engineering ---------------------------------------------------------------------------------

const ENGINEERING: Setup = {
  kindOfWork: 'engineering release',
  workStages: ['Built', 'Reviewed', 'Shipped'],
  lines: [
    { id: 'e-rukia', participantId: 'p-rukia', text: 'Release 2.4 is reviewed and waits for the production test on 24 September.' },
    { id: 'e-baraka', participantId: 'p-baraka', text: 'The login fix is built.', disputedAt: new Date('2026-09-03T09:00:00Z') },
  ],
  items: [
    item('w-1', 'release', 'Release 2.4', { stage: 'Reviewed', ownerParticipantId: 'p-rukia', dueAt: new Date('2026-09-24T00:00:00Z'), sourceEntryId: 'e-rukia' }),
    item('w-2', 'task', 'login fix', { stage: 'Built', ownerParticipantId: 'p-baraka', sourceEntryId: 'e-baraka' }),
  ],
};

describe('an engineering check-in: releases and tasks', () => {
  it('Amina is served the release under the team\'s own stage names, and not a task from a line Baraka disputed', async () => {
    const board = await boardAs(ENGINEERING, ...AMINA);
    expect(board.kindOfWork).toBe('engineering release');
    expect(board.workRecords).toEqual([{
      section: 'Deal grid',
      holds: 'releases and tasks',
      state: 'filled',
      stages: ['Built', 'Reviewed', 'Shipped'],
      rows: [{
        id: 'w-1', kind: 'release', name: 'Release 2.4', stage: 'Reviewed', owner: 'Rukia Mwangi', ownerParticipantId: 'p-rukia',
        due: '2026-09-24', evidence: [], fields: {}, from: 'said', said: 'Release 2.4 is reviewed and waits for the production test on 24 September.',
        saidBy: 'Rukia', saidByParticipantId: 'p-rukia', saidByLine: "In Rukia's words,",
        known: 'said', knownSays: 'Someone said it.', mark: 'memory', next: null, nextKnown: null, nextSays: 'Nobody has said what happens next.',
        lastSaidOn: null,
      }],
    }]);
  });

  /* Request 105: the release is Rukia's, so Baraka, who checks in, is served none of it; before, he was served it. */
  it('Juma is served the release, and Baraka, whose it is not, is not', async () => {
    expect(names(section(await boardAs(ENGINEERING, ...JUMA), 'Deal grid'))).toEqual(['Release 2.4']);
    expect(names(section(await boardAs(ENGINEERING, ...BARAKA), 'Deal grid'))).toEqual([]);
  });
});

// --- A law firm matter ---------------------------------------------------------------------------

const MATTER: Setup = {
  kindOfWork: 'a law firm matter',
  peersVisibleToEachOther: false,
  lines: [{ id: 'e-baraka', participantId: 'p-baraka', text: 'Our reply to the defence is due on Friday 2 October.' }],
  items: [
    item('w-1', 'deadline', 'reply to the defence', { ownerParticipantId: 'p-baraka', dueAt: new Date('2026-10-02T00:00:00Z'), sourceEntryId: 'e-baraka' }),
    item('w-2', 'deadline', 'Original contract from the client', { ownerParticipantId: 'p-rukia', dueAt: new Date('2026-09-30T00:00:00Z'), addedByUserId: 'u-amina' }),
    item('w-3', 'party', 'Pwani Mills', { fields: { Side: 'The other side' }, addedByUserId: 'u-amina' }),
  ],
};

describe('a law firm matter: deadlines and parties', () => {
  it('Amina is served the deadlines under Timeline and the parties under Obligations', async () => {
    const board = await boardAs(MATTER, ...AMINA);
    expect(board.kindOfWork).toBe('a law firm matter');
    expect(section(board, 'Timeline')).toMatchObject({ holds: 'deadlines', state: 'filled' });
    expect(section(board, 'Timeline').rows.map((r: any) => [r.name, r.owner, r.due])).toEqual([
      ['reply to the defence', 'Baraka Otieno', '2026-10-02'],
      ['Original contract from the client', 'Rukia Mwangi', '2026-09-30'],
    ]);
    expect(section(board, 'Obligations')).toEqual({
      section: 'Obligations', holds: 'the parties', state: 'filled',
      rows: [{ id: 'w-3', kind: 'party', name: 'Pwani Mills', stage: null, owner: null, ownerParticipantId: null, due: null, evidence: [], fields: { Side: 'The other side' }, from: 'lead', saidBy: null, saidByParticipantId: null, saidByLine: null, known: 'lead', knownSays: 'You added it on the board.', mark: 'none', next: null, nextKnown: null, nextSays: 'Nobody has said what happens next.', lastSaidOn: null }],
    });
  });

  it('Juma, an admin who only reads, is served every deadline', async () => {
    expect(names(section(await boardAs(MATTER, ...JUMA), 'Timeline'))).toEqual(['reply to the defence', 'Original contract from the client']);
  });

  /* Request 105: only his own records, so the parties the lead added, which are nobody's, are not on his board; before, they were. */
  it('Baraka, where people see only themselves, is served his own deadline, and not Rukia\'s deadline', async () => {
    const board = await boardAs(MATTER, ...BARAKA);
    expect(section(board, 'Timeline').rows.map((r: any) => [r.name, r.owner, r.said])).toEqual([
      ['reply to the defence', 'Baraka Otieno', 'Our reply to the defence is due on Friday 2 October.'],
    ]);
    expect(names(section(board, 'Obligations'))).toEqual([]);
    expect(JSON.stringify(board.workRecords)).not.toMatch(/Original contract|Rukia/);
  });
});

// --- No kind known -------------------------------------------------------------------------------

describe('a check-in whose kind of work nobody knows', () => {
  it('is served kindOfWork null, and every record section as not known', async () => {
    const board = await boardAs({ kindOfWork: null, items: [], lines: [] }, ...AMINA);
    expect(board.kindOfWork).toBeNull();
    expect(board.workRecords.every((s: any) => s.state === 'not-known')).toBe(true);
    expect(board.workRecords.map((s: any) => s.section)).toEqual(['Deal grid', 'Forecast', 'Themes', 'Work plan', 'Timeline', 'Obligations']);
    expect(board.workRecords[0].why).toBe('');
  });

  it('a stored kind that is not one of the eleven is served as none', async () => {
    const board = await boardAs({ kindOfWork: 'banking', items: [], lines: [] }, ...AMINA);
    expect(board.kindOfWork).toBeNull();
  });

  it('a kind Groundwork keeps records for, with none yet, is none-yet rather than not known', () => {
    expect(theRecordSections('support desk', null, [])).toEqual([
      { section: 'Deal grid', holds: 'tickets', state: 'none-yet', rows: [] },
      { section: 'Themes', holds: 'ticket volume and causes from the helpdesk', state: 'not-known', why: '' },
    ]);
  });
});

// --- Written from what people said, never invented -----------------------------------------------

describe('records are read from what somebody said, and never invented', () => {
  const LINES = [{ id: 'e1', participantId: 'p-rukia', text: 'Eastside Foods is qualified and wants a quote by 30 September.' }];

  it('keeps a record whose name is in the line, and drops one whose name is not, a wrong kind and an unknown stage', () => {
    const kept = onlyRecordsTheLinesSay('sales org', [
      { lineId: 'e1', kind: 'deal', name: 'Eastside Foods', stage: 'qualified', due: '2026-09-30', details: [{ label: 'Wants', value: 'A quote' }] },
      { lineId: 'e1', kind: 'deal', name: 'Westside Foods' },
      { lineId: 'e1', kind: 'ticket', name: 'Eastside Foods' },
      { lineId: 'e9', kind: 'deal', name: 'Eastside Foods' },
    ], LINES, null);
    expect(kept).toEqual([{
      kind: 'deal', name: 'Eastside Foods', stage: 'Qualified', dueAt: new Date('2026-09-30T00:00:00.000Z'),
      fields: { Wants: 'A quote' }, sourceEntryId: 'e1', ownerParticipantId: 'p-rukia',
    }]);
    expect(onlyRecordsTheLinesSay('sales org', [{ lineId: 'e1', kind: 'deal', name: 'Eastside Foods', stage: 'Signed' }], LINES, null)[0].stage).toBeNull();
  });

  it('when a check-in completes, writes a new deal once and moves an existing one on', async () => {
    const created: any[] = [];
    const updated: any[] = [];
    const prisma: any = {
      ground: { findUnique: jest.fn(async () => ({ kindOfWork: 'sales org', workStages: null })) },
      recordEntry: { findMany: jest.fn(async () => [...LINES, { id: 'e2', participantId: 'p-rukia', text: 'Karen Butchery has now pitched.' }]) },
      workItem: {
        findMany: jest.fn(async () => [{ id: 'w-karen', kind: 'deal', name: 'Karen Butchery', fields: { Value: 'KES 40K' } }]),
        create: jest.fn(async (a: any) => { created.push(a.data); return { id: 'w-new' }; }),
        update: jest.fn(async (a: any) => { updated.push(a); return a; }),
      },
    };
    const anthropic: any = { extract: jest.fn(async () => ({ records: [
      { lineId: 'e1', kind: 'deal', name: 'Eastside Foods', stage: 'Qualified' },
      { lineId: 'e2', kind: 'deal', name: 'Karen Butchery', stage: 'Pitched' },
      { lineId: 'e2', kind: 'deal', name: 'Made Up Traders', stage: 'Won' },
    ] })) };
    await new BoardListener(prisma, anthropic).onCheckInCompleted({ checkInId: 'c1', groundId: 'g-1', participantId: 'p-rukia', sessionNumber: 1 });
    /* The stage it came onto the record at is kept with its day, so a later move can be counted (a-deals-stages-are-kept). */
    expect(created).toEqual([{ groundId: 'g-1', kind: 'deal', name: 'Eastside Foods', stage: 'Qualified', dueAt: null, fields: { _stages: [{ stage: 'Qualified', on: expect.any(String), by: 'check-in' }] }, sourceEntryId: 'e1', ownerParticipantId: 'p-rukia' }]);
    /* Karen Butchery had nobody's name on it. Rukia saying it moved is a claim, put to the lead; it does not
       make the deal Rukia's (decision 76, item 3). */
    expect(updated).toHaveLength(1);
    const { fields, ...rest } = updated[0].data;
    expect(rest).toEqual({ stage: 'Pitched', sourceEntryId: 'e2' });
    expect(fields.Value).toBe('KES 40K');
    expect(fields._ownerClaim).toMatchObject({ participantId: 'p-rukia', sourceEntryId: 'e2' });
    /* Karen Butchery had no stage kept; it was at none, so its first stage on record is Pitched, not a move. */
    expect(fields._stages).toEqual([{ stage: 'Pitched', on: expect.any(String), by: 'check-in' }]);
  });

  it('a deal added on the board with nobody\'s name on it is not made the deal of whoever says it is theirs, but put to the lead, and a named one keeps its owner (decision 76, item 3)', async () => {
    const updated: any[] = [];
    const lines = [
      { id: 'e1', participantId: 'p-rukia', text: 'I have signed Tuskys Westgate already.' },
      { id: 'e2', participantId: 'p-rukia', text: 'Naivas Karen wants to see the fridges first.' },
    ];
    const prisma: any = {
      ground: { findUnique: jest.fn(async () => ({ kindOfWork: 'sales org', workStages: null })) },
      recordEntry: { findMany: jest.fn(async () => lines) },
      workItem: {
        findMany: jest.fn(async () => [
          { id: 'w-tuskys', kind: 'deal', name: 'Tuskys Westgate', fields: {}, ownerParticipantId: null },
          { id: 'w-naivas', kind: 'deal', name: 'Naivas Karen', fields: {}, ownerParticipantId: 'p-amani' },
        ]),
        create: jest.fn(async () => ({ id: 'w-new' })),
        update: jest.fn(async (a: any) => { updated.push(a); return a; }),
      },
    };
    const anthropic: any = { extract: jest.fn(async () => ({ records: [
      { lineId: 'e1', kind: 'deal', name: 'Tuskys Westgate', stage: 'Won' },
      { lineId: 'e2', kind: 'deal', name: 'Naivas Karen' },
    ] })) };
    await new BoardListener(prisma, anthropic).onCheckInCompleted({ checkInId: 'c1', groundId: 'g-1', participantId: 'p-rukia', sessionNumber: 2 });
    const tuskys = updated.find((u) => u.where.id === 'w-tuskys').data;
    expect(tuskys).not.toHaveProperty('ownerParticipantId');
    expect(tuskys.fields._ownerClaim).toMatchObject({ participantId: 'p-rukia', sourceEntryId: 'e1' });
    const naivas = updated.find((u) => u.where.id === 'w-naivas').data;
    expect(naivas).not.toHaveProperty('ownerParticipantId');
    expect(naivas.fields).not.toHaveProperty('_ownerClaim');
  });

  it('reads nothing when the kind of work is not known', async () => {
    const anthropic: any = { extract: jest.fn() };
    const prisma: any = { ground: { findUnique: jest.fn(async () => ({ kindOfWork: null })) } };
    await new BoardListener(prisma, anthropic).onCheckInCompleted({ checkInId: 'c1', groundId: 'g-1', participantId: 'p-rukia', sessionNumber: 1 });
    expect(anthropic.extract).not.toHaveBeenCalled();
  });
});
