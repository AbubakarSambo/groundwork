import { BoardService } from './board.service';
import { ReportsService } from '../reports/reports.service';
import { GroundMode, GroundScenario, PartyType } from '@prisma/client';
import { boardAs as switchboardAs, AMINA as A, RUKIA as R, BARAKA as B, handoff } from './the-switchboards-sections-harness';
import { NO_AREA_ON_RECORD, NO_STAGE_RULES } from './the-work-by-area-and-by-stage';

/**
 * REQUEST 107 (c): THE FIELDS THE PROTOTYPE'S BOARDS NEED THAT WERE NOT SERVED.
 *
 *  1. Each record's "Next", and how it is known ("Proof shows it", "Someone said it"), never invented.
 *  2. How often a blocker was raised ("Raised: 3 times, 1 Sep to 23 Sep").
 *  3. The work by area ("By site", "By county", "By team", "By queue"), where a record holds an area.
 *  4. On a sales board, what was reported at each stage, beside the rules, which are not on record.
 *
 * Read as Amina, who runs it; Rukia and Baraka, who check in (with and without seeing each other);
 * Juma, an admin who only reads; and the admin who set it up.
 */
const person = (id: string, userId: string, first: string, last: string, partyType: PartyType = PartyType.PARTICIPANT) => ({
  id, userId, partyType, email: `${id}@baridi.test`, roleAsDescribed: 'the team', nameGiven: null, organisationGiven: null,
  remitAsGiven: null, managingOnly: partyType === PartyType.INITIATOR, signedOffAt: null,
  createdAt: new Date(partyType === PartyType.INITIATOR ? '2026-09-01T09:00:00Z' : '2026-09-01T10:00:00Z'),
  user: { firstName: first, lastName: last },
});
const PEOPLE = [person('p-amina', 'u-amina', 'Amina', 'Wanjiru', PartyType.INITIATOR), person('p-rukia', 'u-rukia', 'Rukia', 'Mwangi'), person('p-baraka', 'u-baraka', 'Baraka', 'Otieno')];
const CHECK_INS = ['p-rukia', 'p-baraka'].map((pid) => ({
  id: `c1-${pid}`, participantId: pid, sessionNumber: 1, status: 'COMPLETED', isSetup: false,
  completedAt: new Date('2026-09-02T16:00:00Z'), specificityLevel: 'specific', specificityDimensions: { checkable: 'specific' },
}));
const item = (id: string, kind: string, name: string, more: Record<string, any> = {}) => ({
  id, groundId: 'g-1', kind, name, stage: null, ownerParticipantId: null, dueAt: null, fields: null, sourceEntryId: null,
  addedByUserId: null, createdAt: new Date('2026-09-02T17:00:00Z'), updatedAt: new Date('2026-09-02T17:00:00Z'), ...more,
});
const commitment = (id: string, participantId: string, text: string, status = 'UNKNOWN') => ({
  id, groundId: 'g-1', participantId, text, status, whenSaid: null, explicit: true, source: 'CHECK_IN', statedInSession: 1, saidAgainIn: [],
  settledBy: null, settledAt: null, saidWordForWord: true, whenSaidWordForWord: false, createdAt: new Date('2026-09-02T16:30:00Z'),
});

interface Setup { kindOfWork: string; peersVisibleToEachOther?: boolean; items: any[]; lines: any[]; commitments?: any[]; createdByUserId?: string }

function boardAs(setup: Setup, userId: string, role: string) {
  const ground: any = {
    id: 'g-1', scenario: GroundScenario.OKR_ALIGNMENT, mode: GroundMode.SHARED,
    initiatorId: 'u-amina', createdByUserId: setup.createdByUserId ?? 'u-amina', organizationId: 'org-1',
    peopleWorkTogether: true, peersVisibleToEachOther: setup.peersVisibleToEachOther ?? true, timelineDays: 28, cadence: 'WEEKLY',
    whoSeesTargets: 'THEIR_OWN', label: 'The team, Q3', participants: PEOPLE, checkIns: CHECK_INS, report: null, dependencies: [], poll: null,
    objectives: [], kindOfWork: setup.kindOfWork, workStages: null,
  };
  const reads = {
    findMany: jest.fn(async () => []), findFirst: jest.fn(async () => null), findUnique: jest.fn(async () => null),
    count: jest.fn(async () => 0), aggregate: jest.fn(async () => ({ _max: { sessionNumber: 1 } })),
  };
  const model = (own: Record<string, any> = {}) => ({ ...reads, ...own });
  const prisma = new Proxy({
    ground: model({ findUnique: jest.fn(async () => JSON.parse(JSON.stringify(ground))) }),
    user: model({ findUnique: jest.fn(async () => ({ role, organizationId: 'org-1' })) }),
    checkIn: model({ findMany: jest.fn(async () => JSON.parse(JSON.stringify(CHECK_INS))) }),
    recordEntry: model({
      findMany: jest.fn(async (args: any) => {
        const ids: string[] | undefined = args?.where?.id?.in;
        return ids ? setup.lines.filter((l) => ids.includes(l.id)).map((l) => ({ disputedAt: null, type: 'PROGRESS', ...l })) : [];
      }),
    }),
    workItem: model({ findMany: jest.fn(async () => setup.items.map((i) => ({ ...i }))) }),
    groundCommitment: model({ findMany: jest.fn(async () => (setup.commitments ?? []).map((c) => ({ ...c }))) }),
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
const RUKIA = ['u-rukia', 'MEMBER'] as const;
const BARAKA = ['u-baraka', 'MEMBER'] as const;
const JUMA = ['u-juma', 'ADMIN'] as const;
const grid = (b: any) => (b.workRecords as any[]).find((s) => s.section === 'Deal grid');
const row = (b: any, name: string) => grid(b).rows.find((r: any) => r.name === name);

const SALES: Setup = {
  kindOfWork: 'sales org',
  lines: [
    { id: 'e-rukia', participantId: 'p-rukia', text: 'Nyama Choma Palace paid KES 90K on 22 September, so that one is won.', recallBased: false, anchoredOrigin: null },
    { id: 'e-baraka', participantId: 'p-baraka', text: 'Eastside Foods in Westlands wants a second freezer and the owner has agreed the budget.' },
  ],
  items: [
    item('w-1', 'deal', 'Nyama Choma Palace', { stage: 'Won', ownerParticipantId: 'p-rukia', fields: { Team: 'Industrial Area' }, sourceEntryId: 'e-rukia' }),
    item('w-2', 'deal', 'Eastside Foods', { stage: 'Qualified', ownerParticipantId: 'p-baraka', fields: { Team: 'Westlands' }, sourceEntryId: 'e-baraka' }),
    item('w-3', 'deal', 'Karen Butchery', { stage: 'Contacted', addedByUserId: 'u-amina' }),
  ],
  commitments: [
    commitment('k-baraka', 'p-baraka', 'I will send Eastside Foods the quote with a photo on Friday.'),
    commitment('k-done', 'p-rukia', 'I will collect the payment from Nyama Choma Palace.', 'DONE'),
  ],
};

describe('1. each record says what happens next and how it is known', () => {
  it('Amina reads proof, a word, and her own addition, and only what somebody said comes next', async () => {
    const b = await boardAs(SALES, ...AMINA);
    expect(row(b, 'Nyama Choma Palace')).toMatchObject({ known: 'proof', knownSays: 'Proof shows it.', next: null, nextSays: 'Nobody has said what happens next.' });
    expect(row(b, 'Eastside Foods')).toMatchObject({ known: 'said', knownSays: 'Someone said it.', next: 'Baraka Otieno committed to send Eastside Foods the quote with a photo on Friday.', nextKnown: 'said' });
    expect(row(b, 'Karen Butchery')).toMatchObject({ known: 'lead', knownSays: 'You added it on the board.', next: null });
  });

  it('Baraka reads his own next step as his', async () => {
    const b = await boardAs(SALES, ...BARAKA);
    expect(row(b, 'Eastside Foods').next).toBe('You committed to send Eastside Foods the quote with a photo on Friday.');
    /* Since request 105 (the prototype's B5, "Only yours") the lead's own record is not on his board. Before, he read
       "It was added on the board, not said in a check-in." under it; whoever runs the check-in still reads it. */
    expect(row(b, 'Karen Butchery')).toBeUndefined();
  });

  it('where people see only themselves, Rukia reads no row of Baraka\'s and none of his next steps', async () => {
    const b = await boardAs({ ...SALES, peersVisibleToEachOther: false }, ...RUKIA);
    expect(JSON.stringify(b.workRecords)).not.toMatch(/Eastside|Baraka/);
    expect(JSON.stringify(b.byArea)).not.toMatch(/Westlands/);
  });

  it('Juma, an admin who only reads, reads the same marks and steps as the lead, with names', async () => {
    const b = await boardAs(SALES, ...JUMA);
    expect(row(b, 'Eastside Foods').next).toBe('Baraka Otieno committed to send Eastside Foods the quote with a photo on Friday.');
  });
});

describe('3. the work by area, where a record holds one', () => {
  it('groups by team from what was said about each deal', async () => {
    const b = await boardAs(SALES, ...AMINA);
    expect(b.byArea).toEqual({
      state: 'filled', heading: 'By team',
      areas: [
        { area: 'Industrial Area', records: 1, says: 'Industrial Area has 1 deal on record.' },
        { area: 'Westlands', records: 1, says: 'Westlands has 1 deal on record.' },
      ],
    });
  });
  it('and says plainly where no record names an area', async () => {
    const b = await boardAs({ ...SALES, items: SALES.items.map((i) => ({ ...i, fields: null })) }, ...AMINA);
    expect(b.byArea).toEqual({ state: 'not-known', why: NO_AREA_ON_RECORD });
  });
});

describe('4. on a sales board, what was reported at each stage, and that the rules are not on record', () => {
  it('counts what was reported and what has proof, and never calls it criteria met', async () => {
    const b = await boardAs(SALES, ...AMINA);
    expect(b.reportedAgainstCriteria.state).toBe('not-known');
    expect(b.reportedAgainstCriteria.why).toBe(NO_STAGE_RULES);
    const says = Object.fromEntries(b.reportedAgainstCriteria.stages.map((s: any) => [s.stage, s.says]));
    expect(says.Won).toBe('1 deal was reported at Won, and it has a document behind it.');
    expect(says.Qualified).toBe('1 deal was reported at Qualified, and it has no document behind it.');
    /* Changed 2 Oct 2026 (request 115 f): a stage with no deal is left out, not said as "Nobody has reported a deal at Pitched." */
    expect(says.Pitched).toBeUndefined();
    expect(b.reportedAgainstCriteria.stages.map((s: any) => s.stage)).toEqual(['Contacted', 'Qualified', 'Won']);
  });
  it('is not served for other kinds of work', async () => {
    const b = await boardAs({ ...SALES, kindOfWork: 'support desk', items: [item('t-1', 'ticket', 'Login fails', { addedByUserId: 'u-amina' })] }, ...AMINA);
    expect(b.reportedAgainstCriteria).toBeUndefined();
  });
});

describe('2. how often a blocker was raised', () => {
  const RAISED = [
    handoff('d-1', 'p-rukia', 'the pipeline fix', { sourceCheckInId: 'c1-p-rukia', createdAt: new Date('2026-09-01T09:00:00Z') }),
    handoff('d-2', 'p-rukia', 'pipeline fix', { sourceCheckInId: 'c2-p-rukia', createdAt: new Date('2026-09-10T09:00:00Z') }),
    handoff('d-3', 'p-rukia', 'the pipeline fix', { sourceCheckInId: 'c3-p-rukia', createdAt: new Date('2026-09-23T09:00:00Z') }),
    handoff('d-4', 'p-baraka', 'the new price list', { sourceCheckInId: 'c1-p-baraka', createdAt: new Date('2026-09-03T09:00:00Z') }),
  ];
  it('the lead reads each blocker with how often it was raised', async () => {
    const b = await switchboardAs({ dependencies: RAISED }, ...A);
    const said = Object.fromEntries(b.dependencies.map((d: any) => [d.what, d.raised?.says]));
    expect(said['the pipeline fix']).toBe('This has been raised 3 times, from 1 September to 23 September.');
    expect(said['the new price list']).toBe('This was raised once, on 3 September.');
  });
  it('Rukia reads hers, and where people see only themselves, Baraka reads only his', async () => {
    expect((await switchboardAs({ dependencies: RAISED }, ...R)).dependencies.find((d: any) => d.what === 'the pipeline fix').raised.times).toBe(3);
    const b = await switchboardAs({ dependencies: RAISED, peersVisibleToEachOther: false }, ...B);
    expect(b.dependencies.map((d: any) => d.what)).toEqual(['the new price list']);
  });
});
