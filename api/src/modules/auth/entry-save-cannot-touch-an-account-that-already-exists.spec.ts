import { AuthService } from './auth.service';

/**
 * ENTRY-SAVE CANNOT TOUCH AN ACCOUNT THAT ALREADY EXISTS.
 *
 * The route is public. For an address that already had an account it upserted that account's
 * EntryDraft with the caller's payload, un-consumed it, and returned the new draftToken to the
 * caller - who then kept editing through PATCH /entry/draft and, when the customer opened the
 * magic link this same call sent them, had their organisation renamed and invitations sent from
 * it. One known email address.
 *
 * Now an existing address gets one effect: the link is mailed. Nothing is written, nothing is
 * returned that lets the caller write later.
 */
function service(existingUser: any) {
  const sent: string[] = [];
  const prisma: any = {
    user: { findUnique: jest.fn(async () => existingUser) },
    entryDraft: { upsert: jest.fn(), update: jest.fn(), create: jest.fn() },
    pendingSignup: { upsert: jest.fn(async () => ({})) },
    emailVerificationToken: {
      findFirst: jest.fn(async () => null),
      updateMany: jest.fn(async () => ({ count: 0 })),
      create: jest.fn(async () => ({})),
    },
  };
  const email: any = { sendMagicLinkEmail: jest.fn(async (to: string) => { sent.push(to); }) };
  const svc = new AuthService(prisma, {} as any, { get: () => undefined } as any, email, {} as any, {} as any, { emit: () => undefined } as any);
  return { svc, prisma, sent };
}

const attackersDraft = { payload: { orgName: 'Owned Ltd', contributors: [{ email: 'mule@evil.test' }] }, history: [{ role: 'user', content: 'hi' }] };

describe('an address with an account', () => {
  const ada = { id: 'u-ada', email: 'ada@acme.test', firstName: 'Ada' };

  it('has nothing written to its draft, whatever the caller sent', async () => {
    const { svc, prisma } = service(ada);
    await svc.entrySave('ada@acme.test', attackersDraft);
    expect(prisma.entryDraft.upsert).not.toHaveBeenCalled();
    expect(prisma.entryDraft.update).not.toHaveBeenCalled();
    expect(prisma.entryDraft.create).not.toHaveBeenCalled();
  });

  it('gets no draftToken back, so there is nothing to keep editing with', async () => {
    const { svc } = service(ada);
    const res = await svc.entrySave('ada@acme.test', attackersDraft);
    expect(res).toEqual({ message: 'Check your email for your sign-in link.', email: 'ada@acme.test' });
    expect(res).not.toHaveProperty('draftToken');
  });

  it('is still sent the link - that is the one effect', async () => {
    const { svc, sent } = service(ada);
    await svc.entrySave('ada@acme.test', attackersDraft);
    expect(sent).toEqual(['ada@acme.test']);
  });

  it('the same is true on the double-tap path that reuses a fresh token', async () => {
    const { svc, prisma } = service(ada);
    prisma.emailVerificationToken.findFirst = jest.fn(async () => ({ token: 'fresh' }));
    const res = await svc.entrySave('ada@acme.test', attackersDraft);
    expect(res).not.toHaveProperty('draftToken');
    expect(prisma.entryDraft.upsert).not.toHaveBeenCalled();
  });
});

describe('an address with no account', () => {
  it('still gets a draftToken, because that path holds nothing anybody else owns', async () => {
    const { svc, prisma } = service(null);
    const res = await svc.entrySave('new@acme.test', attackersDraft);
    expect(res.draftToken).toEqual(expect.any(String));
    expect(prisma.pendingSignup.upsert).toHaveBeenCalledTimes(1);
  });
});
