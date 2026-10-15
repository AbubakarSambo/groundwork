import { BoardService } from './board.service';
import { ReportsService } from '../reports/reports.service';
import { GroundMode, GroundScenario, PartyType } from '@prisma/client';
import { whatIsOutstandingFor, theNudgeParts, sendTheLeadsDailyNudges } from '../engagement/the-leads-daily-nudge';

/**
 * MISSED CHECK-INS, TOLD TO THE LEAD (decision 136): Brian has missed three of his last four sessions of "Sales team, Q3", which Rukia runs. Rukia
 * reads it in her daily nudge (once per run, not daily) and on the board, with Brian's reason beside it. Brian, a colleague (Amani) and an admin who
 * does not run it (Grace) read nothing of it on the board. Rukia's own skipped sessions are never counted.
 */
const W = (n: number) => new Date(Date.UTC(2026, 8, 1 + n * 7));
const NOW = W(6);
const row = (pid: string, n: number, how: 'missed' | 'answered' | 'open', extra: any = {}) => ({
  id: `${pid}-c${n}`, participantId: pid, sessionNumber: n, isSetup: false, optional: false, availableFrom: W(n), createdAt: W(n), missedReason: null,
  ...(how === 'missed' ? { status: 'COMPLETED', closedReason: 'auto_closed', turns: [], completedAt: W(n + 1) }
    : how === 'answered' ? { status: 'COMPLETED', closedReason: null, turns: [{ id: 't' }], completedAt: W(n) }
    : { status: 'NOT_STARTED', closedReason: null, turns: [], completedAt: null }),
  ...extra,
});
const person = (id: string, userId: string, first: string, partyType: PartyType = PartyType.PARTICIPANT) => ({
  id, userId, groundId: 'g-1', partyType, email: `${id}@baridi.test`, roleAsDescribed: 'sales', nameGiven: null, organisationGiven: null,
  managingOnly: false, leftAt: null, signedOffAt: null, createdAt: new Date('2026-09-01T10:00:00Z'), user: { firstName: first, lastName: 'Otieno' },
});
const PEOPLE = [person('p-lead', 'u-rukia', 'Rukia', PartyType.INITIATOR), person('p-brian', 'u-brian', 'Brian'), person('p-amani', 'u-amani', 'Amani')];
const ROWS = [
  row('p-brian', 1, 'answered'), row('p-brian', 2, 'missed'), row('p-brian', 3, 'answered'), row('p-brian', 4, 'missed'), row('p-brian', 5, 'missed', { missedReason: 'I was on the road to Kisumu with no signal.' }), row('p-brian', 6, 'open'),
  row('p-amani', 1, 'answered'), row('p-amani', 2, 'answered'), row('p-amani', 3, 'answered'), row('p-amani', 4, 'answered'), row('p-amani', 5, 'answered'), row('p-amani', 6, 'open'),
  /* Rukia skipped everything after her first: optional, never missed. */
  row('p-lead', 1, 'answered', { optional: true }), ...[2, 3, 4, 5].map((n) => row('p-lead', n, 'missed', { optional: true })), row('p-lead', 6, 'open', { optional: true }),
];

function aPrisma(role = 'MEMBER', settings = new Map<string, any>()) {
  const ground: any = {
    id: 'g-1', scenario: GroundScenario.OKR_ALIGNMENT, mode: GroundMode.SHARED, initiatorId: 'u-rukia', createdByUserId: 'u-rukia', organizationId: 'org-1',
    peopleWorkTogether: true, peersVisibleToEachOther: true, timelineDays: 90, cadence: 'WEEKLY', whoSeesTargets: 'EVERYONE', label: 'Sales team, Q3',
    participants: PEOPLE, checkIns: [], report: null, objectives: [], dependencies: [], poll: null, status: 'ACTIVE', overWhatsApp: false,
  };
  const reads = { findMany: jest.fn(async () => []), findFirst: jest.fn(async () => null), findUnique: jest.fn(async () => null), count: jest.fn(async () => 0), aggregate: jest.fn(async () => ({ _max: { sessionNumber: 1 } })) };
  const model = (own: Record<string, any> = {}) => ({ ...reads, ...own });
  return new Proxy({
    ground: model({ findUnique: jest.fn(async () => JSON.parse(JSON.stringify(ground))), findMany: jest.fn(async (a: any) => (a?.skip ? [] : [ground])) }),
    user: model({ findUnique: jest.fn(async (a: any) => ({ role, organizationId: 'org-1', firstName: 'Rukia', email: 'rukia@baridi.test', phoneNumber: null, deletedAt: null, isActive: true, id: a?.where?.id })) }),
    groundParticipant: model({ findMany: jest.fn(async (a: any) => (a?.select?.checkIns ? PEOPLE.map((p) => ({ ...p, checkIns: ROWS.filter((r) => r.participantId === p.id) })) : [])) }),
    platformSetting: model({
      findUnique: jest.fn(async (a: any) => (settings.has(a.where.key) ? { value: settings.get(a.where.key) } : null)),
      create: jest.fn(async (a: any) => { settings.set(a.data.key, a.data.value); return {}; }),
    }),
  } as any, {
    get(target: any, prop: string) {
      if (!(prop in target) && typeof prop === 'string' && !prop.startsWith('$')) target[prop] = model();
      return target[prop];
    },
  });
}

const boardAs = (userId: string, role = 'MEMBER') => new BoardService(aPrisma(role), { respond: jest.fn(async () => null) } as any, { getSessionProgress: async () => null } as any, Object.create(ReportsService.prototype) as ReportsService).get('g-1', userId) as Promise<any>;

const RUKIA_READS = 'Brian has missed 3 of the last 4 check-ins. Brian gave this reason: "I was on the road to Kisumu with no signal." When someone stops checking in, the team loses their view, problems surface late, and the effort to keep everyone in step falls on you and the rest of the team. Speak to Brian this week.';

describe('missed check-ins on the board (decision 136)', () => {
  it('Rukia, who runs it, reads Brian\'s line with his reason beside it, and nothing about her own skipped sessions', async () => {
    const board = await boardAs('u-rukia');
    console.log(`RUKIA READS ON THE BOARD:\n${board.missedCheckIns.map((m: any) => m.text).join('\n')}`);
    expect(board.missedCheckIns).toEqual([{ participantId: 'p-brian', name: 'Brian', text: RUKIA_READS, reason: 'I was on the road to Kisumu with no signal.', suggestion: null }]);
  });

  it.each([['Brian himself', 'u-brian', 'MEMBER'], ['Amani, a colleague', 'u-amani', 'MEMBER'], ['Grace, an admin who does not run it', 'u-grace', 'ADMIN']])('%s reads none of it on the board', async (_who, userId, role) => {
    const board = await boardAs(userId, role);
    expect(board.missedCheckIns).toBeUndefined();
    expect(JSON.stringify(board)).not.toMatch(/Kisumu|has missed/);
  });
});

describe('missed check-ins in the lead\'s daily nudge (decision 136)', () => {
  const lead = { userId: 'u-rukia', organizationId: 'org-1', grounds: [{ id: 'g-1', label: 'Sales team, Q3', scenario: GroundScenario.OKR_ALIGNMENT, overWhatsApp: false, timelineDays: 90, cadence: 'WEEKLY' }] };

  it('is said first among the risks, as facts and what they do', async () => {
    const found = await whatIsOutstandingFor(aPrisma(), lead as any, { boards: {} as any, release: null }, NOW);
    const risks = theNudgeParts(found).risks;
    console.log(`RUKIA'S DAILY NUDGE, RISKS:\n${risks.join('\n')}`);
    expect(risks[0]).toBe(RUKIA_READS.replace('check-ins.', 'check-ins on "Sales team, Q3".'));
  });

  it('goes in the daily message once per run of misses, not every day', async () => {
    const settings = new Map<string, any>();
    const email = { sendTheLeadsDailyNudge: jest.fn(async () => 'sent') };
    const doors: any = { prisma: aPrisma('MEMBER', settings), whatsapp: { sendFor: jest.fn(), isEnabled: async () => false }, email, boards: {}, frontendUrl: 'https://app.test' };
    await sendTheLeadsDailyNudges(doors, NOW);
    await sendTheLeadsDailyNudges(doors, NOW);
    const said = (email.sendTheLeadsDailyNudge.mock.calls as any[]).map((c) => JSON.stringify(c[2]));
    expect(said[0]).toContain('Brian has missed 3 of the last 4 check-ins');
    expect((said[1] ?? '')).not.toContain('Brian has missed');
  });
});
