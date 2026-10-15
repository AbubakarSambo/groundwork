import { namedWhenAnAdminApproved, theyWaitForAnAdmin, whatHappensWhenYouJoin } from './named-when-an-admin-approved';

/**
 * Hafsah, 12 October 2026: "people listed on a check-in when an admin approves it go straight in; people a
 * non-admin lead adds afterwards wait for an admin, as production does. The invitation and invite page say
 * plainly which applies." Esther, a lead who is not an admin, set up a check-in that waited; Njeri, an admin of
 * Kito Foods, approved it on 5 October. Brian was named before; Faith was added by Esther on 8 October.
 */
const APPROVED = new Date('2026-10-05T09:00:00Z');
const ground = { organizationId: 'org-kito', initiatorId: 'u-esther', approvedById: 'u-njeri', approvedAt: APPROVED };
const users: Record<string, any> = {
  'u-esther': { role: 'LEAD', organizationId: 'org-kito' },
  'u-njeri': { role: 'ADMIN', organizationId: 'org-kito' },
};
const db: any = {
  user: { findUnique: async ({ where }: any) => (where.id ? users[where.id] ?? null : null) },
  organizationMembership: { findUnique: async () => null },
};
const brian = { email: 'brian@new.test', createdAt: new Date('2026-10-03T09:00:00Z'), addedByUserId: 'u-esther' };
const faith = { email: 'faith@new.test', createdAt: new Date('2026-10-08T09:00:00Z'), addedByUserId: 'u-esther' };

describe('who goes straight in, and who waits for an admin', () => {
  it('Brian, on the check-in when Njeri approved it, goes straight in', async () => {
    expect(namedWhenAnAdminApproved(ground, brian, users['u-njeri'])).toBe(true);
    expect(await theyWaitForAnAdmin(db, ground, brian)).toBe(false);
  });

  it('Faith, added by Esther afterwards, waits for an admin', async () => {
    expect(await theyWaitForAnAdmin(db, ground, faith)).toBe(true);
  });

  it('an approval by somebody who is not an admin lets nobody in', () => {
    expect(namedWhenAnAdminApproved(ground, brian, { role: 'LEAD', organizationId: 'org-kito' })).toBe(false);
  });

  it('each reads one plain sentence', () => {
    const straight = whatHappensWhenYouJoin(false, 'Kito Foods');
    const waits = whatHappensWhenYouJoin(true, 'Kito Foods');
    console.log(`BRIAN READS: ${straight}\nFAITH READS: ${waits}`);
    expect(straight).toBe('When you join, you go straight in and can check in at once.');
    expect(waits).toBe('When you join, an admin at Kito Foods has to let you in before you can check in, and you will be told by email when they have.');
  });
});

describe('the door itself, accept()', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { ParticipantsService } = require('./participants.service');
  function joining(row: any) {
    const participant = { id: 'p1', groundId: 'g1', userId: null, inviteToken: 'tok', awaitingSeat: false, nameGiven: null, ...row };
    const created: any[] = [];
    const prisma: any = {
      groundParticipant: { findUnique: jest.fn(async () => participant), findFirst: jest.fn(async () => participant), update: jest.fn(async (a: any) => a) },
      ground: { findUnique: jest.fn(async () => ({ id: 'g1', ...ground })) },
      user: {
        findUnique: jest.fn(async ({ where }: any) => (where.id ? users[where.id] ?? null : null)),
        create: jest.fn(async (a: any) => { created.push(a.data); return { id: 'u-new', email: a.data.email, firstName: 'X', lastName: '', role: 'MEMBER', organizationId: 'org-kito', ...a.data }; }),
        update: jest.fn(async () => ({})),
      },
      organizationMembership: { findUnique: jest.fn(async () => null), upsert: jest.fn(async () => ({})) },
      membershipRequest: { upsert: jest.fn(async () => ({})), create: jest.fn(async () => ({})), findFirst: jest.fn(async () => null) },
      checkIn: { findFirst: jest.fn(async () => ({ id: 'ci1' })), findMany: jest.fn(async () => []) },
      emailVerificationToken: { create: jest.fn(async () => ({})) },
      $transaction: jest.fn(async (fn: any) => fn(prisma)),
    };
    const svc = new ParticipantsService(prisma, { sign: () => 'jwt' } as any, { sendAddPasswordEmail: async () => undefined, sendMagicLinkEmail: async () => undefined } as any, { userShapeFor: jest.fn(async (id: string) => ({ id })) } as any);
    return { svc, created };
  }

  it('Brian is not held; Faith is', async () => {
    const b = joining(brian);
    await b.svc.accept('tok').catch(() => undefined);
    expect(b.created[0]?.awaitingOrgApproval).toBe(false);
    const f = joining(faith);
    await f.svc.accept('tok').catch(() => undefined);
    expect(f.created[0]?.awaitingOrgApproval).toBe(true);
  });
});
