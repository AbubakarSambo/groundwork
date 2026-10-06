import { EntryService } from './entry.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

/**
 * A JOIN LINK PROVES YOU WERE GIVEN A LINK.
 *
 * It once proved rather more than that: `join-accept` took the link and any email
 * address, found that person's account with no organisation scope and no proof of
 * ownership, and returned a signed session as them — so everybody holding a
 * broadcast link could become the admin who sent it.
 *
 * The first two tests below are that attack. They are written as the attack rather
 * than as a property, because a property can be satisfied by an implementation
 * that has quietly grown a second door.
 *
 * The rest hold the shape the flow still has to have: the link does the work, it
 * works once, and it lands somebody in the real engine rather than fabricating a
 * finished transcript.
 */
function makeService(overrides: any = {}) {
  const created: any = { checkIn: null, participant: null, pending: null, user: null };
  const store: any = { pending: overrides.pending ?? null };
  const prisma: any = {
    /* The join now runs its writes in one transaction, like the invitation path; the client handed in is this mock. */
    $transaction: async (fn: any) => fn(prisma),
    ground: { findUnique: jest.fn(async () => (overrides.ground === null ? null : { id: 'g1', organizationId: 'org1', initiatorId: 'u-lead', isFreeGround: false, freeParticipantCap: 5 })) },
    organization: { findUnique: jest.fn(async () => ({ subscriptionPlan: null, subscriptionStatus: null })) },
    organizationMembership: { findUnique: jest.fn(async () => null), upsert: jest.fn(async () => ({})) },
    membershipRequest: { upsert: jest.fn(async () => ({})) },
    pendingJoin: {
      create: jest.fn(async (a: any) => { created.pending = { id: 'pj1', ...a.data }; return created.pending; }),
      updateMany: jest.fn(async () => ({ count: 0 })),
      findUnique: jest.fn(async () => store.pending),
      update: jest.fn(async (a: any) => { store.pending = { ...store.pending, ...a.data }; return store.pending; }),
    },
    user: {
      findUnique: jest.fn(async () => (overrides.existingUser ?? null)),
      findMany: jest.fn(async () => []),
      update: jest.fn(async () => ({})),
      create: jest.fn(async (a: any) => { created.user = { id: 'u1', ...a.data }; return created.user; }),
    },
    emailVerificationToken: { create: jest.fn(async () => ({})) },
    groundParticipant: {
      findUnique: jest.fn(async () => (overrides.existingParticipant ?? null)),
      create: jest.fn(async (a: any) => { created.participant = { id: 'p1', ...a.data }; return created.participant; }),
      update: jest.fn(async (a: any) => ({ id: 'p1', ...a.data })),
    },
    checkIn: {
      findFirst: jest.fn(async () => null),
      create: jest.fn(async (a: any) => { created.checkIn = { id: 'ci1', ...a.data }; return created.checkIn; }),
    },
  };
  const email: any = {
    sendAddPasswordEmail: jest.fn(async () => ({})),
    sendJoinConfirmation: jest.fn(async () => ({})),
  };
  const jwt: any = { sign: jest.fn(() => 'jwt-token') };
  const service = new EntryService(
    {} as any, prisma, {} as any, jwt, email, {} as any, {} as any,
  );
  return { service, prisma, email, jwt, created, store };
}

const aLiveLink = (over: any = {}) => ({
  id: 'pj1',
  joinToken: 'jt',
  email: 'cohort@acme.test',
  firstName: 'Cohort',
  lastName: '',
  roleAsDescribed: null,
  token: 'confirm-token',
  expiresAt: new Date(Date.now() + 60_000),
  usedAt: null,
  ...over,
});

describe('the attack this closes', () => {
  it('typing the admin’s address does not sign you in as the admin', async () => {
    const admin = { id: 'admin-1', email: 'admin@acme.test', organizationId: 'org1', role: 'ADMIN', firstName: 'A' };
    const { service, jwt, prisma } = makeService({ existingUser: admin });

    const out: any = await service.askToJoin({ joinToken: 'jt', email: 'admin@acme.test' });

    expect(jwt.sign).not.toHaveBeenCalled();
    expect(out.accessToken).toBeUndefined();
    expect(out.userId).toBeUndefined();
    expect(out.sent).toBe(true);
    /* And nothing was created in their name either. */
    expect(prisma.groundParticipant.create).not.toHaveBeenCalled();
    expect(prisma.checkIn.create).not.toHaveBeenCalled();
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('and typing a colleague’s new address does not put words in their mouth', async () => {
    /* The tempting compromise is to let an unknown address straight in because
       there is nothing yet to steal. There is: a check-in in their name. */
    const { service, jwt, prisma } = makeService();
    await service.askToJoin({ joinToken: 'jt', email: 'nobody@acme.test' });
    expect(jwt.sign).not.toHaveBeenCalled();
    expect(prisma.user.create).not.toHaveBeenCalled();
    expect(prisma.checkIn.create).not.toHaveBeenCalled();
  });

  it('says the same thing whether or not that address has an account here', async () => {
    const withAccount = makeService({ existingUser: { id: 'u9', email: 'a@b.test', organizationId: 'org1', role: 'ADMIN' } });
    const without = makeService();
    const one: any = await withAccount.service.askToJoin({ joinToken: 'jt', email: 'a@b.test' });
    const two: any = await without.service.askToJoin({ joinToken: 'jt', email: 'a@b.test' });
    expect(one.says).toEqual(two.says);
  });

  it('sends the link to the address that was typed, and nowhere else', async () => {
    const { service, email } = makeService();
    await service.askToJoin({ joinToken: 'jt', email: 'Cohort@Acme.test' });
    expect(email.sendJoinConfirmation).toHaveBeenCalledWith('cohort@acme.test', expect.any(String));
  });

  it('refuses a link nobody issued before sending anything', async () => {
    const { service, email } = makeService({ ground: null });
    await expect(service.askToJoin({ joinToken: 'nope', email: 'a@b.test' })).rejects.toThrow(NotFoundException);
    expect(email.sendJoinConfirmation).not.toHaveBeenCalled();
  });

  it('needs an address at all', async () => {
    const { service } = makeService();
    await expect(service.askToJoin({ joinToken: 'jt', email: '' })).rejects.toThrow(BadRequestException);
  });
});

describe('the link is what does the work', () => {
  it('creates the account, the participant and a NOT_STARTED session-1 check-in', async () => {
    const { service, created } = makeService({ pending: aLiveLink() });
    const res: any = await service.joinConfirm('confirm-token');

    expect(created.checkIn.status).toBe('NOT_STARTED');
    expect(created.checkIn.sessionNumber).toBe(1);
    expect(res.checkInId).toBe('ci1');
    expect(res.groundId).toBe('g1');
    expect(res.accessToken).toBe('jwt-token');
    /* Never fabricates a finished transcript — the old join-commit's job. */
    expect(created.checkIn.status).not.toBe('COMPLETED');
  });

  it('marks the account verified, because opening the link IS the proof', async () => {
    const { service, created } = makeService({ pending: aLiveLink() });
    await service.joinConfirm('confirm-token');
    expect(created.user.isEmailVerified).toBe(true);
  });

  it('works once', async () => {
    const { service } = makeService({ pending: aLiveLink({ usedAt: new Date() }) });
    await expect(service.joinConfirm('confirm-token')).rejects.toThrow(/already been used/);
  });

  it('and not after a day', async () => {
    const { service } = makeService({ pending: aLiveLink({ expiresAt: new Date(Date.now() - 1000) }) });
    await expect(service.joinConfirm('confirm-token')).rejects.toThrow(/expired|24 hours/);
  });

  it('an unknown token is refused, and says how to get a new one', async () => {
    const { service } = makeService({ pending: null });
    await expect(service.joinConfirm('made-up')).rejects.toThrow(/recognise|copied/);
  });

  it('is marked used only after everything else succeeded', async () => {
    /* The other way round, a failure halfway leaves somebody who cannot get in
       and cannot ask again. */
    const { service, prisma, store } = makeService({ pending: aLiveLink() });
    (prisma.checkIn.create as jest.Mock).mockRejectedValueOnce(new Error('database went away'));
    await expect(service.joinConfirm('confirm-token')).rejects.toThrow();
    expect(store.pending.usedAt).toBeNull();
  });

  it('reuses an existing participant rather than making a second one', async () => {
    const { service, prisma } = makeService({
      pending: aLiveLink(),
      existingParticipant: { id: 'p1', userId: null, groundId: 'g1', email: 'cohort@acme.test' },
    });
    await service.joinConfirm('confirm-token');
    expect(prisma.groundParticipant.create).not.toHaveBeenCalled();
    expect(prisma.groundParticipant.update).toHaveBeenCalled();
  });
});

describe('what somebody typed about themselves on the join page never becomes the lead\'s private description', () => {
  /*
   * `PendingJoin.roleAsDescribed` is "Your part in this" from JoinPage.tsx — the joiner's own
   * words about their own role, typed before the lead has ever seen them. GroundParticipant's
   * column of the same name is the opposite: the LEAD's private description of somebody,
   * never shown to that person or anyone else (decision 30). A join used to copy one straight
   * into the other. It now goes to the person's own profile field, User.jobTitle — the same
   * field participants.service.ts#updateRole and the check-in's own role-correction write to.
   */
  it('a brand-new joiner\'s own words go to their new account\'s job title, never to roleAsDescribed', async () => {
    const { service, created } = makeService({ pending: aLiveLink({ roleAsDescribed: 'I run the clinic that refers into this' }) });
    await service.joinConfirm('confirm-token');

    expect(created.user.jobTitle).toBe('I run the clinic that refers into this');
    expect(created.participant.roleAsDescribed).toBeUndefined();
  });

  it('an existing account joining a further check-in has its job title updated from what it just typed, never roleAsDescribed', async () => {
    const existing = { id: 'u9', email: 'cohort@acme.test', organizationId: 'org1', role: 'MEMBER', firstName: 'Cohort' };
    const { service, prisma, created } = makeService({
      pending: aLiveLink({ roleAsDescribed: 'Clinic manager, four sites' }),
      existingUser: existing,
    });
    await service.joinConfirm('confirm-token');

    expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: 'u9' }, data: { jobTitle: 'Clinic manager, four sites' } });
    expect(created.participant.roleAsDescribed).toBeUndefined();
  });

  it('a blank answer touches nobody\'s job title', async () => {
    const existing = { id: 'u9', email: 'cohort@acme.test', organizationId: 'org1', role: 'MEMBER', firstName: 'Cohort' };
    const { service, prisma } = makeService({ pending: aLiveLink({ roleAsDescribed: null }), existingUser: existing });
    await service.joinConfirm('confirm-token');
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});
