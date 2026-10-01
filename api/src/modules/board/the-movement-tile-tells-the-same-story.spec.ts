import { Logger } from '@nestjs/common';
import { GroundMode, GroundScenario, PartyType } from '@prisma/client';
import { BoardService } from './board.service';
import { ReportsService } from '../reports/reports.service';

/**
 * THE MOVEMENT TILE, AS EACH READER READS IT, AND THE SAME STORY AS "SINCE THE LAST ROUND"
 * (review of 1 October 2026, run re-d, sales).
 *
 * 1. The tile added up every target on the check-in, whoever was reading. On a check-in where people
 *    see only their own numbers, a colleague could read "+5" when the only target that moved was
 *    Kwame's. It now counts only what this reader may read, by the rule the board's targets use.
 * 2. In session 2 the tile said "No target moved this session." while Since the last round, on the same
 *    page, said the team's total went from 0 to 31 million naira. Both now read the same round's counts.
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

interface World { objectives: any[]; snapshots: Record<number, { objectiveId: string; count: number }[]> }

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
  } as any, {
    get(target: any, prop: string) {
      if (!(prop in target) && typeof prop === 'string' && !prop.startsWith('$')) target[prop] = model();
      return target[prop];
    },
  });
}

async function readAs(w: World, userId: string, role = 'MEMBER'): Promise<{ movement: { value: string; sub: string }; sinceLast: string }> {
  const prisma = prismaFor(w, role);
  const reports = Object.create(ReportsService.prototype) as any;
  reports.prisma = prisma;
  reports.logger = new Logger('test');
  reports.getAsBuilt = jest.fn(async () => ({ groundId: 'g-sales', report: { findings: [] } }));
  const board = await new BoardService(prisma, { respond: jest.fn(async () => null) } as any, { getSessionProgress: async () => null } as any, reports)
    .get('g-sales', userId) as any;
  const report = await (reports as ReportsService).get('g-sales', userId, 'org-1') as any;
  const movement = (board.quickRead ?? []).find((t: any) => t.label === 'Movement');
  return { movement: { value: movement?.value, sub: movement?.sub }, sinceLast: [report.sinceLast?.says, report.sinceLast?.also].filter(Boolean).join(' ') };
}

const DISBURSED = (count: number) => objective('o-team', 'N120m disbursed', 120000000, count, null, 0);
const KWAMES = (count: number) => objective('o-kwame', 'approved facilities', 14, count, 'p-kwame', 1);

describe('1. the Movement tile counts only the targets this reader may read', () => {
  /* Only Kwame's own target moved, 0 to 5. The team's stayed at 31 million naira. */
  const w: World = {
    objectives: [DISBURSED(31000000), KWAMES(5)],
    snapshots: { 1: [{ objectiveId: 'o-team', count: 31000000 }, { objectiveId: 'o-kwame', count: 0 }], 2: [{ objectiveId: 'o-team', count: 31000000 }, { objectiveId: 'o-kwame', count: 5 }] },
  };
  it('Bisi, who runs it, reads that it moved by 5', async () => {
    const r = await readAs(w, 'u-bisi');
    expect(r.movement).toEqual({ value: '+5', sub: 'Targets moved this session.' });
    expect(r.sinceLast).toBe("Kwame's approved facilities went from 0 to 5, against the aim of 14.");
  });
  it('Kwame, whose target it is, reads that it moved by 5', async () => {
    const r = await readAs(w, 'u-kwame');
    expect(r.movement).toEqual({ value: '+5', sub: 'Targets moved this session.' });
    expect(r.sinceLast).toBe('Your approved facilities went from 0 to 5.');
  });
  it('Ngozi, who may not read Kwame’s number, reads that nothing moved, and never "+5"', async () => {
    const r = await readAs(w, 'u-ngozi');
    expect(r.movement).toEqual({ value: 'None', sub: 'No target moved this session.' });
    expect(r.sinceLast).toBe('');
  });
  it('an admin outside the check-in reads that nothing moved, and never "+5"', async () => {
    const r = await readAs(w, 'u-grace', 'ADMIN');
    expect(r.movement).toEqual({ value: 'None', sub: 'No target moved this session.' });
    expect(r.sinceLast).toBe('');
  });
});

describe('2. the tile and Since the last round tell one story (re-d, sales, session 2)', () => {
  /* As the round closed and its number was read off it: 0 after round 1, 31 million naira after round 2. */
  const w: World = {
    objectives: [DISBURSED(31000000)],
    snapshots: { 1: [{ objectiveId: 'o-team', count: 0 }], 2: [{ objectiveId: 'o-team', count: 31000000 }] },
  };
  it.each([['Bisi, who runs it', 'u-bisi', 'MEMBER'], ['Ngozi, in it', 'u-ngozi', 'MEMBER'], ['an admin outside it', 'u-grace', 'ADMIN']])('%s reads the same movement on the tile and in the sentence', async (_who, userId, role) => {
    const r = await readAs(w, userId, role);
    expect(r.movement).toEqual({ value: '+31 million', sub: 'Targets moved this session.' });
    expect(r.sinceLast).toBe("The team is aiming for 120 million naira disbursed. The team's total went from 0 to 31 million naira.");
  });

  it('where the round’s snapshot says nothing moved, the sentence does not say it did', async () => {
    const still: World = { objectives: [DISBURSED(31000000)], snapshots: { 1: [{ objectiveId: 'o-team', count: 31000000 }], 2: [{ objectiveId: 'o-team', count: 31000000 }] } };
    const r = await readAs(still, 'u-bisi');
    expect(r.movement).toEqual({ value: 'None', sub: 'No target moved this session.' });
    expect(r.sinceLast).not.toMatch(/went from/);
  });
});
