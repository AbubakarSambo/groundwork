import { AssistantService } from '../assistant/assistant.service';
import { whoApprovesFor, mayApproveFor } from './who-approves';
import { theirSignIn, theirRosterEntries } from './a-roster-entry-and-its-sign-in';

/**
 * DECISION 82, ITEM 6 (WhatsApp item 8): A ROSTER ENTRY WITH NO LINK, BUT THE SAME ADDRESS AS A
 * SIGN-IN, IS THAT PERSON FOR LEAVE, HOURS, SPENDING AND APPROVALS.
 *
 * Amani Wekesa is on the roster as " Amani.Wekesa@Example.com " and signs in as
 * "amani.wekesa@example.com". Nobody linked the two. Her manager Wairimu Kamau is the same: on the
 * roster, never linked, same address as her sign-in, and a lead here. Before this, Amani's "I need
 * next Thursday and Friday off" reached no leave lane at all, and Wairimu was never found as the one
 * who approves. Read as what Amani is told. Today is Thursday 1 October 2026.
 */

type P = { id: string; externalId: string; organizationId: string; linkedUserId: string | null; email: string | null; active: boolean; givenName?: string; displayName?: string; department?: string | null; managerExternalId?: string | null };
type U = { id: string; email: string; organizationId: string; deletedAt: null };

const eq = (a: string | null | undefined, b: string) => (a ?? '').trim().toLowerCase() === b.trim().toLowerCase();

/** Only the shapes of query these files make, honoured honestly: no row is returned that the where clause would not. */
function aRoster(people: P[], users: U[], roles: Record<string, string>) {
  const pick = (row: any, select?: any) => (select ? Object.fromEntries(Object.keys(select).map((k) => [k, row[k]])) : row);
  const personMatches = (p: P, w: any): boolean => {
    if (!w) return true;
    for (const [k, v] of Object.entries(w)) {
      if (k === 'OR') { if (!(v as any[]).some((o) => personMatches(p, o))) return false; continue; }
      if (k === 'email' && v && typeof v === 'object') { if (!eq(p.email, (v as any).equals)) return false; continue; }
      if (v && typeof v === 'object' && 'in' in (v as any)) { if (!(v as any).in.includes((p as any)[k])) return false; continue; }
      if ((p as any)[k] !== v) return false;
    }
    return true;
  };
  const userMatches = (u: U, w: any): boolean => {
    if (w.id?.in && !w.id.in.includes(u.id)) return false;
    if (w.OR && !w.OR.some((o: any) => (o.email ? eq(u.email, o.email.equals) : o.organizationId ? u.organizationId === o.organizationId : false))) return false;
    if (w.AND && !w.AND.every((a: any) => a.OR.some((o: any) => o.organizationId === u.organizationId))) return false;
    return true;
  };
  return {
    person: {
      findFirst: jest.fn(async ({ where, select }: any) => { const p = people.find((x) => personMatches(x, where)); return p ? pick(p, select) : null; }),
      findMany: jest.fn(async ({ where, select }: any) => people.filter((x) => personMatches(x, where)).map((p) => pick(p, select))),
    },
    user: { findMany: jest.fn(async ({ where, select }: any) => users.filter((u) => userMatches(u, where)).map((u) => pick(u, select))) },
    organizationMembership: { findUnique: jest.fn(async ({ where }: any) => (roles[where.userId_organizationId.userId] ? { role: roles[where.userId_organizationId.userId] } : null)) },
  };
}

const ORG = 'org-a';
const amani: P = { id: 'p-amani', externalId: 'amani', organizationId: ORG, linkedUserId: null, email: ' Amani.Wekesa@Example.com ', active: true, givenName: 'Amani', displayName: 'Amani Wekesa', department: 'Sales', managerExternalId: 'wairimu' };
const wairimu: P = { id: 'p-wairimu', externalId: 'wairimu', organizationId: ORG, linkedUserId: null, email: 'WAIRIMU@example.com', active: true, givenName: 'Wairimu', displayName: 'Wairimu Kamau', department: 'Sales', managerExternalId: null };
const users: U[] = [
  { id: 'u-amani', email: 'amani.wekesa@example.com', organizationId: ORG, deletedAt: null },
  { id: 'u-wairimu', email: 'wairimu@example.com', organizationId: ORG, deletedAt: null },
];
const roles = { 'u-amani': 'MEMBER', 'u-wairimu': 'LEAD' };

describe('a roster entry matched to its sign-in by address', () => {
  it('is the same person, trimmed and without regard to capitals', async () => {
    const prisma: any = aRoster([amani, wairimu], users, roles);
    expect(await theirSignIn(prisma, ORG, amani)).toBe('u-amani');
    expect((await theirRosterEntries(prisma, ORG, ['u-amani'], { externalId: true })).get('u-amani')).toMatchObject({ externalId: 'amani' });
  });

  it('and a manager matched that way is the one who approves, and may decide', async () => {
    const prisma: any = aRoster([amani, wairimu], users, roles);
    expect(await whoApprovesFor(prisma, { organizationId: ORG, personUserId: 'u-amani' })).toEqual({ kind: 'manager', userId: 'u-wairimu', firstName: 'Wairimu' });
    expect(await mayApproveFor(prisma, { organizationId: ORG, readerId: 'u-wairimu', readerRole: 'LEAD', personUserId: 'u-amani' })).toBe(true);
    expect(await mayApproveFor(prisma, { organizationId: ORG, readerId: 'u-amani', readerRole: 'MEMBER', personUserId: 'u-amani' })).toBe(false);
  });

  it('is never matched when two unlinked entries carry the address, or the sign-in is already linked to another entry', async () => {
    const twin: P = { ...amani, id: 'p-twin', externalId: 'twin' };
    expect((await theirRosterEntries(aRoster([amani, twin], users, roles) as any, ORG, ['u-amani'], { externalId: true })).has('u-amani')).toBe(false);
    const linkedElsewhere: P = { ...amani, id: 'p-other', externalId: 'other', email: 'someone@else.com', linkedUserId: 'u-amani' };
    expect(await theirSignIn(aRoster([amani, linkedElsewhere], users, roles) as any, ORG, amani)).toBeNull();
  });

  it('never reaches an account in another organisation', async () => {
    const elsewhere: U[] = [{ ...users[0], organizationId: 'org-b' }];
    expect(await theirSignIn(aRoster([amani], elsewhere, roles) as any, ORG, amani)).toBeNull();
  });
});

describe('Amani asks for leave through Ask Groundwork, with an entry nobody linked', () => {
  beforeAll(() => jest.useFakeTimers({ now: new Date('2026-10-01T09:00:00Z'), doNotFake: ['nextTick', 'setImmediate', 'setTimeout', 'setInterval', 'queueMicrotask', 'clearTimeout', 'clearInterval', 'clearImmediate', 'performance'] }));
  afterAll(() => jest.useRealTimers());

  function svc(parked: any = null) {
    const proposals: any[] = [];
    const ask = jest.fn(async () => ({ id: 'l1' }));
    const prisma: any = {
      ...aRoster([amani, wairimu], users, roles),
      organizationSuite: { findUnique: jest.fn(async () => ({ isOn: true, answers: { approver: 'Their manager' } })) },
      leaveRequest: { findMany: jest.fn(async () => []) },
      organizationMemory: { findMany: jest.fn(async () => []) },
      ground: { findFirst: jest.fn(async () => null), findMany: jest.fn(async () => []) },
      assistantTurn: { count: jest.fn(async () => 5), createMany: jest.fn(async () => ({ count: 2 })) },
      assistantProposal: {
        findFirst: jest.fn(async () => parked),
        create: jest.fn(async ({ data }: any) => { const p = { id: 'pr1', state: 'PARKED', ...data }; proposals.push(p); return p; }),
        update: jest.fn(async ({ where, data }: any) => { proposals.push({ id: where.id, ...data }); return data; }),
      },
      commitment: { create: jest.fn(async () => ({})), findUnique: jest.fn(async () => null), findMany: jest.fn(async () => []) },
      subject: { findMany: jest.fn(async () => []), count: jest.fn(async () => 0) },
      detectionQuietPeriod: { findMany: jest.fn(async () => []) },
    };
    const service = new AssistantService(
      prisma, { respond: jest.fn(async () => { throw new Error('model off'); }) } as any, { retrieve: jest.fn(async () => ({ cards: [], truncated: false })) } as any,
      { waitingAcrossTheOrg: async () => ({ waiting: [], waitedOn: [] }) } as any,
      { statusFor: async () => ({ roleName: null, gates: [], left: [] }) } as any,
      { pendingFor: async () => [], decide: async () => { throw new Error('none'); } } as any,
      { start: async () => { throw new Error('none'); } } as any,
      { forPerson: async () => { throw new Error('none'); } } as any,
      { read: async () => ({ read: false, because: 'none' }) } as any,
      { sendRoundDigest: async () => { throw new Error('none'); } } as any,
      {} as any, undefined, undefined,
      { mine: async () => ({ daysLeft: 16 }), ask } as any,
    );
    const said = async (q: string) => {
      const r: any = await service.respond(ORG, 'p-amani', q);
      return { lane: r.lane, text: r.blocks.filter((b: any) => b.type === 'text').map((b: any) => b.body).join('\n') };
    };
    return { said, ask, proposals };
  }

  it('is said back with Wairimu as the one who approves, and nothing is sent yet', async () => {
    const s = svc();
    const out = await s.said('I need next Thursday and Friday off');
    expect(out).toEqual({
      lane: 'ask_for_leave',
      text: 'You asked for leave from Thursday 8 October to Friday 9 October, which is 2 working days. You have 16 days of leave left this year, and nobody else in Sales is off then. Shall I send it to Wairimu to approve?',
    });
    expect(s.ask).not.toHaveBeenCalled();
  });

  it('and her yes sends it as her own sign-in', async () => {
    const s = svc({ id: 'pk', kind: 'leave_request', state: 'PARKED', summary: 'x', payload: { startsOn: '2026-10-08', endsOn: '2026-10-09' } });
    const out = await s.said('yes');
    /* With the say-back's reference, kept in the record of who did what (decision 85, build step 5). */
    expect(s.ask).toHaveBeenCalledWith(ORG, 'u-amani', { startsOn: '2026-10-08', endsOn: '2026-10-09', proposalId: expect.any(String) });
    expect(out.text).toBe('I have sent your leave request from Thursday 8 October to Friday 9 October to Wairimu. It is not approved until they decide, and you will see it under your leave.');
  });
});
