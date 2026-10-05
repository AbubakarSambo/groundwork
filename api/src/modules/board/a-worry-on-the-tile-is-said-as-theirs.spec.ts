import { Logger } from '@nestjs/common';
import { GroundMode, GroundScenario, PartyType } from '@prisma/client';
import { BoardService } from './board.service';
import { ReportsService } from '../reports/reports.service';

/**
 * THE BLOCKERS TILE'S WORRY, AS EACH READER READS IT (review of 1 October 2026, re-d, seniorhire and
 * pip). The tile served a person's worry in their own first-person words with no name: "I still set up
 * the meetings. There are 4 more worries on record, and nobody is waiting on anybody." It is now their
 * words in quotation marks after their name, "You said, ..." for them.
 */
const at = (d: string) => new Date(`2026-09-${d}T16:00:00Z`);
const person = (id: string, userId: string, first: string, last: string, lead = false) => ({
  id, userId, partyType: lead ? PartyType.INITIATOR : PartyType.PARTICIPANT, email: `${userId}@sales.test`,
  roleAsDescribed: lead ? 'Sales manager' : 'Relationship officer', nameGiven: null, organisationGiven: null, managingOnly: lead,
  remitAsGiven: null, createdAt: new Date(`2026-09-01T${lead ? '09' : '10'}:00:00Z`), user: { firstName: first, lastName: last },
});
const PEOPLE = [person('p-bisi', 'u-bisi', 'Bisi', 'Adeyemi', true), person('p-ngozi', 'u-ngozi', 'Ngozi', 'Eze'), person('p-kwame', 'u-kwame', 'Kwame', 'Mensah')];
const CHECK_INS = ['p-ngozi', 'p-kwame'].flatMap((pid) => [1, 2].map((n) => ({
  id: `c${n}-${pid}`, participantId: pid, sessionNumber: n, status: 'COMPLETED', isSetup: false,
  completedAt: at(n === 1 ? '15' : '29'), specificityLevel: 'specific', specificityDimensions: { checkable: 'specific' },
})));
const objective = (id: string, name: string, target: number, count: number, owner: string | null, sortOrder: number) => ({
  id, groundId: 'g-sales', name, target, count, prevCount: 0, ownerParticipantId: owner, setByParticipantId: null,
  direction: null, isADecisionAboutAPerson: false, sortOrder, addedAtSession: null, assumes: [],
});

interface World { objectives: any[]; snapshots: Record<number, { objectiveId: string; count: number }[]>; worries?: any[] }

function prismaFor(w: World, role: string) {
  const ground: any = {
    id: 'g-sales', scenario: GroundScenario.OKR_ALIGNMENT, mode: GroundMode.SHARED,
    initiatorId: 'u-bisi', createdByUserId: 'u-bisi', organizationId: 'org-1',
    peopleWorkTogether: true, peersVisibleToEachOther: true, timelineDays: 90, cadence: 'FORTNIGHTLY',
    whoSeesTargets: 'THEIR_OWN', label: 'Credit sales against this quarter target', participants: PEOPLE,
    checkIns: CHECK_INS, report: null, dependencies: [], poll: null, objectives: w.objectives, personObjectives: [],
    closedAt: null, kindOfWork: null, workStages: null,
  };
  const reads = {
    findMany: jest.fn(async () => []), findFirst: jest.fn(async () => null), findUnique: jest.fn(async () => null),
    count: jest.fn(async () => 0), aggregate: jest.fn(async () => ({ _max: { sessionNumber: 2 } })),
  };
  const model = (own: Record<string, any> = {}) => ({ ...reads, ...own });
  return new Proxy({
    ground: model({ findUnique: jest.fn(async () => structuredClone(ground)) }),
    user: model({ findUnique: jest.fn(async () => ({ role, organizationId: 'org-1' })) }),
    checkIn: model({ findMany: jest.fn(async (args: any) => structuredClone(CHECK_INS).filter((c: any) => args?.where?.sessionNumber == null || c.sessionNumber === args.where.sessionNumber)) }),
    groundObjective: model({ findMany: jest.fn(async () => structuredClone(w.objectives)) }),
    groundObjectiveSnapshot: model({ findMany: jest.fn(async (args: any) => structuredClone(w.snapshots[args?.where?.sessionNumber] ?? [])) }),
    recordEntry: model({ findMany: jest.fn(async (args: any) => (args?.where?.type?.in?.includes?.('WORRY') || (args?.where?.participant && !args?.where?.type) ? structuredClone(w.worries ?? []) : [])) }),
  } as any, {
    get(target: any, prop: string) {
      if (!(prop in target) && typeof prop === 'string' && !prop.startsWith('$')) target[prop] = model();
      return target[prop];
    },
  });
}

async function readAs(w: World, userId: string, role = 'MEMBER'): Promise<{ blockers: { value: string; sub: string }; movement: { value: string; sub: string }; sinceLast: string }> {
  const prisma = prismaFor(w, role);
  const reports = Object.create(ReportsService.prototype) as any;
  reports.prisma = prisma;
  reports.logger = new Logger('test');
  reports.getAsBuilt = jest.fn(async () => ({ groundId: 'g-sales', report: { findings: [] } }));
  const board = await new BoardService(prisma, { respond: jest.fn(async () => null) } as any, { getSessionProgress: async () => null } as any, reports)
    .get('g-sales', userId) as any;
  const report = await (reports as ReportsService).get('g-sales', userId, 'org-1') as any;
  const movement = (board.quickRead ?? []).find((t: any) => t.label === 'Movement');
  const blockers = (board.quickRead ?? []).find((t: any) => t.label === 'Blockers');
  return { blockers: { value: blockers?.value, sub: blockers?.sub }, movement: { value: movement?.value, sub: movement?.sub }, sinceLast: [report.sinceLast?.says, report.sinceLast?.also].filter(Boolean).join(' ') };
}


const w: World = {
  objectives: [],
  snapshots: {},
  worries: [
    { text: 'I still set up the meetings. Nobody else does.', participantId: 'p-kwame', saidWordForWord: true },
    { text: 'The committee is slow.', participantId: 'p-ngozi', saidWordForWord: true },
  ],
};
const REST = 'There is 1 more worry on record, and nobody is waiting on anybody.';

describe('the Blockers tile says whose worry it is', () => {
  it('Bisi, who runs it, reads Kwame\'s words after his name', async () => {
    expect((await readAs(w, 'u-bisi')).blockers).toEqual({ value: '2 worries', sub: `Kwame Mensah said, "I still set up the meetings." ${REST}` });
  });
  /* Request 105 (the prototype's B5): the tiles are the team's picture, so a person who checks in is served
     none of them until it is shared, and no report is released on this board. */
  it('Kwame, who checks in, is served no tile before the team picture is shared', async () => {
    expect((await readAs(w, 'u-kwame')).blockers).toEqual({ value: undefined, sub: undefined });
  });
  it('Ngozi, a colleague, is served no tile with Kwame\'s words before the team picture is shared', async () => {
    expect((await readAs(w, 'u-ngozi')).blockers).toEqual({ value: undefined, sub: undefined });
  });
  it('an admin outside the check-in reads them after his name', async () => {
    expect((await readAs(w, 'u-grace', 'ADMIN')).blockers.sub).toBe(`Kwame Mensah said, "I still set up the meetings." ${REST}`);
  });
  it('no reader is served the bare first-person line', async () => {
    for (const [u, r] of [['u-bisi', 'MEMBER'], ['u-kwame', 'MEMBER'], ['u-ngozi', 'MEMBER'], ['u-grace', 'ADMIN']] as const) {
      expect(String((await readAs(w, u, r)).blockers.sub)).not.toMatch(/^I still/);
    }
  });
});

describe('a line the record did not keep word for word is never put in quotation marks', () => {
  it('the tile passes over it and gives the count', async () => {
    const paraphrased: World = { ...w, worries: [{ text: 'I still set up the meetings.', participantId: 'p-kwame', saidWordForWord: false }] };
    expect((await readAs(paraphrased, 'u-bisi')).blockers).toEqual({ value: '1 worry', sub: '1 worry is on record. It cannot be shown to you word for word. Nobody is waiting on anybody.' }); /* Changed 5 Oct 2026, request 127 item 7. */
  });
});

describe('where a colleague\'s words are walled from the reader (the person an evaluation is about)', () => {
  const { whatThisSessionHolds } = require('../reports/what-this-session-holds');
  const prisma = (rows: any[]) => ({
    checkIn: { findMany: async () => [{ id: 'c1' }] },
    groundDependency: { findMany: async () => [] },
    groundObjective: { findMany: async () => [] },
    groundObjectiveSnapshot: { findMany: async () => [] },
    ground: { findUnique: async () => ({ participants: PEOPLE, peersVisibleToEachOther: true }) },
    recordEntry: { findMany: async (args: any) => (args?.where?.type ? rows : []) },
  });
  it('reads only their own worry, as "You said"', async () => {
    const held = await whatThisSessionHolds(prisma(w.worries!), 'g-sales', 1, { participantId: 'p-ngozi', isLead: false, colleaguesWordsWalled: true });
    expect(held.theFirstWorry).toBe('You said, "The committee is slow."');
  });
  it('and with only a colleague\'s worry, no words at all, so the tile gives the count', async () => {
    const held = await whatThisSessionHolds(prisma(w.worries!.slice(0, 1)), 'g-sales', 1, { participantId: 'p-ngozi', isLead: false, colleaguesWordsWalled: true });
    expect(held.theFirstWorry).toBeNull();
    expect(held.worries).toBe(1);
  });
});
