import { readFileSync } from 'fs';
import { join } from 'path';
import { BoardService } from './board.service';
import { ReportsService } from '../reports/reports.service';
import { GroundMode, GroundScenario, PartyType } from '@prisma/client';

/**
 * CHANGED 28 SEPTEMBER 2026, on Hafsah's correction. This spec pinned request 8's rule (a1747927):
 * the board never reads how checkable a person's answers were, and the lead is served the same rows
 * however every check-in was rated. Hafsah: the rating of how specific and checkable a person's
 * answers are is needed; it rates the answers, not the person or their work, so decision 11 does not
 * cover it, and the prototype shows it on the lead's board as "Nothing checkable". So the rating
 * now decides exactly one thing, that reason, and every other protection here stays: nobody but
 * whoever runs the check-in reads these rows, no raw rating value is ever served, no sentence rates
 * the person, and nothing else on a row moves with the rating.
 *
 * WHAT IT SAID BEFORE: THE BOARD NEVER READS HOW A PERSON'S ANSWERS WERE RATED (CLAUDE.md, privacy; request 8).
 *
 * "Where each person is" told the lead a person said "nothing checkable", and that was worked out
 * from `specificityLevel` and `specificityDimensions`, the engine's rating of their answers. A lead
 * never sees that rating, by any route. So the same board is built twice through `BoardService.get`,
 * once with every check-in rated as well as it can be and once as badly, and what the lead is
 * served must not differ by a character: not the reason, not the sentence, not the order.
 *
 * And the sentences the lead reads say what happened. None of them carries a word that rates or
 * labels the person.
 */

const person = (id: string, first: string, last: string, over: Record<string, unknown> = {}) => ({
  id, userId: `u-${id}`, partyType: PartyType.PARTICIPANT, email: `${id}@baridi.test`,
  roleAsDescribed: 'sales', nameGiven: null, organisationGiven: null, managingOnly: false,
  createdAt: new Date('2026-09-01T10:00:00Z'), user: { firstName: first, lastName: last }, ...over,
});
const LEAD = {
  ...person('p-lead', 'Wairimu', 'Kamau'), userId: 'u-wairimu', partyType: PartyType.INITIATOR,
  roleAsDescribed: 'runs the sales team', managingOnly: true,
};
const MIRIAM = person('p-miriam', 'Miriam', 'Wanjiku');
const AISHA = person('p-aisha', 'Aisha', 'Otieno');
const FEMI = person('p-femi', 'Femi', 'Adeyemi');
const NO_NAME = person('p-role', '', '', { roleAsDescribed: 'Head of Sales', user: { firstName: null, lastName: null } });

const checkIn = (id: string, participantId: string, status: string) => ({
  id, participantId, sessionNumber: 2, status, isSetup: false,
  completedAt: status === 'COMPLETED' ? new Date('2026-09-22T16:10:00Z') : null,
});

/* What each person's check-in this round put on the record. Aisha gave a number; Miriam did not. */
const ENTRIES = [
  { checkInId: 'c-miriam', participantId: 'p-miriam', type: 'PROGRESS', text: 'I visited the buyers and it went well.', anchoredDocumentId: null, documentSays: null },
  { checkInId: 'c-aisha', participantId: 'p-aisha', type: 'PROGRESS', text: 'I sold 3 freezers to Fresh Foods.', anchoredDocumentId: null, documentSays: null },
  { checkInId: 'c-role', participantId: 'p-role', type: 'PROGRESS', text: 'Busy week with the team.', anchoredDocumentId: null, documentSays: null },
];

const RATINGS = {
  mostFlattering: { specificityLevel: 'specific', specificityDimensions: { checkable: 'specific', anchored: 'specific' } },
  leastFlattering: { specificityLevel: 'managed', specificityDimensions: { checkable: 'managed', anchored: 'managed' } },
};

function boardRatedAs(rating: keyof typeof RATINGS) {
  const checkIns = [
    checkIn('c-miriam', 'p-miriam', 'COMPLETED'),
    checkIn('c-aisha', 'p-aisha', 'COMPLETED'),
    checkIn('c-femi', 'p-femi', 'NOT_STARTED'),
    checkIn('c-role', 'p-role', 'COMPLETED'),
    { ...checkIn('c-miriam-1', 'p-miriam', 'COMPLETED'), sessionNumber: 1 },
  ].map((c) => ({ ...c, ...RATINGS[rating] }));
  const ground: any = {
    id: 'g-sales', scenario: GroundScenario.OKR_ALIGNMENT, mode: GroundMode.SHARED,
    initiatorId: 'u-wairimu', createdByUserId: 'u-wairimu', organizationId: 'org-1',
    peopleWorkTogether: true, peersVisibleToEachOther: true, timelineDays: 90, cadence: 'WEEKLY',
    whoSeesTargets: 'THEIR_OWN', label: 'Sales team, Q3', totalSessions: 12,
    participants: [LEAD, MIRIAM, AISHA, FEMI, NO_NAME],
    checkIns,
    report: {
      releasedAt: new Date('2026-09-23T17:00:00Z'), sharedAs: null, theOpening: null, networkPicture: null,
      sharedPicture: 'Three have checked in.', agreements: [], divergences: [], centralQuestion: null,
      engagement: {}, findings: [],
      createdAt: new Date('2026-09-20T09:00:00Z'), updatedAt: new Date('2026-09-23T15:02:00Z'),
    },
    objectives: [],
    dependencies: [],
    poll: null,
  };
  const reads = {
    findMany: jest.fn(async () => []),
    findFirst: jest.fn(async () => null),
    findUnique: jest.fn(async () => null),
    count: jest.fn(async () => 0),
    aggregate: jest.fn(async () => ({ _max: { sessionNumber: 2 } })),
  };
  const model = (own: Record<string, any> = {}) => ({ ...reads, ...own });
  const prisma: any = new Proxy({
    ground: model({ findUnique: jest.fn(async () => JSON.parse(JSON.stringify(ground))) }),
    user: model({ findUnique: jest.fn(async () => ({ role: 'MEMBER', organizationId: 'org-1' })) }),
    checkIn: model({ findMany: jest.fn(async () => JSON.parse(JSON.stringify(checkIns))) }),
    recordEntry: model({
      findMany: jest.fn(async (args: any) => {
        const ids: string[] | undefined = args?.where?.checkInId?.in;
        return JSON.parse(JSON.stringify(ids ? ENTRIES.filter((e) => ids.includes(e.checkInId)) : ENTRIES));
      }),
    }),
  }, {
    get(target: any, prop: string) {
      if (!(prop in target) && typeof prop === 'string' && !prop.startsWith('$')) target[prop] = model();
      return target[prop];
    },
  });
  const reports = Object.create(ReportsService.prototype) as ReportsService;
  const svc = new BoardService(prisma, { respond: jest.fn(async () => null) } as any, { getSessionProgress: async () => null } as any, reports);
  return svc.get('g-sales', 'u-wairimu') as Promise<any>;
}

const served = (b: any) => (b.eachPerson ?? []).map((r: any) => ({ who: r.who, reason: r.reason, says: r.says }));

describe('the board reads how checkable the answers were, and nothing more', () => {
  it('the rating decides "nothing checkable" and nothing else on the row', async () => {
    const best = served(await boardRatedAs('mostFlattering'));
    const worst = served(await boardRatedAs('leastFlattering'));
    expect(best.length).toBe(4);
    const others = (rows: any[]) => rows.filter((r) => r.reason !== 'nothing checkable' && r.reason !== 'nothing to do');
    expect(others(worst)).toEqual(others(best));
    expect(best.some((r: any) => r.reason === 'nothing checkable')).toBe(false);
  });

  it("and what the lead reads is said in full sentences, in the prototype's words", async () => {
    expect(served(await boardRatedAs('leastFlattering'))).toEqual([
      { who: 'Femi Adeyemi', reason: 'has not answered', says: 'Femi Adeyemi has not checked in for this session yet.' },
      /* In name order within a reason; Miriam's first round had nothing checkable either. */
      { who: 'Aisha Otieno', reason: 'nothing checkable', says: 'Nothing Aisha Otieno said this round can be checked yet. A number, a date or a document for what moved would change that.' },
      { who: 'Miriam Wanjiku', reason: 'nothing checkable', says: 'Nothing Miriam Wanjiku said this round can be checked yet. This is the second week in a row. A number, a date or a document for what moved would change that.' },
      /* Somebody with no name is "A colleague", never the lead's description of them (request 36). */
      { who: 'A colleague', reason: 'nothing checkable', says: 'Nothing a colleague said this round can be checked yet. A number, a date or a document for what moved would change that.' },
    ]);
  });

  it('with what to ask next', async () => {
    const b = await boardRatedAs('leastFlattering');
    const miriam = (b.eachPerson ?? []).find((r: any) => r.who === 'Miriam Wanjiku');
    /* This rating has no proof part, so the ask is for a number or a date. See the unit spec for proof. */
    expect(miriam.ask).toBe('Ask Miriam Wanjiku for a number or a date for what moved this round.');
  });

  it('no sentence rates or labels the person, and no raw rating value is served', async () => {
    for (const rating of ['mostFlattering', 'leastFlattering'] as const) {
      const b = await boardRatedAs(rating);
      for (const r of b.eachPerson ?? []) {
        expect(r.says).not.toMatch(/vague|specific|rating|score|not chasing|\blow\b|poor/i);
        expect(r.ask ?? '').not.toMatch(/vague|specific|rating|score|\blow\b|poor/i);
      }
      expect(JSON.stringify(b.eachPerson)).not.toMatch(/specificity|managed|vague|"specific"/i);
    }
  });
});

describe('and only whoever runs the check-in reads it', () => {
  const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const board = strip(readFileSync(join(__dirname, 'board.service.ts'), 'utf8'));
  it('the rows are built only when the reader runs the check-in', () => {
    expect(board).toMatch(/const runsThisGround = isInitiator \|\| isSetupAdmin \|\| adminHere;/);
    const start = board.indexOf("if (has('checkInGrid') && runsThisGround) {");
    expect(start).toBeGreaterThan(0);
    expect(board.indexOf('out.eachPerson = whereEachPersonIs(')).toBeGreaterThan(start);
  });
});
