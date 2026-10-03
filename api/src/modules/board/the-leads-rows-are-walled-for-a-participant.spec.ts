import { theLeadsLineAsAParticipantMayRead } from '../reports/one-persons-circumstances-stay-their-own';
import { BoardService } from './board.service';
import { BoardListener } from './board.listener';
import { ReportsService } from '../reports/reports.service';
import { GroundMode, GroundScenario, PartyType } from '@prisma/client';
import { onlyRecordsTheLinesSay, theRecordSections } from './the-kind-of-work';

/**
 * RUN-26 REVIEW: THE LEAD'S OWN ROWS CARRY OTHER PEOPLE'S CIRCUMSTANCES. Every record is owned by the person who said it, so
 * a line by the lead about one borrower's tricycle was the lead's row, and was served word for word to every borrower.
 * Read as Rukia and Baraka, who check in and do not see each other, as Amina, who runs it, and as Juma, an admin.
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
  commitments?: any[];
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
    groundCommitment: model({ findMany: jest.fn(async () => (setup.commitments ?? []).map((c) => ({ ...c }))) }),
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


const SAID = {
  kindOfWork: 'sales org',
  peersVisibleToEachOther: false,
  lines: [
    { id: 'e-1', participantId: 'p-amina', text: 'Baraka\'s tricycle was stolen in the fourth month.' },
    { id: 'e-2', participantId: 'p-amina', text: 'Most borrowers started repaying before their asset was earning.' },
    { id: 'e-3', participantId: 'p-amina', text: 'I want twelve shops signed by June.' },
    { id: 'e-4', participantId: 'p-amina', text: 'The tricycle was stolen in the fourth month.' },
    { id: 'e-5', participantId: 'p-amina', text: 'The supplier never delivered the machine. We want every borrower earning by the fourth month.' },
  ],
  items: [
    item('w-1', 'deal', 'Stolen tricycle', { stage: 'Contacted', sourceEntryId: 'e-1' }),
    item('w-2', 'deal', 'Late repayments', { stage: 'Contacted', sourceEntryId: 'e-2' }),
    item('w-3', 'deal', 'Twelve shops', { stage: 'Contacted', sourceEntryId: 'e-3' }),
    item('w-4', 'deal', 'Second tricycle', { stage: 'Contacted', sourceEntryId: 'e-4' }),
    item('w-5', 'deal', 'Earning by month four', { stage: 'Contacted', sourceEntryId: 'e-5' }),
    item('w-6', 'deal', 'Baraka loan review', { stage: 'Contacted', addedByUserId: 'u-amina' }),
  ],
} as Setup;
const rows = (board: any) => (board.workRecords as any[]).find((s) => s.section === 'Deal grid').rows as any[];

describe('the lead\'s rows, read where people do not see each other', () => {
  it('Rukia reads nothing of one borrower\'s circumstances in the lead\'s rows', async () => {
    const board = await boardAs(SAID, ...RUKIA);
    expect(JSON.stringify(rows(board))).not.toMatch(/tricycle|supplier never delivered|Baraka/i);
  });

  it('Amina, who runs it, and Juma, an admin, read every row word for word', async () => {
    for (const who of [AMINA, JUMA] as (readonly [string, string])[]) {
      const r = rows(await boardAs(SAID, who[0], who[1]));
      expect(r.map((x: any) => x.name).sort()).toEqual(['Baraka loan review', 'Earning by month four', 'Late repayments', 'Second tricycle', 'Stolen tricycle', 'Twelve shops']);
      expect(r.find((x: any) => x.name === 'Earning by month four').said).toBe('The supplier never delivered the machine. We want every borrower earning by the fourth month.');
    }
  });
});

/**
 * The board already narrows a participant's work records to their own (request 105), so the unit below is the wall the
 * lead's rows go through before that narrowing, for any reader the narrowing does not reach.
 */
describe('a line of the lead\'s, for a reader who may not name the others', () => {
  const others = { names: ['Baraka Otieno', 'Baraka', 'Rukia Mwangi', 'Rukia'], lead: ['Amina Wanjiru', 'Amina'] };
  it.each([
    ['Yakubu\'s tricycle was stolen.', ''],
    ['Baraka\'s tricycle was stolen in the fourth month.', ''],
    ['The tricycle was stolen in the fourth month.', ''],
    ['Most borrowers started repaying before their asset was earning.', 'Most borrowers started repaying before their asset was earning.'],
    ['I want twelve shops signed by June.', 'I want twelve shops signed by June.'],
    ['I think Baraka should not have had a loan.', ''],
    ['The supplier never delivered the machine. We want every borrower earning by the fourth month.', 'We want every borrower earning by the fourth month.'],
  ])('%s', (said, kept) => {
    expect(theLeadsLineAsAParticipantMayRead(said, others).kept).toBe(kept);
  });
});

/**
 * WHAT HAPPENS NEXT FOLLOWS THE SPEAKER, AS THE REST OF THE ROW DOES. An older row stored Rukia as the owner of a line
 * Baraka said; the row is Baraka's, so his own commitment is its next step, and Rukia's is not.
 */
describe('what happens next to a record the speaker owns', () => {
  const SPOKEN: Setup = {
    kindOfWork: 'sales org',
    lines: [{ id: 'e-b', participantId: 'p-baraka', text: 'I will send Eastside Foods the quote with a photo on Friday.' }],
    items: [item('w-1', 'deal', 'Eastside Foods', { stage: 'Quoted', ownerParticipantId: 'p-rukia', sourceEntryId: 'e-b' })],
    commitments: [
      { id: 'k-b', groundId: 'g-1', participantId: 'p-baraka', text: 'I will send Eastside Foods the quote with a photo on Friday.', status: 'UNKNOWN', whenSaid: null, explicit: true, source: 'CHECK_IN', statedInSession: 1, saidAgainIn: [], settledBy: null, settledAt: null, saidWordForWord: true, whenSaidWordForWord: false, createdAt: new Date('2026-09-02T16:30:00Z') },
      { id: 'k-r', groundId: 'g-1', participantId: 'p-rukia', text: 'I will phone Eastside Foods on Monday.', status: 'UNKNOWN', whenSaid: null, explicit: true, source: 'CHECK_IN', statedInSession: 1, saidAgainIn: [], settledBy: null, settledAt: null, saidWordForWord: true, whenSaidWordForWord: false, createdAt: new Date('2026-09-02T16:31:00Z') },
    ],
  };
  it('Baraka reads his own commitment as the next step, and never Rukia\'s', async () => {
    const row = rows(await boardAs(SPOKEN, ...BARAKA))[0];
    expect(row.next).toBe('You committed to send Eastside Foods the quote with a photo on Friday.');
    expect(JSON.stringify(row)).not.toMatch(/phone/);
  });
});
