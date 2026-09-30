import { BoardService } from './board.service';
import { ReportsService } from '../reports/reports.service';
import { GroundMode, GroundScenario, PartyType } from '@prisma/client';
import { withTheirOwnWordsKept, THEIR_OWN_WORDS_ON_THE_BOARD } from './their-own-words-stay';
import { withoutHiddenTargetsIn } from './a-hidden-target-stays-hidden';

/**
 * WHAT RUKIA SAID STAYS HERS TO BE READ. Screens request 77, 29 September 2026.
 *
 * "Sales team, Q3". Amina runs it. Rukia and Baraka check in, and each sees only their own target
 * (THEIR_OWN). Rukia's target is 4 shops. Juma is an admin who only reads. Amina's own file,
 * team-plan.txt, is hers alone.
 *
 * Rukia said, in her check-in, "Four shops for me.", "Baraka has four shops in Westlands and Neema has
 * four in Karen." and "As team-plan.txt says, four shops each by Friday." Juma was served those lines
 * with no words at all, because the rule that hides her target from him emptied every line with
 * "four" in it. Hafsah's ruling: a person's own words from their check-in are never removed. The file
 * rule may hide the file's name and nothing else. The target rule is for Groundwork's own sentences.
 */
const person = (id: string, userId: string, first: string, last: string, partyType: PartyType = PartyType.PARTICIPANT, managingOnly = false) => ({
  id, userId, partyType, email: `${id}@baridi.test`, roleAsDescribed: 'sales', nameGiven: null, organisationGiven: null,
  remitAsGiven: null, managingOnly, signedOffAt: null,
  createdAt: new Date(partyType === PartyType.INITIATOR ? '2026-09-01T09:00:00Z' : '2026-09-01T10:00:00Z'),
  user: { firstName: first, lastName: last },
});
const PEOPLE = [
  person('p-amina', 'u-amina', 'Amina', 'Wanjiru', PartyType.INITIATOR, true),
  person('p-rukia', 'u-rukia', 'Rukia', 'Mwangi'),
  person('p-baraka', 'u-baraka', 'Baraka', 'Otieno'),
];
const CHECK_INS = [1, 2, 3].flatMap((n) => ['p-rukia', 'p-baraka'].map((pid) => ({
  id: `c${n}-${pid}`, participantId: pid, sessionNumber: n, status: 'COMPLETED', isSetup: false,
  completedAt: new Date(`2026-09-0${n + 1}T16:00:00Z`), specificityLevel: 'specific', specificityDimensions: { checkable: 'specific' },
})));

const SHE_SAID = [
  'Four shops for me.',
  'Baraka has four shops in Westlands and Neema has four in Karen.',
  'As team-plan.txt says, four shops each by Friday.',
];
const ENTRIES = SHE_SAID.map((text, i) => ({
  id: `e${i}`, participantId: 'p-rukia', type: i === 0 ? 'COMMITMENT' : 'PROGRESS', text, checkInId: 'c1-p-rukia',
  createdAt: new Date(`2026-09-02T1${i}:00:00Z`), recallBased: true, anchoredDocumentId: null, anchoredOrigin: null, documentSays: null, confirmedAt: null,
}));

function boardAs(userId: string, role: string) {
  const ground: any = {
    id: 'g-1', scenario: GroundScenario.OKR_ALIGNMENT, mode: GroundMode.SHARED,
    initiatorId: 'u-amina', createdByUserId: 'u-amina', organizationId: 'org-1',
    peopleWorkTogether: true, peersVisibleToEachOther: true, timelineDays: 28, cadence: 'WEEKLY', totalSessions: 4,
    whoSeesTargets: 'THEIR_OWN', label: 'Sales team, Q3', participants: PEOPLE, checkIns: CHECK_INS, report: null, dependencies: [], poll: null,
    objectives: [{ id: 'o-1', name: 'Shops signed', target: 4, count: 1, prevCount: 1, ownerParticipantId: 'p-rukia', sortOrder: 1, assumes: [],
      createdAt: new Date('2026-09-01T09:00:00Z'), updatedAt: new Date('2026-09-02T09:00:00Z') }],
  };
  const reads = {
    findMany: jest.fn(async () => []), findFirst: jest.fn(async () => null), findUnique: jest.fn(async () => null),
    count: jest.fn(async () => 0), aggregate: jest.fn(async () => ({ _max: { sessionNumber: 3 } })),
  };
  const model = (own: Record<string, any> = {}) => ({ ...reads, ...own });
  const prisma = new Proxy({
    ground: model({ findUnique: jest.fn(async () => JSON.parse(JSON.stringify(ground))) }),
    user: model({ findUnique: jest.fn(async () => ({ role, organizationId: 'org-1' })) }),
    checkIn: model({ findMany: jest.fn(async () => JSON.parse(JSON.stringify(CHECK_INS))) }),
    recordEntry: model({
      findMany: jest.fn(async (args: any) => (args?.where?.type?.in?.includes?.('PROGRESS') ? ENTRIES.map((e) => ({ ...e })) : [])),
    }),
    groundDocument: model({
      findMany: jest.fn(async () => [{ fileName: 'team-plan.txt', visibility: 'OWN', participantId: 'p-amina' }]),
    }),
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

const whatRukiaSaid = (board: any): string[] =>
  ((board.whoOwnsWhat ?? []).find((r: any) => r.participantId === 'p-rukia')?.items ?? []).map((i: any) => i.text);
const rukiasRow = (board: any) => (board.eachPerson ?? []).find((r: any) => r.participantId === 'p-rukia');

describe('what Rukia said in her check-in, read by each person', () => {
  it('Juma, an admin who only reads, reads every line she said, with only the file name hidden', async () => {
    const board = await boardAs('u-juma', 'ADMIN');
    expect(whatRukiaSaid(board)).toEqual([
      'Four shops for me.',
      'Baraka has four shops in Westlands and Neema has four in Karen.',
      'As a document says, four shops each by Friday.',
    ]);
    expect(JSON.stringify(board)).not.toMatch(/team-plan/);
  });

  it('Baraka, a colleague, reads the same, with only the file name hidden', async () => {
    expect(whatRukiaSaid(await boardAs('u-baraka', 'MEMBER'))).toEqual([
      'Four shops for me.',
      'Baraka has four shops in Westlands and Neema has four in Karen.',
      'As a document says, four shops each by Friday.',
    ]);
  });

  it('Amina, who runs it and owns the file, reads every line exactly as Rukia said it', async () => {
    expect(whatRukiaSaid(await boardAs('u-amina', 'MEMBER'))).toEqual(SHE_SAID);
  });

  it('no line under "Who owns what" is ever served without words', async () => {
    for (const [u, r] of [['u-juma', 'ADMIN'], ['u-baraka', 'MEMBER'], ['u-amina', 'MEMBER']]) {
      const board = await boardAs(u, r);
      for (const row of board.whoOwnsWhat ?? []) for (const item of row.items) expect(String(item.text ?? '').trim()).not.toBe('');
    }
  });
});

describe("a sentence Groundwork writes about Rukia's hidden target still goes", () => {
  it('Amina reads that Rukia is behind, with her number', async () => {
    expect(rukiasRow(await boardAs('u-amina', 'MEMBER')).says).toMatch(/is at 1 of 4\b/);
  });

  it('Juma is served her row without the number', async () => {
    const row = rukiasRow(await boardAs('u-juma', 'ADMIN'));
    /* Decision 53, item 11 (29 September 2026): Juma cannot see Rukia's target, so she is never told
       "nothing here needs you this week" - that claim is about the very number she cannot see. Was
       'Rukia Mwangi has checked in, and nothing here needs you this week.' before the decision. */
    expect(row.says).toBe('Rukia Mwangi has checked in.');
  });

  it('outside what Rukia said, nothing Juma or Baraka is served gives her 4; Amina is served it', async () => {
    const beyondWhatSheSaid = (b: any) => JSON.stringify({ ...b, whoOwnsWhat: undefined });
    const HER_NUMBER = /\b(?:of|said) 4\b|\bfour\b/i;
    expect(beyondWhatSheSaid(await boardAs('u-amina', 'MEMBER'))).toMatch(HER_NUMBER);
    expect(beyondWhatSheSaid(await boardAs('u-juma', 'ADMIN'))).not.toMatch(HER_NUMBER);
    expect(beyondWhatSheSaid(await boardAs('u-baraka', 'MEMBER'))).not.toMatch(HER_NUMBER);
  });
});

describe('withTheirOwnWordsKept', () => {
  const hidden = [{ names: ['Rukia Mwangi', 'Rukia'], target: 4, participantId: 'p-rukia' }];
  it('keeps the record line and still takes the product sentence out of the same row', () => {
    const served = {
      whoOwnsWhat: [{ participantId: 'p-rukia', name: 'Rukia Mwangi', role: 'Rukia has a target of four shops. She sells in Karen.', items: [{ id: 'e0', type: 'COMMITMENT', text: 'Four shops for me.' }] }],
      summary: 'Rukia is at 1 of 4. She is waiting on stock.',
      when: new Date('2026-09-29T09:00:00Z'),
    };
    const out = withTheirOwnWordsKept(served, THEIR_OWN_WORDS_ON_THE_BOARD, (v) => withoutHiddenTargetsIn(v, hidden));
    expect(out.whoOwnsWhat[0].items[0].text).toBe('Four shops for me.');
    expect(out.whoOwnsWhat[0].role).toBe('She sells in Karen.');
    expect(out.summary).toBe('She is waiting on stock.');
    expect(out.when).toBeInstanceOf(Date);
    /* The object it was given is not changed. */
    expect(served.whoOwnsWhat[0].role).toMatch(/four shops/);
  });
});
