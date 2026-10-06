import { AssistantService } from './assistant.service';
import { route } from './the-router-is-deterministic';

/**
 * "HOW IS THE TEAM DOING?" (4 October 2026, the user journeys). A lead who asked it was given "I cannot answer
 * that one yet" with options. It is now answered from what the board and the latest report of the check-ins the
 * lead runs already say, to the lead alone. Read here as what each person is told.
 */
const BOARD = {
  renders: true,
  howItIsGoing: {
    latestSummary: 'Amani says the Green Mart proposal has not gone out yet, and Baraka says nobody told the warehouse about the sales promises.',
    glance: { progress: { answeredThisRound: 3, ofPeople: 3 }, inTheWay: { count: 1, oldest: 'The Green Mart proposal', sinceSays: 'since 2 October' } },
  },
};

function svc(me: { linkedUserId: string; role: string }) {
  const board = { get: jest.fn(async () => BOARD), waitingAcrossTheOrg: async () => ({ waiting: [], waitedOn: [] }) };
  const prisma: any = {
    person: { findFirst: jest.fn(async () => ({ id: 'p1', externalId: 'u-1', active: true, linkedUserId: me.linkedUserId, department: 'Sales' })), findMany: jest.fn(async () => []) },
    organizationMembership: { findUnique: jest.fn(async () => ({ role: me.role })) },
    ground: { findFirst: jest.fn(async () => null), findMany: jest.fn(async ({ where }: any) => (where?.initiatorId === 'u-wairimu' ? [{ id: 'g-sales', label: 'Sales team, last quarter' }] : [])) },
    assistantTurn: { count: jest.fn(async () => 5), createMany: jest.fn(async () => ({ count: 2 })) },
    assistantProposal: { findFirst: jest.fn(async () => null), create: jest.fn(async ({ data }: any) => ({ id: 'pr1', ...data })), update: jest.fn(async () => ({})) },
    commitment: { findMany: jest.fn(async () => []) }, todo: { findMany: jest.fn(async () => []) },
    subject: { findMany: jest.fn(async () => []), count: jest.fn(async () => 0) },
    detectionQuietPeriod: { findMany: jest.fn(async () => []) }, organizationMemory: { findMany: jest.fn(async () => []) },
    organizationSuite: { findUnique: jest.fn(async () => null) },
  };
  const service = new AssistantService(
    prisma, { respond: jest.fn(async () => { throw new Error('model off for these tests'); }) } as any,
    { retrieve: jest.fn(async () => ({ cards: [], truncated: false })) } as any, board as any,
    { statusFor: async () => ({ roleName: null, gates: [], left: [] }) } as any,
    { pendingFor: async () => [], decide: async () => { throw new Error('none'); } } as any,
    { start: async () => { throw new Error('none'); } } as any, { forPerson: async () => { throw new Error('none'); } } as any,
    { read: async () => ({ read: false, because: 'none' }) } as any, { sendRoundDigest: async () => { throw new Error('none'); } } as any, {} as any,
  );
  return { service, prisma, board };
}
const said = async (s: ReturnType<typeof svc>, q: string) => {
  const r: any = await s.service.respond('org-a', 'p1', q);
  return { lane: r.lane, text: r.blocks.filter((b: any) => b.type === 'text').map((b: any) => b.body).join('\n') };
};

describe('how is the team doing', () => {
  it.each(['How is the team doing?', 'how is my team getting on', "how's the team", 'How is everyone doing'])('"%s" goes to the team reading', (q) => {
    expect(route(q).lane).toBe('how_is_the_team');
  });
  it('and "how am I doing" is still about the asker', () => {
    expect(route('how am I doing?').lane).not.toBe('how_is_the_team');
  });

  it('Wairimu, who runs Sales team, is told what the board and the report say, with the count and what is in the way', async () => {
    const s = svc({ linkedUserId: 'u-wairimu', role: 'LEAD' });
    const r = await said(s, 'How is the team doing?');
    expect(r.lane).toBe('how_is_the_team');
    expect(r.text).toBe(
      'Amani says the Green Mart proposal has not gone out yet, and Baraka says nobody told the warehouse about the sales promises. All three people have answered. One thing is in the way. The one that has waited longest is "The Green Mart proposal", since 2 October.\n\nThis is what your board and your latest report say, and only you can read it here.',
    );
    expect(r.text).not.toContain('cannot answer');
    expect(s.board.get).toHaveBeenCalledWith('g-sales', 'u-wairimu');
  });

  it('Amani, who takes part and runs nothing, is told plainly that there is no team to tell her about, and the board is never read for her', async () => {
    const s = svc({ linkedUserId: 'u-amani', role: 'MEMBER' });
    const r = await said(s, 'How is the team doing?');
    expect(r.text).toBe('You do not run a check-in yet, so there is no team for me to tell you about. You can ask me how you are doing, or what you are waiting on.');
    expect(s.board.get).not.toHaveBeenCalled();
  });

  it('an empty board is not read out as a state of the team', async () => {
    const s = svc({ linkedUserId: 'u-wairimu', role: 'LEAD' });
    (s.board.get as jest.Mock).mockResolvedValueOnce({ renders: true, howItIsGoing: { latestSummary: null, glance: { progress: { answeredThisRound: 0, ofPeople: 0 }, inTheWay: { count: 0 } } } });
    const r = await said(s, 'How is the team doing?');
    expect(r.text).toBe('Nobody has answered in the check-ins you run yet, so there is nothing to tell you about the team so far. I will have more once people have finished.');
  });
});
