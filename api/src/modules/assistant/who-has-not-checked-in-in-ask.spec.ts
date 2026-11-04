import { AssistantService } from './assistant.service';
import { route } from './the-router-is-deterministic';

/**
 * B-134: "Who has not checked in on Sales team, Q4?" and "How is the sales team doing?" were answered
 * "I cannot answer that one yet." with a four-item menu. A lead is told, by name, who has not checked in
 * on the check-ins she runs, counted the way the board counts, and how the team is doing.
 */
const GROUNDS = [{ id: 'g-sales', label: 'Sales team, Q4' }, { id: 'g-ops', label: 'Warehouse rollout' }];
const person = (userId: string, first: string, status: string, round = 2) => ({ status, sessionNumber: round, participant: { userId, managingOnly: false, nameGiven: null, user: { firstName: first, lastName: '', awaitingOrgApproval: false } } });
const ROWS: Record<string, any[]> = {
  'g-sales': [person('u-wairimu', 'Wairimu', 'COMPLETED'), person('u-amani', 'Amani', 'COMPLETED'), person('u-juma', 'Juma', 'NOT_STARTED'), person('u-neema', 'Neema', 'IN_PROGRESS')],
  'g-ops': [person('u-wairimu', 'Wairimu', 'COMPLETED'), person('u-kito', 'Kito', 'COMPLETED')],
};

const ROLE = { value: 'LEAD' };
const RUNS_NOTHING = { value: false };
function svc() {
  const prisma: any = {
    ground: { findMany: jest.fn(async (a: any) => (a.where.overWhatsApp === false || (a.where.initiatorId && RUNS_NOTHING.value) ? [] : GROUNDS)) },
    checkIn: { findMany: jest.fn(async (a: any) => ROWS[a.where.groundId] ?? []) },
    assistantProposal: { findFirst: jest.fn(async () => null), create: jest.fn(async (a: any) => ({ id: 'pr1', ...a.data })), update: jest.fn(async () => ({})) },
    assistantTurn: { count: jest.fn(async () => 5), createMany: jest.fn(async () => ({ count: 2 })) },
    organizationMembership: { findUnique: jest.fn(async () => ({ role: ROLE.value })) },
    person: { count: jest.fn(async () => 2), findFirst: jest.fn(async () => ({ externalId: 'x-wairimu', linkedUserId: 'u-wairimu', email: 'wairimu@msingi.test' })), findMany: jest.fn(async () => []) },
    subject: { findMany: jest.fn(async () => []), count: jest.fn(async () => 0) },
    detectionQuietPeriod: { findMany: jest.fn(async () => []) },
  };
  const knowledge: any = { retrieve: jest.fn(async () => ({ cards: [], truncated: false })) };
  const engine: any = { respond: jest.fn(async () => { throw new Error('no model in this test'); }) };
  const service = new AssistantService(prisma, engine, knowledge, { waitingAcrossTheOrg: async () => ({ waiting: [], waitedOn: [] }) } as any, { statusFor: async () => ({ roleName: null, gates: [], left: [] }) } as any, { pendingFor: async () => [], decide: async () => { throw new Error('no suggestions in these tests'); } } as any, { start: async () => { throw new Error('no drafting in these tests'); } } as any, { forPerson: async () => { throw new Error('no assembly in these tests'); } } as any, { read: async () => ({ read: false, because: 'no reading in these tests' }) } as any, { sendRoundDigest: async () => { throw new Error('no mail in these tests'); } } as any, { create: async () => { throw new Error('no ground creation in these tests'); }, addParticipant: async () => { throw new Error('no ground creation in these tests'); } } as any);
  return { service, prisma, engine };
}
const ask = async (s: AssistantService, q: string) => String(((await s.respond('org-a', 'p1', q)).blocks[0] as any).body);

describe('how a named team is doing', () => {
  it('is the team lane, whatever the team is called, and how am I doing stays the coach\'s', () => {
    expect(route('How is the sales team doing?').lane).toBe('how_is_the_team');
    expect(route('how is our operations team getting on').lane).toBe('how_is_the_team');
    expect(route('How am I doing?').lane).toBe('how_am_i_doing');
  });
});

describe('who has not checked in, asked by an admin who runs nothing', () => {
  afterEach(() => { ROLE.value = 'LEAD'; RUNS_NOTHING.value = false; });
  it('is told by name about the check-ins she may read, which a lead is told only for the ones she runs', async () => {
    ROLE.value = 'ADMIN';
    RUNS_NOTHING.value = true;
    const said = await ask(svc().service, 'Who has not checked in on Sales team, Q4?');
    /* Changed 3 November (F5 part 3): Ask says the one count's own sentence, each person missing named once in their state. */
    expect(said).toContain('Neema has started and not finished yet, and Juma hasn’t started yet.');
    RUNS_NOTHING.value = true;
    ROLE.value = 'LEAD';
    expect(await ask(svc().service, 'Who has not checked in?')).toContain('You do not run a check-in that is going yet');
    ROLE.value = 'ADMIN';
    const none = svc();
    none.prisma.ground.findMany = jest.fn(async () => []);
    expect(await ask(none.service, 'Who has not checked in?')).toContain('There is no check-in going in the organisation that you can read');
  });
});

describe('who has not checked in', () => {
  it('is its own lane, and leaves a handoff or a person to theirs', () => {
    expect(route('Who has not checked in on Sales team, Q4?')).toEqual({ lane: 'who_has_not_checked_in', subject: 'Sales team, Q4' });
    expect(route('who has not checked in')).toEqual({ lane: 'who_has_not_checked_in' });
    expect(route("who hasn't answered yet?").lane).toBe('who_has_not_checked_in');
    expect(route('Who is waiting on me?').lane).toBe('what_is_stuck');
    expect(route('Who is Femi?').lane).toBe('who_is');
  });

  it('names the people on the check-in asked about, as the board counts them', async () => {
    const said = await ask(svc().service, 'Who has not checked in on Sales team, Q4?');
    expect(said).toContain('In "Sales team, Q4", 2 of 4 have checked in; Neema has started and not finished yet, and Juma hasn’t started yet.');
    expect(said).not.toContain('Warehouse rollout');
  });

  it('answers for every check-in she runs when none is named', async () => {
    const said = await ask(svc().service, 'Who has not checked in?');
    /* Changed 3 November (F5 part 3): Ask says the one count's own sentence, each person missing named once in their state. */
    expect(said).toContain('Neema has started and not finished yet, and Juma hasn’t started yet.');
    expect(said).toContain('Warehouse rollout');
  });

  it('says plainly when she runs no check-in that is going, or none by that name', async () => {
    const none = svc();
    none.prisma.ground.findMany = jest.fn(async () => []);
    expect(await ask(none.service, 'Who has not checked in?')).toContain('You do not run a check-in that is going yet');
    expect(await ask(svc().service, 'Who has not checked in on the budget review?')).toContain('I cannot find a check-in called the budget review that you run.');
  });
});
