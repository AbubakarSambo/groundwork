import { theyWaitForAnAdmin, whatHappensWhenYouJoin } from './named-when-an-admin-approved';

/**
 * Local test of staging, 15 October. Hafsah is an admin of Drop Access and of Muchemi & Co. She invited Kevin to
 * Drop Access's "Sales check-in", and his email said "When you join, you go straight in and can check in at once."
 * By the time he opened it she had Muchemi open, which rewrites her own role and organisation, so the rule read
 * her as "not an admin of Drop Access": his invite page said an admin had to let him in, and he waited. Her
 * standing in Drop Access is her membership there, whichever organisation she has open.
 */
const users: Record<string, any> = {
  'u-hafsah': { id: 'u-hafsah', role: 'ADMIN', organizationId: 'org-muchemi' },
  'u-esther': { id: 'u-esther', role: 'MEMBER', organizationId: 'org-muchemi' },
};
const memberships: Record<string, string> = { 'u-hafsah|org-drop': 'ADMIN', 'u-esther|org-drop': 'MEMBER' };
const db: any = {
  user: { findUnique: async ({ where }: any) => (where.id ? users[where.id] ?? null : null) },
  organizationMembership: {
    findUnique: async ({ where }: any) => {
      const k = where.userId_organizationId; const role = memberships[`${k.userId}|${k.organizationId}`];
      return role ? { id: 'm', role } : null;
    },
  },
};
const ground = { organizationId: 'org-drop', initiatorId: 'u-hafsah', approvedById: null, approvedAt: null };
const kevin = { email: 'kevin.drop@example.test', createdAt: new Date('2026-10-15T06:13:23Z'), addedByUserId: 'u-hafsah' };

describe('an admin with another organisation open still lets the people she invites straight in', () => {
  it('Kevin does not wait, and his invitation and invite page read the same sentence', async () => {
    const waits = await theyWaitForAnAdmin(db, ground, kevin);
    const sentence = whatHappensWhenYouJoin(waits, 'Drop Access (test)');
    console.log(`KEVIN READS: ${sentence}`);
    expect(waits).toBe(false);
    expect(sentence).toBe('When you join, you go straight in and can check in at once.');
  });

  it('somebody a member who is not an admin there invited still waits', async () => {
    const waits = await theyWaitForAnAdmin(db, { ...ground, initiatorId: 'u-esther' }, { ...kevin, addedByUserId: 'u-esther' });
    expect(waits).toBe(true);
  });

  it('accept() lets Kevin in on arrival', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { ParticipantsService } = require('./participants.service');
    const participant = { id: 'p1', groundId: 'g1', userId: null, inviteToken: 'tok', awaitingSeat: false, nameGiven: null, ...kevin };
    const created: any[] = [];
    const prisma: any = {
      groundParticipant: { findUnique: jest.fn(async () => participant), findFirst: jest.fn(async () => participant), update: jest.fn(async (a: any) => a) },
      ground: { findUnique: jest.fn(async () => ({ id: 'g1', ...ground })) },
      user: {
        findUnique: jest.fn(async ({ where }: any) => (where.id ? users[where.id] ?? null : null)),
        create: jest.fn(async (a: any) => { created.push(a.data); return { id: 'u-kevin', firstName: 'Kevin', lastName: 'Omondi', role: 'MEMBER', ...a.data }; }),
        update: jest.fn(async () => ({})),
      },
      organizationMembership: { findUnique: db.organizationMembership.findUnique, upsert: jest.fn(async () => ({})) },
      membershipRequest: { upsert: jest.fn(async () => ({})), create: jest.fn(async () => ({})), findFirst: jest.fn(async () => null) },
      checkIn: { findFirst: jest.fn(async () => ({ id: 'ci1' })), findMany: jest.fn(async () => []) },
      emailVerificationToken: { create: jest.fn(async () => ({})) },
      $transaction: jest.fn(async (fn: any) => fn(prisma)),
    };
    const svc = new ParticipantsService(prisma, { sign: () => 'jwt' } as any, { sendAddPasswordEmail: async () => undefined, sendMagicLinkEmail: async () => undefined } as any, { userShapeFor: jest.fn(async (id: string) => ({ id })) } as any);
    await svc.accept('tok').catch(() => undefined);
    expect(created[0]?.awaitingOrgApproval).toBe(false);
  });
});
