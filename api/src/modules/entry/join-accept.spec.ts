import { EntryService } from './entry.service';
import { BadRequestException } from '@nestjs/common';

/**
 * ONE-PATH join guard (E): joining a broadcast link must sign the person in and
 * land them in the REAL engine - create a participant and a NOT_STARTED
 * session-1 check-in, and RETURN its checkInId to hand off to /checkin/:id. It
 * must NOT fabricate a completed transcript (that was the old entry-pipeline
 * join-commit). Sign-in is required: no email -> rejected, no anonymous branch.
 */
function makeService(overrides: any = {}) {
  const created: any = { checkIn: null, participant: null };
  const prisma: any = {
    ground: { findUnique: jest.fn(async () => ({ id: 'g1', organizationId: 'org1' })) },
    user: {
      findUnique: jest.fn(async () => (overrides.existingUser ?? null)),
      create: jest.fn(async (a: any) => ({ id: 'u1', ...a.data })),
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
  const email: any = { sendAddPasswordEmail: jest.fn(async () => ({})) };
  const jwt: any = { sign: jest.fn(() => 'jwt-token') };
  const service = new EntryService(
    {} as any, prisma, {} as any, jwt, email, {} as any, {} as any,
  );
  return { service, prisma, created };
}

describe('GW-JOIN-ONEPATH: join lands in the real engine, no fabricated transcript', () => {
  it('creates a NOT_STARTED session-1 check-in and returns its checkInId', async () => {
    const { service, prisma, created } = makeService();
    const res = await service.joinAccept({ joinToken: 'jt', email: 'Cohort@Acme.test', firstName: 'Cohort' });
    expect(prisma.checkIn.create).toHaveBeenCalled();
    expect(created.checkIn.status).toBe('NOT_STARTED');
    expect(created.checkIn.sessionNumber).toBe(1);
    expect(res.checkInId).toBe('ci1');
    expect(res.groundId).toBe('g1');
    expect(res.accessToken).toBe('jwt-token');
    // never fabricates a completed transcript on the join
    expect((prisma.checkIn.create as jest.Mock).mock.calls[0][0].data.status).not.toBe('COMPLETED');
  });

  it('requires an email (no anonymous join onto the real engine)', async () => {
    const { service } = makeService();
    await expect(service.joinAccept({ joinToken: 'jt', email: '   ' } as any)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('reuses an existing participant + open check-in instead of duplicating', async () => {
    const { service, prisma } = makeService({
      existingParticipant: { id: 'p-existing', userId: 'u1' },
    });
    (prisma.checkIn.findFirst as jest.Mock).mockResolvedValueOnce({ id: 'ci-existing', status: 'IN_PROGRESS' });
    const res = await service.joinAccept({ joinToken: 'jt', email: 'back@acme.test' });
    expect(prisma.groundParticipant.create).not.toHaveBeenCalled();
    expect(prisma.checkIn.create).not.toHaveBeenCalled();
    expect(res.checkInId).toBe('ci-existing');
  });

  it('never fabricates a name from the email when none is given', async () => {
    const { service, prisma } = makeService();
    await service.joinAccept({ joinToken: 'jt', email: 'hjumare@acme.test' });
    const created = (prisma.user.create as jest.Mock).mock.calls[0][0].data;
    expect(created.firstName).toBe('');
    expect(created.firstName).not.toMatch(/hjumare/i);
  });
})
