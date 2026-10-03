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
const RUKIA = ['u-rukia', 'MEMBER'] as const;
const BARAKA = ['u-baraka', 'MEMBER'] as const;
const JUMA = ['u-juma', 'ADMIN'] as const;

/*
 * SCREENS REQUEST 89: WHO SAID A RECORD, BESIDE WHOSE IT IS.
 * Baraka names Rukia's deal in his own words. The deal is Rukia's; the words are Baraka's.
 */
const NAMED_BY_ANOTHER: Setup = {
  kindOfWork: 'sales org',
  lines: [{ id: 'e-baraka', participantId: 'p-baraka', text: 'Rukia has Nyama Choma Palace at the quote stage.' }],
  items: [
    item('w-1', 'deal', 'Nyama Choma Palace', { stage: 'Quoted', ownerParticipantId: 'p-rukia', sourceEntryId: 'e-baraka' }),
    item('w-2', 'deal', 'Karen Butchery', { stage: 'Contacted', addedByUserId: 'u-amina' }),
  ],
};
const rowsOf = (board: any) => (board.workRecords as any[]).find((s) => s.section === 'Deal grid').rows as any[];

/*
 * CHANGED WITH RUN-26 (Hafsah's release instruction: a record is always owned by the person who said it). This fixture
 * stored Rukia as the owner of a line Baraka said, which is exactly what let Musa's "I signed for the loan" reach Sunday's
 * board. A record is its speaker's, so Baraka's line is Baraka's deal, whatever an older row stored, and Rukia does not
 * read it.
 */
describe('who said a record, where people see each other', () => {
  it('Rukia does not read a deal Baraka said, even where an older row stored her as its owner', async () => {
    expect(rowsOf(await boardAs(NAMED_BY_ANOTHER, ...RUKIA)).map((r: any) => r.name)).toEqual([]);
  });

  it.each<[string, readonly [string, string]]>([['Amina, who runs it', AMINA], ['Juma, an admin who only reads', JUMA]])('%s reads that Baraka said it and that it is Baraka\'s', async (_who, reader) => {
    const row = rowsOf(await boardAs(NAMED_BY_ANOTHER, reader[0], reader[1])).find((r: any) => r.name === 'Nyama Choma Palace');
    expect(row.owner).toBe('Baraka Otieno');
    expect(row.saidBy).toBe('Baraka');
    expect(row.saidByLine).toBe('In Baraka\'s words,');
    expect(row.saidByParticipantId).toBe('p-baraka');
  });

  /* Changed with the run-26 review: this case expected Baraka to be told "Baraka" for his own line. It is "In your words,". */
  it('Baraka, who said it, reads that it is his, and that it is in your words, never his own first name', async () => {
    const row = rowsOf(await boardAs(NAMED_BY_ANOTHER, ...BARAKA)).find((r: any) => r.name === 'Nyama Choma Palace');
    expect(row.owner).toBe('Baraka Otieno');
    expect(row.saidBy).toBe('You');
    expect(row.saidByLine).toBe('In your words,');
    expect(row.saidByParticipantId).toBe('p-baraka');
    expect(JSON.stringify(row.saidByLine)).not.toMatch(/Baraka/);
  });

  it('a record the lead added was said by nobody', async () => {
    const row = rowsOf(await boardAs(NAMED_BY_ANOTHER, ...AMINA)).find((r: any) => r.name === 'Karen Butchery');
    expect(row.saidBy).toBeNull();
    expect(row.saidByParticipantId).toBeNull();
  });
});

describe('who said a record, where people see only themselves', () => {
  const HIDDEN = { ...NAMED_BY_ANOTHER, peersVisibleToEachOther: false };

  it('Rukia is not served the deal Baraka said, and is given no id or name for him', async () => {
    expect(rowsOf(await boardAs(HIDDEN, ...RUKIA)).map((r: any) => r.name)).toEqual([]);
    expect(JSON.stringify(await boardAs(HIDDEN, ...RUKIA))).not.toContain('p-baraka');
    expect(JSON.stringify(await boardAs(HIDDEN, ...RUKIA))).not.toContain('Baraka');
  });

  it('Baraka, who said it, reads it as his own', async () => {
    expect(rowsOf(await boardAs(HIDDEN, ...BARAKA)).map((r: any) => [r.name, r.owner])).toEqual([['Nyama Choma Palace', 'Baraka Otieno']]);
  });

  it('Amina, who runs it, and Juma, an admin, read the first name and the id', async () => {
    for (const reader of [AMINA, JUMA] as const) {
      const row = rowsOf(await boardAs(HIDDEN, reader[0], reader[1]))[0];
      expect(row.saidBy).toBe('Baraka');
      expect(row.saidByParticipantId).toBe('p-baraka');
    }
  });
});
