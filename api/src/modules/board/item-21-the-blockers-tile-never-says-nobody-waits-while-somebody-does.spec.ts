import { Logger } from '@nestjs/common';
import { GroundMode, GroundScenario, PartyType } from '@prisma/client';
import { BoardService } from './board.service';
import { ReportsService } from '../reports/reports.service';
import { atAGlanceTiles } from '../reports/what-this-session-holds';

/**
 * ITEM 21, THE FOUNDER'S BOARD: THE BLOCKERS TILE NEVER SAYS NOBODY WAITS WHILE SOMEBODY DOES.
 *
 * "A second founder joining" (local test database, 9a904212): Ada, who runs it, read "Blockers 2
 * worries. You said, "We haven't actually gotten to that part yet, specifically." There is 1 more
 * worry on record, and no wait has been recorded against a named person." On the same board Tunde had been waiting on her
 * for three things since session 4. This session raised no new wait; the earlier ones were still
 * open. The tile now says so, for every reader it is served to.
 */
const at = (d: string) => new Date(`2026-09-${d}T16:00:00Z`);
const person = (id: string, userId: string, first: string, last: string, lead = false) => ({
  id, userId, partyType: lead ? PartyType.INITIATOR : PartyType.PARTICIPANT, email: `${userId}@founder.test`,
  roleAsDescribed: lead ? 'Founder and chief executive' : 'Incoming co-founder and CTO', nameGiven: null, organisationGiven: null, managingOnly: false,
  remitAsGiven: null, createdAt: new Date(`2026-09-01T${lead ? '09' : '10'}:00:00Z`), user: { firstName: first, lastName: last },
});
const PEOPLE = [person('p-ada', 'u-ada', 'Ada', 'Nwosu', true), person('p-tunde', 'u-tunde', 'Tunde', 'Bakare')];
const CHECK_INS = ['p-ada', 'p-tunde'].flatMap((pid) => [1, 2].map((n) => ({
  id: `c${n}-${pid}`, participantId: pid, sessionNumber: n, status: 'COMPLETED', isSetup: false,
  completedAt: at(n === 1 ? '15' : '29'), specificityLevel: 'specific', specificityDimensions: { checkable: 'specific' },
})));
/* Raised by Tunde in session 1, on Ada, and still open. */
const WAITS = ['the co-founder agreement', 'the formalized agreement', 'an explicit handoff of decisions and processes'].map((what, i) => ({
  id: `d${i}`, groundId: 'g-founder', fromParticipantId: 'p-tunde', onParticipantId: 'p-ada', onLabel: 'Ada Nwosu', what,
  status: 'BLOCKING', clearedAt: null, sourceCheckInId: 'c1-p-tunde', createdAt: at('15'), updatedAt: at('15'),
}));
const WORRIES = [
  { text: 'We haven\'t actually gotten to that part yet, specifically.', participantId: 'p-ada', saidWordForWord: true },
  { text: 'The paperwork is slow.', participantId: 'p-tunde', saidWordForWord: true },
];

/* Answers each read of the waits by the session its check-in was in, the way the database does. */
const theWaitsAsAsked = (args: any) => WAITS.filter((d) => {
  const w = args?.where ?? {};
  if (w.clearedAt === null && d.clearedAt !== null) return false;
  if (w.sourceCheckInId?.in && !w.sourceCheckInId.in.includes(d.sourceCheckInId)) return false;
  if (w.OR) return w.OR.some((o: any) => (o.sourceCheckInId === null ? d.sourceCheckInId === null : !o.sourceCheckInId.notIn.includes(d.sourceCheckInId)));
  return true;
});

function prismaFor(role: string) {
  const ground: any = {
    id: 'g-founder', scenario: GroundScenario.NEW_COFOUNDER, mode: GroundMode.SHARED,
    initiatorId: 'u-ada', createdByUserId: 'u-ada', organizationId: 'org-1',
    peopleWorkTogether: true, peersVisibleToEachOther: true, timelineDays: 90, cadence: 'FORTNIGHTLY',
    whoSeesTargets: 'THEIR_OWN', label: 'A second founder joining, and what each of us owns', participants: PEOPLE,
    checkIns: CHECK_INS, report: null, dependencies: WAITS, poll: null, objectives: [], personObjectives: [],
    closedAt: null, kindOfWork: "founder's own check-in", workStages: null,
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
    groundDependency: model({ findMany: jest.fn(async (args: any) => structuredClone(theWaitsAsAsked(args))) }),
    recordEntry: model({ findMany: jest.fn(async (args: any) => (args?.where?.type?.in?.includes?.('WORRY') || (args?.where?.participant && !args?.where?.type) ? structuredClone(WORRIES) : [])) }),
  } as any, {
    get(target: any, prop: string) {
      if (!(prop in target) && typeof prop === 'string' && !prop.startsWith('$')) target[prop] = model();
      return target[prop];
    },
  });
}

async function theTileAs(userId: string, role = 'MEMBER'): Promise<{ value?: string; sub?: string }> {
  const prisma = prismaFor(role);
  const reports = Object.create(ReportsService.prototype) as any;
  reports.prisma = prisma;
  reports.logger = new Logger('test');
  reports.getAsBuilt = jest.fn(async () => ({ groundId: 'g-founder', report: { findings: [] } }));
  const board = await new BoardService(prisma, { respond: jest.fn(async () => null) } as any, { getSessionProgress: async () => null } as any, reports)
    .get('g-founder', userId) as any;
  const t = (board.quickRead ?? []).find((x: any) => x.label === 'Blockers');
  return { value: t?.value, sub: t?.sub };
}

describe('the Blockers tile, with three waits from an earlier session still open', () => {
  const READS = 'You said, "We haven\'t actually gotten to that part yet, specifically." There is 1 more worry on record. Nobody named a new wait this check-in, and 3 waits from earlier check-ins are still open.';

  it('Ada, who runs it, reads that three earlier waits are still open', async () => {
    expect(await theTileAs('u-ada')).toEqual({ value: '2 worries', sub: READS });
  });
  it('an admin outside the check-in reads the same, with Ada named', async () => {
    expect((await theTileAs('u-grace', 'ADMIN')).sub).toBe(READS.replace('You said,', 'Ada Nwosu said,'));
  });
  it('Tunde, who checks in, is served no tile before the team picture is shared, as before', async () => {
    expect(await theTileAs('u-tunde')).toEqual({ value: undefined, sub: undefined });
  });
  it('no reader is told that nobody is waiting on anybody', async () => {
    for (const [u, r] of [['u-ada', 'MEMBER'], ['u-tunde', 'MEMBER'], ['u-grace', 'ADMIN']] as const) {
      expect(String((await theTileAs(u, r)).sub)).not.toMatch(/nobody is waiting on anybody/i);
    }
  });
});

describe('the tile itself', () => {
  const base = { agreed: 0, stillOpen: 0, movedOnTargets: null, blocked: 0, waiting: 0, backedPct: null, numberWasSaid: false } as const;
  it('with nothing waiting anywhere, nobody waits, as before', () => {
    expect(atAGlanceTiles({ ...base, worries: 1, theWorry: null }).find((t) => t.label === 'Blockers')!.sub)
      /* Changed 5 Oct 2026 (request 127 item 7): the count says why no worry is shown. */
      .toBe('1 worry is on record. It was not kept in the words it was said, so it is not quoted here. No wait has been recorded against a named person.');
  });
  it('with one earlier wait and no worry, it says so', () => {
    expect(atAGlanceTiles({ ...base, waitsFromEarlier: 1 }).find((t) => t.label === 'Blockers')!.sub)
      .toBe('Nobody named anything new holding work up this check-in, and 1 wait from an earlier check-in is still open.');
  });
});
