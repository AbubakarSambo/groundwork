import { readFileSync } from 'fs';
import { join } from 'path';
import { BoardService } from './board.service';
import { ReportsService } from '../reports/reports.service';
import { GroundMode, GroundScenario, PartyType } from '@prisma/client';

/**
 * THE BOARD NEVER READS HOW A PERSON'S ANSWERS WERE RATED (CLAUDE.md, privacy; request 8).
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

describe('the board never reads how a person’s answers were rated', () => {
  it('serves the lead exactly the same rows however every check-in was rated', async () => {
    const best = served(await boardRatedAs('mostFlattering'));
    const worst = served(await boardRatedAs('leastFlattering'));
    expect(best.length).toBe(4);
    expect(worst).toEqual(best);
  });

  it('and what the lead reads is what the record holds, said in full sentences', async () => {
    expect(served(await boardRatedAs('leastFlattering'))).toEqual([
      { who: 'Femi Adeyemi', reason: 'has not answered', says: 'Femi Adeyemi has not checked in for this round yet.' },
      { who: 'Miriam Wanjiku', reason: 'nothing to count yet', says: 'What Miriam Wanjiku said this round has no number, no date and no document with it yet, so there is nothing new to count. A number or a date for what moved would change that.' },
      /* Somebody with no name is "A colleague", never the lead's description of them (request 36). */
      { who: 'A colleague', reason: 'nothing to count yet', says: 'What a colleague said this round has no number, no date and no document with it yet, so there is nothing new to count. A number or a date for what moved would change that.' },
      { who: 'Aisha Otieno', reason: 'nothing to do', says: 'Aisha Otieno has checked in, and nothing here needs you this week.' },
    ]);
  });

  it('no sentence rates or labels the person', async () => {
    for (const rating of ['mostFlattering', 'leastFlattering'] as const) {
      const b = await boardRatedAs(rating);
      for (const r of b.eachPerson ?? []) {
        expect(r.says).not.toMatch(/checkable|vague|specific|rating|score|not chasing|\blow\b|poor/i);
      }
      expect(JSON.stringify(b.eachPerson)).not.toMatch(/specificity|nothing checkable|managed|vague/i);
    }
  });
});

describe('and the code that builds each row asks the rating nothing', () => {
  /* Comments stripped first: a sentence that names the rating must not satisfy the guard, or fail it. */
  const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const board = strip(readFileSync(join(__dirname, 'board.service.ts'), 'utf8'));
  const start = board.indexOf('const openRound = whichRoundIsOpen(checkIns as any);');
  const block = board.slice(start, board.indexOf("if (has('checkInGrid')) {", start));
  const rows = strip(readFileSync(join(__dirname, 'where-each-person-is-against-their-number.ts'), 'utf8'));

  it('the eachPerson block and the rule never mention specificityLevel or specificityDimensions', () => {
    expect(start).toBeGreaterThan(0);
    expect(block).toContain('out.eachPerson = whereEachPersonIs(');
    expect(block).not.toMatch(/specificity/i);
    expect(rows).not.toMatch(/specificity/i);
  });

  it('and the board does not even ask the database for the rating', () => {
    expect(board).not.toMatch(/specificityLevel: true|specificityDimensions: true/);
  });
});
