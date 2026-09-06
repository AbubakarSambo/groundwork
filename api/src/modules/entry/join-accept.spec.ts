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
    ground: { findUnique: jest.fn(async () => (overrides.ground === null ? null : { id: 'g1', organizationId: 'org1' })) },
    pendingJoin: {
      create: jest.fn(async (a: any) => { created.pending = { id: 'pj1', ...a.data }; return created.pending; }),
      updateMany: jest.fn(async () => ({ count: 0 })),
      findUnique: jest.fn(async () => store.pending),
      update: jest.fn(async (a: any) => { store.pending = { ...store.pending, ...a.data }; return store.pending; }),
    },
    user: {
      findUnique: jest.fn(async () => (overrides.existingUser ?? null)),
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
