import { GroundsService, SAFE_PARTICIPANT_SELECT } from './grounds.service';

/**
 * Trust invariants (GW-01). These guard the product's load-bearing rule -
 * "record ownership is the mechanism" - against regression. If any of these
 * fail, a participant's private data is leaking through the ground view.
 */
describe('GroundsService - participant serialization (GW-01)', () => {
  const SENSITIVE = ['inviteToken', 'inviteTokenExpiresAt', 'soloArtifact', 'specificityHistory', 'willingnessEvidence', 'willingnessCadence', 'lastNudgedAt'];

  it('SAFE_PARTICIPANT_SELECT never exposes sensitive fields', () => {
    for (const field of SENSITIVE) {
      expect((SAFE_PARTICIPANT_SELECT as Record<string, unknown>)[field]).toBeUndefined();
    }
    // soloArtifactAt (timestamp) is allowed; soloArtifact (content) is not.
    expect((SAFE_PARTICIPANT_SELECT as Record<string, unknown>).soloArtifactAt).toBe(true);
    expect((SAFE_PARTICIPANT_SELECT as Record<string, unknown>).soloArtifact).toBeUndefined();
  });

  it('get() loads participants through the safe select only', async () => {
    let capturedInclude: any;
    const prisma: any = {
      ground: {
        findFirst: jest.fn(async (args: any) => {
          capturedInclude = args.include;
          return { id: args.where.id, organizationId: args.where.organizationId, participants: [], checkIns: [] };
        }),
      },
      organization: { findUnique: jest.fn(async () => null) },
      checkIn: { aggregate: jest.fn(async () => ({ _max: { sessionNumber: null } })) },
      groundParticipant: { findMany: jest.fn(async () => []) },
    };
    const service = new GroundsService(prisma, {} as any, {} as any, {} as any, { emit: () => Promise.resolve() } as any, {} as any);
    await service.get('g1', 'org1');

    expect(prisma.ground.findFirst).toHaveBeenCalled();
    // The participants relation must be a field-selected projection, not `true`.
    expect(capturedInclude.participants).toEqual({ select: SAFE_PARTICIPANT_SELECT });
    for (const field of SENSITIVE) {
      expect(capturedInclude.participants.select[field]).toBeUndefined();
    }
  });

  it('get() is scoped to the requesting organization', async () => {
    const prisma: any = {
      ground: { findFirst: jest.fn(async (args: any) => ({ id: 'g1', organizationId: args.where.organizationId, participants: [], checkIns: [] })) },
      organization: { findUnique: jest.fn(async () => null) },
      checkIn: { aggregate: jest.fn(async () => ({ _max: { sessionNumber: null } })) },
      groundParticipant: { findMany: jest.fn(async () => []) },
    };
    const service = new GroundsService(prisma, {} as any, {} as any, {} as any, { emit: () => Promise.resolve() } as any, {} as any);
    await service.get('g1', 'org-A');
    expect(prisma.ground.findFirst.mock.calls[0][0].where.organizationId).toBe('org-A');
  });
});

/**
 * GW-24: participant invite resend - generates a fresh token and re-sends
 * the email. Throws when the participant has already accepted.
 */
describe('GroundsService.resendParticipantInvite - GW-24', () => {
  function makePrisma(ground: any, participant: any, initiator: any) {
    const updated: any[] = [];
    return {
      updated,
      prisma: {
        ground: { findFirst: jest.fn(async () => ground) },
        groundParticipant: {
          findFirst: jest.fn(async () => participant),
          update: jest.fn(async (args: any) => { updated.push(args.data); return {}; }),
        },
        user: { findUnique: jest.fn(async () => initiator) },
        checkIn: { findFirst: jest.fn(async () => null) },
      } as any,
    };
  }

  it('generates a new token and calls sendParticipantInvite', async () => {
    const ground = { id: 'g1', organizationId: 'org1', label: 'Test Ground', initiatorId: 'u1' };
    const participant = { id: 'p1', groundId: 'g1', email: 'other@test.com', userId: null };
    const initiator = { id: 'u1', firstName: 'Alice' };
    const { prisma, updated } = makePrisma(ground, participant, initiator);
    const emailSent: any[] = [];
    const email: any = { sendParticipantInvite: jest.fn(async (...args: any[]) => { emailSent.push(args); }) };

    const service = new GroundsService(prisma, email, {} as any, {} as any, { emit: () => Promise.resolve() } as any, {} as any);
    const result = await service.resendParticipantInvite('g1', 'p1', 'org1');

    expect(result.message).toBe('Invite resent');
    expect(updated[0].inviteToken).toBeTruthy();
    expect(updated[0].inviteTokenExpiresAt).toBeInstanceOf(Date);
    expect(emailSent).toHaveLength(1);
  });

  it('throws BadRequest when the participant has already accepted', async () => {
    const ground = { id: 'g1', organizationId: 'org1', label: 'Test', initiatorId: 'u1' };
    const participant = { id: 'p1', groundId: 'g1', email: 'x@test.com', userId: 'already-set' };
    const { prisma } = makePrisma(ground, participant, null);
    const { BadRequestException } = await import('@nestjs/common');
    const service = new GroundsService(prisma, {} as any, {} as any, {} as any, { emit: () => Promise.resolve() } as any, {} as any);

    await expect(service.resendParticipantInvite('g1', 'p1', 'org1')).rejects.toBeInstanceOf(BadRequestException);
  });
});

/**
 * GW-ORG-BOUNDARY: a user cannot retrieve a ground that belongs to another
 * organization unless they are also a linked participant on it. This is a
 * permanent tripwire - if the org-scoped lookup or the participant fallback
 * ever gets loosened, this test goes red before merge.
 */
describe('GroundsService.get - org boundary (GW-ORG-BOUNDARY)', () => {
  const GROUND = { id: 'g1', organizationId: 'org-A', participants: [], checkIns: [] };

  function makePrisma({ findFirstResult, participantLink, findUniqueResult }: any) {
    return {
      ground: {
        findFirst: jest.fn(async () => findFirstResult),
        findUnique: jest.fn(async () => findUniqueResult),
      },
      groundParticipant: {
        findFirst: jest.fn(async () => participantLink),
        findMany: jest.fn(async () => []),
      },
      organization: { findUnique: jest.fn(async () => null) },
      checkIn: { aggregate: jest.fn(async () => ({ _max: { sessionNumber: null } })) },
    } as any;
  }

  it('throws NotFoundException for a requester in a different org with no participant link', async () => {
    const { NotFoundException } = await import('@nestjs/common');
    const prisma = makePrisma({ findFirstResult: null, participantLink: null, findUniqueResult: null });
    const service = new GroundsService(prisma, {} as any, {} as any, {} as any, { emit: () => Promise.resolve() } as any, {} as any);

    await expect(service.get('g1', 'org-B', 'user-outsider')).rejects.toBeInstanceOf(NotFoundException);
    // The org-scoped lookup must have been tried first, scoped to the requester's own org.
    expect(prisma.ground.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'g1', organizationId: 'org-B' } }),
    );
    // No participant link for this ground -> the cross-org fallback must not surface it.
    expect(prisma.ground.findUnique).not.toHaveBeenCalled();
  });

  it('throws NotFoundException even with no requestingUserId at all (anonymous/service call)', async () => {
    const { NotFoundException } = await import('@nestjs/common');
    const prisma = makePrisma({ findFirstResult: null, participantLink: null, findUniqueResult: null });
    const service = new GroundsService(prisma, {} as any, {} as any, {} as any, { emit: () => Promise.resolve() } as any, {} as any);

    await expect(service.get('g1', 'org-B')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('succeeds for a genuine cross-org participant (linked via GroundParticipant)', async () => {
    const prisma = makePrisma({
      findFirstResult: null,
      participantLink: { id: 'p1', groundId: 'g1', userId: 'user-linked' },
      findUniqueResult: { ...GROUND },
    });
    const service = new GroundsService(prisma, {} as any, {} as any, {} as any, { emit: () => Promise.resolve() } as any, {} as any);

    const result = await service.get('g1', 'org-B', 'user-linked');
    expect(result.id).toBe('g1');
    expect(prisma.groundParticipant.findFirst).toHaveBeenCalledWith({ where: { groundId: 'g1', userId: 'user-linked' } });
  });

  it('succeeds for a same-org requester via the primary org-scoped lookup', async () => {
    const prisma = makePrisma({ findFirstResult: { ...GROUND }, participantLink: null, findUniqueResult: null });
    const service = new GroundsService(prisma, {} as any, {} as any, {} as any, { emit: () => Promise.resolve() } as any, {} as any);

    const result = await service.get('g1', 'org-A', 'user-member');
    expect(result.id).toBe('g1');
    expect(prisma.ground.findUnique).not.toHaveBeenCalled();
  });
});
