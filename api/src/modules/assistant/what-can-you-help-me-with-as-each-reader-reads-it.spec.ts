import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AssistantService } from './assistant.service';

/**
 * "WHAT CAN YOU HELP ME WITH?" IS ANSWERED, FOR EACH READER, WITH WHAT THEY CAN DO HERE (4 October 2026).
 * review, items A2 and A3). Each used to get "I cannot answer that one yet". Read here as what the person
 * is told, for a member, a lead, an admin and a guest. Today is Thursday 1 October 2026.
 */
jest.mock('../suites/who-approves', () => ({
  whoApprovesFor: jest.fn(async (_p: any, input: any) => (input.suite === 'time' ? { kind: 'admin' } : { kind: 'manager', userId: 'u-boss', firstName: 'Wairimu' })),
}));

interface Opts {
  role?: 'MEMBER' | 'LEAD' | 'ADMIN' | 'GUEST';
  leaveOff?: boolean;
  spendOff?: boolean;
  kinds?: { key: string; name: string; perYear: number | null; daysLeft: number | null }[];
  daysLeft?: number | null;
  perYear?: number | null;
  leaveRequests?: any[];
  spendRequests?: any[];
  waitingLeave?: any[];
  waitingSpend?: any[];
  off?: any[];
  limit?: number | null;
  commitments?: any[];
  toDos?: any[];
}

function svc(o: Opts = {}) {
  const role = o.role ?? 'MEMBER';
  const off = () => { throw new NotFoundException('off'); };
  const leave = {
    mine: jest.fn(async () => {
      if (o.leaveOff) off();
      if (role === 'GUEST') throw new ForbiddenException('Only people in this organisation can ask for leave here.');
      return { perYear: o.perYear === undefined ? 20 : o.perYear, daysLeft: o.daysLeft === undefined ? 17 : o.daysLeft, kinds: o.kinds ?? [], requests: o.leaveRequests ?? [] };
    }),
    board: jest.fn(async () => {
      if (o.leaveOff) off();
      if (role !== 'ADMIN' && role !== 'LEAD') throw new ForbiddenException('Only an admin or a lead can open this board.');
      return { reader: role.toLowerCase(), waiting: o.waitingLeave ?? [], off: o.off ?? [], toldToHr: [] };
    }),
  };
  const spending = {
    mine: jest.fn(async () => { if (o.spendOff) off(); if (role === 'GUEST') throw new ForbiddenException('Only people in this organisation can ask to spend here.'); return { currency: 'KES', requests: o.spendRequests ?? [] }; }),
    board: jest.fn(async () => { if (o.spendOff) off(); return { currency: 'KES', waiting: o.waitingSpend ?? [] }; }),
    checkForChat: jest.fn(async (_org: string, _u: string, amount: number) => {
      if (o.spendOff) off();
      const above = o.limit != null && amount > o.limit;
      return { currency: 'KES', team: 'Operations', left: 38000, fits: true, approver: 'manager', limit: o.limit ?? null, approverFirstName: above ? 'Grace' : 'Wairimu', ...(above ? { bar: o.limit, thenTo: ['Omar in finance'] } : {}) };
    }),
  };
  const timeSheets = { forChat: jest.fn(async () => ({ clients: ['Atlas'], approverFirstName: null })), board: jest.fn(async () => ({ weeks: [] })) };
  const prisma: any = {
    person: { findFirst: jest.fn(async () => ({ id: 'p1', externalId: 'u-1', active: true, linkedUserId: 'u-me', department: 'Operations' })), findMany: jest.fn(async () => []) },
    organizationMembership: { findUnique: jest.fn(async () => ({ role })) },
    ground: { findFirst: jest.fn(async () => null), findMany: jest.fn(async () => []) },
    assistantTurn: { count: jest.fn(async () => 5), createMany: jest.fn(async () => ({ count: 2 })) },
    assistantProposal: { findFirst: jest.fn(async () => null), create: jest.fn(async ({ data }: any) => ({ id: 'pr1', ...data })), update: jest.fn(async () => ({})) },
    commitment: { create: jest.fn(async () => ({})), findUnique: jest.fn(async () => null), findMany: jest.fn(async () => o.commitments ?? []) },
    todo: { findMany: jest.fn(async () => o.toDos ?? []) },
    subject: { findMany: jest.fn(async () => []), count: jest.fn(async () => 0) },
    detectionQuietPeriod: { findMany: jest.fn(async () => []) },
    organizationMemory: { findMany: jest.fn(async () => []) },
    organizationSuite: { findUnique: jest.fn(async () => null) },
  };
  const service = new AssistantService(
    prisma, { respond: jest.fn(async () => { throw new Error('model off for these tests'); }) } as any,
    { retrieve: jest.fn(async () => ({ cards: [], truncated: false })) } as any,
    { waitingAcrossTheOrg: async () => ({ waiting: [], waitedOn: [] }) } as any,
    { statusFor: async () => ({ roleName: null, gates: [], left: [] }) } as any,
    { pendingFor: async () => [], decide: async () => { throw new Error('none'); } } as any,
    { start: async () => { throw new Error('none'); } } as any, { forPerson: async () => { throw new Error('none'); } } as any,
    { read: async () => ({ read: false, because: 'none' }) } as any,
    { sendRoundDigest: async () => { throw new Error('none'); } } as any,
    {} as any, undefined, undefined, o.leaveOff && false ? undefined : (leave as any), (timeSheets as any), (spending as any),
  );
  return { service, prisma, leave, spending };
}
const said = async (s: ReturnType<typeof svc>, q: string) => {
  const r: any = await s.service.respond('org-a', 'p1', q);
  return { lane: r.lane, text: r.blocks.filter((b: any) => b.type === 'text').map((b: any) => b.body).join('\n') };
};

beforeAll(() => jest.useFakeTimers({ now: new Date('2026-10-01T09:00:00Z'), doNotFake: ['nextTick', 'setImmediate', 'setTimeout', 'setInterval', 'queueMicrotask', 'clearTimeout', 'clearInterval', 'clearImmediate', 'performance'] }));

const ASKED = ['What can you help me with?', 'help', 'what can you do', 'What can I ask you?', 'How can you help', 'how do I use this'];

describe('what can you help me with', () => {
  it.each(ASKED)('"%s" is answered, never "I cannot answer that one yet"', async (q) => {
    const s = svc({});
    const r = await said(s, q);
    expect(r.lane).toBe('what_can_you_do');
    expect(r.text).not.toContain('cannot answer');
    expect(r.text).toMatch(/^Here is what you can ask me\./);
  });

  it('a member in a check-in with leave and spending on, and one request waiting, reads their own list', async () => {
    const s = svc({ waitingLeave: [], role: 'MEMBER' });
    s.prisma.groundParticipant = { findMany: jest.fn(async () => [{ groundId: 'g1', partyType: 'PARTICIPANT' }]) };
    const r = await said(s, 'What can you help me with?');
    expect(r.text).toContain('You are in 1 check-in right now');
    expect(r.text).toContain('Leave, spending and hours are switched on for you');
    expect(r.text).not.toContain('You run');
    expect(r.text).toContain('Whatever you ask me stays between you and me.');
  });

  it('a lead who runs two check-ins is offered the lead questions, and is told what waits', async () => {
    const s = svc({ role: 'LEAD', waitingLeave: [{ id: 'w1', name: 'Amina Otieno', startsOn: '2026-10-08', endsOn: '2026-10-09', mayDecide: true }] });
    s.prisma.groundParticipant = { findMany: jest.fn(async () => [{ groundId: 'g1', partyType: 'INITIATOR' }, { groundId: 'g2', partyType: 'INITIATOR' }]) };
    const r = await said(s, 'what can you do');
    expect(r.text).toContain('You are in 2 check-ins right now');
    expect(r.text).toContain('You run 2 check-ins, so you can also ask who needs you this week');
    expect(r.text).toContain('1 request waits for you to approve.');
  });

  it('a person with every suite off and no check-in is told so, and is not offered what is not there', async () => {
    const s = svc({ leaveOff: true, spendOff: true });
    (s as any).service.timeSheets = undefined;
    const r = await said(s, 'help');
    expect(r.text).toContain('You are not in a check-in right now');
    expect(r.text).toContain('are not switched on for you');
    expect(r.text).not.toContain('waits for you');
  });

  it('a guest is not offered leave or spending', async () => {
    const s = svc({ role: 'GUEST' });
    (s as any).service.timeSheets = undefined;
    const r = await said(s, 'what can you help me with');
    expect(r.text).toContain('are not switched on for you');
  });

  it('help with something specific still goes where it went', async () => {
    const s = svc({});
    const r = await said(s, 'help me think through the Q4 target');
    expect(r.lane).not.toBe('what_can_you_do');
  });
});
