import { BadRequestException } from '@nestjs/common';
import { EntryService } from './entry.service';
import { WAITING_TO_BE_LET_IN } from '../participants/nobody-joins-your-company-by-being-invited-to-a-check-in';

/**
 * A FORWARDED JOIN LINK STILL WAITS AT THE DOOR.
 *
 * The invitation path asks four things before letting somebody in: do they need an admin's
 * approval, is the account marked as waiting, is the request queued, is there a seat. The join
 * link asked none of them and made a MEMBER with a live check-in for whoever opened it - and a join
 * link exists to be forwarded to a cohort. The same rule now decides both, and the person is told
 * they are waiting rather than sent to a check-in that refuses them.
 */
function service(o: { existingUser?: any; memberHere?: boolean; freeGround?: boolean; taken?: number; paying?: boolean } = {}) {
  const writes: Record<string, any[]> = { user: [], membershipRequest: [], membership: [], participant: [], checkIn: [], userUpdate: [] };
  const sent: string[] = [];
  const prisma: any = {
    $transaction: async (fn: any) => fn(prisma),
    ground: { findUnique: jest.fn(async () => ({ id: 'g1', organizationId: 'org1', status: 'ACTIVE', endState: null, initiatorId: 'u-lead', isFreeGround: !!o.freeGround, freeParticipantCap: 5, label: 'Team' })) },
    organization: { findUnique: jest.fn(async () => ({ subscriptionPlan: o.paying ? 'TEAM' : null, subscriptionStatus: o.paying ? 'active' : null })) },
    organizationMembership: {
      findUnique: jest.fn(async () => (o.memberHere ? { id: 'm' } : null)),
      upsert: jest.fn(async (a: any) => { writes.membership.push(a); return {}; }),
    },
    membershipRequest: { upsert: jest.fn(async (a: any) => { writes.membershipRequest.push(a); return {}; }) },
    pendingJoin: {
      findUnique: jest.fn(async () => ({ id: 'pj', joinToken: 'jt', email: 'cohort@else.test', token: 't', expiresAt: new Date(Date.now() + 60_000), usedAt: null, firstName: 'C', lastName: null, roleAsDescribed: null })),
      update: jest.fn(async () => ({})),
    },
    user: {
      findUnique: jest.fn(async () => o.existingUser ?? null),
      findMany: jest.fn(async () => [{ email: 'admin@org1.test', firstName: 'Ann' }]),
      create: jest.fn(async (a: any) => { writes.user.push(a.data); return { id: 'u-new', ...a.data }; }),
      update: jest.fn(async (a: any) => { writes.userUpdate.push(a); return {}; }),
    },
    groundParticipant: {
      findUnique: jest.fn(async () => null),
      count: jest.fn(async () => o.taken ?? 0),
      create: jest.fn(async (a: any) => { writes.participant.push(a.data); return { id: 'p1', ...a.data }; }),
      update: jest.fn(async () => ({})),
    },
    checkIn: {
      findFirst: jest.fn(async () => null),
      create: jest.fn(async (a: any) => { writes.checkIn.push(a.data); return { id: 'ci1', ...a.data }; }),
    },
    emailVerificationToken: { create: jest.fn(async () => ({})) },
  };
  const email: any = {
    sendAddPasswordEmail: jest.fn(async () => ({})),
    sendSomebodyIsWaiting: jest.fn(async (to: string) => { sent.push(to); }),
  };
  const svc = new EntryService({} as any, prisma, {} as any, { sign: jest.fn(() => 'jwt') } as any, email, {} as any, {} as any);
  return { svc, prisma, writes, sent, email };
}

const settle = () => new Promise((r) => setTimeout(r, 0));

describe('somebody new, arriving from a forwarded link', () => {
  it('gets an account marked as waiting, a queued request, and is told so', async () => {
    const { svc, writes } = service();
    const res = await svc.joinConfirm('t');
    expect(writes.user[0]).toMatchObject({ role: 'MEMBER', awaitingOrgApproval: true, organizationId: 'org1' });
    expect(writes.membershipRequest).toHaveLength(1);
    expect(writes.membershipRequest[0].create).toMatchObject({ organizationId: 'org1', userId: 'u-new', requestedByUserId: 'u-lead', groundId: 'g1' });
    expect(res.queuedForApproval).toBe(true);
    expect(res.saying).toBe(WAITING_TO_BE_LET_IN);
  });

  it('still has a participant row and a session-1 check-in to come back to', async () => {
    const { svc, writes } = service();
    const res = await svc.joinConfirm('t');
    expect(writes.participant).toHaveLength(1);
    expect(writes.checkIn[0]).toMatchObject({ sessionNumber: 1, status: 'NOT_STARTED' });
    expect(res.checkInId).toBe('ci1');
  });

  it('and the admins are told, after the transaction', async () => {
    const { svc, sent } = service();
    await svc.joinConfirm('t');
    await settle();
    expect(sent).toEqual(['admin@org1.test']);
  });
});

describe('somebody who already belongs here', () => {
  it('is not queued and is not told to wait', async () => {
    const { svc, writes, email } = service({ existingUser: { id: 'u-here', email: 'cohort@else.test', organizationId: 'org1', role: 'MEMBER', firstName: 'C' } });
    const res = await svc.joinConfirm('t');
    expect(res.queuedForApproval).toBe(false);
    expect(res).not.toHaveProperty('saying');
    expect(writes.membershipRequest).toHaveLength(0);
    expect(writes.userUpdate).toHaveLength(0);
    await settle();
    expect(email.sendSomebodyIsWaiting).not.toHaveBeenCalled();
  });
});

describe('somebody with an account in another organisation', () => {
  const elsewhere = { id: 'u-else', email: 'cohort@else.test', organizationId: 'org-other', role: 'ADMIN', firstName: 'C' };

  it('arrives as a GUEST here - no queue, and nothing touches their own account', async () => {
    /* The waiting flag is on the account, so queueing them would have refused them on their OWN
       organisation's check-ins. A guest holds no seat and no keys here; the role is the gate. */
    const { svc, writes } = service({ existingUser: elsewhere });
    const res = await svc.joinConfirm('t');
    expect(writes.membership[0].create).toMatchObject({ organizationId: 'org1', role: 'GUEST' });
    expect(writes.userUpdate).toHaveLength(0);
    expect(writes.membershipRequest).toHaveLength(0);
    expect(res.queuedForApproval).toBe(false);
  });

  it('and a second arrival does not overwrite a role they were given here', async () => {
    const { svc, writes } = service({ existingUser: elsewhere, memberHere: true });
    await svc.joinConfirm('t');
    expect(writes.membership[0].update).toEqual({});
  });

  it('is signed in as their home organisation, as the invitation path does', async () => {
    const { svc, prisma } = service({ existingUser: elsewhere });
    await svc.joinConfirm('t');
    const jwt = (svc as any).jwt;
    expect(jwt.sign).toHaveBeenCalledWith(expect.objectContaining({ sub: 'u-else', organizationId: 'org-other', role: 'ADMIN' }));
    expect(prisma.user.update).not.toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ organizationId: 'org1' }) }));
  });
});

describe('the seat', () => {
  it('a free ground at its cap refuses the same way addParticipant does, and writes nothing', async () => {
    const { svc, writes, prisma } = service({ freeGround: true, taken: 5 });
    await expect(svc.joinConfirm('t')).rejects.toThrow(BadRequestException);
    await expect(svc.joinConfirm('t')).rejects.toThrow(/free plan covers 5 people/);
    expect(writes.participant).toHaveLength(0);
    expect(writes.checkIn).toHaveLength(0);
    /* Refused inside the transaction, so the link is not burned either. */
    expect(prisma.pendingJoin.update).not.toHaveBeenCalled();
  });

  it('a free ground with room, or a paying organisation, lets them on', async () => {
    for (const o of [{ freeGround: true, taken: 4 }, { freeGround: true, taken: 50, paying: true }]) {
      const { svc, writes } = service(o);
      await svc.joinConfirm('t');
      expect(writes.participant).toHaveLength(1);
    }
  });
});
