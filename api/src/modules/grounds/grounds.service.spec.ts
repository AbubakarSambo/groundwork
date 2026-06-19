import { GroundsService, SAFE_PARTICIPANT_SELECT } from './grounds.service';

/**
 * Trust invariants (GW-01). These guard the product's load-bearing rule —
 * "record ownership is the mechanism" — against regression. If any of these
 * fail, a participant's private data is leaking through the ground view.
 */
describe('GroundsService — participant serialization (GW-01)', () => {
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
          return { id: args.where.id, organizationId: args.where.organizationId, participants: [] };
        }),
      },
    };
    const service = new GroundsService(prisma, {} as any, {} as any, {} as any, { emit: () => Promise.resolve() } as any);
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
      ground: { findFirst: jest.fn(async (args: any) => ({ id: 'g1', organizationId: args.where.organizationId, participants: [] })) },
    };
    const service = new GroundsService(prisma, {} as any, {} as any, {} as any, { emit: () => Promise.resolve() } as any);
    await service.get('g1', 'org-A');
    expect(prisma.ground.findFirst.mock.calls[0][0].where.organizationId).toBe('org-A');
  });
});

/**
 * GW-24: participant invite resend — generates a fresh token and re-sends
 * the email. Throws when the participant has already accepted.
 */
describe('GroundsService.resendParticipantInvite — GW-24', () => {
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

    const service = new GroundsService(prisma, email, {} as any, {} as any, { emit: () => Promise.resolve() } as any);
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
    const service = new GroundsService(prisma, {} as any, {} as any, {} as any, { emit: () => Promise.resolve() } as any);

    await expect(service.resendParticipantInvite('g1', 'p1', 'org1')).rejects.toBeInstanceOf(BadRequestException);
  });
});
